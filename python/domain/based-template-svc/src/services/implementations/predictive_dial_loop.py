"""プレディクティブダイヤル 自動ループ

アクティブなキャンペーンを定期的にポーリングし、
PPredictiveDialerService のアルゴリズムに基づいて自動発信を行う。
FastAPI の lifespan から起動し、バックグラウンドスレッドで動作する。
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone
from logging import getLogger

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...database_utils.database import SyncSessionLocal
from ...models.tables.enum import (
    CallStatusEnum,
    CampaignContactStatusEnum,
    CampaignStatusEnum,
    UserStatusEnum,
)
from ...models.tables.model_defs import (
    DialerCallLogModel,
    DialerCampaignContactModel,
    DialerCampaignModel,
    DialerContactModel,
    DialerUserCampaignModel,
    DialerUserModel,
)
from ...routers.dialer.calling_session import create_session as create_calling_session
from .p_freeswitch_service import PFreeSwitchService
from .p_predictive_dialer_service import PPredictiveDialerService

logger = getLogger(__name__)
JST = timezone(timedelta(hours=9))

_POLL_INTERVAL_SECONDS = 3
_loop_thread: threading.Thread | None = None
_stop_flag = threading.Event()


def _get_available_user_count(campaign_id: str, db: Session) -> int:
    """キャンペーンに割り当てられた AVAILABLE ユーザー数を取得"""
    return (
        db.execute(
            select(func.count())
            .select_from(DialerUserCampaignModel)
            .join(DialerUserModel)
            .where(
                DialerUserCampaignModel.campaign_id == campaign_id,
                DialerUserCampaignModel.is_active.is_(True),
                DialerUserModel.status == UserStatusEnum.AVAILABLE,
                DialerUserModel.is_deleted.is_(False),
            )
        ).scalar()
        or 0
    )


def _process_campaign(
    campaign: DialerCampaignModel,
    dialer_svc: PPredictiveDialerService,
    telephony_svc: PFreeSwitchService,
    db: Session,
) -> None:
    """1つのキャンペーンに対してプレディクティブ発信を実行"""
    campaign_id = campaign.campaign_id

    available_users = _get_available_user_count(campaign_id, db)
    if available_users <= 0:
        return

    if not dialer_svc.should_dial_next(campaign_id, available_users, db):
        return

    # 現在のアクティブ通話数
    active_calls = (
        db.execute(
            select(func.count()).where(
                DialerCallLogModel.campaign_id == campaign_id,
                DialerCallLogModel.call_status.in_([
                    CallStatusEnum.DIALING,
                    CallStatusEnum.RINGING,
                    CallStatusEnum.IN_PROGRESS,
                ]),
            )
        ).scalar()
        or 0
    )

    # 発信する数を計算
    ratio = dialer_svc.calculate_optimal_ratio(campaign_id, db)
    target = int(available_users * float(ratio))
    to_dial = max(0, min(target - active_calls, campaign.max_concurrent_calls - active_calls))

    if to_dial <= 0:
        return

    # 次の連絡先を取得
    contact_ids = dialer_svc.get_next_contacts_to_dial(campaign_id, to_dial, db)
    if not contact_ids:
        return

    # 連絡先情報を取得
    contacts = (
        db.execute(
            select(DialerContactModel).where(
                DialerContactModel.contact_id.in_(contact_ids)
            )
        )
        .scalars()
        .all()
    )
    contact_map = {c.contact_id: c for c in contacts}

    caller_id = campaign.caller_id
    if not caller_id:
        logger.warning("キャンペーン %s に発信者番号が設定されていません", campaign_id)
        return

    session_calls: list[tuple[str, str, str | None, str]] = []

    for cid in contact_ids:
        contact = contact_map.get(cid)
        if not contact or not contact.phone_primary:
            continue

        try:
            result = telephony_svc.initiate_call(
                to=contact.phone_primary,
                from_=caller_id,
                voice_url="",
                status_callback_url="",
                ring_timeout=campaign.ring_timeout_seconds,
            )
            log = DialerCallLogModel(
                tenant_id=campaign.tenant_id,
                campaign_id=campaign_id,
                contact_id=contact.contact_id,
                phone_number_dialed=contact.phone_primary,
                caller_id_used=caller_id,
                call_uuid=result.get("call_sid"),
                call_status=CallStatusEnum.DIALING,
            )
            db.add(log)
            db.flush()

            # キャンペーンコンタクトの試行回数を更新
            now = datetime.now(JST)
            cc = db.execute(
                select(DialerCampaignContactModel).where(
                    DialerCampaignContactModel.campaign_id == campaign_id,
                    DialerCampaignContactModel.contact_id == cid,
                )
            ).scalar_one_or_none()
            if cc:
                cc.status = CampaignContactStatusEnum.IN_PROGRESS
                cc.attempt_count = cc.attempt_count + 1
                cc.last_attempt_at = now
                cc.next_attempt_at = now + timedelta(
                    minutes=campaign.retry_interval_minutes
                )

            session_calls.append((
                log.call_log_id,
                contact.contact_id,
                result.get("call_sid"),
                contact.phone_primary,
            ))
            logger.info(
                "自動発信: campaign=%s contact=%s phone=%s",
                campaign_id,
                cid,
                contact.phone_primary,
            )
        except Exception:
            logger.exception(
                "自動発信失敗: campaign=%s contact=%s", campaign_id, cid
            )

    db.commit()

    # セッション作成
    if session_calls:
        create_calling_session(
            call_list_id=campaign_id,  # キャンペーンIDをセッションのリストIDとして使用
            tenant_id=campaign.tenant_id,
            calls=session_calls,
        )
        logger.info(
            "プレディクティブセッション作成: campaign=%s calls=%d",
            campaign_id,
            len(session_calls),
        )


def _run_loop() -> None:
    """メインポーリングループ"""
    dialer_svc = PPredictiveDialerService()
    telephony_svc = PFreeSwitchService()

    while not _stop_flag.is_set():
        try:
            with SyncSessionLocal() as db:
                # アクティブなキャンペーンを取得
                campaigns = (
                    db.execute(
                        select(DialerCampaignModel).where(
                            DialerCampaignModel.status == CampaignStatusEnum.ACTIVE,
                            DialerCampaignModel.is_deleted.is_(False),
                        )
                    )
                    .scalars()
                    .all()
                )

                for campaign in campaigns:
                    if _stop_flag.is_set():
                        return
                    try:
                        _process_campaign(campaign, dialer_svc, telephony_svc, db)
                    except Exception:
                        logger.exception(
                            "キャンペーン処理失敗: %s", campaign.campaign_id
                        )
        except Exception:
            logger.exception("ダイヤルループ エラー")

        _stop_flag.wait(timeout=_POLL_INTERVAL_SECONDS)


def start_dial_loop() -> None:
    """プレディクティブダイヤルループを開始する"""
    global _loop_thread
    _stop_flag.clear()

    _loop_thread = threading.Thread(
        target=_run_loop, daemon=True, name="predictive-dial-loop"
    )
    _loop_thread.start()
    logger.info("プレディクティブダイヤルループ開始")


def stop_dial_loop() -> None:
    """プレディクティブダイヤルループを停止する"""
    _stop_flag.set()
    logger.info("プレディクティブダイヤルループ停止")
