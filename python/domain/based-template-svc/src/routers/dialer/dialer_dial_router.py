"""プログレッシブダイヤラー発信エンドポイント

FreeSWITCH ESL経由で外線発信し、応答後にオペレーターの
SIP内線 (WebRTC) へブリッジする。

POST /api/dial - 発信してオペレーターへブリッジ
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import CallStatusEnum, UserStatusEnum
from ...models.tables.model_defs import (
    DialerCallLogModel,
    DialerContactModel,
    DialerUserModel,
)
from ...services.implementations.p_freeswitch_service import PFreeSwitchService

router = APIRouter()
logger = getLogger(__name__)
JST = timezone(timedelta(hours=9))


# ── リクエスト / レスポンス スキーマ ──────────────────────────


class DialRequest(BaseModel):
    """発信リクエスト"""

    phone_number: str = Field(..., description="発信先電話番号")
    contact_id: str = Field(..., description="連絡先ID")
    caller_id: str = Field(..., description="発信者番号 (E.164)")
    campaign_id: str | None = Field(None, description="キャンペーンID")
    ring_timeout: int = Field(30, ge=10, le=120, description="呼出タイムアウト (秒)")
    record: bool = Field(True, description="録音を有効にする")


class DialResponse(BaseModel):
    """発信レスポンス"""

    call_uuid: str = Field(..., description="FreeSWITCH通話UUID")
    status: str = Field(..., description="通話ステータス")
    user_extension: str = Field(..., description="ブリッジ先オペレーター内線")
    contact_id: str
    phone_number: str


# ── エンドポイント ────────────────────────────────────────────


@router.post("/dial", response_model=DialResponse, status_code=201)
def dial_and_bridge(
    body: DialRequest,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """プログレッシブダイヤラー: 外線発信 → オペレーターにブリッジ

    1. 認証済みユーザーの情報からSIP内線番号を取得
    2. FreeSWITCH ESL で外線発信 (sofia/gateway)
    3. 顧客応答時にオペレーターの SIP内線 (user/xxxx) へ自動ブリッジ
    4. 通話ログをDBに記録
    """
    firebase_uid, tenant_id = auth

    # ── ユーザー検索 ──
    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(404, "ユーザー情報が見つかりません")

    if not user.extension:
        raise HTTPException(
            400,
            "SIP内線番号が設定されていません。設定で内線番号を登録してください。",
        )

    if user.status != UserStatusEnum.AVAILABLE:
        raise HTTPException(
            409,
            f"ステータスが「{user.status.value}」です。"
            "「available」の状態でのみ発信できます。",
        )

    # ── 連絡先の存在確認 ──
    contact = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id == body.contact_id,
            DialerContactModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()

    if not contact:
        raise HTTPException(404, "連絡先が見つかりません")

    # ── FreeSWITCH ESL で発信 ──
    svc = PFreeSwitchService()

    try:
        result = svc.dial_and_bridge(
            to=body.phone_number,
            from_=body.caller_id,
            user_extension=user.extension,
            ring_timeout=body.ring_timeout,
            record=body.record,
        )
    except RuntimeError as e:
        logger.error("FreeSWITCH発信エラー: %s", e)
        raise HTTPException(502, f"発信に失敗しました: {e}")

    # ── 通話ログ記録 ──
    now = datetime.now(JST)
    log = DialerCallLogModel(
        tenant_id=tenant_id,
        campaign_id=body.campaign_id,
        contact_id=body.contact_id,
        user_id=user.user_id,
        phone_number_dialed=body.phone_number,
        caller_id_used=body.caller_id,
        call_uuid=result["call_sid"],  # FS UUID を格納
        call_status=CallStatusEnum.DIALING,
        initiated_at=now,
    )
    db.add(log)

    # ── ユーザーステータス更新 ──
    user.status = UserStatusEnum.ON_CALL
    user.status_changed_at = now
    user.current_call_id = log.call_log_id

    db.flush()

    logger.info(
        "プログレッシブ発信開始: uuid=%s to=%s user=%s(%s)",
        result["call_sid"],
        body.phone_number,
        user.display_name,
        user.extension,
    )

    return DialResponse(
        call_uuid=result["call_sid"],
        status="dialing",
        user_extension=user.extension,
        contact_id=body.contact_id,
        phone_number=body.phone_number,
    )
