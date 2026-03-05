"""共通スキーマ定義"""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

from ....common.schemas.base_schema import BaseSchema

T = TypeVar("T")


class PaginatedResponse(BaseModel):
    """ページネーション付きレスポンス"""

    items: list[Any]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
    total_pages: int = Field(alias="totalPages")

    model_config = {"populate_by_name": True}


class MessageResponse(BaseSchema):
    """汎用メッセージレスポンス"""

    message: str


class BulkOperationResult(BaseSchema):
    """一括操作結果"""

    success_count: int
    error_count: int
    errors: list[str] = []
