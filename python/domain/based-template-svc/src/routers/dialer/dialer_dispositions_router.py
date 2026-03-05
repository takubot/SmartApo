"""処理結果ルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerDispositionModel
from .schemas.disposition_schemas import (
    DispositionCreateSchema,
    DispositionResponseSchema,
    DispositionUpdateSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/", response_model=list[DispositionResponseSchema])
def list_dispositions(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    rows = db.execute(
        select(DialerDispositionModel).where(
            DialerDispositionModel.tenant_id == tenant_id,
            DialerDispositionModel.is_deleted.is_(False),
        ).order_by(DialerDispositionModel.display_order)
    ).scalars().all()
    return [DispositionResponseSchema.model_validate(r) for r in rows]


@router.post("/", response_model=DispositionResponseSchema, status_code=201)
def create_disposition(
    body: DispositionCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    disp = DialerDispositionModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(disp)
    db.flush()
    return DispositionResponseSchema.model_validate(disp)


@router.put("/{disposition_id}", response_model=DispositionResponseSchema)
def update_disposition(
    disposition_id: str,
    body: DispositionUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    disp = db.execute(
        select(DialerDispositionModel).where(
            DialerDispositionModel.disposition_id == disposition_id,
            DialerDispositionModel.tenant_id == tenant_id,
            DialerDispositionModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not disp:
        raise HTTPException(404, "処理結果が見つかりません")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(disp, key, val)
    db.flush()
    return DispositionResponseSchema.model_validate(disp)


@router.delete("/{disposition_id}", status_code=204)
def delete_disposition(
    disposition_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    disp = db.execute(
        select(DialerDispositionModel).where(
            DialerDispositionModel.disposition_id == disposition_id,
            DialerDispositionModel.tenant_id == tenant_id,
            DialerDispositionModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not disp:
        raise HTTPException(404, "処理結果が見つかりません")
    disp.is_deleted = True
    disp.deleted_at = datetime.now(JST)
