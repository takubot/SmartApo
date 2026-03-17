"""コールバックスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class CallbackCreateSchema(BaseSchema):
    contact_id: str
    campaign_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    scheduled_at: datetime
    priority: str = "medium"
    notes: Optional[str] = None


class CallbackUpdateSchema(BaseSchema):
    assigned_user_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    priority: Optional[str] = None
    notes: Optional[str] = None


class CallbackResponseSchema(BaseSchema):
    callback_id: str
    contact_id: str
    campaign_id: Optional[str] = None
    assigned_user_id: Optional[str] = None
    scheduled_at: datetime
    priority: str
    notes: Optional[str] = None
    is_completed: bool
    completed_at: Optional[datetime] = None
    google_calendar_event_id: Optional[str] = None
    created_at: datetime
