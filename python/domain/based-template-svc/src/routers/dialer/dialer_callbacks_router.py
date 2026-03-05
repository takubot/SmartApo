"""コールバックルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerCallbackModel
from .schemas.callback_schemas import CallbackCreateSchema, CallbackResponseSchema, CallbackUpdateSchema
from .schemas.common_schemas import MessageResponse

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/", response_model=list[CallbackResponseSchema])
def list_callbacks(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    rows = db.execute(
        select(DialerCallbackModel).where(
            DialerCallbackModel.tenant_id == tenant_id,
            DialerCallbackModel.is_deleted.is_(False),
        ).order_by(DialerCallbackModel.scheduled_at)
    ).scalars().all()
    return [CallbackResponseSchema.model_validate(r) for r in rows]


@router.post("/", response_model=CallbackResponseSchema, status_code=201)
def create_callback(
    body: CallbackCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cb = DialerCallbackModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(cb)
    db.flush()
    return CallbackResponseSchema.model_validate(cb)


@router.put("/{callback_id}", response_model=CallbackResponseSchema)
def update_callback(
    callback_id: str,
    body: CallbackUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cb = db.execute(
        select(DialerCallbackModel).where(
            DialerCallbackModel.callback_id == callback_id,
            DialerCallbackModel.tenant_id == tenant_id,
            DialerCallbackModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not cb:
        raise HTTPException(404, "コールバックが見つかりません")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(cb, key, val)
    db.flush()
    return CallbackResponseSchema.model_validate(cb)


@router.delete("/{callback_id}", status_code=204)
def delete_callback(
    callback_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cb = db.execute(
        select(DialerCallbackModel).where(
            DialerCallbackModel.callback_id == callback_id,
            DialerCallbackModel.tenant_id == tenant_id,
            DialerCallbackModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not cb:
        raise HTTPException(404, "コールバックが見つかりません")
    cb.is_deleted = True
    cb.deleted_at = datetime.now(JST)


@router.post("/{callback_id}/complete", response_model=MessageResponse)
def complete_callback(
    callback_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cb = db.execute(
        select(DialerCallbackModel).where(
            DialerCallbackModel.callback_id == callback_id,
            DialerCallbackModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()
    if not cb:
        raise HTTPException(404, "コールバックが見つかりません")
    cb.is_completed = True
    cb.completed_at = datetime.now(JST)
    return MessageResponse(message="コールバックを完了にしました")


@router.get("/today", response_model=list[CallbackResponseSchema])
def today_callbacks(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    now = datetime.now(JST)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    rows = db.execute(
        select(DialerCallbackModel).where(
            DialerCallbackModel.tenant_id == tenant_id,
            DialerCallbackModel.scheduled_at >= start_of_day,
            DialerCallbackModel.scheduled_at < end_of_day,
            DialerCallbackModel.is_deleted.is_(False),
        ).order_by(DialerCallbackModel.scheduled_at)
    ).scalars().all()
    return [CallbackResponseSchema.model_validate(r) for r in rows]
