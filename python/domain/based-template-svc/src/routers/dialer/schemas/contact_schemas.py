"""連絡先スキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class ContactCreateSchema(BaseSchema):
    """連絡先作成"""

    last_name: str
    first_name: str
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    phone_mobile: Optional[str] = None
    email: Optional[str] = None
    postal_code: Optional[str] = None
    prefecture: Optional[str] = None
    city: Optional[str] = None
    address_line: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class ContactUpdateSchema(BaseSchema):
    """連絡先更新"""

    last_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone_primary: Optional[str] = None
    phone_secondary: Optional[str] = None
    phone_mobile: Optional[str] = None
    email: Optional[str] = None
    postal_code: Optional[str] = None
    prefecture: Optional[str] = None
    city: Optional[str] = None
    address_line: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    status: Optional[str] = None


class ContactResponseSchema(BaseSchema):
    """連絡先レスポンス"""

    contact_id: str
    last_name: str
    first_name: str
    last_name_kana: Optional[str] = None
    first_name_kana: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    phone_primary: str
    phone_secondary: Optional[str] = None
    phone_mobile: Optional[str] = None
    email: Optional[str] = None
    postal_code: Optional[str] = None
    prefecture: Optional[str] = None
    city: Optional[str] = None
    address_line: Optional[str] = None
    status: str
    notes: Optional[str] = None
    tags: Optional[list[str]] = None
    total_calls: int = 0
    last_called_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ContactSearchSchema(BaseSchema):
    """連絡先検索"""

    keyword: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None
