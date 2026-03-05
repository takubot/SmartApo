"""スクリプトスキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class ScriptCreateSchema(BaseSchema):
    name: str
    content: Optional[str] = None
    is_default: bool = False


class ScriptUpdateSchema(BaseSchema):
    name: Optional[str] = None
    content: Optional[str] = None
    is_default: Optional[bool] = None


class ScriptResponseSchema(BaseSchema):
    script_id: str
    name: str
    content: Optional[str] = None
    version: int
    is_default: bool
    created_at: datetime
    updated_at: datetime
