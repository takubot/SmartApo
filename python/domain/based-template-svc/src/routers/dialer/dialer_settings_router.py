"""電話設定ルーター (FreeSWITCH ESL)"""

from __future__ import annotations

from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...common.env_config import get_settings
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerUserModel
from ...services.implementations.p_freeswitch_service import PFreeSwitchService
from .schemas.settings_schemas import (
    EslTestResponseSchema,
    PhoneConfigResponseSchema,
    SipConfigResponseSchema,
)

router = APIRouter()


@router.get("/phone", response_model=PhoneConfigResponseSchema)
def get_phone_config(
    auth: tuple[str, str] = Depends(get_current_user),
):
    """電話設定 (FreeSWITCH) の状態取得"""
    settings = get_settings()
    svc = PFreeSwitchService()

    esl_connected = False
    registered_users = 0
    try:
        esl_connected = svc.esl.connected
        users = svc.get_registered_users()
        registered_users = len(users)
    except Exception:
        pass

    return PhoneConfigResponseSchema(
        esl_connected=esl_connected,
        sip_gateway=settings.FREESWITCH_SIP_GATEWAY,
        registered_users=registered_users,
        default_caller_id=None,
    )


@router.get("/sip-config", response_model=SipConfigResponseSchema)
def get_sip_config(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """現在のユーザーのSIP設定を返す (Softphone初期化用)"""
    firebase_uid, tenant_id = auth
    settings = get_settings()

    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if not user or not user.extension:
        raise HTTPException(400, "内線番号が割り当てられていません")

    wss_url = settings.FREESWITCH_WSS_URL
    if not wss_url:
        raise HTTPException(503, "FreeSWITCH WSS URLが設定されていません")

    # SIPドメイン: WSS URLのホスト部分を使用
    parsed = urlparse(wss_url)
    domain = parsed.hostname or "localhost"

    # パスワード: FreeSWITCH directory と一致 (infra/.env AGENT_SIP_PASSWORD)
    password = settings.AGENT_SIP_PASSWORD

    return SipConfigResponseSchema(
        wss_url=wss_url,
        extension=user.extension,
        password=password,
        domain=domain,
        auto_answer=True,
    )


@router.post("/phone/test", response_model=EslTestResponseSchema)
def test_esl_connection(
    auth: tuple[str, str] = Depends(get_current_user),
):
    """FreeSWITCH ESL 接続テスト"""
    try:
        svc = PFreeSwitchService()
        result = svc.esl.api("version")
        return EslTestResponseSchema(
            success=True,
            message="FreeSWITCH接続成功",
            freeswitch_version=result.strip(),
        )
    except Exception as e:
        return EslTestResponseSchema(
            success=False,
            message=f"接続失敗: {e}",
        )
