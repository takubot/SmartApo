"""プレディクティブコール セッション管理（インメモリ）

複数同時発信の状態を追跡し、最初の応答検出・他通話の自動切断を制御する。
"""

from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

JST = timezone(timedelta(hours=9))


@dataclass
class CallEntry:
    """セッション内の個別通話"""

    call_log_id: str
    contact_id: str
    twilio_call_sid: str | None
    phone_number: str
    status: str = "dialing"


@dataclass
class CallingSession:
    """プレディクティブコール セッション"""

    session_id: str
    call_list_id: str
    tenant_id: str
    calls: dict[str, CallEntry]  # call_log_id -> CallEntry
    connected_call_log_id: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(JST))

    @property
    def is_terminal(self) -> bool:
        _terminal = {"completed", "busy", "no_answer", "failed", "canceled", "voicemail"}
        return all(c.status in _terminal for c in self.calls.values())


# ── モジュールレベル ストア ────────────────────────────────────

_lock = threading.Lock()
_sessions: dict[str, CallingSession] = {}
_sid_to_session: dict[str, str] = {}  # twilio_call_sid -> session_id


def create_session(
    call_list_id: str,
    tenant_id: str,
    calls: list[tuple[str, str, str | None, str]],
) -> CallingSession:
    """セッション作成。

    calls: list of (call_log_id, contact_id, twilio_call_sid, phone_number)
    """
    session_id = str(uuid.uuid4())
    entries: dict[str, CallEntry] = {}
    for call_log_id, contact_id, call_sid, phone in calls:
        entries[call_log_id] = CallEntry(
            call_log_id=call_log_id,
            contact_id=contact_id,
            twilio_call_sid=call_sid,
            phone_number=phone,
        )
    session = CallingSession(
        session_id=session_id,
        call_list_id=call_list_id,
        tenant_id=tenant_id,
        calls=entries,
    )
    with _lock:
        _sessions[session_id] = session
        for entry in entries.values():
            if entry.twilio_call_sid:
                _sid_to_session[entry.twilio_call_sid] = session_id
    return session


def get_session(session_id: str) -> CallingSession | None:
    with _lock:
        return _sessions.get(session_id)


def get_session_by_call_sid(call_sid: str) -> tuple[CallingSession | None, str | None]:
    """(session, call_log_id) を返す。"""
    with _lock:
        session_id = _sid_to_session.get(call_sid)
        if not session_id:
            return None, None
        session = _sessions.get(session_id)
        if not session:
            return None, None
        for entry in session.calls.values():
            if entry.twilio_call_sid == call_sid:
                return session, entry.call_log_id
        return None, None


def update_status(session_id: str, call_log_id: str, status: str) -> bool:
    """通話ステータス更新。最初の接続なら True を返す。"""
    with _lock:
        session = _sessions.get(session_id)
        if not session or call_log_id not in session.calls:
            return False
        session.calls[call_log_id].status = status
        if status in ("in_progress", "answered") and not session.connected_call_log_id:
            session.connected_call_log_id = call_log_id
            return True
        return False


def get_sids_to_cancel(session_id: str) -> list[str]:
    """接続済み以外のアクティブな通話の call_sid を返す。"""
    with _lock:
        session = _sessions.get(session_id)
        if not session or not session.connected_call_log_id:
            return []
        result = []
        for entry in session.calls.values():
            if entry.call_log_id == session.connected_call_log_id:
                continue
            if entry.status in ("dialing", "ringing"):
                if entry.twilio_call_sid:
                    result.append(entry.twilio_call_sid)
        return result


def mark_canceled(session_id: str, call_sids: list[str]) -> None:
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            return
        for entry in session.calls.values():
            if entry.twilio_call_sid in call_sids:
                entry.status = "canceled"


def remove_session(session_id: str) -> None:
    with _lock:
        session = _sessions.pop(session_id, None)
        if session:
            for entry in session.calls.values():
                if entry.twilio_call_sid:
                    _sid_to_session.pop(entry.twilio_call_sid, None)
