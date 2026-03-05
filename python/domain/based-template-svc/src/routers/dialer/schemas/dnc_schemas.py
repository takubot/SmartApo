"""DNCスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class DncCreateSchema(BaseSchema):
    phone_number: str
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None


class DncBulkCreateSchema(BaseSchema):
    phone_numbers: list[str]
    reason: Optional[str] = None


class DncResponseSchema(BaseSchema):
    dnc_id: str
    phone_number: str
    reason: Optional[str] = None
    added_by: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime


class DncCheckResponseSchema(BaseSchema):
    phone_number: str
    is_dnc: bool
