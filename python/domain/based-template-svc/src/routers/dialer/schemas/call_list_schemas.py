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
    spreadsheet_id: Optional[str] = None
    sheet_name: Optional[str] = None
    sheet_range: Optional[str] = None
    column_mapping: Optional[str] = None
    header_row: int = 1
    last_sheet_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CallListContactAddSchema(BaseSchema):
    contact_ids: list[str]


class SheetsImportRequestSchema(BaseSchema):
    """Google Sheetsからのインポートリクエスト"""
    spreadsheet_id: str
    sheet_name: Optional[str] = "Sheet1"
    range_name: Optional[str] = "A:Z"
    header_row: int = 1
    list_name: str
    list_description: Optional[str] = None
    column_mapping: Optional[dict[str, str]] = None


class SheetsImportResponseSchema(BaseSchema):
    """Google Sheetsインポート結果"""
    call_list_id: str
    name: str
    imported_count: int
    skipped_count: int
    message: str


class SheetsSyncResponseSchema(BaseSchema):
    """Google Sheets再同期結果"""
    added_count: int
    updated_count: int
    removed_count: int
    message: str


class SheetsPreviewRequestSchema(BaseSchema):
    """Google Sheetsプレビューリクエスト"""
    spreadsheet_id: str
    sheet_name: Optional[str] = "Sheet1"
    header_row: int = 1


class SheetsPreviewResponseSchema(BaseSchema):
    """Google Sheetsプレビュー結果"""
    headers: list[str]
    rows: list[dict[str, str]]
    total_rows: int
    raw_rows: list[list[str]] = []
    suggested_mapping: dict[str, str] = {}


class SpreadsheetItemSchema(BaseSchema):
    """スプレッドシート一覧アイテム"""
    spreadsheet_id: str
    name: str
    modified_time: Optional[str] = None


class SpreadsheetListSchema(BaseSchema):
    """スプレッドシート一覧"""
    items: list[SpreadsheetItemSchema]


class SheetTabSchema(BaseSchema):
    """シートタブ"""
    sheet_id: int
    title: str


class SheetTabListSchema(BaseSchema):
    """シートタブ一覧"""
    items: list[SheetTabSchema]


class CallListContactDetailSchema(BaseSchema):
    """コールリスト内コンタクト詳細"""

    contact_id: str
    last_name: str
    first_name: str
    phone_primary: str
    phone_secondary: Optional[str] = None
    phone_mobile: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    tele_status: str = "none"
    tele_note: Optional[str] = None
    total_calls: int = 0
    last_called_at: Optional[datetime] = None


class StartCallingRequestSchema(BaseSchema):
    """架電開始リクエスト"""

    caller_id: Optional[str] = None
    max_concurrent_calls: int = 1
    contact_ids: Optional[list[str]] = None


class StartCallingResponseSchema(BaseSchema):
    """架電開始レスポンス"""

    initiated_count: int
    message: str
    session_id: Optional[str] = None


# ── プレディクティブコール セッション ──────────────────────


class CallingSessionCallSchema(BaseSchema):
    """セッション内の個別通話"""

    call_log_id: str
    contact_id: str
    status: str
    phone_number: str
    contact_name: str = ""
    company_name: Optional[str] = None


class CallingSessionContactSchema(BaseSchema):
    """接続されたコンタクトのプロフィール"""

    contact_id: str
    last_name: str
    first_name: str
    phone_primary: str
    phone_secondary: Optional[str] = None
    phone_mobile: Optional[str] = None
    email: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None


class CallingSessionStatusSchema(BaseSchema):
    """セッションポーリングレスポンス"""

    session_id: str
    calls: list[CallingSessionCallSchema]
    connected_call_log_id: Optional[str] = None
    connected_contact: Optional[CallingSessionContactSchema] = None
    is_complete: bool


class CallResultRequestSchema(BaseSchema):
    """架電結果登録リクエスト"""

    tele_status: str
    tele_note: Optional[str] = None
    notes: Optional[str] = None
    disposition_id: Optional[str] = None
