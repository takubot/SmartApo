"""キャンペーンルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import (
    AgentStatusEnum,
    CallStatusEnum,
    CampaignContactStatusEnum,
    CampaignStatusEnum,
)
from ...models.tables.model_defs import (
    DialerAgentCampaignModel,
    DialerAgentModel,
    DialerCallLogModel,
    DialerCampaignContactModel,
    DialerCampaignModel,
    DialerContactModel,
)
from .schemas.campaign_schemas import (
    CampaignContactAddSchema,
    CampaignCreateSchema,
    CampaignResponseSchema,
    CampaignStatsSchema,
    CampaignUpdateSchema,
)
from .schemas.common_schemas import MessageResponse, PaginatedResponse
from .schemas.contact_schemas import ContactResponseSchema

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("", response_model=PaginatedResponse)
def list_campaigns(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン一覧"""
    _, tenant_id = auth
    q = select(DialerCampaignModel).where(
        DialerCampaignModel.tenant_id == tenant_id,
        DialerCampaignModel.is_deleted.is_(False),
    )
    if status:
        q = q.where(DialerCampaignModel.status == status)

    total = db.execute(
        select(func.count()).select_from(q.subquery())
    ).scalar() or 0
    rows = db.execute(
        q.order_by(DialerCampaignModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).scalars().all()

    return PaginatedResponse(
        items=[CampaignResponseSchema.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=CampaignResponseSchema, status_code=201)
def create_campaign(
    body: CampaignCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン作成"""
    _, tenant_id = auth
    campaign = DialerCampaignModel(
        tenant_id=tenant_id,
        **body.model_dump(exclude_none=True),
    )
    db.add(campaign)
    db.flush()
    return CampaignResponseSchema.model_validate(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponseSchema)
def get_campaign(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン詳細"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    return CampaignResponseSchema.model_validate(campaign)


@router.put("/{campaign_id}", response_model=CampaignResponseSchema)
def update_campaign(
    campaign_id: str,
    body: CampaignUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン更新"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(campaign, key, val)
    db.flush()
    return CampaignResponseSchema.model_validate(campaign)


@router.delete("/{campaign_id}", status_code=204)
def delete_campaign(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン論理削除"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    campaign.is_deleted = True
    campaign.deleted_at = datetime.now(JST)


@router.post("/{campaign_id}/start", response_model=MessageResponse)
def start_campaign(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン開始"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    if campaign.status not in (CampaignStatusEnum.DRAFT, CampaignStatusEnum.PAUSED):
        raise HTTPException(400, "開始できないステータスです")
    campaign.status = CampaignStatusEnum.ACTIVE
    return MessageResponse(message="キャンペーンを開始しました")


@router.post("/{campaign_id}/pause", response_model=MessageResponse)
def pause_campaign(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン一時停止"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    if campaign.status != CampaignStatusEnum.ACTIVE:
        raise HTTPException(400, "一時停止できないステータスです")
    campaign.status = CampaignStatusEnum.PAUSED
    return MessageResponse(message="キャンペーンを一時停止しました")


@router.post("/{campaign_id}/stop", response_model=MessageResponse)
def stop_campaign(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン停止"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    campaign.status = CampaignStatusEnum.COMPLETED
    return MessageResponse(message="キャンペーンを停止しました")


@router.get("/{campaign_id}/stats", response_model=CampaignStatsSchema)
def campaign_stats(
    campaign_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン統計"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)

    active_agents = db.execute(
        select(func.count())
        .select_from(DialerAgentCampaignModel)
        .join(DialerAgentModel)
        .where(
            DialerAgentCampaignModel.campaign_id == campaign_id,
            DialerAgentCampaignModel.is_active.is_(True),
            DialerAgentModel.status == AgentStatusEnum.AVAILABLE,
        )
    ).scalar() or 0

    active_calls = db.execute(
        select(func.count()).where(
            DialerCallLogModel.campaign_id == campaign_id,
            DialerCallLogModel.call_status.in_([
                CallStatusEnum.DIALING,
                CallStatusEnum.RINGING,
                CallStatusEnum.IN_PROGRESS,
            ]),
        )
    ).scalar() or 0

    answer_rate = (
        campaign.total_answered / campaign.total_calls * 100
        if campaign.total_calls > 0
        else 0.0
    )
    abandon_rate = (
        campaign.total_abandoned / campaign.total_answered * 100
        if campaign.total_answered > 0
        else 0.0
    )

    return CampaignStatsSchema(
        campaign_id=campaign.campaign_id,
        total_contacts=campaign.total_contacts,
        completed_contacts=campaign.completed_contacts,
        total_calls=campaign.total_calls,
        total_answered=campaign.total_answered,
        total_abandoned=campaign.total_abandoned,
        answer_rate=round(answer_rate, 2),
        abandon_rate=round(abandon_rate, 2),
        active_agents=active_agents,
        active_calls=active_calls,
        predictive_ratio=campaign.predictive_ratio,
    )


@router.post("/{campaign_id}/contacts", response_model=MessageResponse, status_code=201)
def add_contacts_to_campaign(
    campaign_id: str,
    body: CampaignContactAddSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーンに連絡先を追加"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    count = 0
    for cid in body.contact_ids:
        existing = db.execute(
            select(DialerCampaignContactModel).where(
                DialerCampaignContactModel.campaign_id == campaign_id,
                DialerCampaignContactModel.contact_id == cid,
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(DialerCampaignContactModel(
                campaign_id=campaign_id,
                contact_id=cid,
                priority=body.priority,
            ))
            count += 1
    campaign.total_contacts += count
    db.flush()
    return MessageResponse(message=f"{count}件の連絡先を追加しました")


@router.get("/{campaign_id}/contacts", response_model=PaginatedResponse)
def list_campaign_contacts(
    campaign_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーン内連絡先一覧"""
    _, tenant_id = auth
    _get_campaign(campaign_id, tenant_id, db)

    q = (
        select(DialerContactModel)
        .join(DialerCampaignContactModel)
        .where(DialerCampaignContactModel.campaign_id == campaign_id)
    )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
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


@router.delete("/{campaign_id}/contacts/{contact_id}", status_code=204)
def remove_contact_from_campaign(
    campaign_id: str,
    contact_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """キャンペーンから連絡先を除外"""
    _, tenant_id = auth
    campaign = _get_campaign(campaign_id, tenant_id, db)
    cc = db.execute(
        select(DialerCampaignContactModel).where(
            DialerCampaignContactModel.campaign_id == campaign_id,
            DialerCampaignContactModel.contact_id == contact_id,
        )
    ).scalar_one_or_none()
    if cc:
        db.delete(cc)
        campaign.total_contacts = max(0, campaign.total_contacts - 1)


@router.post("/{campaign_id}/agents", response_model=MessageResponse, status_code=201)
def assign_agents(
    campaign_id: str,
    agent_ids: list[str],
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """エージェントをキャンペーンに割当"""
    _, tenant_id = auth
    _get_campaign(campaign_id, tenant_id, db)
    count = 0
    for aid in agent_ids:
        existing = db.execute(
            select(DialerAgentCampaignModel).where(
                DialerAgentCampaignModel.campaign_id == campaign_id,
                DialerAgentCampaignModel.agent_id == aid,
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(DialerAgentCampaignModel(campaign_id=campaign_id, agent_id=aid))
            count += 1
    db.flush()
    return MessageResponse(message=f"{count}名のエージェントを割り当てました")


@router.delete("/{campaign_id}/agents/{agent_id}", status_code=204)
def unassign_agent(
    campaign_id: str,
    agent_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """エージェント割当解除"""
    _, tenant_id = auth
    _get_campaign(campaign_id, tenant_id, db)
    assignment = db.execute(
        select(DialerAgentCampaignModel).where(
            DialerAgentCampaignModel.campaign_id == campaign_id,
            DialerAgentCampaignModel.agent_id == agent_id,
        )
    ).scalar_one_or_none()
    if assignment:
        db.delete(assignment)


# ── ヘルパー ─────────────────────────────────────────────────

def _get_campaign(
    campaign_id: str, tenant_id: str, db: Session
) -> DialerCampaignModel:
    campaign = db.execute(
        select(DialerCampaignModel).where(
            DialerCampaignModel.campaign_id == campaign_id,
            DialerCampaignModel.tenant_id == tenant_id,
            DialerCampaignModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not campaign:
        raise HTTPException(404, "キャンペーンが見つかりません")
    return campaign
