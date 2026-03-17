"""FreeSWITCH ESL (Event Socket Library) クライアント

Inbound ESL接続でFreeSWITCHにコマンドを送信し、
イベントをサブスクライブするための軽量クライアント。
"""

from __future__ import annotations

import socket
import threading
import uuid
from collections.abc import Callable
from logging import getLogger
from typing import Any

logger = getLogger(__name__)

_RECV_SIZE = 65536


class ESLEvent:
    """FreeSWITCHから受信したESLイベント"""

    def __init__(self, headers: dict[str, str], body: str = "") -> None:
        self.headers = headers
        self.body = body

    def get(self, key: str, default: str = "") -> str:
        return self.headers.get(key, default)

    @property
    def event_name(self) -> str:
        return self.headers.get("Event-Name", "")

    @property
    def unique_id(self) -> str:
        return self.headers.get("Unique-ID", "")

    @property
    def channel_call_uuid(self) -> str:
        return self.headers.get("Channel-Call-UUID", self.unique_id)

    def __repr__(self) -> str:
        return f"ESLEvent({self.event_name}, uuid={self.unique_id})"


class ESLClient:
    """FreeSWITCH Inbound ESL クライアント

    Usage:
        client = ESLClient("127.0.0.1", 8021, "ClueCon")
        client.connect()
        result = client.api("status")
        client.disconnect()
    """

    def __init__(self, host: str, port: int, password: str) -> None:
        self._host = host
        self._port = port
        self._password = password
        self._sock: socket.socket | None = None
        self._connected = False
        self._lock = threading.Lock()
        self._event_handlers: list[Callable[[ESLEvent], None]] = []
        self._listener_thread: threading.Thread | None = None
        self._stop_event = threading.Event()
        self._buffer = b""

    @property
    def connected(self) -> bool:
        return self._connected

    # ── 接続 / 切断 ────────────────────────────────────────────

    def connect(self) -> None:
        """FreeSWITCHに接続し認証する"""
        self._sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._sock.settimeout(10)
        self._sock.connect((self._host, self._port))
        self._buffer = b""

        # 認証リクエストを待つ
        event = self._recv_event()
        if event.get("Content-Type") != "auth/request":
            raise ConnectionError(
                f"予期しない応答: {event.get('Content-Type')}"
            )

        # 認証
        self._send(f"auth {self._password}")
        reply = self._recv_event()
        reply_text = reply.get("Reply-Text", "")
        if not reply_text.startswith("+OK"):
            raise ConnectionError(f"ESL認証失敗: {reply_text}")

        self._connected = True
        logger.info("FreeSWITCH ESL接続成功: %s:%d", self._host, self._port)

    def disconnect(self) -> None:
        """接続を閉じる"""
        self._stop_event.set()
        self._connected = False
        if self._sock:
            try:
                self._sock.close()
            except OSError:
                pass
            self._sock = None
        if self._listener_thread and self._listener_thread.is_alive():
            self._listener_thread.join(timeout=5)
        logger.info("FreeSWITCH ESL切断")

    # ── コマンド送信 ────────────────────────────────────────────

    def api(self, command: str) -> str:
        """同期APIコマンドを実行し結果を返す

        例: client.api("originate sofia/gateway/gw/09012345678 &bridge(user/1001)")
        """
        with self._lock:
            self._send(f"api {command}")
            event = self._recv_event()
            return event.body.strip()

    def bgapi(self, command: str, job_uuid: str | None = None) -> str:
        """非同期APIコマンドを実行しJob-UUIDを返す"""
        job_uuid = job_uuid or str(uuid.uuid4())
        with self._lock:
            self._send(f"bgapi {command}\nJob-UUID: {job_uuid}")
            event = self._recv_event()
            return event.get("Job-UUID", job_uuid)

    def sendmsg(self, uuid: str, command: str, args: str = "") -> str:
        """チャネル固有のコマンドを送信する"""
        msg = f"sendmsg {uuid}\n"
        msg += f"call-command: execute\n"
        msg += f"execute-app-name: {command}\n"
        if args:
            msg += f"execute-app-arg: {args}\n"
        with self._lock:
            self._send(msg)
            event = self._recv_event()
            return event.get("Reply-Text", "")

    # ── イベント購読 ──────────────────────────────────────────

    def subscribe_events(
        self,
        events: list[str],
        handler: Callable[[ESLEvent], None],
    ) -> None:
        """イベントを購読しバックグラウンドでリスンする

        events: ["CHANNEL_ANSWER", "CHANNEL_HANGUP_COMPLETE", ...]
        handler: イベントごとに呼ばれるコールバック
        """
        self._event_handlers.append(handler)
        event_list = " ".join(events)

        with self._lock:
            self._send(f"event plain {event_list}")
            self._recv_event()  # +OK が返る

        if not self._listener_thread or not self._listener_thread.is_alive():
            self._stop_event.clear()
            self._listener_thread = threading.Thread(
                target=self._event_loop, daemon=True, name="esl-event-loop"
            )
            self._listener_thread.start()

    def _event_loop(self) -> None:
        """バックグラウンドでイベントを受信しハンドラに配送する"""
        logger.info("ESLイベントループ開始")
        while not self._stop_event.is_set() and self._connected:
            try:
                if self._sock:
                    self._sock.settimeout(1)
                event = self._recv_event()
                if event.event_name:
                    for handler in self._event_handlers:
                        try:
                            handler(event)
                        except Exception:
                            logger.exception("ESLイベントハンドラでエラー")
            except socket.timeout:
                continue
            except (OSError, ConnectionError):
                if not self._stop_event.is_set():
                    logger.warning("ESL接続が切断されました")
                    self._connected = False
                break
        logger.info("ESLイベントループ終了")

    # ── 内部メソッド ──────────────────────────────────────────

    def _send(self, data: str) -> None:
        """ESLプロトコルでメッセージを送信する"""
        if not self._sock:
            raise ConnectionError("ESL未接続")
        self._sock.sendall((data + "\n\n").encode("utf-8"))

    def _recv_event(self) -> ESLEvent:
        """ESLプロトコルで1つのイベント/応答を受信する"""
        if not self._sock:
            raise ConnectionError("ESL未接続")

        # ヘッダ部を読み取る（空行まで）
        while b"\n\n" not in self._buffer:
            chunk = self._sock.recv(_RECV_SIZE)
            if not chunk:
                raise ConnectionError("ESL接続が閉じられました")
            self._buffer += chunk

        header_part, self._buffer = self._buffer.split(b"\n\n", 1)
        headers: dict[str, str] = {}
        for line in header_part.decode("utf-8", errors="replace").split("\n"):
            if ": " in line:
                k, v = line.split(": ", 1)
                headers[k] = v

        # Content-Lengthがあればボディを読む
        body = ""
        content_length = int(headers.get("Content-Length", "0"))
        if content_length > 0:
            while len(self._buffer) < content_length:
                chunk = self._sock.recv(_RECV_SIZE)
                if not chunk:
                    raise ConnectionError("ESL接続が閉じられました")
                self._buffer += chunk
            body_bytes = self._buffer[:content_length]
            self._buffer = self._buffer[content_length:]
            body = body_bytes.decode("utf-8", errors="replace")

        return ESLEvent(headers, body)


# ── シングルトン管理 ──────────────────────────────────────────

_client_lock = threading.Lock()
_global_client: ESLClient | None = None


def get_esl_client(host: str, port: int, password: str) -> ESLClient:
    """グローバルESLクライアントを取得（未接続なら接続）"""
    global _global_client
    with _client_lock:
        if _global_client is None or not _global_client.connected:
            _global_client = ESLClient(host, port, password)
            _global_client.connect()
        return _global_client


def shutdown_esl_client() -> None:
    """グローバルESLクライアントを切断"""
    global _global_client
    with _client_lock:
        if _global_client:
            _global_client.disconnect()
            _global_client = None
