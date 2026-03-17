# declarative_base.py からインポート
from .declarative_base import Base, DeleteMixin, TimestampMixin

# enum.py からインポート
from .enum import (
    CallbackPriorityEnum,
    CallStatusEnum,
    CampaignContactStatusEnum,
    CampaignStatusEnum,
    ContactStatusEnum,
    DispositionTypeEnum,
    GoogleIntegrationTypeEnum,
    GoogleSyncStatusEnum,
    UserStatusEnum,
)

# model_defs.py からインポート
from .model_defs import (
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
    DialerUserCampaignModel,
    DialerUserModel,
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
    "UserStatusEnum",
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
    "DialerUserModel",
    "DialerUserCampaignModel",
    "DialerCallLogModel",
    "DialerDncModel",
    "DialerCallbackModel",
    "DialerGoogleIntegrationModel",
    # Functions
    "load_all_table_definitions",
]
