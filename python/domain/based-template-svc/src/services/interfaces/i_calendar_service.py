from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, List, Dict, Any

class ICalendarService(ABC):
    """
    カレンダー連携用サービスのインターフェース。
    """
    
    # --- OAuth2 Flow ---
    @abstractmethod
    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """
        認証URLを取得する。
        """
        pass

    @abstractmethod
    def fetch_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """
        認可コードからトークンを取得する。
        """
        pass

    @abstractmethod
    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        リフレッシュトークンを使用してアクセストークンを更新する。
        """
        pass

    # --- Event Management ---
    @abstractmethod
    def create_event(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        title: str,
        start_at: datetime,
        end_at: datetime,
        description: Optional[str] = None,
        color_hex: Optional[str] = None
    ) -> Optional[str]:
        """
        カレンダーにイベントを作成し、イベントIDを返す。
        """
        pass

    @abstractmethod
    def update_event(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        event_id: str,
        title: Optional[str] = None,
        start_at: Optional[datetime] = None,
        end_at: Optional[datetime] = None,
        description: Optional[str] = None,
        color_hex: Optional[str] = None
    ) -> bool:
        """
        既存のイベントを更新する。
        """
        pass

    @abstractmethod
    def delete_event(self, credentials_info: Dict[str, Any], calendar_id: str, event_id: str) -> bool:
        """
        イベントを削除する。
        """
        pass

    @abstractmethod
    def add_attendee(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        event_id: str,
        email: str,
        display_name: Optional[str] = None
    ) -> bool:
        """
        イベントに出席者を追加する。
        """
        pass

    # --- Sync & Webhook ---
    @abstractmethod
    def watch_events(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        webhook_url: str,
        channel_id: str
    ) -> Dict[str, Any]:
        """
        Webhook通知の購読を開始する。
        """
        pass

    @abstractmethod
    def stop_watch(
        self,
        credentials_info: Dict[str, Any],
        resource_id: str,
        channel_id: str
    ) -> bool:
        """
        Webhook通知の購読を停止する。
        """
        pass

    @abstractmethod
    def list_events_delta(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        sync_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        前回の同期からの差分イベントを取得する。
        """
        pass
