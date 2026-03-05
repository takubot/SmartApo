"""Google連携ルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import GoogleIntegrationTypeEnum, GoogleSyncStatusEnum
from ...models.tables.model_defs import DialerGoogleIntegrationModel
from ...services.implementations.di import get_contact_sync_service, get_sheets_service
from .schemas.common_schemas import MessageResponse
from .schemas.google_schemas import (
    GoogleAuthUrlResponseSchema,
    GoogleCallbackSchema,
    GoogleIntegrationStatusSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("/auth-url/{integration_type}", response_model=GoogleAuthUrlResponseSchema)
def get_auth_url(
    integration_type: str,
    redirect_uri: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """OAuth認証URL取得"""
    _, tenant_id = auth
    state = f"{tenant_id}:{integration_type}"

    if integration_type in ("contacts",):
        svc = get_contact_sync_service()
    elif integration_type in ("sheets",):
        svc = get_sheets_service()
    else:
        raise HTTPException(400, f"未対応の連携種類: {integration_type}")

    url = svc.get_auth_url(redirect_uri=redirect_uri, state=state)
    return GoogleAuthUrlResponseSchema(auth_url=url)


@router.post("/callback", response_model=MessageResponse)
def oauth_callback(
    body: GoogleCallbackSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """OAuthコールバック処理"""
    user_id, tenant_id = auth

    if body.integration_type in ("contacts",):
        svc = get_contact_sync_service()
    elif body.integration_type in ("sheets",):
        svc = get_sheets_service()
    else:
        raise HTTPException(400, f"未対応の連携種類: {body.integration_type}")

    tokens = svc.exchange_code(code=body.code, redirect_uri="")

    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.integration_type == body.integration_type,
        )
    ).scalar_one_or_none()

    if integration:
        integration.access_token = tokens.get("access_token")
        integration.refresh_token = tokens.get("refresh_token")
        integration.status = GoogleSyncStatusEnum.CONNECTED
    else:
        db.add(DialerGoogleIntegrationModel(
            tenant_id=tenant_id,
            user_id=user_id,
            integration_type=GoogleIntegrationTypeEnum(body.integration_type),
            status=GoogleSyncStatusEnum.CONNECTED,
            access_token=tokens.get("access_token"),
            refresh_token=tokens.get("refresh_token"),
        ))
    db.flush()
    return MessageResponse(message="Google連携が完了しました")


@router.get("/status", response_model=list[GoogleIntegrationStatusSchema])
def integration_status(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連携状態一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [GoogleIntegrationStatusSchema.model_validate(r) for r in rows]


@router.post("/sync/{integration_type}", response_model=MessageResponse)
def manual_sync(
    integration_type: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """手動同期実行"""
    _, tenant_id = auth
    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.integration_type == integration_type,
            DialerGoogleIntegrationModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not integration:
        raise HTTPException(404, "連携設定が見つかりません")

    integration.status = GoogleSyncStatusEnum.SYNCING
    integration.last_synced_at = datetime.now(JST)
    db.flush()
    return MessageResponse(message="同期を開始しました")


@router.delete("/{integration_id}", status_code=204)
def disconnect(
    integration_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """連携解除"""
    _, tenant_id = auth
    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.integration_id == integration_id,
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
        )
    ).scalar_one_or_none()
    if not integration:
        raise HTTPException(404, "連携設定が見つかりません")
    integration.is_deleted = True
    integration.deleted_at = datetime.now(JST)
