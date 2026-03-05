"""コールリストルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerCallListContactModel, DialerCallListModel
from .schemas.call_list_schemas import (
    CallListContactAddSchema,
    CallListCreateSchema,
    CallListResponseSchema,
    CallListUpdateSchema,
)
from .schemas.common_schemas import MessageResponse

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/", response_model=list[CallListResponseSchema])
def list_call_lists(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    rows = db.execute(
        select(DialerCallListModel).where(
            DialerCallListModel.tenant_id == tenant_id,
            DialerCallListModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [CallListResponseSchema.model_validate(r) for r in rows]


@router.post("/", response_model=CallListResponseSchema, status_code=201)
def create_call_list(
    body: CallListCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = DialerCallListModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(cl)
    db.flush()
    return CallListResponseSchema.model_validate(cl)


@router.get("/{call_list_id}", response_model=CallListResponseSchema)
def get_call_list(
    call_list_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    return CallListResponseSchema.model_validate(cl)


@router.put("/{call_list_id}", response_model=CallListResponseSchema)
def update_call_list(
    call_list_id: str,
    body: CallListUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(cl, key, val)
    db.flush()
    return CallListResponseSchema.model_validate(cl)


@router.delete("/{call_list_id}", status_code=204)
def delete_call_list(
    call_list_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    cl.is_deleted = True
    cl.deleted_at = datetime.now(JST)


@router.post("/{call_list_id}/contacts", response_model=MessageResponse, status_code=201)
def add_contacts(
    call_list_id: str,
    body: CallListContactAddSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    count = 0
    for cid in body.contact_ids:
        existing = db.execute(
            select(DialerCallListContactModel).where(
                DialerCallListContactModel.call_list_id == call_list_id,
                DialerCallListContactModel.contact_id == cid,
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(DialerCallListContactModel(call_list_id=call_list_id, contact_id=cid))
            count += 1
    cl.contact_count += count
    db.flush()
    return MessageResponse(message=f"{count}件追加しました")


@router.delete("/{call_list_id}/contacts/{contact_id}", status_code=204)
def remove_contact(
    call_list_id: str,
    contact_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    rec = db.execute(
        select(DialerCallListContactModel).where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerCallListContactModel.contact_id == contact_id,
        )
    ).scalar_one_or_none()
    if rec:
        db.delete(rec)
        cl.contact_count = max(0, cl.contact_count - 1)


def _get_call_list(call_list_id: str, tenant_id: str, db: Session) -> DialerCallListModel:
    cl = db.execute(
        select(DialerCallListModel).where(
            DialerCallListModel.call_list_id == call_list_id,
            DialerCallListModel.tenant_id == tenant_id,
            DialerCallListModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not cl:
        raise HTTPException(404, "コールリストが見つかりません")
    return cl
