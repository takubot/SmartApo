"""プレディクティブコール架電SaaS用 テーブル定義"""

from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .declarative_base import Base, DeleteMixin, TimestampMixin
from .enum import (
    AgentStatusEnum,
    CallbackPriorityEnum,
    CallStatusEnum,
    CampaignContactStatusEnum,
    CampaignStatusEnum,
    ContactStatusEnum,
    DispositionTypeEnum,
    GoogleIntegrationTypeEnum,
    GoogleSyncStatusEnum,
)


def _uuid() -> str:
    return str(uuid.uuid4())


# ════════════════════════════════════════════════════════════════
# 連絡先 (Contacts)
# ════════════════════════════════════════════════════════════════


class DialerContactModel(Base, TimestampMixin, DeleteMixin):
    """連絡先マスタ"""

    __tablename__ = "dialer_contacts"

    contact_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="連絡先ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    # 基本情報
    last_name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="姓"
    )
    first_name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="名"
    )
    last_name_kana: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="姓（カナ）"
    )
    first_name_kana: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="名（カナ）"
    )
    company_name: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, comment="会社名"
    )
    department: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True, comment="部署"
    )
    position: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="役職"
    )
    # 連絡先
    phone_primary: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="主要電話番号"
    )
    phone_secondary: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="副電話番号"
    )
    phone_mobile: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="携帯電話番号"
    )
    email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="メールアドレス"
    )
    # 住所
    postal_code: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, comment="郵便番号"
    )
    prefecture: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, comment="都道府県"
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, comment="市区町村"
    )
    address_line: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="番地以降"
    )
    # メタ
    status: Mapped[ContactStatusEnum] = mapped_column(
        Enum(ContactStatusEnum),
        nullable=False,
        default=ContactStatusEnum.NEW,
        comment="連絡先ステータス",
    )
    timezone: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Asia/Tokyo", comment="タイムゾーン"
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="メモ"
    )
    tags: Mapped[Optional[str]] = mapped_column(
        JSON, nullable=True, comment="タグ (JSON配列)"
    )
    google_contact_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="Google Contacts連携ID"
    )
    total_calls: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="総通話回数"
    )
    last_called_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="最終通話日時"
    )

    # Relationships
    call_logs: Mapped[list[DialerCallLogModel]] = relationship(
        back_populates="contact"
    )
    campaign_contacts: Mapped[list[DialerCampaignContactModel]] = relationship(
        back_populates="contact"
    )

    __table_args__ = (
        Index("ix_dialer_contacts_tenant_phone", "tenant_id", "phone_primary"),
        Index("ix_dialer_contacts_tenant_status", "tenant_id", "status"),
        Index("ix_dialer_contacts_tenant_company", "tenant_id", "company_name"),
        {"comment": "連絡先マスタテーブル"},
    )


# ════════════════════════════════════════════════════════════════
# コールリスト (Call Lists)
# ════════════════════════════════════════════════════════════════


class DialerCallListModel(Base, TimestampMixin, DeleteMixin):
    """コールリスト"""

    __tablename__ = "dialer_call_lists"

    call_list_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="コールリストID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="リスト名"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="説明"
    )
    contact_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="連絡先数"
    )
    source: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="インポート元 (manual, google_contacts, google_sheets, csv)",
    )

    # Relationships
    contacts: Mapped[list[DialerCallListContactModel]] = relationship(
        back_populates="call_list"
    )

    __table_args__ = ({"comment": "コールリストテーブル"},)


