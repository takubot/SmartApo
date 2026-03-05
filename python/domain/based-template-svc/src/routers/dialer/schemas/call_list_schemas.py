"""コールリストスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class CallListCreateSchema(BaseSchema):
    name: str
    description: Optional[str] = None


class CallListUpdateSchema(BaseSchema):
    name: Optional[str] = None
    description: Optional[str] = None


class CallListResponseSchema(BaseSchema):
    call_list_id: str
    name: str
    description: Optional[str] = None
    contact_count: int
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CallListContactAddSchema(BaseSchema):
    contact_ids: list[str]
