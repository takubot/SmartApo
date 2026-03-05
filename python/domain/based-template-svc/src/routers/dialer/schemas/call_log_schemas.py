"""通話ログスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class CallLogResponseSchema(BaseSchema):
    call_log_id: str
    campaign_id: Optional[str] = None
    contact_id: str
    agent_id: Optional[str] = None
    disposition_id: Optional[str] = None
    twilio_call_sid: Optional[str] = None
    phone_number_dialed: str
    caller_id_used: Optional[str] = None
    call_status: str
    initiated_at: Optional[datetime] = None
    answered_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    ring_duration_seconds: int = 0
    recording_url: Optional[str] = None
    recording_duration_seconds: int = 0
    notes: Optional[str] = None
    is_abandoned: bool = False
    created_at: datetime
