"""設定スキーマ"""

from __future__ import annotations

from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class TwilioConfigSchema(BaseSchema):
    account_sid: str
    auth_token: str
    twiml_app_sid: Optional[str] = None
    phone_numbers: Optional[list[str]] = None
    default_caller_id: Optional[str] = None
    webhook_url: Optional[str] = None
    status_callback_url: Optional[str] = None
    recording_enabled: bool = True


class TwilioConfigResponseSchema(BaseSchema):
    config_id: str
    account_sid: str
    twiml_app_sid: Optional[str] = None
    phone_numbers: Optional[list[str]] = None
    default_caller_id: Optional[str] = None
    webhook_url: Optional[str] = None
    recording_enabled: bool


class TwilioTestResponseSchema(BaseSchema):
    success: bool
    message: str
    account_name: Optional[str] = None
