"""通話ログルーター"""

from __future__ import annotations

from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerCallLogModel
from .schemas.call_log_schemas import CallLogResponseSchema
from .schemas.common_schemas import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
def list_call_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    campaign_id: str | None = Query(None),
    user_id: str | None = Query(None),
    status: str | None = Query(None),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """通話ログ一覧"""
    _, tenant_id = auth
    q = select(DialerCallLogModel).where(
        DialerCallLogModel.tenant_id == tenant_id
    )
    if campaign_id:
        q = q.where(DialerCallLogModel.campaign_id == campaign_id)
    if user_id:
        q = q.where(DialerCallLogModel.user_id == user_id)
    if status:
        q = q.where(DialerCallLogModel.call_status == status)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(
        q.order_by(DialerCallLogModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return PaginatedResponse(
        items=[CallLogResponseSchema.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.get("/{call_log_id}", response_model=CallLogResponseSchema)
def get_call_log(
    call_log_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """通話ログ詳細"""
    _, tenant_id = auth
    log = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.call_log_id == call_log_id,
            DialerCallLogModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(404, "通話記録が見つかりません")
    return CallLogResponseSchema.model_validate(log)


@router.get("/{call_log_id}/recording")
def get_recording(
    call_log_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """録音URL取得"""
    _, tenant_id = auth
    log = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.call_log_id == call_log_id,
            DialerCallLogModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()
    if not log:
        raise HTTPException(404, "通話記録が見つかりません")
    if not log.recording_url:
        raise HTTPException(404, "録音がありません")
    return {"recording_url": log.recording_url, "duration": log.recording_duration_seconds}
