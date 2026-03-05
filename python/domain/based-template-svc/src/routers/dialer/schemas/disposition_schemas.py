"""処理結果スキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class DispositionCreateSchema(BaseSchema):
    name: str
    disposition_type: str
    requires_callback: bool = False
    is_final: bool = False
    display_order: int = 0
    color_code: Optional[str] = None


class DispositionUpdateSchema(BaseSchema):
    name: Optional[str] = None
    disposition_type: Optional[str] = None
    requires_callback: Optional[bool] = None
    is_final: Optional[bool] = None
    display_order: Optional[int] = None
    color_code: Optional[str] = None


class DispositionResponseSchema(BaseSchema):
    disposition_id: str
    name: str
    disposition_type: str
    requires_callback: bool
    is_final: bool
    display_order: int
    color_code: Optional[str] = None
    created_at: datetime
