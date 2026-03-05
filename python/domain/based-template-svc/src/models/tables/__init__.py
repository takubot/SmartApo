# declarative_base.py からインポート
from .declarative_base import Base, DeleteMixin, TimestampMixin

# enum.py からインポート
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

# model_defs.py からインポート
from .model_defs import (
    DialerAgentCampaignModel,
    DialerAgentModel,
    DialerCallbackModel,
    DialerCallListContactModel,
    DialerCallListModel,
    DialerCallLogModel,
    DialerCallScriptModel,
    DialerCampaignContactModel,
    DialerCampaignModel,
    DialerContactModel,
    DialerDispositionModel,
    DialerDncModel,
    DialerGoogleIntegrationModel,
    DialerTwilioConfigModel,
)


def load_all_table_definitions():
    """
    テーブル定義がなされたすべてのモジュールをインポートし、
    SQLAlchemyのレジストリにマッパーを登録する
    """
    pass


__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "DeleteMixin",
    # Enums
    "CampaignStatusEnum",
    "CallStatusEnum",
    "AgentStatusEnum",
    "ContactStatusEnum",
    "CampaignContactStatusEnum",
    "DispositionTypeEnum",
    "GoogleSyncStatusEnum",
    "GoogleIntegrationTypeEnum",
    "CallbackPriorityEnum",
    # Models
    "DialerContactModel",
    "DialerCallListModel",
    "DialerCallListContactModel",
    "DialerDispositionModel",
    "DialerCallScriptModel",
    "DialerCampaignModel",
    "DialerCampaignContactModel",
    "DialerAgentModel",
    "DialerAgentCampaignModel",
    "DialerCallLogModel",
    "DialerDncModel",
    "DialerCallbackModel",
    "DialerGoogleIntegrationModel",
    "DialerTwilioConfigModel",
    # Functions
    "load_all_table_definitions",
]
