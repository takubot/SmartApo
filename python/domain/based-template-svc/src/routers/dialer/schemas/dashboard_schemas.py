"""ダッシュボードスキーマ"""

from __future__ import annotations

from decimal import Decimal

from ....common.schemas.base_schema import BaseSchema


class DashboardOverviewSchema(BaseSchema):
    """ダッシュボード概要"""

    total_calls_today: int
    total_answered_today: int
    answer_rate_today: float
    avg_call_duration_seconds: float
    active_campaigns: int
    active_agents: int
    total_callbacks_today: int
    total_contacts: int


class AgentPerformanceSchema(BaseSchema):
    """エージェント実績"""

    agent_id: str
    display_name: str
    total_calls: int
    total_answered: int
    answer_rate: float
    avg_call_duration_seconds: float
    total_talk_time_seconds: int


class HourlyStatSchema(BaseSchema):
    """時間帯別統計"""

    hour: int
    total_calls: int
    total_answered: int
    answer_rate: float