class DialerCallListContactModel(Base, TimestampMixin):
    """コールリスト-連絡先 中間テーブル"""

    __tablename__ = "dialer_call_list_contacts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    call_list_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_call_lists.call_list_id"),
        nullable=False,
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_contacts.contact_id"),
        nullable=False,
    )

    # Relationships
    call_list: Mapped[DialerCallListModel] = relationship(
        back_populates="contacts"
    )

    __table_args__ = (
        Index(
            "ix_calllist_contact_unique",
            "call_list_id",
            "contact_id",
            unique=True,
        ),
        {"comment": "コールリスト-連絡先中間テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# 処理結果 (Dispositions)
# ════════════════════════════════════════════════════════════════


class DialerDispositionModel(Base, TimestampMixin, DeleteMixin):
    """処理結果マスタ"""

    __tablename__ = "dialer_dispositions"

    disposition_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="処理結果ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="処理結果名"
    )
    disposition_type: Mapped[DispositionTypeEnum] = mapped_column(
        Enum(DispositionTypeEnum), nullable=False, comment="分類"
    )
    requires_callback: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="コールバック必要フラグ"
    )
    is_final: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="最終結果フラグ"
    )
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="表示順"
    )
    color_code: Mapped[Optional[str]] = mapped_column(
        String(7), nullable=True, comment="表示色 (#HEX)"
    )

    __table_args__ = ({"comment": "処理結果マスタテーブル"},)


# ════════════════════════════════════════════════════════════════
# コールスクリプト (Call Scripts)
# ════════════════════════════════════════════════════════════════


class DialerCallScriptModel(Base, TimestampMixin, DeleteMixin):
    """コールスクリプト"""

    __tablename__ = "dialer_call_scripts"

    script_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="スクリプトID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="スクリプト名"
    )
    content: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="スクリプト本文 (Markdown)"
    )
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, comment="バージョン"
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="デフォルトスクリプトフラグ"
    )

    __table_args__ = ({"comment": "コールスクリプトテーブル"},)


# ════════════════════════════════════════════════════════════════
# キャンペーン (Campaigns)
# ════════════════════════════════════════════════════════════════


class DialerCampaignModel(Base, TimestampMixin, DeleteMixin):
    """発信キャンペーン"""

    __tablename__ = "dialer_campaigns"

    campaign_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="キャンペーンID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, comment="キャンペーン名"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="説明"
    )
    status: Mapped[CampaignStatusEnum] = mapped_column(
        Enum(CampaignStatusEnum),
        nullable=False,
        default=CampaignStatusEnum.DRAFT,
        comment="キャンペーンステータス",
    )
    # スケジュール
    start_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, comment="開始日"
    )
    end_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True, comment="終了日"
    )
    daily_start_time: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(9, 0), comment="日次開始時刻 (JST)"
    )
    daily_end_time: Mapped[time] = mapped_column(
        Time, nullable=False, default=time(18, 0), comment="日次終了時刻 (JST)"
    )
    active_days: Mapped[Optional[str]] = mapped_column(
        JSON,
        nullable=True,
        comment="曜日 (1=月...7=日) JSON配列",
    )
    # 予測ダイヤラー設定
    predictive_ratio: Mapped[Decimal] = mapped_column(
        Numeric(4, 2),
        nullable=False,
        default=Decimal("1.20"),
        comment="予測発信比率",
    )
    max_concurrent_calls: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10, comment="最大同時発信数"
    )
    max_abandon_rate: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("3.00"),
        comment="最大放棄率 (%)",
    )
    max_attempts_per_contact: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, comment="連絡先あたり最大試行数"
    )
    retry_interval_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, comment="再試行間隔 (分)"
    )
    ring_timeout_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, comment="呼出タイムアウト (秒)"
    )
    wrap_up_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=30, comment="後処理時間 (秒)"
    )
    # リンク
    call_list_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_call_lists.call_list_id"),
        nullable=True,
        comment="コールリストID",
    )
    script_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_call_scripts.script_id"),
        nullable=True,
        comment="コールスクリプトID",
    )
    # 集計
    total_contacts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="総連絡先数"
    )
    completed_contacts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="完了連絡先数"
    )
    total_calls: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="総発信数"
    )
    total_answered: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="応答数"
    )
    total_abandoned: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="放棄数"
    )
    # Twilio
    caller_id: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="発信者番号 (Twilio)"
    )

    # Relationships
    campaign_contacts: Mapped[list[DialerCampaignContactModel]] = relationship(
        back_populates="campaign"
    )
    agent_assignments: Mapped[list[DialerAgentCampaignModel]] = relationship(
        back_populates="campaign"
    )
    call_logs: Mapped[list[DialerCallLogModel]] = relationship(
        back_populates="campaign"
    )

    __table_args__ = (
        Index("ix_dialer_campaigns_tenant_status", "tenant_id", "status"),
        {"comment": "発信キャンペーンテーブル"},
    )


