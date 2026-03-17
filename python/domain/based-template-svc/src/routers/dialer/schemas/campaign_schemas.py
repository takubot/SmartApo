"""キャンペーンスキーマ"""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class CampaignCreateSchema(BaseSchema):
    """キャンペーン作成"""

    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    daily_start_time: time = time(9, 0)
    daily_end_time: time = time(18, 0)
    active_days: Optional[list[int]] = None
    predictive_ratio: Decimal = Decimal("1.20")
    max_concurrent_calls: int = 10
    max_abandon_rate: Decimal = Decimal("3.00")
    max_attempts_per_contact: int = 3
    retry_interval_minutes: int = 30
    ring_timeout_seconds: int = 30
    wrap_up_seconds: int = 30
    call_list_id: Optional[str] = None
    script_id: Optional[str] = None
    caller_id: Optional[str] = None


class CampaignUpdateSchema(BaseSchema):
    """キャンペーン更新"""

    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    daily_start_time: Optional[time] = None
    daily_end_time: Optional[time] = None
    active_days: Optional[list[int]] = None
    predictive_ratio: Optional[Decimal] = None
    max_concurrent_calls: Optional[int] = None
    max_abandon_rate: Optional[Decimal] = None
    max_attempts_per_contact: Optional[int] = None
    retry_interval_minutes: Optional[int] = None
    ring_timeout_seconds: Optional[int] = None
    wrap_up_seconds: Optional[int] = None
    call_list_id: Optional[str] = None
    script_id: Optional[str] = None
    caller_id: Optional[str] = None


class CampaignResponseSchema(BaseSchema):
    """キャンペーンレスポンス"""

    campaign_id: str
    name: str
    description: Optional[str] = None
    status: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    daily_start_time: time
    daily_end_time: time
    active_days: Optional[list[int]] = None
    predictive_ratio: Decimal
    max_concurrent_calls: int
    max_abandon_rate: Decimal
    max_attempts_per_contact: int
    retry_interval_minutes: int
    ring_timeout_seconds: int
    wrap_up_seconds: int
    call_list_id: Optional[str] = None
    script_id: Optional[str] = None
    caller_id: Optional[str] = None
    total_contacts: int = 0
    completed_contacts: int = 0
    total_calls: int = 0
    total_answered: int = 0
    total_abandoned: int = 0
    created_at: datetime
    updated_at: datetime


class CampaignStatsSchema(BaseSchema):
    """キャンペーン統計"""

    campaign_id: str
    total_contacts: int
    completed_contacts: int
    total_calls: int
    total_answered: int
    total_abandoned: int
    answer_rate: float
    abandon_rate: float
    active_users: int
    active_calls: int
    predictive_ratio: Decimal


class CampaignContactAddSchema(BaseSchema):
    """キャンペーンに連絡先追加"""

    contact_ids: list[str]
    priority: int = 0
