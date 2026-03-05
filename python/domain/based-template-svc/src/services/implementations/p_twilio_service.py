"""Twilio SDK を用いたテレフォニーサービス実装"""

from __future__ import annotations

from logging import getLogger
from typing import Any, Optional

from twilio.rest import Client as TwilioClient

from ...common.env_config import get_settings
from ..interfaces.i_telephony_service import ITelephonyService

logger = getLogger(__name__)
settings = get_settings()


class PTwilioService(ITelephonyService):
    """Twilio REST API による発信・通話制御"""

    def __init__(
        self,
        account_sid: str | None = None,
        auth_token: str | None = None,
    ) -> None:
        self._account_sid = account_sid or settings.TWILIO_ACCOUNT_SID
        self._auth_token = auth_token or settings.TWILIO_AUTH_TOKEN
        self._client: TwilioClient | None = None

    @property
    def client(self) -> TwilioClient:
        if self._client is None:
            self._client = TwilioClient(self._account_sid, self._auth_token)
        return self._client

    # ── 発信 ─────────────────────────────────────────────────

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
        """発信を開始する"""
        call = self.client.calls.create(
            to=to,
            from_=from_,
            url=voice_url,
            status_callback=status_callback_url,
            status_callback_event=["initiated", "ringing", "answered", "completed"],
            timeout=ring_timeout,
            record=record,
            machine_detection=machine_detection,
        )
        logger.info("通話開始: sid=%s to=%s", call.sid, to)
        return {
            "call_sid": call.sid,
            "status": call.status,
            "direction": call.direction,
        }

    # ── 終了 ─────────────────────────────────────────────────

    def end_call(self, call_sid: str) -> bool:
        """通話を終了する"""
        call = self.client.calls(call_sid).update(status="completed")
        logger.info("通話終了: sid=%s", call_sid)
        return call.status == "completed"

    # ── 保留 ─────────────────────────────────────────────────

    def hold_call(self, call_sid: str, hold_music_url: Optional[str] = None) -> bool:
        """保留にする"""
        twiml = '<Response><Play loop="0">{}</Play></Response>'.format(
            hold_music_url or "http://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-B8075.mp3"
        )
        self.client.calls(call_sid).update(twiml=twiml)
        logger.info("通話保留: sid=%s", call_sid)
        return True

    def resume_call(self, call_sid: str) -> bool:
        """保留を解除する"""
        twiml = "<Response><Dial><Conference>call-{}</Conference></Dial></Response>".format(call_sid)
        self.client.calls(call_sid).update(twiml=twiml)
        logger.info("保留解除: sid=%s", call_sid)
        return True

    # ── 転送 ─────────────────────────────────────────────────

    def transfer_call(self, call_sid: str, target: str) -> dict[str, Any]:
        """通話を転送する"""
        twiml = '<Response><Dial>{}</Dial></Response>'.format(target)
        self.client.calls(call_sid).update(twiml=twiml)
        logger.info("通話転送: sid=%s → %s", call_sid, target)
        return {"call_sid": call_sid, "transferred_to": target}

    # ── ステータス / 録音 ────────────────────────────────────

    def get_call_status(self, call_sid: str) -> dict[str, Any]:
        """通話ステータスを取得する"""
        call = self.client.calls(call_sid).fetch()
        return {
            "call_sid": call.sid,
            "status": call.status,
            "duration": call.duration,
            "start_time": str(call.start_time) if call.start_time else None,
            "end_time": str(call.end_time) if call.end_time else None,
        }

    def get_recording(self, recording_sid: str) -> dict[str, Any]:
        """録音メタデータを取得する"""
        rec = self.client.recordings(recording_sid).fetch()
        return {
            "recording_sid": rec.sid,
            "duration": rec.duration,
            "url": f"https://api.twilio.com{rec.uri.replace('.json', '.mp3')}",
            "status": rec.status,
        }

    def delete_recording(self, recording_sid: str) -> bool:
        """録音を削除する"""
        self.client.recordings(recording_sid).delete()
        logger.info("録音削除: sid=%s", recording_sid)
        return True