# ════════════════════════════════════════════════════════════════
# キャンペーン-連絡先 (M2M)
# ════════════════════════════════════════════════════════════════


class DialerCampaignContactModel(Base, TimestampMixin):
    """キャンペーン-連絡先 中間テーブル"""

    __tablename__ = "dialer_campaign_contacts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    campaign_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_campaigns.campaign_id"),
        nullable=False,
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_contacts.contact_id"),
        nullable=False,
    )
    status: Mapped[CampaignContactStatusEnum] = mapped_column(
        Enum(CampaignContactStatusEnum),
        nullable=False,
        default=CampaignContactStatusEnum.PENDING,
        comment="キャンペーン内ステータス",
    )
    priority: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="優先度"
    )
    attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="発信試行回数"
    )
    last_attempt_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="最終試行日時"
    )
    next_attempt_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="次回試行予定日時"
    )
    disposition_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_dispositions.disposition_id"),
        nullable=True,
        comment="最終処理結果",
    )

    # Relationships
    campaign: Mapped[DialerCampaignModel] = relationship(
        back_populates="campaign_contacts"
    )
    contact: Mapped[DialerContactModel] = relationship(
        back_populates="campaign_contacts"
    )

    __table_args__ = (
        Index(
            "ix_campaign_contact_unique",
            "campaign_id",
            "contact_id",
            unique=True,
        ),
        Index("ix_campaign_contact_status", "campaign_id", "status"),
        Index(
            "ix_campaign_contact_next_attempt",
            "campaign_id",
            "next_attempt_at",
        ),
        {"comment": "キャンペーン-連絡先中間テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# オペレーター (Agents)
# ════════════════════════════════════════════════════════════════


class DialerAgentModel(Base, TimestampMixin, DeleteMixin):
    """オペレーター"""

    __tablename__ = "dialer_agents"

    agent_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="オペレーターID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, comment="Firebase User ID"
    )
    display_name: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="表示名"
    )
    extension: Mapped[Optional[str]] = mapped_column(
        String(10), nullable=True, comment="内線番号"
    )
    status: Mapped[AgentStatusEnum] = mapped_column(
        Enum(AgentStatusEnum),
        nullable=False,
        default=AgentStatusEnum.OFFLINE,
        comment="現在のステータス",
    )
    status_changed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="ステータス変更日時"
    )
    current_call_id: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, comment="現在の通話ID"
    )
    skills: Mapped[Optional[str]] = mapped_column(
        JSON, nullable=True, comment="スキルタグ (JSON配列)"
    )
    max_concurrent_calls: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, comment="最大同時通話数"
    )

    # Relationships
    campaign_assignments: Mapped[list[DialerAgentCampaignModel]] = relationship(
        back_populates="agent"
    )
    call_logs: Mapped[list[DialerCallLogModel]] = relationship(
        back_populates="agent"
    )

    __table_args__ = (
        Index(
            "ix_dialer_agents_tenant_user",
            "tenant_id",
            "user_id",
            unique=True,
        ),
        Index("ix_dialer_agents_tenant_status", "tenant_id", "status"),
        {"comment": "オペレーターテーブル"},
    )


# ════════════════════════════════════════════════════════════════
# オペレーター-キャンペーン (M2M)
# ════════════════════════════════════════════════════════════════


