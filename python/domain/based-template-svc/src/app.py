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
    from .routers.dialer.dialer_users_router import router as dialer_users_router
    from .routers.dialer.dialer_call_lists_router import router as dialer_call_lists_router
    from .routers.dialer.dialer_call_logs_router import router as dialer_call_logs_router
    from .routers.dialer.dialer_callbacks_router import router as dialer_callbacks_router
    from .routers.dialer.dialer_calls_router import router as dialer_calls_router
    from .routers.dialer.dialer_campaigns_router import router as dialer_campaigns_router
    from .routers.dialer.dialer_contacts_router import router as dialer_contacts_router
    from .routers.dialer.dialer_dashboard_router import router as dialer_dashboard_router
    from .routers.dialer.dialer_dispositions_router import router as dialer_dispositions_router
    from .routers.dialer.dialer_dnc_router import router as dialer_dnc_router
    from .routers.dialer.dialer_google_router import router as dialer_google_router
    from .routers.dialer.dialer_scripts_router import router as dialer_scripts_router
    from .routers.dialer.dialer_settings_router import router as dialer_settings_router
    from .routers.dialer.dialer_dial_router import router as dialer_dial_router

    routers_to_register = [
        # ── Dialer ──
        (dialer_contacts_router, "/v2/dialer/contacts", ["Dialer Contacts"]),
        (dialer_campaigns_router, "/v2/dialer/campaigns", ["Dialer Campaigns"]),
        (dialer_users_router, "/v2/dialer/users", ["Dialer Users"]),
        (dialer_calls_router, "/v2/dialer/calls", ["Dialer Calls"]),
        (dialer_call_logs_router, "/v2/dialer/call-logs", ["Dialer Call Logs"]),
        (dialer_call_lists_router, "/v2/dialer/call-lists", ["Dialer Call Lists"]),
        (dialer_callbacks_router, "/v2/dialer/callbacks", ["Dialer Callbacks"]),
        (dialer_dispositions_router, "/v2/dialer/dispositions", ["Dialer Dispositions"]),
        (dialer_dnc_router, "/v2/dialer/dnc", ["Dialer DNC"]),
        (dialer_scripts_router, "/v2/dialer/scripts", ["Dialer Scripts"]),
        (dialer_dashboard_router, "/v2/dialer/dashboard", ["Dialer Dashboard"]),
        (dialer_google_router, "/v2/dialer/google", ["Dialer Google"]),
        (dialer_settings_router, "/v2/dialer/settings", ["Dialer Settings"]),
        (dialer_dial_router, "/v2/dialer", ["Dialer"]),
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

    # FreeSWITCH ESLイベントハンドラ起動（環境変数が設定されている場合のみ）
    _esl_started = False
    _dial_loop_started = False
    if settings.FREESWITCH_ESL_HOST:
        try:
            from .services.implementations.freeswitch_event_handler import (
                start_event_handler,
                stop_event_handler,
            )

            start_event_handler(
                esl_host=settings.FREESWITCH_ESL_HOST,
                esl_port=settings.FREESWITCH_ESL_PORT,
                esl_password=settings.FREESWITCH_ESL_PASSWORD,
            )
            _esl_started = True
            logger.info("FreeSWITCH ESL event handler started.")
        except Exception:
            logger.warning("FreeSWITCH ESL event handler起動失敗", exc_info=True)

        # プレディクティブダイヤルループ起動
        try:
            from .services.implementations.predictive_dial_loop import (
                start_dial_loop,
                stop_dial_loop,
            )

            start_dial_loop()
            _dial_loop_started = True
            logger.info("Predictive dial loop started.")
        except Exception:
            logger.warning("プレディクティブダイヤルループ起動失敗", exc_info=True)
    else:
        logger.info("FREESWITCH_ESL_HOST が未設定のためESLイベントハンドラをスキップ")

    try:
        yield
    finally:
        # Shutdown
        if _dial_loop_started:
            try:
                stop_dial_loop()
            except Exception:
                pass
        if _esl_started:
            try:
                stop_event_handler()
            except Exception:
                pass


# ─────────────────────────────────────────────────────────────
# アプリ ファクトリー
# ─────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    settings: Settings = get_settings()

    app = FastAPI(
        title="smartapo",
        version="0.1.0",
        servers=[
            {"url": "http://localhost:8080", "description": "Local"},
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
