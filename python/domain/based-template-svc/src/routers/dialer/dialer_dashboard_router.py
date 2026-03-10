"""ダッシュボードルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import AgentStatusEnum, CampaignStatusEnum
from ...models.tables.model_defs import (
    DialerAgentModel,
    DialerCallbackModel,
    DialerCallLogModel,
    DialerCampaignModel,
    DialerContactModel,
)
from .schemas.dashboard_schemas import (
    AgentPerformanceSchema,
    DashboardOverviewSchema,
    HourlyStatSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/overview", response_model=DashboardOverviewSchema)
def dashboard_overview(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ダッシュボード概要"""
    _, tenant_id = auth
    now = datetime.now(JST)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_calls_today = db.execute(
        select(func.count()).where(
            DialerCallLogModel.tenant_id == tenant_id,
            DialerCallLogModel.initiated_at >= start_of_day,
        )
    ).scalar() or 0

    total_answered_today = db.execute(
        select(func.count()).where(
            DialerCallLogModel.tenant_id == tenant_id,
            DialerCallLogModel.answered_at.is_not(None),
            DialerCallLogModel.initiated_at >= start_of_day,
        )
    ).scalar() or 0

    avg_duration = db.execute(
        select(func.avg(DialerCallLogModel.duration_seconds)).where(
            DialerCallLogModel.tenant_id == tenant_id,
            DialerCallLogModel.duration_seconds > 0,
            DialerCallLogModel.initiated_at >= start_of_day,
        )
    ).scalar() or 0.0

    active_campaigns = db.execute(
        select(func.count()).where(
            DialerCampaignModel.tenant_id == tenant_id,
            DialerCampaignModel.status == CampaignStatusEnum.ACTIVE,
        )
    ).scalar() or 0

    active_agents = db.execute(
        select(func.count()).where(
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.status != AgentStatusEnum.OFFLINE,
            DialerAgentModel.is_deleted.is_(False),
        )
    ).scalar() or 0

    total_callbacks_today = db.execute(
        select(func.count()).where(
            DialerCallbackModel.tenant_id == tenant_id,
            DialerCallbackModel.scheduled_at >= start_of_day,
            DialerCallbackModel.scheduled_at < start_of_day + timedelta(days=1),
        )
    ).scalar() or 0

    total_contacts = db.execute(
        select(func.count()).where(
            DialerContactModel.tenant_id == tenant_id,
            DialerContactModel.is_deleted.is_(False),
        )
    ).scalar() or 0

    answer_rate = (
        total_answered_today / total_calls_today * 100
        if total_calls_today > 0
        else 0.0
    )

    return DashboardOverviewSchema(
        total_calls_today=total_calls_today,
        total_answered_today=total_answered_today,
        answer_rate_today=round(answer_rate, 2),
        avg_call_duration_seconds=round(float(avg_duration), 1),
        active_campaigns=active_campaigns,
        active_agents=active_agents,
        total_callbacks_today=total_callbacks_today,
        total_contacts=total_contacts,
    )


@router.get("/agents/performance", response_model=list[AgentPerformanceSchema])
def agents_performance(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """エージェント実績"""
    _, tenant_id = auth
    now = datetime.now(JST)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    agents = db.execute(
        select(DialerAgentModel).where(
            DialerAgentModel.tenant_id == tenant_id,
            DialerAgentModel.is_deleted.is_(False),
        )
    ).scalars().all()

    results = []
    for agent in agents:
        total = db.execute(
            select(func.count()).where(
                DialerCallLogModel.agent_id == agent.agent_id,
                DialerCallLogModel.initiated_at >= start_of_day,
            )
        ).scalar() or 0

        answered = db.execute(
            select(func.count()).where(
                DialerCallLogModel.agent_id == agent.agent_id,
                DialerCallLogModel.answered_at.is_not(None),
                DialerCallLogModel.initiated_at >= start_of_day,
            )
        ).scalar() or 0

        avg_dur = db.execute(
            select(func.avg(DialerCallLogModel.duration_seconds)).where(
                DialerCallLogModel.agent_id == agent.agent_id,
                DialerCallLogModel.duration_seconds > 0,
                DialerCallLogModel.initiated_at >= start_of_day,
            )
        ).scalar() or 0.0

        total_talk = db.execute(
            select(func.sum(DialerCallLogModel.duration_seconds)).where(
                DialerCallLogModel.agent_id == agent.agent_id,
                DialerCallLogModel.initiated_at >= start_of_day,
            )
        ).scalar() or 0

        results.append(AgentPerformanceSchema(
            agent_id=agent.agent_id,
            display_name=agent.display_name,
            total_calls=total,
            total_answered=answered,
            answer_rate=round(answered / total * 100 if total else 0, 2),
            avg_call_duration_seconds=round(float(avg_dur), 1),
            total_talk_time_seconds=total_talk,
        ))
    return results


@router.get("/hourly-stats", response_model=list[HourlyStatSchema])
def hourly_stats(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """時間帯別統計"""
    _, tenant_id = auth
    now = datetime.now(JST)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    results = []
    for hour in range(24):
        h_start = start_of_day + timedelta(hours=hour)
        h_end = h_start + timedelta(hours=1)

        total = db.execute(
            select(func.count()).where(
                DialerCallLogModel.tenant_id == tenant_id,
                DialerCallLogModel.initiated_at >= h_start,
                DialerCallLogModel.initiated_at < h_end,
            )
        ).scalar() or 0

        answered = db.execute(
            select(func.count()).where(
                DialerCallLogModel.tenant_id == tenant_id,
                DialerCallLogModel.answered_at.is_not(None),
                DialerCallLogModel.initiated_at >= h_start,
                DialerCallLogModel.initiated_at < h_end,
            )
        ).scalar() or 0

        results.append(HourlyStatSchema(
            hour=hour,
            total_calls=total,
            total_answered=answered,
            answer_rate=round(answered / total * 100 if total else 0, 2),
        ))
    return results
