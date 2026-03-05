from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional


class ISheetsService(ABC):
    """Google Sheetsサービスのインターフェース"""

    @abstractmethod
    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """OAuth認証URLを取得する"""
        ...

    @abstractmethod
    def exchange_code(self, code: str, redirect_uri: str) -> dict[str, Any]:
        """認可コードをトークンに交換する"""
        ...

    @abstractmethod
    def import_from_sheet(
        self,
        access_token: str,
        refresh_token: str,
        spreadsheet_id: str,
        range_name: str,
    ) -> list[dict[str, Any]]:
        """スプレッドシートからデータをインポートする"""
        ...

    @abstractmethod
    def export_to_sheet(
        self,
        access_token: str,
        refresh_token: str,
        spreadsheet_id: str,
        range_name: str,
        data: list[list[Any]],
    ) -> bool:
        """スプレッドシートにデータをエクスポートする"""
        ...

    @abstractmethod
    def create_report_sheet(
        self,
        access_token: str,
        refresh_token: str,
        title: str,
        headers: list[str],
        rows: list[list[Any]],
    ) -> str:
        """レポート用スプレッドシートを新規作成し、IDを返す"""
        ...
