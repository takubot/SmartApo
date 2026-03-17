from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional


class ITelephonyService(ABC):
    """テレフォニー（電話発信）サービスのインターフェース"""

    @abstractmethod
    def initiate_call(
        self,
        to: str,
        from_: str,
        voice_url: str,
        status_callback_url: str,
        ring_timeout: int = 30,
        record: bool = True,
        machine_detection: str = "Enable",
    ) -> dict[str, Any]:
        """発信を開始し call_uuid 等を返す"""
        ...

    @abstractmethod
    def end_call(self, call_sid: str) -> bool:
        """通話を終了する"""
        ...

    @abstractmethod
    def hold_call(self, call_sid: str, hold_music_url: Optional[str] = None) -> bool:
        """通話を保留にする"""
        ...

    @abstractmethod
    def resume_call(self, call_sid: str) -> bool:
        """保留を解除する"""
        ...

    @abstractmethod
    def transfer_call(self, call_sid: str, target: str) -> dict[str, Any]:
        """通話を転送する"""
        ...

    @abstractmethod
    def get_call_status(self, call_sid: str) -> dict[str, Any]:
        """通話のステータスを取得する"""
        ...

    @abstractmethod
    def get_recording(self, recording_sid: str) -> dict[str, Any]:
        """録音メタデータを取得する"""
        ...

    @abstractmethod
    def delete_recording(self, recording_sid: str) -> bool:
        """録音を削除する"""
        ...
