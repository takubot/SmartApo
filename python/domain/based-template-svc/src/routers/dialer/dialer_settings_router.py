"""電話設定ルーター (FreeSWITCH ESL)"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ...auth.authentication.dependencies import get_current_user
from ...common.env_config import get_settings
from ...services.implementations.p_freeswitch_service import PFreeSwitchService
from .schemas.settings_schemas import EslTestResponseSchema, PhoneConfigResponseSchema

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
