# app/auth/dependencies.py

import jwt
from fastapi import Cookie, Depends, Header
from firebase_admin import tenant_mgt
from firebase_admin.auth import ExpiredIdTokenError, InvalidIdTokenError, RevokedIdTokenError

from ...common.exceptions import CredentialsException
from ...common.log_config import autolog


@autolog
def raise_credentials_exception(message: str = "認証エラーが発生しました。") -> None:
    """
    認証系の例外を投げる共通関数
    """
    raise CredentialsException(message)


@autolog
def get_token_from_cookie(
    access_token: str | None = Cookie(default=None),
) -> str:
    """
    Cookie からアクセストークンを取得
    """
    if access_token is None:
        raise_credentials_exception("アクセストークンが存在しません。")
    return access_token


@autolog
def get_token_from_header(authorization: str = Header(None)) -> str:
    """
    Bearer ヘッダからトークンを取り出す
    e.g. "Authorization: Bearer xxxxx"
    """
    if not authorization:
        raise_credentials_exception("Authorization header is missing.")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise_credentials_exception("Invalid authentication scheme.")
    if not token:
        raise_credentials_exception("Token is missing.")

    return token


@autolog
def get_current_user(
    token: str = Depends(get_token_from_header),
) -> tuple[str, str]:
    """
    Firebase トークンを検証し、(user_id, tenant_id) を返す
    """
    try:
        # print("token", token)
        # 署名検証を行わずにトークンをデコードし、tenant_id を取得する
        unverified_claims = jwt.decode(token, options={"verify_signature": False})
        
        # 安全に取得を試みる
        firebase_claim = unverified_claims.get("firebase", {})
        if not isinstance(firebase_claim, dict):
             # firebaseクレームが辞書でない場合のガード
             raise KeyError("firebase claim is not a dict")
             
        tenant_id_from_token = firebase_claim.get("tenant")
        
        if not tenant_id_from_token:
            print(f"Tenant ID missing in unverified token. Claims: {unverified_claims}")
            raise KeyError("tenant_id not found in token")

        # print("tenant_id_from_token", tenant_id_from_token)

        # 取得した tenant_id を使用して tenant_client を生成する
        tenant_client = tenant_mgt.auth_for_tenant(tenant_id_from_token)
        # print("tenant_client", tenant_client)


        # tenant_client を使ってトークンを正式に検証する
        # 時計のズレ(60秒)を許容する
        decoded_token = tenant_client.verify_id_token(token, clock_skew_seconds=60)
        
        # print("decoded_token", decoded_token)
        user_id = decoded_token.get("user_id")
        tenant_data = decoded_token.get("firebase", {})
        tenant_id = tenant_data.get("tenant") if isinstance(tenant_data, dict) else None
        
        if not user_id:
            raise_credentials_exception("ユーザーIDがトークンに含まれていません。")
        if not tenant_id:
            raise_credentials_exception("テナントIDがトークンに含まれていません。")
        return user_id, tenant_id
    except InvalidIdTokenError as e:
        print(f"InvalidIdTokenError: {e}")
        raise_credentials_exception("トークンが無効です。")
    except ExpiredIdTokenError as e:
        print(f"ExpiredIdTokenError: {e}")
        raise_credentials_exception("トークンが期限切れです。")
    except RevokedIdTokenError as e:
        print(f"RevokedIdTokenError: {e}")
        raise_credentials_exception("トークンが無効化されています。")
    except KeyError as e:
        print(f"KeyError during token parsing: {e}")
        raise_credentials_exception("トークンに必要なキーが含まれていません。")
    except Exception as e:
        print(f"Unexpected error verifying token: {e}")
        raise_credentials_exception("トークンの検証に失敗しました。")


@autolog
def get_user_id(
    user_info: tuple[str, str] = Depends(get_current_user),
) -> str:
    """
    current_user から user_id だけを取り出す
    """
    user_id, _ = user_info
    return user_id


@autolog
def get_tenant_id(
    user_info: tuple[str, str] = Depends(get_current_user),
) -> str:
    """
    current_user から tenant_id だけを取り出す
    """
    _, tenant_id = user_info
    return tenant_id
