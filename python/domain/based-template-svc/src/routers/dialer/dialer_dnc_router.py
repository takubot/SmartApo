"""DNCルーター"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerDncModel
from .schemas.common_schemas import BulkOperationResult, MessageResponse
from .schemas.dnc_schemas import (
    DncBulkCreateSchema,
    DncCheckResponseSchema,
    DncCreateSchema,
    DncResponseSchema,
)

router = APIRouter()


@router.get("", response_model=list[DncResponseSchema])
def list_dnc(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """DNCリスト一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerDncModel).where(DialerDncModel.tenant_id == tenant_id)
    ).scalars().all()
    return [DncResponseSchema.model_validate(r) for r in rows]


@router.post("", response_model=DncResponseSchema, status_code=201)
def add_dnc(
    body: DncCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """DNC追加"""
    user_id, tenant_id = auth
    existing = db.execute(
        select(DialerDncModel).where(
            DialerDncModel.tenant_id == tenant_id,
            DialerDncModel.phone_number == body.phone_number,
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(409, "既にDNCリストに登録されています")

    dnc = DialerDncModel(
        tenant_id=tenant_id,
        phone_number=body.phone_number,
        reason=body.reason,
        added_by=user_id,
        expires_at=body.expires_at,
    )
    db.add(dnc)
    db.flush()
    return DncResponseSchema.model_validate(dnc)


@router.post("/bulk", response_model=BulkOperationResult)
def bulk_add_dnc(
    body: DncBulkCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """DNC一括追加"""
    user_id, tenant_id = auth
    success = 0
    errors: list[str] = []
    for phone in body.phone_numbers:
        existing = db.execute(
            select(DialerDncModel).where(
                DialerDncModel.tenant_id == tenant_id,
                DialerDncModel.phone_number == phone,
            )
        ).scalar_one_or_none()
        if existing:
            errors.append(f"{phone}: 既に登録済み")
            continue
        db.add(DialerDncModel(
            tenant_id=tenant_id,
            phone_number=phone,
            reason=body.reason,
            added_by=user_id,
        ))
        success += 1
    db.flush()
    return BulkOperationResult(
        success_count=success,
        error_count=len(errors),
        errors=errors,
    )


@router.delete("/{dnc_id}", status_code=204)
def delete_dnc(
    dnc_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """DNC削除"""
    _, tenant_id = auth
    dnc = db.execute(
        select(DialerDncModel).where(
            DialerDncModel.dnc_id == dnc_id,
            DialerDncModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()
    if not dnc:
        raise HTTPException(404, "DNCレコードが見つかりません")
    db.delete(dnc)


@router.get("/check/{phone_number}", response_model=DncCheckResponseSchema)
def check_dnc(
    phone_number: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """番号がDNCか確認"""
    _, tenant_id = auth
    existing = db.execute(
        select(DialerDncModel).where(
            DialerDncModel.tenant_id == tenant_id,
            DialerDncModel.phone_number == phone_number,
        )
    ).scalar_one_or_none()
    return DncCheckResponseSchema(phone_number=phone_number, is_dnc=existing is not None)
