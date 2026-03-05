"""設定ルーター"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerTwilioConfigModel
from .schemas.settings_schemas import (
    TwilioConfigResponseSchema,
    TwilioConfigSchema,
    TwilioTestResponseSchema,
)

router = APIRouter()


@router.get("/twilio", response_model=TwilioConfigResponseSchema | None)
def get_twilio_config(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Twilio設定取得"""
    _, tenant_id = auth
    config = db.execute(
        select(DialerTwilioConfigModel).where(
            DialerTwilioConfigModel.tenant_id == tenant_id,
            DialerTwilioConfigModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not config:
        return None
    return TwilioConfigResponseSchema.model_validate(config)


@router.put("/twilio", response_model=TwilioConfigResponseSchema)
def update_twilio_config(
    body: TwilioConfigSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Twilio設定更新"""
    _, tenant_id = auth
    config = db.execute(
        select(DialerTwilioConfigModel).where(
            DialerTwilioConfigModel.tenant_id == tenant_id,
            DialerTwilioConfigModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if config:
        for key, val in body.model_dump(exclude_none=True).items():
            setattr(config, key, val)
    else:
        config = DialerTwilioConfigModel(
            tenant_id=tenant_id,
            **body.model_dump(exclude_none=True),
        )
        db.add(config)

    db.flush()
    return TwilioConfigResponseSchema.model_validate(config)


@router.post("/twilio/test", response_model=TwilioTestResponseSchema)
def test_twilio(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Twilio接続テスト"""
    _, tenant_id = auth
    config = db.execute(
        select(DialerTwilioConfigModel).where(
            DialerTwilioConfigModel.tenant_id == tenant_id,
            DialerTwilioConfigModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not config:
        raise HTTPException(404, "Twilio設定がありません")

    try:
        from twilio.rest import Client

        client = Client(config.account_sid, config.auth_token)
        account = client.api.accounts(config.account_sid).fetch()
        return TwilioTestResponseSchema(
            success=True,
            message="接続成功",
            account_name=account.friendly_name,
        )
    except Exception as e:
        return TwilioTestResponseSchema(
            success=False,
            message=f"接続失敗: {e}",
        )
