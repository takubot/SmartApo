"""通話制御ルーター"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import CallStatusEnum
from ...models.tables.model_defs import DialerCallLogModel, DialerUserModel
from ...services.implementations.di import get_telephony_service
from .schemas.call_log_schemas import CallLogResponseSchema
from .schemas.common_schemas import MessageResponse

router = APIRouter()


@router.post("/initiate", response_model=CallLogResponseSchema, status_code=201)
def initiate_call(
    contact_id: str,
    phone_number: str,
    caller_id: str | None = None,
    campaign_id: str | None = None,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """手動発信"""
    firebase_uid, tenant_id = auth

    if not caller_id:
        raise HTTPException(400, "発信者番号が指定されていません。")

    svc = get_telephony_service()
    result = svc.initiate_call(
        to=phone_number,
        from_=caller_id,
        voice_url="",
        status_callback_url="",
    )

    # ログインユーザーを自動解決して通話ログに紐付け
    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    log = DialerCallLogModel(
        tenant_id=tenant_id,
        campaign_id=campaign_id,
        contact_id=contact_id,
        user_id=user.user_id if user else None,
        phone_number_dialed=phone_number,
        caller_id_used=caller_id,
        call_uuid=result.get("call_sid"),
        call_status=CallStatusEnum.DIALING,
    )
    db.add(log)
    db.flush()
    return CallLogResponseSchema.model_validate(log)


@router.post("/{call_uuid}/hold", response_model=MessageResponse)
def hold_call(
    call_uuid: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """保留"""
    svc = get_telephony_service()
    svc.hold_call(call_uuid)
    return MessageResponse(message="保留にしました")


@router.post("/{call_uuid}/resume", response_model=MessageResponse)
def resume_call(
    call_uuid: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """保留解除"""
    svc = get_telephony_service()
    svc.resume_call(call_uuid)
    return MessageResponse(message="保留を解除しました")


@router.post("/{call_uuid}/transfer", response_model=MessageResponse)
def transfer_call(
    call_uuid: str,
    target: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """転送"""
    svc = get_telephony_service()
    svc.transfer_call(call_uuid, target)
    return MessageResponse(message=f"{target}に転送しました")


@router.post("/{call_uuid}/end", response_model=MessageResponse)
def end_call(
    call_uuid: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """通話終了"""
    svc = get_telephony_service()
    svc.end_call(call_uuid)

    log = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.call_uuid == call_uuid
        )
    ).scalar_one_or_none()
    if log:
        log.call_status = CallStatusEnum.COMPLETED
    return MessageResponse(message="通話を終了しました")


@router.post("/{call_uuid}/disposition", response_model=MessageResponse)
def set_disposition(
    call_uuid: str,
    disposition_id: str,
    notes: str | None = None,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """処理結果登録"""
    log = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.call_uuid == call_uuid
        )
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(404, "通話記録が見つかりません")
    log.disposition_id = disposition_id
    if notes:
        log.notes = notes
    return MessageResponse(message="処理結果を登録しました")


@router.get("/active", response_model=list[CallLogResponseSchema])
def active_calls(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """アクティブ通話一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.tenant_id == tenant_id,
            DialerCallLogModel.call_status.in_([
                CallStatusEnum.DIALING,
                CallStatusEnum.RINGING,
                CallStatusEnum.IN_PROGRESS,
            ]),
        )
    ).scalars().all()
    return [CallLogResponseSchema.model_validate(r) for r in rows]
