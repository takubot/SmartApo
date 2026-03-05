from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional


class IContactSyncService(ABC):
    """連絡先同期サービスのインターフェース（Google Contacts等）"""

    @abstractmethod
    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """OAuth認証URLを取得する"""
        ...

    @abstractmethod
    def exchange_code(self, code: str, redirect_uri: str) -> dict[str, Any]:
        """認可コードをトークンに交換する"""
        ...

    @abstractmethod
    def import_contacts(
        self, access_token: str, refresh_token: str
    ) -> list[dict[str, Any]]:
        """連絡先を一括インポートする"""
        ...

    @abstractmethod
    def sync_contacts(
        self, access_token: str, refresh_token: str, sync_token: Optional[str] = None
    ) -> dict[str, Any]:
        """差分同期を実行する。{contacts, next_sync_token}を返す"""
        ...