class DialerAgentCampaignModel(Base, TimestampMixin):
    """オペレーター-キャンペーン 割当"""

    __tablename__ = "dialer_agent_campaigns"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid
    )
    agent_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_agents.agent_id"),
        nullable=False,
    )
    campaign_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_campaigns.campaign_id"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, comment="有効フラグ"
    )

    # Relationships
    agent: Mapped[DialerAgentModel] = relationship(
        back_populates="campaign_assignments"
    )
    campaign: Mapped[DialerCampaignModel] = relationship(
        back_populates="agent_assignments"
    )

    __table_args__ = (
        Index(
            "ix_agent_campaign_unique",
            "agent_id",
            "campaign_id",
            unique=True,
        ),
        {"comment": "オペレーター-キャンペーン割当テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# 通話ログ (Call Logs)
# ════════════════════════════════════════════════════════════════


class DialerCallLogModel(Base, TimestampMixin):
    """通話記録"""

    __tablename__ = "dialer_call_logs"

    call_log_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="通話記録ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    campaign_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_campaigns.campaign_id"),
        nullable=True,
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_contacts.contact_id"),
        nullable=False,
    )
    agent_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_agents.agent_id"),
        nullable=True,
    )
    disposition_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_dispositions.disposition_id"),
        nullable=True,
    )
    # Twilio
    twilio_call_sid: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, index=True, comment="Twilio Call SID"
    )
    twilio_parent_call_sid: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="転送元Call SID"
    )
    # 通話詳細
    phone_number_dialed: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="発信先番号"
    )
    caller_id_used: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="使用した発信者番号"
    )
    call_status: Mapped[CallStatusEnum] = mapped_column(
        Enum(CallStatusEnum),
        nullable=False,
        default=CallStatusEnum.PENDING,
        comment="通話ステータス",
    )
    # 時間
    initiated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="発信開始日時"
    )
    answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="応答日時"
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="終了日時"
    )
    duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="通話時間 (秒)"
    )
    ring_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="呼出時間 (秒)"
    )
    wait_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="待機時間 (秒)"
    )
    # 録音
    recording_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="録音URL"
    )
    recording_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, comment="録音時間 (秒)"
    )
    recording_sid: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="Twilio Recording SID"
    )
    # メモ
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="通話メモ"
    )
    is_abandoned: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="放棄通話フラグ",
    )

    # Relationships
    campaign: Mapped[Optional[DialerCampaignModel]] = relationship(
        back_populates="call_logs"
    )
    contact: Mapped[DialerContactModel] = relationship(
        back_populates="call_logs"
    )
    agent: Mapped[Optional[DialerAgentModel]] = relationship(
        back_populates="call_logs"
    )

    __table_args__ = (
        Index("ix_dialer_call_logs_tenant_date", "tenant_id", "initiated_at"),
        Index("ix_dialer_call_logs_campaign", "campaign_id"),
        Index("ix_dialer_call_logs_contact", "contact_id"),
        Index("ix_dialer_call_logs_agent", "agent_id"),
        {"comment": "通話記録テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# DNCリスト (Do Not Call)
# ════════════════════════════════════════════════════════════════


class DialerDncModel(Base, TimestampMixin):
    """発信禁止リスト"""

    __tablename__ = "dialer_dnc_list"

    dnc_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="DNC ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    phone_number: Mapped[str] = mapped_column(
        String(20), nullable=False, comment="禁止電話番号"
    )
    reason: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="登録理由"
    )
    added_by: Mapped[Optional[str]] = mapped_column(
        String(36), nullable=True, comment="登録者ID"
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="有効期限 (NULL=無期限)"
    )

    __table_args__ = (
        Index(
            "ix_dialer_dnc_tenant_phone",
            "tenant_id",
            "phone_number",
            unique=True,
        ),
        {"comment": "発信禁止リスト (DNC)"},
    )


# ════════════════════════════════════════════════════════════════
# コールバック (Callbacks)
# ════════════════════════════════════════════════════════════════


