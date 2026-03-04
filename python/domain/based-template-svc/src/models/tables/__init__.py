# model_defs.py からインポート
# declarative_base.py からインポート
from .declarative_base import Base, TimestampMixin

# enum.py からインポート
from .enum import (
    BotPermissionLevelEnum,
    ChatEntryCustomFormDisplayModeEnum,
    ChatEntryKindEnum,
    ChatTypeEnum,
    ChatOpenTypeEnum,
    ChatPositionEnum,
    GroupRoleEnum,
    IpRestrictionModeEnum,
    TenantRoleEnum,
    WebModeEnum,
    ExternalServiceTypeEnum,
    ToolRunTypeEnum,
    ToolRunStatusEnum,
)

from .model_defs import (
    BotModel,
    CategoryModel,
    ChatEntryAccessPolicyModel,
    ChatEntryAllowedIPModel,
    ChatEntryApiKeyModel,
    ChatEntryCustomFormBindingModel,
    ChatEntryLineModel,
    ChatEntryModel,
    ChatEntryThemeModel,
    ChatEntryWebModel,
    ChatHistoryModel,
    ChatSpaceModel,
    ChunkModel,
    ChunkTableModel,
    ChunkTableTemplateModel,
    ExternalUserModel,
    FileOutlineModel,
    ReferenceLinkModel,
    ReferenceLinkToFileAssociation,
    TenantBotTemplateModel,
    TenantBotTemplateUsageModel,
    TenantConfigModel,
    UserChatLogModel,
    UserGroupModel,
    UserModel,
    UserToGroupAssociation,
    SuggestModel,
    SuggestItemModel,
    SuggestLogModel,
    CustomFormModel,
    CustomFormResponseModel,
    CustomFormTagRuleModel,
    ExternalUserTagModel,
    MailSenderConfigModel,
    MailTemplateModel,
    ExternalUserMailLogModel,
    BookingSettingsModel,
    BookingMenuModel,
    BookingScheduleModel,
    BookingBlockModel,
    BookingReservationModel,
    NotificationModel,
    NotificationReadModel,
    suggest_item_to_bot,
    suggest_bot_association,
    bot_to_file_association,
    chat_entry_to_bot_association,
    chat_entry_to_booking_menu_association,
    chat_entry_to_handoff_booking_menu_association,
    chunk_category_association,
    file_category_association,
    bot_to_chunk_table_template_association,
)


def load_all_table_definitions():
    """
    テーブル定義がなされたすべてのモジュールをインポートし、
    SQLAlchemyのレジストリにマッパーを登録する
    """
    # このモジュールをインポートすることで、すべてのテーブル定義が
    # SQLAlchemyのレジストリに自動的に登録される
    pass


# すべてのモデルをリストとして定義（必要に応じて使用）
__all__ = [
    # Core models
    "TenantConfigModel",
    "TenantBotTemplateModel",
    "TenantBotTemplateUsageModel",
    "UserModel",
    "ExternalUserModel",
    "UserGroupModel",
    "UserToGroupAssociation",
    # Bot and Form models
    "BotModel",
    "ReferenceLinkModel",
    "ReferenceLinkToFileAssociation",
    # File and Content models
    "FileOutlineModel",
    "ChunkModel",
    "ChunkTableModel",
    "ChunkTableTemplateModel",
    "CategoryModel",
    # Chat models
    "ChatSpaceModel",
    "ChatEntryModel",
    "ChatEntryCustomFormBindingModel",
    "ChatEntryWebModel",
    "ChatEntryLineModel",
    "ChatEntryApiKeyModel",
    "ChatEntryAccessPolicyModel",
    "ChatEntryAllowedIPModel",
    "ChatEntryThemeModel",
    "ChatHistoryModel",
    "UserChatLogModel",
    # Suggest and Form models
    "SuggestModel",
    "SuggestItemModel",
    "SuggestLogModel",
    "CustomFormModel",
    "CustomFormResponseModel",
    "CustomFormTagRuleModel",
    "ToolRunModel",
    "ExternalUserTagModel",
    "MailSenderConfigModel",
    "MailTemplateModel",
    "ExternalUserMailLogModel",
    "BookingSettingsModel",
    "BookingMenuModel",
    "BookingScheduleModel",
    "BookingBlockModel",
    "BookingReservationModel",
    "NotificationModel",
    "NotificationReadModel",
    # Association tables
    "suggest_item_to_bot",
    "suggest_bot_association",
    "bot_to_file_association",
    "chat_entry_to_booking_menu_association",
    "chat_entry_to_handoff_booking_menu_association",
    "chunk_category_association",
    "chat_entry_to_bot_association",
    "file_category_association",
    "bot_to_chunk_table_template_association",
    # Enums
    "BotPermissionLevelEnum",
    "ChatEntryCustomFormDisplayModeEnum",
    "ChatEntryKindEnum",
    "ChatTypeEnum",
    "ChatOpenTypeEnum",
    "ChatPositionEnum",
    "GroupRoleEnum",
    "IpRestrictionModeEnum",
    "TenantRoleEnum",
    "WebModeEnum",
    "ExternalServiceTypeEnum",
    "ToolRunTypeEnum",
    "ToolRunStatusEnum",
    # Base classes
    "Base",
    "TimestampMixin",
    # Functions
    "load_all_table_definitions",
]
