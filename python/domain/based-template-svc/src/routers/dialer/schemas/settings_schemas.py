"""設定スキーマ"""

from __future__ import annotations

from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class PhoneConfigResponseSchema(BaseSchema):
    """電話設定レスポンス"""

    esl_connected: bool
    sip_gateway: str
    registered_users: int
    default_caller_id: Optional[str] = None


class SipConfigResponseSchema(BaseSchema):
    """SIP設定レスポンス (フロントエンドSoftphone用)"""

    wss_url: str
    extension: str
    password: str
    domain: str
    auto_answer: bool = True


class EslTestResponseSchema(BaseSchema):
    """ESL接続テストレスポンス"""

    success: bool
    message: str
    freeswitch_version: Optional[str] = None