class DialerCallbackModel(Base, TimestampMixin, DeleteMixin):
    """コールバック予定"""

    __tablename__ = "dialer_callbacks"

    callback_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="コールバックID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    contact_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dialer_contacts.contact_id"),
        nullable=False,
    )
    campaign_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_campaigns.campaign_id"),
        nullable=True,
    )
    assigned_agent_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("dialer_agents.agent_id"),
        nullable=True,
        comment="担当オペレーターID",
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, comment="予定日時 (JST)"
    )
    priority: Mapped[CallbackPriorityEnum] = mapped_column(
        Enum(CallbackPriorityEnum),
        nullable=False,
        default=CallbackPriorityEnum.MEDIUM,
        comment="優先度",
    )
    notes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="メモ"
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, comment="完了フラグ"
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="完了日時"
    )
    google_calendar_event_id: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, comment="Googleカレンダーイベント連携ID"
    )

    __table_args__ = (
        Index(
            "ix_dialer_callbacks_tenant_scheduled",
            "tenant_id",
            "scheduled_at",
        ),
        Index(
            "ix_dialer_callbacks_agent",
            "assigned_agent_id",
            "is_completed",
        ),
        {"comment": "コールバック予定テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# Google連携設定
# ════════════════════════════════════════════════════════════════


class DialerGoogleIntegrationModel(Base, TimestampMixin, DeleteMixin):
    """Google連携設定"""

    __tablename__ = "dialer_google_integrations"

    integration_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="連携ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True, comment="テナントID"
    )
    user_id: Mapped[str] = mapped_column(
        String(36), nullable=False, comment="連携したユーザーID"
    )
    integration_type: Mapped[GoogleIntegrationTypeEnum] = mapped_column(
        Enum(GoogleIntegrationTypeEnum), nullable=False, comment="連携種類"
    )
    status: Mapped[GoogleSyncStatusEnum] = mapped_column(
        Enum(GoogleSyncStatusEnum),
        nullable=False,
        default=GoogleSyncStatusEnum.NOT_CONNECTED,
        comment="同期状態",
    )
    access_token: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="アクセストークン (暗号化)"
    )
    refresh_token: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="リフレッシュトークン (暗号化)"
    )
    token_expiry: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="トークン有効期限"
    )
    scopes: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="許可スコープ (カンマ区切り)"
    )
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True, comment="最終同期日時"
    )
    sync_cursor: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True, comment="同期カーソル/トークン"
    )
    config: Mapped[Optional[str]] = mapped_column(
        JSON, nullable=True, comment="追加設定 (JSON)"
    )

    __table_args__ = (
        Index(
            "ix_google_int_tenant_type", "tenant_id", "integration_type"
        ),
        {"comment": "Google連携設定テーブル"},
    )


# ════════════════════════════════════════════════════════════════
# Twilio設定
# ════════════════════════════════════════════════════════════════


class DialerTwilioConfigModel(Base, TimestampMixin, DeleteMixin):
    """Twilio設定（テナントごと）"""

    __tablename__ = "dialer_twilio_config"

    config_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_uuid, comment="設定ID"
    )
    tenant_id: Mapped[str] = mapped_column(
        String(36), nullable=False, unique=True, comment="テナントID"
    )
    account_sid: Mapped[str] = mapped_column(
        String(64), nullable=False, comment="Twilio Account SID"
    )
    auth_token: Mapped[str] = mapped_column(
        Text, nullable=False, comment="Twilio Auth Token (暗号化)"
    )
    twiml_app_sid: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True, comment="TwiML App SID"
    )
    phone_numbers: Mapped[Optional[str]] = mapped_column(
        JSON, nullable=True, comment="利用可能な発信番号一覧 (JSON配列)"
    )
    default_caller_id: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, comment="デフォルト発信者番号"
    )
    webhook_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="Webhook受信URL"
    )
    status_callback_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True, comment="ステータスコールバックURL"
    )
    recording_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, comment="録音有効フラグ"
    )

    __table_args__ = ({"comment": "Twilio設定テーブル"},)
