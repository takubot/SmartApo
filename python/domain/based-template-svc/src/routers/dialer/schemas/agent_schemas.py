"""エージェントスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class AgentCreateSchema(BaseSchema):
    display_name: str
    user_id: str
    extension: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: int = 1


class AgentUpdateSchema(BaseSchema):
    display_name: Optional[str] = None
    extension: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: Optional[int] = None


class AgentStatusUpdateSchema(BaseSchema):
    status: str


class AgentResponseSchema(BaseSchema):
    agent_id: str
    user_id: str
    display_name: str
    extension: Optional[str] = None
    status: str
    status_changed_at: Optional[datetime] = None
    current_call_id: Optional[str] = None
    skills: Optional[list[str]] = None
    max_concurrent_calls: int
    created_at: datetime
    updated_at: datetime
