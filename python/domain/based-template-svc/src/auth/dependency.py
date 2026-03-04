# # dependency.py
# from __future__ import annotations

# import contextvars
# from collections.abc import Iterator
# from contextlib import contextmanager
# from logging import getLogger
# from typing import Any

# from cryptography.hazmat.primitives import serialization
# from fastapi import HTTPException, Request, status
# from jose import JWTError, jwt

# from ..common.env_config import get_settings

# logger = getLogger(__name__)

# __all__ = (
#     "set_current_account",
#     "get_current_account",
#     "clear_current_account",
#     "require_current_account",
#     "set_current_tenant",
#     "get_current_tenant",
#     "clear_current_tenant",
#     "require_current_tenant",
#     "set_current_membership",
#     "get_current_membership",
#     "clear_current_membership",
#     "require_current_membership",
#     "system_account",
#     "authenticate_account",
# )

# # ---------------------------------------------------------------------------
# # Task-local storage
# # ---------------------------------------------------------------------------

# _CURRENT_TENANT: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_tenant", default=None)
# _CURRENT_ACCOUNT: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_account", default=None)
# _CURRENT_MEMBERSHIP: contextvars.ContextVar[str | None] = contextvars.ContextVar("current_membership", default=None)
# _SYSTEM_ACCOUNT_ID = "SYSTEM"


# def set_current_account(account_id: str) -> None:
#     if not account_id:
#         raise ValueError("account_id must be non-empty")
#     _CURRENT_ACCOUNT.set(account_id)


# def get_current_account() -> str | None:
#     if settings.is_local:
#         return "LOCAL"
#     return _CURRENT_ACCOUNT.get()


# def clear_current_account() -> None:
#     _CURRENT_ACCOUNT.set(None)


# def require_current_account() -> str:
#     account_id = get_current_account()
#     if account_id is None:
#         raise RuntimeError("Current account not set. Did you run authenticate_account() or set_current_account()?")
#     return account_id


# def set_current_tenant(tenant_id: str) -> None:
#     if not tenant_id:
#         raise ValueError("tenant_id must be non-empty")
#     _CURRENT_TENANT.set(tenant_id)


# def get_current_tenant() -> str | None:
#     if settings.is_local:
#         return "LOCAL"
#     return _CURRENT_TENANT.get()


# def clear_current_tenant() -> None:
#     _CURRENT_TENANT.set(None)


# def require_current_tenant() -> str:
#     tenant_id = get_current_tenant()
#     if tenant_id is None:
#         raise RuntimeError("Current tenant not set. Did you run set_current_tenant()?")
#     return tenant_id


# def set_current_membership(membership_id: str) -> None:
#     if not membership_id:
#         raise ValueError("membership_id must be non-empty")
#     _CURRENT_MEMBERSHIP.set(membership_id)


# def get_current_membership() -> str | None:
#     if settings.is_local:
#         return "LOCAL"
#     return _CURRENT_MEMBERSHIP.get()


# def clear_current_membership() -> None:
#     _CURRENT_MEMBERSHIP.set(None)


# def require_current_membership() -> str:
#     membership_id = get_current_membership()
#     if membership_id is None:
#         raise RuntimeError("Current membership not set. Did you run set_current_membership()?")
#     return membership_id

# 
# @contextmanager
# def system_account() -> Iterator[None]:
#     token = _CURRENT_ACCOUNT.set(_SYSTEM_ACCOUNT_ID)
#     try:
#         yield
#     finally:
#         _CURRENT_ACCOUNT.reset(token)


# # ---------------------------------------------------------------------------
# # JWT authentication dependency for FastAPI
# # ---------------------------------------------------------------------------

# settings = get_settings()

# # 署名検証パラメータ（発行側と一致させる）
# JWT_ALGS = ["ES256"]
# JWT_ISS = settings.jwt_api_issuer
# JWT_AUD = settings.jwt_api_audience

# # 例: {"app-jwt-ec-1": "<PEM文字列>", ...} あるいは {"kid": {JWK dict}, ...}
# PUBLIC_KEYS_BY_KID = settings.jwt_public_key_by_kid


# def _get_token_from_request(req: Request) -> str | None:
#     # Authorization: Bearer ... を優先。なければ Cookie(app_token) を見る
#     auth = req.headers.get("Authorization")
#     logger.info(f"auth: {auth}")
#     if auth and auth.lower().startswith("bearer "):
#         return auth.split(" ", 1)[1].strip()
#     return req.cookies.get("app_token")


# def _resolve_public_key_for_kid(kid: str | None) -> Any:
#     """
#     settings.PUBLIC_KEYS_BY_KID から kid に対応する公開鍵を返す。
#     値は PEM 文字列でも JWK(dict) でも良い。python-jose は双方を受け付ける。
#     """
#     if not kid:
#         raise HTTPException(status_code=401, detail="Missing kid in JWT header")

#     key = PUBLIC_KEYS_BY_KID.get(kid)
#     if not key:
#         raise HTTPException(status_code=401, detail="Unknown key id")

#     # PEM 文字列なら、cryptography オブジェクトにしてもOKだし、そのまま jose に渡してもOK。
#     if isinstance(key, str) and "BEGIN PUBLIC KEY" in key:
#         try:
#             # cryptography オブジェクトに変換（どちらでも可）
#             return serialization.load_pem_public_key(key.encode("utf-8"))
#         except Exception:
#             # 失敗したら PEM 文字列のまま jose に渡す（jose は PEM 文字列を受け付ける）
#             return key

#     # JWK(dict) の場合はそのまま返す
#     return key


# async def authenticate_account(request: Request) -> str:
#     """
#     FastAPI 依存関数:
#       1) Authorization/Cookie から JWT を取得
#       2) kid→公開鍵を解決し、ES256 + iss/aud/exp/iat を検証
#       3) 必須クレームを確認
#       4) ContextVar に格納（account=sub, tenant=tenant_id）
#       5) handler で使いやすいよう account_id(sub) を返す
#     """
#     if settings.is_local:
#         return "LOCAL"
#     token = _get_token_from_request(request)
#     logger.info(f"token: {token}")
#     if not token:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

#     try:
#         header = jwt.get_unverified_header(token)
#         pubkey = _resolve_public_key_for_kid(header.get("kid"))

#         payload = jwt.decode(
#             token,
#             pubkey,
#             algorithms=JWT_ALGS,
#             audience=JWT_AUD,
#             issuer=JWT_ISS,
#             options={"require_exp": True, "require_iat": True},
#         )
#     except JWTError:
#         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

#     # 発行側（_issue_jwt）と対応する必須クレーム
#     required = ["sub", "tenant_id", "membership_id", "roles"]
#     if any(k not in payload for k in required):
#         raise HTTPException(status_code=401, detail="Claims missing")

#     # コンテキストに保存（用途に応じてどちらを account とするかは運用で決める）
#     # ここでは 'sub'（= account_id）をユーザー、tenant_id をテナントとして格納
#     set_current_account(payload["sub"])
#     set_current_tenant(payload["tenant_id"])
#     set_current_membership(payload["membership_id"])

#     # 役割などをハンドラで使いたければ、request.state に載せてもよい
#     request.state.membership_id = payload["membership_id"]
#     request.state.roles = payload.get("roles", [])

#     return payload["sub"]
