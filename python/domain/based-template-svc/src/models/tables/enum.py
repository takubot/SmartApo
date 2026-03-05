"""プレディクティブコール架電SaaS用 Enum定義"""

import enum


# ── カレンダープロバイダー (既存の DI で使用) ──────────────────────


class CalendarProviderEnum(str, enum.Enum):
    """カレンダーサービスのプロバイダー"""

    GOOGLE = "google"
    OUTLOOK = "outlook"


# ── キャンペーン ──────────────────────────────────────────────────


class CampaignStatusEnum(str, enum.Enum):
    """キャンペーンの状態"""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# ── 通話 ──────────────────────────────────────────────────────────


class CallStatusEnum(str, enum.Enum):
    """通話ステータス"""

    PENDING = "pending"
    DIALING = "dialing"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    ANSWERED = "answered"
    BUSY = "busy"
    NO_ANSWER = "no_answer"
    FAILED = "failed"
    VOICEMAIL = "voicemail"
    COMPLETED = "completed"
    CANCELED = "canceled"


# ── オペレーター ──────────────────────────────────────────────────


class AgentStatusEnum(str, enum.Enum):
    """オペレーターの状態"""

    OFFLINE = "offline"
    AVAILABLE = "available"
    ON_CALL = "on_call"
    WRAP_UP = "wrap_up"
    ON_BREAK = "on_break"
    LUNCH = "lunch"


# ── 連絡先 ────────────────────────────────────────────────────────


class ContactStatusEnum(str, enum.Enum):
    """連絡先のステータス"""

    NEW = "new"
    ACTIVE = "active"
    DO_NOT_CALL = "do_not_call"
    INVALID = "invalid"
    CONVERTED = "converted"


# ── キャンペーン内連絡先 ──────────────────────────────────────────


class CampaignContactStatusEnum(str, enum.Enum):
    """キャンペーン内の連絡先ステータス"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    CALLBACK = "callback"
    MAX_ATTEMPTS = "max_attempts"


# ── 処理結果 ──────────────────────────────────────────────────────


class DispositionTypeEnum(str, enum.Enum):
    """処理結果の分類"""

    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    UNREACHABLE = "unreachable"
    SYSTEM = "system"


# ── Google連携 ────────────────────────────────────────────────────


class GoogleSyncStatusEnum(str, enum.Enum):
    """Google連携の同期状態"""

    NOT_CONNECTED = "not_connected"
    CONNECTED = "connected"
    SYNCING = "syncing"
    ERROR = "error"
    TOKEN_EXPIRED = "token_expired"


class GoogleIntegrationTypeEnum(str, enum.Enum):
    """Google連携の種類"""

    CONTACTS = "contacts"
    CALENDAR = "calendar"
    GMAIL = "gmail"
    SHEETS = "sheets"


# ── コールバック ──────────────────────────────────────────────────


class CallbackPriorityEnum(str, enum.Enum):
    """コールバックの優先度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
