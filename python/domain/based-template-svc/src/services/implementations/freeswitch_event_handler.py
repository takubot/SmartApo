"""FreeSWITCH ESLイベントハンドラ

ESLイベントを購読し、通話ステータスのDB更新やセッション連携をイベント駆動で行う。
FastAPIのlifespanで起動し、バックグラウンドスレッドで動作する。
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timedelta, timezone
from logging import getLogger

from sqlalchemy import select

from ...database_utils.database import SyncSessionLocal
from ...models.tables.enum import CallStatusEnum
from ...models.tables.model_defs import DialerCallLogModel
from ...routers.dialer.calling_session import (
    get_session_by_call_sid,
    get_sids_to_cancel,
    mark_canceled,
    update_status,
)
from .esl_client import ESLClient, ESLEvent, get_esl_client, shutdown_esl_client

logger = getLogger(__name__)
JST = timezone(timedelta(hours=9))

# FreeSWITCH イベント → CallStatusEnum のマッピング
_FS_EVENT_STATUS_MAP: dict[str, CallStatusEnum] = {
    "CHANNEL_PROGRESS": CallStatusEnum.RINGING,
    "CHANNEL_PROGRESS_MEDIA": CallStatusEnum.RINGING,
    "CHANNEL_ANSWER": CallStatusEnum.IN_PROGRESS,
    "CHANNEL_HANGUP_COMPLETE": CallStatusEnum.COMPLETED,
}

# FreeSWITCH hangup cause → CallStatusEnum
_HANGUP_CAUSE_MAP: dict[str, CallStatusEnum] = {
    "NORMAL_CLEARING": CallStatusEnum.COMPLETED,
    "USER_BUSY": CallStatusEnum.BUSY,
    "NO_ANSWER": CallStatusEnum.NO_ANSWER,
    "NO_USER_RESPONSE": CallStatusEnum.NO_ANSWER,
    "ORIGINATOR_CANCEL": CallStatusEnum.CANCELED,
    "CALL_REJECTED": CallStatusEnum.FAILED,
    "NORMAL_TEMPORARY_FAILURE": CallStatusEnum.FAILED,
    "UNALLOCATED_NUMBER": CallStatusEnum.FAILED,
    "RECOVERY_ON_TIMER_EXPIRE": CallStatusEnum.NO_ANSWER,
    "DESTINATION_OUT_OF_ORDER": CallStatusEnum.FAILED,
    "SUBSCRIBER_ABSENT": CallStatusEnum.NO_ANSWER,
}

# 購読するFreeSWITCHイベント
_SUBSCRIBE_EVENTS = [
    "CHANNEL_CREATE",
    "CHANNEL_PROGRESS",
    "CHANNEL_PROGRESS_MEDIA",
    "CHANNEL_ANSWER",
    "CHANNEL_BRIDGE",
    "CHANNEL_UNBRIDGE",
    "CHANNEL_HANGUP",
    "CHANNEL_HANGUP_COMPLETE",
    "RECORD_STOP",
]


def _handle_event(event: ESLEvent) -> None:
    """個別のESLイベントを処理する"""
    event_name = event.event_name
    call_uuid = event.channel_call_uuid or event.unique_id

    if not call_uuid:
        return

    # Outbound (API originate) のチャネルのみ処理
    direction = event.get("Call-Direction", "")
    if direction not in ("outbound", ""):
        # inbound = WebRTCオペレーター側のレッグ → 無視
        return

    logger.debug("ESLイベント: %s uuid=%s", event_name, call_uuid)

    if event_name == "CHANNEL_PROGRESS" or event_name == "CHANNEL_PROGRESS_MEDIA":
        _update_call_status(call_uuid, CallStatusEnum.RINGING)

    elif event_name == "CHANNEL_ANSWER":
        _update_call_status(call_uuid, CallStatusEnum.IN_PROGRESS, answered=True)

    elif event_name == "CHANNEL_HANGUP_COMPLETE":
        hangup_cause = event.get("Hangup-Cause", "NORMAL_CLEARING")
        duration = event.get("variable_billsec", "0")
        mapped = _HANGUP_CAUSE_MAP.get(hangup_cause, CallStatusEnum.COMPLETED)
        _update_call_status(
            call_uuid, mapped, ended=True, duration=int(duration or 0)
        )

    elif event_name == "RECORD_STOP":
        rec_path = event.get("Record-File-Path", "")
        duration = event.get("variable_record_seconds", "0")
        _update_recording(call_uuid, rec_path, int(duration or 0))


def _update_call_status(
    call_uuid: str,
    status: CallStatusEnum,
    answered: bool = False,
    ended: bool = False,
    duration: int = 0,
) -> None:
    """通話ステータスをDBに反映する"""
    now = datetime.now(JST)

    try:
        with SyncSessionLocal() as db:
            log = db.execute(
                select(DialerCallLogModel).where(
                    DialerCallLogModel.call_uuid == call_uuid
                )
            ).scalar_one_or_none()

            if log:
                log.call_status = status
                if answered:
                    log.answered_at = now
                if ended:
                    log.ended_at = now
                    log.duration_seconds = duration
                db.commit()
                logger.info(
                    "通話ステータス更新: uuid=%s status=%s", call_uuid, status.value
                )
    except Exception:
        logger.exception("通話ステータスDB更新失敗: uuid=%s", call_uuid)

    # ── セッション連携（プレディクティブ用）──
    try:
        session, call_log_id = get_session_by_call_sid(call_uuid)
        if session and call_log_id:
            is_first_connect = update_status(
                session.session_id, call_log_id, status.value
            )
            if is_first_connect:
                sids_to_cancel = get_sids_to_cancel(session.session_id)
                if sids_to_cancel:
                    from .p_freeswitch_service import PFreeSwitchService

                    svc = PFreeSwitchService()
                    for sid in sids_to_cancel:
                        try:
                            svc.end_call(sid)
                            logger.info("自動キャンセル: %s", sid)
                        except Exception:
                            logger.exception("自動キャンセル失敗: %s", sid)
                    mark_canceled(session.session_id, sids_to_cancel)
    except Exception:
        logger.exception("セッション連携失敗: uuid=%s", call_uuid)


def _update_recording(call_uuid: str, rec_path: str, duration: int) -> None:
    """録音情報をDBに反映する"""
    try:
        with SyncSessionLocal() as db:
            log = db.execute(
                select(DialerCallLogModel).where(
                    DialerCallLogModel.call_uuid == call_uuid
                )
            ).scalar_one_or_none()

            if log:
                log.recording_sid = call_uuid  # FS UUID = recording ID
                log.recording_url = rec_path
                log.recording_duration_seconds = duration
                db.commit()
                logger.info("録音情報更新: uuid=%s path=%s", call_uuid, rec_path)
    except Exception:
        logger.exception("録音情報DB更新失敗: uuid=%s", call_uuid)


# ── ライフサイクル管理 ────────────────────────────────────────


_handler_thread: threading.Thread | None = None
_stop_flag = threading.Event()

# リトライ設定
_RETRY_INITIAL_INTERVAL = 5  # 初回リトライ間隔(秒)
_RETRY_MAX_INTERVAL = 60  # 最大リトライ間隔(秒)
_RETRY_MAX_ATTEMPTS = 3  # 最大リトライ回数


def start_event_handler(
    esl_host: str, esl_port: int, esl_password: str
) -> None:
    """ESLイベントハンドラをバックグラウンドで開始する

    FastAPIのlifespanから呼び出す。
    FreeSWITCHが未起動でもアプリ起動をブロックしない。
    最大3回リトライし、接続できなければ諦めてログを出す。
    """
    global _handler_thread
    _stop_flag.clear()

    def _run() -> None:
        interval = _RETRY_INITIAL_INTERVAL
        attempts = 0
        while not _stop_flag.is_set() and attempts < _RETRY_MAX_ATTEMPTS:
            attempts += 1
            try:
                client = get_esl_client(esl_host, esl_port, esl_password)
                client.subscribe_events(_SUBSCRIBE_EVENTS, _handle_event)
                logger.info(
                    "FreeSWITCH ESLイベントハンドラ開始: %s:%d", esl_host, esl_port
                )
                return
            except ConnectionRefusedError:
                if attempts < _RETRY_MAX_ATTEMPTS:
                    logger.warning(
                        "FreeSWITCH ESL接続失敗 (%s:%d) - %d秒後にリトライします (%d/%d)",
                        esl_host, esl_port, interval, attempts, _RETRY_MAX_ATTEMPTS,
                    )
                else:
                    logger.warning(
                        "FreeSWITCH ESL接続失敗 (%s:%d) - 最大リトライ回数に到達。"
                        "FreeSWITCHが起動したら電話設定ページから手動で接続テストしてください。",
                        esl_host, esl_port,
                    )
                    return
            except Exception:
                logger.warning(
                    "FreeSWITCH ESL接続エラー (%s:%d) - リトライ (%d/%d)",
                    esl_host, esl_port, attempts, _RETRY_MAX_ATTEMPTS,
                    exc_info=True,
                )
                if attempts >= _RETRY_MAX_ATTEMPTS:
                    return

            _stop_flag.wait(timeout=interval)
            interval = min(interval * 2, _RETRY_MAX_INTERVAL)

    _handler_thread = threading.Thread(
        target=_run, daemon=True, name="freeswitch-event-handler"
    )
    _handler_thread.start()


def stop_event_handler() -> None:
    """ESLイベントハンドラを停止する"""
    _stop_flag.set()
    shutdown_esl_client()
    logger.info("FreeSWITCH ESLイベントハンドラ停止")
