"""連絡先ルーター"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timedelta, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import ContactStatusEnum
from ...models.tables.model_defs import DialerContactModel
from .schemas.common_schemas import MessageResponse, PaginatedResponse
from .schemas.contact_schemas import (
    ContactCreateSchema,
    ContactResponseSchema,
    ContactSearchSchema,
    ContactUpdateSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/", response_model=PaginatedResponse)
def list_contacts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先一覧取得"""
    _, tenant_id = auth
    q = select(DialerContactModel).where(
        DialerContactModel.tenant_id == tenant_id,
        DialerContactModel.is_deleted.is_(False),
    )
    count_q = select(func.count()).select_from(DialerContactModel).where(
        DialerContactModel.tenant_id == tenant_id,
        DialerContactModel.is_deleted.is_(False),
    )

    if status:
        q = q.where(DialerContactModel.status == status)
        count_q = count_q.where(DialerContactModel.status == status)
    if search:
        like = f"%{search}%"
        cond = or_(
            DialerContactModel.last_name.like(like),
            DialerContactModel.first_name.like(like),
            DialerContactModel.company_name.like(like),
            DialerContactModel.phone_primary.like(like),
        )
        q = q.where(cond)
        count_q = count_q.where(cond)

    total = db.execute(count_q).scalar() or 0
    rows = db.execute(
        q.order_by(DialerContactModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return PaginatedResponse(
        items=[ContactResponseSchema.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.post("/", response_model=ContactResponseSchema, status_code=201)
def create_contact(
    body: ContactCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先作成"""
    _, tenant_id = auth
    contact = DialerContactModel(
        tenant_id=tenant_id,
        **body.model_dump(exclude_none=True),
    )
    db.add(contact)
    db.flush()
    return ContactResponseSchema.model_validate(contact)


@router.get("/{contact_id}", response_model=ContactResponseSchema)
def get_contact(
    contact_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先詳細取得"""
    _, tenant_id = auth
    contact = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id == contact_id,
            DialerContactModel.tenant_id == tenant_id,
            DialerContactModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "連絡先が見つかりません")
    return ContactResponseSchema.model_validate(contact)


@router.put("/{contact_id}", response_model=ContactResponseSchema)
def update_contact(
    contact_id: str,
    body: ContactUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先更新"""
    _, tenant_id = auth
    contact = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id == contact_id,
            DialerContactModel.tenant_id == tenant_id,
            DialerContactModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "連絡先が見つかりません")

    for key, val in body.model_dump(exclude_none=True).items():
        setattr(contact, key, val)
    db.flush()
    return ContactResponseSchema.model_validate(contact)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(
    contact_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先論理削除"""
    _, tenant_id = auth
    contact = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id == contact_id,
            DialerContactModel.tenant_id == tenant_id,
            DialerContactModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "連絡先が見つかりません")
    contact.is_deleted = True
    contact.deleted_at = datetime.now(JST)


@router.post("/import/csv", response_model=MessageResponse)
async def import_csv(
    file: UploadFile,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """CSVファイルから連絡先をインポート"""
    _, tenant_id = auth
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode("utf-8-sig")))

    count = 0
    for row in reader:
        contact = DialerContactModel(
            tenant_id=tenant_id,
            last_name=row.get("姓", row.get("last_name", "")),
            first_name=row.get("名", row.get("first_name", "")),
            phone_primary=row.get("電話番号", row.get("phone", "")),
            company_name=row.get("会社名", row.get("company", None)),
            email=row.get("メール", row.get("email", None)),
        )
        db.add(contact)
        count += 1

    db.flush()
    return MessageResponse(message=f"{count}件の連絡先をインポートしました")


@router.post("/search", response_model=PaginatedResponse)
def search_contacts(
    body: ContactSearchSchema,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連絡先を高度検索"""
    _, tenant_id = auth
    q = select(DialerContactModel).where(
        DialerContactModel.tenant_id == tenant_id,
        DialerContactModel.is_deleted.is_(False),
    )

    if body.keyword:
        like = f"%{body.keyword}%"
        q = q.where(
            or_(
                DialerContactModel.last_name.like(like),
                DialerContactModel.first_name.like(like),
                DialerContactModel.company_name.like(like),
            )
        )
    if body.company_name:
        q = q.where(DialerContactModel.company_name.like(f"%{body.company_name}%"))
    if body.phone:
        q = q.where(DialerContactModel.phone_primary.like(f"%{body.phone}%"))
    if body.status:
        q = q.where(DialerContactModel.status == body.status)

    total = db.execute(
        select(func.count()).select_from(q.subquery())
    ).scalar() or 0
    rows = db.execute(
        q.offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()

    return PaginatedResponse(
        items=[ContactResponseSchema.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )
