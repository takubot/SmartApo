"""Google連携ルーター（統合OAuth）"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from google_auth_oauthlib.flow import Flow
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...common.env_config import get_settings
from ...database_utils.database import get_sync_session
from ...models.tables.enum import GoogleIntegrationTypeEnum, GoogleSyncStatusEnum
from ...models.tables.model_defs import DialerGoogleIntegrationModel
from .schemas.common_schemas import MessageResponse
from .schemas.google_schemas import (
    GoogleAuthUrlResponseSchema,
    GoogleCallbackSchema,
    GoogleIntegrationListSchema,
    GoogleIntegrationStatusSchema,
    GooglePickerConfigSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))

_ALL_SCOPES = [
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]


def _build_flow(redirect_uri: str) -> Flow:
    """全スコープ統合のOAuthフローを構築"""
    settings = get_settings()
    return Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=_ALL_SCOPES,
        redirect_uri=redirect_uri,
    )


@router.get("/auth-url", response_model=GoogleAuthUrlResponseSchema)
def get_auth_url(
    redirect_uri: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """OAuth認証URL取得（全スコープ統合）"""
    _, tenant_id = auth
    state = f"{tenant_id}:google"

    flow = _build_flow(redirect_uri)
    url, _ = flow.authorization_url(
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
        state=state,
    )
    return GoogleAuthUrlResponseSchema(auth_url=url)


@router.post("/callback", response_model=MessageResponse)
def oauth_callback(
    body: GoogleCallbackSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """OAuthコールバック処理"""
    user_id, tenant_id = auth

    flow = _build_flow(body.redirect_uri or "")
    flow.fetch_token(code=body.code)
    creds = flow.credentials

    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.integration_type == GoogleIntegrationTypeEnum.GOOGLE,
        )
    ).scalar_one_or_none()

    if integration:
        integration.access_token = creds.token
        integration.refresh_token = creds.refresh_token
        integration.status = GoogleSyncStatusEnum.CONNECTED
        integration.is_deleted = False
        integration.deleted_at = None
    else:
        db.add(DialerGoogleIntegrationModel(
            tenant_id=tenant_id,
            user_id=user_id,
            integration_type=GoogleIntegrationTypeEnum.GOOGLE,
            status=GoogleSyncStatusEnum.CONNECTED,
            access_token=creds.token,
            refresh_token=creds.refresh_token,
        ))
    db.flush()
    return MessageResponse(message="Google連携が完了しました")


@router.get("/picker-config", response_model=GooglePickerConfigSchema)
def picker_config(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Google Picker API用の設定を返す（トークンリフレッシュ込み）"""
    _, tenant_id = auth
    settings = get_settings()

    if not settings.GOOGLE_PICKER_API_KEY:
        raise HTTPException(500, "GOOGLE_PICKER_API_KEY が設定されていません")
    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.integration_type == GoogleIntegrationTypeEnum.GOOGLE,
            DialerGoogleIntegrationModel.is_deleted.is_(False),
            DialerGoogleIntegrationModel.status == GoogleSyncStatusEnum.CONNECTED,
        )
    ).scalar_one_or_none()
    if not integration:
        raise HTTPException(400, "Googleが連携されていません")

    # トークンをリフレッシュして最新のaccess_tokenを取得
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    creds = Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
    )
    creds.refresh(Request())

    # リフレッシュ後のトークンをDBに保存
    integration.access_token = creds.token
    db.flush()

    # Client IDからApp ID（プロジェクト番号）を抽出
    app_id = settings.GOOGLE_OAUTH_CLIENT_ID.split("-")[0]

    return GooglePickerConfigSchema(
        access_token=creds.token,
        api_key=settings.GOOGLE_PICKER_API_KEY,
        app_id=app_id,
    )


@router.get("/status", response_model=GoogleIntegrationListSchema)
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
    return GoogleIntegrationListSchema(
        integrations=[GoogleIntegrationStatusSchema.model_validate(r) for r in rows],
    )


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
    integration.status = GoogleSyncStatusEnum.NOT_CONNECTED
    integration.access_token = None
    integration.refresh_token = None
