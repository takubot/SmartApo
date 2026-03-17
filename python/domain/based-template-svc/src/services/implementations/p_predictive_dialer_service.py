"""予測ダイヤラー アルゴリズム実装"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from logging import getLogger

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...models.tables.enum import (
    UserStatusEnum,
    CallStatusEnum,
    CampaignContactStatusEnum,
)
from ...models.tables.model_defs import (
    DialerUserCampaignModel,
    DialerUserModel,
    DialerCallLogModel,
    DialerCampaignContactModel,
    DialerCampaignModel,
    DialerDncModel,
)
from ..interfaces.i_predictive_dialer_service import IPredictiveDialerService

logger = getLogger(__name__)

JST = timezone(timedelta(hours=9))
_MAX_RATIO = Decimal("3.00")
_MIN_RATIO = Decimal("1.00")


class PPredictiveDialerService(IPredictiveDialerService):
    """予測ダイヤラーのコアアルゴリズム"""

    # ── 最適比率計算 ─────────────────────────────────────────

    def calculate_optimal_ratio(self, campaign_id: str, db: Session) -> Decimal:
        """
        直近30分の応答率から最適な予測発信比率を算出する。
        base_ratio = 1 / answer_rate
        放棄率によるガード付き。
        """
        now = datetime.now(JST)
        window_30m = now - timedelta(minutes=30)

        # 30分間の完了通話数
        total_q = (
            select(func.count())
            .where(DialerCallLogModel.campaign_id == campaign_id)
            .where(DialerCallLogModel.call_status == CallStatusEnum.COMPLETED)
            .where(DialerCallLogModel.initiated_at >= window_30m)
        )
        total_completed = db.execute(total_q).scalar() or 0

        # 30分間の応答通話数
        answered_q = (
            select(func.count())
            .where(DialerCallLogModel.campaign_id == campaign_id)
            .where(DialerCallLogModel.call_status == CallStatusEnum.COMPLETED)
            .where(DialerCallLogModel.answered_at.is_not(None))
            .where(DialerCallLogModel.initiated_at >= window_30m)
        )
        total_answered = db.execute(answered_q).scalar() or 0

        if total_completed == 0:
            return Decimal("1.20")  # デフォルト

        answer_rate = total_answered / total_completed
        if answer_rate <= 0:
            return _MIN_RATIO

        base_ratio = Decimal(str(round(1.0 / answer_rate, 2)))

        # 放棄率ガード
        abandon_rate = float(self.check_abandon_rate(campaign_id, db))
        if abandon_rate > 0.025:
            base_ratio = base_ratio * Decimal("0.80")
        elif abandon_rate > 0.020:
            base_ratio = base_ratio * Decimal("0.90")

        # 上限・下限
        base_ratio = max(min(base_ratio, _MAX_RATIO), _MIN_RATIO)
        return base_ratio.quantize(Decimal("0.01"))

    # ── 次の発信対象取得 ─────────────────────────────────────

    def get_next_contacts_to_dial(
        self, campaign_id: str, count: int, db: Session
    ) -> list[str]:
        """
        優先キューから次に発信する連絡先IDを取得。
        1. コールバック予定 (scheduled_at 昇順)
        2. 試行回数が少ない順
        3. 最終試行から時間が経過した順
        DNC登録済み番号は除外。
        """
        campaign = db.get(DialerCampaignModel, campaign_id)
        if not campaign:
            return []

        now = datetime.now(JST)

        # DNC番号リスト (サブクエリ)
        dnc_phones = select(DialerDncModel.phone_number).where(
            DialerDncModel.tenant_id == campaign.tenant_id
        )

        # 発信可能な連絡先を取得
        q = (
            select(DialerCampaignContactModel.contact_id)
            .where(DialerCampaignContactModel.campaign_id == campaign_id)
            .where(
                DialerCampaignContactModel.status.in_([
                    CampaignContactStatusEnum.PENDING,
                    CampaignContactStatusEnum.CALLBACK,
                ])
            )
            .where(
                DialerCampaignContactModel.attempt_count
                < campaign.max_attempts_per_contact
            )
            .where(
                (DialerCampaignContactModel.next_attempt_at.is_(None))
                | (DialerCampaignContactModel.next_attempt_at <= now)
            )
            .order_by(
                # コールバックを優先
                DialerCampaignContactModel.status.desc(),
                # 試行回数が少ない順
                DialerCampaignContactModel.attempt_count.asc(),
                # 古いものを優先
                DialerCampaignContactModel.last_attempt_at.asc().nulls_first(),
            )
            .limit(count)
        )
        rows = db.execute(q).scalars().all()
        return list(rows)

    # ── 発信判定 ─────────────────────────────────────────────

    def should_dial_next(
        self, campaign_id: str, available_users: int, db: Session
    ) -> bool:
        """次の発信を行うべきか判定する"""
        if available_users <= 0:
            return False

        campaign = db.get(DialerCampaignModel, campaign_id)
        if not campaign:
            return False

        # 現在の同時通話数
        active_calls = db.execute(
            select(func.count())
            .where(DialerCallLogModel.campaign_id == campaign_id)
            .where(
                DialerCallLogModel.call_status.in_([
                    CallStatusEnum.DIALING,
                    CallStatusEnum.RINGING,
                    CallStatusEnum.IN_PROGRESS,
                ])
            )
        ).scalar() or 0

        # 最大同時発信数チェック
        if active_calls >= campaign.max_concurrent_calls:
            return False

        # 予測比率に基づく発信判定
        ratio = self.calculate_optimal_ratio(campaign_id, db)
        target_calls = int(available_users * float(ratio))
        return active_calls < target_calls

    # ── メトリクス更新 ───────────────────────────────────────

    def update_metrics(
        self, campaign_id: str, call_status: str, db: Session
    ) -> None:
        """通話結果をキャンペーンの集計値に反映する"""
        campaign = db.get(DialerCampaignModel, campaign_id)
        if not campaign:
            return

        campaign.total_calls += 1

        if call_status == CallStatusEnum.ANSWERED.value:
            campaign.total_answered += 1
        elif call_status == "abandoned":
            campaign.total_abandoned += 1

        # 完了連絡先数を再計算
        completed_count = db.execute(
            select(func.count())
            .where(DialerCampaignContactModel.campaign_id == campaign_id)
            .where(
                DialerCampaignContactModel.status
                == CampaignContactStatusEnum.COMPLETED
            )
        ).scalar() or 0
        campaign.completed_contacts = completed_count

    # ── 放棄率計算 ───────────────────────────────────────────

    def check_abandon_rate(self, campaign_id: str, db: Session) -> Decimal:
        """直近15分の放棄率を計算する"""
        now = datetime.now(JST)
        window_15m = now - timedelta(minutes=15)

        answered_q = (
            select(func.count())
            .where(DialerCallLogModel.campaign_id == campaign_id)
            .where(DialerCallLogModel.answered_at.is_not(None))
            .where(DialerCallLogModel.initiated_at >= window_15m)
        )
        total_answered = db.execute(answered_q).scalar() or 0

        if total_answered == 0:
            return Decimal("0.00")

        abandoned_q = (
            select(func.count())
            .where(DialerCallLogModel.campaign_id == campaign_id)
            .where(DialerCallLogModel.is_abandoned.is_(True))
            .where(DialerCallLogModel.initiated_at >= window_15m)
        )
        total_abandoned = db.execute(abandoned_q).scalar() or 0

        rate = Decimal(str(total_abandoned / total_answered))
        return rate.quantize(Decimal("0.0001"))
