# app/auth/dependencies.py

import os

from fastapi import Cookie, Depends, Header
from firebase_admin import auth as firebase_auth
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError

from ...common.exceptions import CredentialsException
from ...common.log_config import autolog

_ENV = os.getenv("ENV", "local").lower()
_TENANT_ID = os.getenv("TENANT_ID", "based-template-vbf6m")


@autolog
def raise_credentials_exception(message: str = "認証エラーが発生しました。") -> None:
    raise CredentialsException(message)


@autolog
def get_token_from_cookie(
    access_token: str | None = Cookie(default=None),
) -> str:
    if access_token is None:
        raise_credentials_exception("アクセストークンが存在しません。")
    return access_token


@autolog
def get_token_from_header(authorization: str | None = Header(None)) -> str | None:
    """
    Bearer ヘッダからトークンを取り出す
    ローカル環境ではヘッダーが無くても None を返す
    """
    if not authorization:
        if _ENV == "local":
            return None
        raise_credentials_exception("Authorization header is missing.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise_credentials_exception("Invalid authentication scheme.")
    if not token:
        raise_credentials_exception("Token is missing.")

    return token


@autolog
def get_current_user(
    token: str | None = Depends(get_token_from_header),
) -> tuple[str, str]:
    """
    Firebase トークンを検証し、(user_id, tenant_id) を返す
    tenant_id は環境変数 TENANT_ID から取得（シングルテナント）
    ローカル環境でトークンが無い場合はダミー値を返す
    """
    if token is None and _ENV == "local":
        return ("local-dev-user", _TENANT_ID)

    if token is None:
        raise_credentials_exception("Authorization header is missing.")

    try:
        decoded_token = firebase_auth.verify_id_token(token, clock_skew_seconds=60)

        user_id = decoded_token.get("user_id") or decoded_token.get("uid")
        if not user_id:
            raise_credentials_exception("ユーザーIDがトークンに含まれていません。")

        return user_id, _TENANT_ID
    except InvalidIdTokenError as e:
        print(f"InvalidIdTokenError: {e}")
        raise_credentials_exception("トークンが無効です。")
    except ExpiredIdTokenError as e:
        print(f"ExpiredIdTokenError: {e}")
        raise_credentials_exception("トークンが期限切れです。")
    except RevokedIdTokenError as e:
        print(f"RevokedIdTokenError: {e}")
        raise_credentials_exception("トークンが無効化されています。")
    except Exception as e:
        print(f"Unexpected error verifying token: {e}")
        raise_credentials_exception("トークンの検証に失敗しました。")


@autolog
def get_user_id(
    user_info: tuple[str, str] = Depends(get_current_user),
) -> str:
    user_id, _ = user_info
    return user_id


@autolog
def get_tenant_id(
    user_info: tuple[str, str] = Depends(get_current_user),
) -> str:
    _, tenant_id = user_info
    return tenant_id
