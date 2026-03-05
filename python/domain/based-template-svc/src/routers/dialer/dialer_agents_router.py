"""オペレータールーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import AgentStatusEnum
from ...models.tables.model_defs import DialerAgentModel
from .schemas.agent_schemas import (
    AgentCreateSchema,
    AgentResponseSchema,
    AgentStatusUpdateSchema,
    AgentUpdateSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/", response_model=list[AgentResponseSchema])
def list_agents(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """オペレーター一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerAgentModel).where(
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [AgentResponseSchema.model_validate(r) for r in rows]


@router.post("/", response_model=AgentResponseSchema, status_code=201)
def create_agent(
    body: AgentCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """オペレーター登録"""
    _, tenant_id = auth
    agent = DialerAgentModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(agent)
    db.flush()
    return AgentResponseSchema.model_validate(agent)


@router.get("/status-board", response_model=list[AgentResponseSchema])
def status_board(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """リアルタイムステータスボード"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerAgentModel).where(
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.is_deleted.is_(False),
        ).order_by(DialerAgentModel.status)
    ).scalars().all()
    return [AgentResponseSchema.model_validate(r) for r in rows]


@router.get("/available", response_model=list[AgentResponseSchema])
def available_agents(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """利用可能なオペレーター一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerAgentModel).where(
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.status == AgentStatusEnum.AVAILABLE,
            DialerAgentModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [AgentResponseSchema.model_validate(r) for r in rows]


@router.get("/{agent_id}", response_model=AgentResponseSchema)
def get_agent(
    agent_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """オペレーター詳細"""
    _, tenant_id = auth
    agent = _get_agent(agent_id, tenant_id, db)
    return AgentResponseSchema.model_validate(agent)


@router.put("/{agent_id}", response_model=AgentResponseSchema)
def update_agent(
    agent_id: str,
    body: AgentUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """オペレーター更新"""
    _, tenant_id = auth
    agent = _get_agent(agent_id, tenant_id, db)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(agent, key, val)
    db.flush()
    return AgentResponseSchema.model_validate(agent)


@router.put("/{agent_id}/status", response_model=AgentResponseSchema)
def update_agent_status(
    agent_id: str,
    body: AgentStatusUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ステータス変更"""
    _, tenant_id = auth
    agent = _get_agent(agent_id, tenant_id, db)
    agent.status = AgentStatusEnum(body.status)
    agent.status_changed_at = datetime.now(JST)
    db.flush()
    return AgentResponseSchema.model_validate(agent)


def _get_agent(agent_id: str, tenant_id: str, db: Session) -> DialerAgentModel:
    agent = db.execute(
        select(DialerAgentModel).where(
            DialerAgentModel.agent_id == agent_id,
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not agent:
        raise HTTPException(404, "オペレーターが見つかりません")
    return agent
