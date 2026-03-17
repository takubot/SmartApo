"""ユーザースキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class UserCreateSchema(BaseSchema):
    email: str
    password: str
    display_name: str
    extension: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: int = 1


class UserUpdateSchema(BaseSchema):
    display_name: Optional[str] = None
    extension: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: Optional[int] = None


class UserStatusUpdateSchema(BaseSchema):
    status: str


class UserResponseSchema(BaseSchema):
    user_id: str
    firebase_uid: str
    display_name: str
    extension: Optional[str] = None
    status: str
    status_changed_at: Optional[datetime] = None
    current_call_id: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: int
    created_at: datetime
    updated_at: datetime
