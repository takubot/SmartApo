# app.py

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from logging import getLogger
from typing import Any

from fastapi import FastAPI, Security
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette import status
from starlette.requests import Request

from .auth.authentication.firebase_init import initialize_firebase
from .common.env_config import Settings, get_settings

logger = getLogger(__name__)

settings = get_settings()


# ─────────────────────────────────────────────────────────────
# Security: “存在だけ”させる Bearer（OpenAPI に出すが検証は強制しない）
# ─────────────────────────────────────────────────────────────
_bearer = HTTPBearer(
    auto_error=False,  # 認証ヘッダが無くても 401 にしない
    scheme_name="BearerAuth",  # OpenAPI 上の表示名
)


def _dummy_auth(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> str:
    """実際には何もしない依存関数（ドキュメント用）。"""
    return credentials.credentials if credentials else "anonymous"


# ─────────────────────────────────────────────────────────────
# Middleware 設定
# ─────────────────────────────────────────────────────────────
def _setup_middleware(app: FastAPI, settings: Settings) -> None:
    logger.info(f"Setting up middleware with allowed origins: {settings.allow_origins}")
    logger.info(
        f"Production: {settings.is_production}, Staging: {settings.is_staging}, Development: {settings.is_development}"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=settings.is_production or settings.is_staging or settings.is_development,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ─────────────────────────────────────────────────────────────
# ルーター登録（既存の install_routers を使用）
# ─────────────────────────────────────────────────────────────
def _register_routers(app: FastAPI) -> None:
    routers_to_register = [
        (bot_router, "/v2/bot", ["Bot"]),
        (category_router, "/v2/category", ["Category"]),
        (chat_log_router, "/v2/chat_log", ["Chat Log"]),
        (chat_space_router, "/v2/chat_space", ["chat_space"]),
        (file_router, "/v2/file", ["File"]),
        (user_router, "/v2/user", ["User"]),
        (group_router, "/v2/group", ["Group"]),
        (mail_router, "/v2/mail", ["Mail"]),
        (user_to_group_router, "/v2/user_to_group", ["User/To/Group"]),
        (chunk_data_router, "/v2/chunk_data", ["Chunk Data"]),
        (chunk_table_router, "/v2/chunk_table", ["Chunk Table"]),
        (chat_entry_router, "/v2/chat_entry", ["Chat Entry"]),
        (chat_router, "/v2/chat", ["Chat"]),
        (external_router, "/v2/chat/external", ["External"]),
        (line_router, "/v2/chat/line", ["LINE"]),
        (ai_platform_router, "/v2/chat/ai_platform", ["AI Platform"]),

        (dashboard_router, "/v2/dashboard", ["Dashboard"]),
        (reference_link_router, "/v2/reference_link", ["ReferenceLink"]),
        (chat_history_router, "/v2/chat_history", ["Chat History"]),
        (suggest_router, "/v2/suggest", ["Suggest"]),
        (tenant_config_router, "/v2/tenant_config", ["Tenant Config"]),
        (user_manage_router, "/v2/user_manage", ["UserManage"]),
        (notification_router, "/v2/notification", ["Notification"]),
        (custom_form_router, "/v2/custom_form", ["Custom Form"]),
        (booking_router, "/v2/booking", ["Booking"]),
        (booking_external_router, "/v2/booking/external", ["External Booking"]),
        (mock_router, "/v2/mock", ["Mock"]),
    ]

    for router, prefix, tags in routers_to_register:
        app.include_router(router, prefix=prefix, tags=tags)


# ─────────────────────────────────────────────────────────────
# OpenAPI カスタマイズ（servers / securitySchemes / root security）
# ─────────────────────────────────────────────────────────────
def _customize_openapi(app: FastAPI, settings: Settings) -> None:
    original_openapi = app.openapi

    def custom_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema

        schema = original_openapi()

        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi


# ─────────────────────────────────────────────────────────────
# 例外ハンドラ（422）
# ─────────────────────────────────────────────────────────────
def _install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    def _handler(request: Request, exc: RequestValidationError):
        logger.warning(
            "Request validation failed: method=%s path=%s errors=%s",
            request.method,
            request.url.path,
            exc.errors(),
        )
        return JSONResponse(content={}, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY)


# ─────────────────────────────────────────────────────────────
# Lifespan（on_event の代替）
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    initialize_firebase()
    logger.info("Firebase Admin SDK initialized.")
    try:
        yield
    finally:
        # Shutdown（Firebase Admin は明示解放不要。必要ならここでクリーンアップを実施）
        # 例）from firebase_admin import delete_app, get_app
        #     try: delete_app(get_app())
        #     except Exception: pass
        ...


# ─────────────────────────────────────────────────────────────
# アプリ ファクトリー
# ─────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    settings: Settings = get_settings()

    app = FastAPI(
        title="doppel",
        version="0.1.0",
        servers=[
            {"url": "http://localhost:8080", "description": "Local"},
            {"url": "https://based-template-svc-1090554569112.asia-northeast1.run.app", "description": "dev"},
            {"url": "https://based-template-svc-638194985906.asia-northeast1.run.app", "description": "stg"},
            {"url": "https://based-template-svc-646682719623.asia-northeast1.run.app", "description": "prod"},
        ],
        docs_url=None,  # 元コード踏襲（必要に応じて settings で制御）
        redoc_url=None,
        dependencies=[Security(_dummy_auth)],  # “見せるだけ”の Bearer を OpenAPI に含める
        # generate_unique_id_function=_method_path_id,
        lifespan=_lifespan,
    )

    _setup_middleware(app, settings)
    _register_routers(app)
    _customize_openapi(app, settings)
    _install_exception_handlers(app)

    return app
