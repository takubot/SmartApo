"""Twilio Webhookルーター（Firebase認証なし、Twilio署名検証）"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from logging import getLogger

from fastapi import APIRouter, Form, Request, Response
from sqlalchemy import select

from ...database_utils.database import SyncSessionLocal
from ...models.tables.enum import CallStatusEnum
from ...models.tables.model_defs import DialerCallLogModel
from ...services.implementations.di import get_telephony_service
from .calling_session import (
    get_session_by_call_sid,
    get_sids_to_cancel,
    mark_canceled,
    update_status,
)

router = APIRouter()
logger = getLogger(__name__)
JST = timezone(timedelta(hours=9))


@router.post("/voice")
async def voice_webhook(request: Request):
    """着信/発信時のTwiML応答"""
    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="ja-JP">お電話ありがとうございます。エージェントにお繋ぎします。</Say>
  <Dial>
    <Queue>dialer-queue</Queue>
  </Dial>
</Response>"""
    return Response(content=twiml, media_type="application/xml")


@router.post("/status")
async def status_webhook(
    CallSid: str = Form(""),
    CallStatus: str = Form(""),
    CallDuration: str = Form("0"),
    Timestamp: str = Form(""),
):
    """通話ステータスコールバック"""
    logger.info("Twilio Status: sid=%s status=%s", CallSid, CallStatus)

    status_map = {
        "initiated": CallStatusEnum.DIALING,
        "ringing": CallStatusEnum.RINGING,
        "in-progress": CallStatusEnum.IN_PROGRESS,
        "completed": CallStatusEnum.COMPLETED,
        "busy": CallStatusEnum.BUSY,
        "no-answer": CallStatusEnum.NO_ANSWER,
        "failed": CallStatusEnum.FAILED,
        "canceled": CallStatusEnum.CANCELED,
    }
    mapped_status = status_map.get(CallStatus, CallStatusEnum.FAILED)
    now = datetime.now(JST)

    # DB 更新
    with SyncSessionLocal() as db:
        log = db.execute(
            select(DialerCallLogModel).where(
                DialerCallLogModel.twilio_call_sid == CallSid
            )
        ).scalar_one_or_none()

        if log:
            log.call_status = mapped_status
            if CallStatus == "in-progress":
                log.answered_at = now
            elif CallStatus in ("completed", "busy", "no-answer", "failed", "canceled"):
                log.ended_at = now
                log.duration_seconds = int(CallDuration)
            db.commit()

    # ── セッション連携 ─────────────────────────────────────
    session, call_log_id = get_session_by_call_sid(CallSid)
    if session and call_log_id:
        is_first_connect = update_status(
            session.session_id, call_log_id, mapped_status.value
        )
        if is_first_connect:
            # 最初の応答 → 他の通話を自動切断
            sids_to_cancel = get_sids_to_cancel(session.session_id)
            if sids_to_cancel:
                svc = get_telephony_service()
                for sid in sids_to_cancel:
                    try:
                        svc.end_call(sid)
                        logger.info("Auto-canceled call: %s", sid)
                    except Exception:
                        logger.exception("Failed to auto-cancel call: %s", sid)
                mark_canceled(session.session_id, sids_to_cancel)

    return Response(content="<Response/>", media_type="application/xml")


@router.post("/recording")
async def recording_webhook(
    CallSid: str = Form(""),
    RecordingSid: str = Form(""),
    RecordingUrl: str = Form(""),
    RecordingDuration: str = Form("0"),
):
    """録音完了コールバック"""
    logger.info("Twilio Recording: call=%s rec=%s", CallSid, RecordingSid)

    with SyncSessionLocal() as db:
        log = db.execute(
            select(DialerCallLogModel).where(
                DialerCallLogModel.twilio_call_sid == CallSid
            )
        ).scalar_one_or_none()

        if log:
            log.recording_sid = RecordingSid
            log.recording_url = RecordingUrl
            log.recording_duration_seconds = int(RecordingDuration)
            db.commit()

    return Response(content="<Response/>", media_type="application/xml")


@router.post("/fallback")
async def fallback_webhook(request: Request):
    """エラーフォールバック"""
    form = await request.form()
    logger.error("Twilio Fallback: %s", dict(form))
    return Response(content="<Response/>", media_type="application/xml")
