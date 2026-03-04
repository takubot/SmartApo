import uuid
from dataclasses import dataclass
from typing import Any

import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ...models.tables.enum import ExternalServiceTypeEnum
from ...models.tables.model_defs import ChatEntryWebModel, ExternalUserModel


@dataclass(frozen=True)
class ExternalSessionResolution:
    external_user: ExternalUserModel | None
    resolved_session_id: str


def validate_external_session_id(session_id: str) -> str:
    normalized = (session_id or "").strip()
    if not normalized:
        raise ValueError("session_idは必須です。フロントエンドから提供される必要があります。")
    return normalized


def compose_web_scoped_session_id(chat_entry_id: int, external_user_id: str) -> str:
    return f"web:{chat_entry_id}:{external_user_id}"


def extract_external_user_id_from_web_scoped_session(session_id: str) -> str | None:
    if not session_id.startswith("web:"):
        return None
    parts = session_id.split(":", 2)
    if len(parts) != 3:
        return None
    external_user_id = parts[2].strip()
    return external_user_id or None


def derive_legacy_external_user_id_from_session(session_id: str) -> str:
    return f"ext_{session_id}"


def _decode_embed_user_token(chat_entry_web: ChatEntryWebModel, token: str) -> dict[str, Any]:
    """埋め込み先アプリJWTを検証してclaimsを返す。"""
    public_key = (chat_entry_web.embed_user_public_key or "").strip()
    if not public_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="埋め込みユーザー連携が有効ですが、公開鍵が設定されていません",
        )

    algorithm = (chat_entry_web.embed_user_jwt_algorithm or "RS256").strip() or "RS256"
    issuer = (chat_entry_web.embed_user_jwt_issuer or "").strip() or None
    audience = (chat_entry_web.embed_user_jwt_audience or "").strip() or None
    try:
        return jwt.decode(
            token,
            public_key,
            algorithms=[algorithm],
            issuer=issuer,
            audience=audience,
            options={"verify_aud": audience is not None},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"埋め込み先アプリトークンの検証に失敗しました: {str(exc)}",
        ) from exc


def get_or_create_guest_external_user(
    db: Session,
    group_id: str,
    raw_session_id: str,
) -> ExternalUserModel:
    """
    JWTなし外部ユーザー向けに session_id ベースでExternalUserを作成/取得する。
    external_service_user_id は guest:{session_id} で一意化する。
    """
    session_id = validate_external_session_id(raw_session_id)
    guest_external_service_user_id = f"guest:{session_id}"
    external_user = (
        db.query(ExternalUserModel)
        .filter(
            ExternalUserModel.group_id == group_id,
            ExternalUserModel.external_service_type == ExternalServiceTypeEnum.WEB,
            ExternalUserModel.external_service_user_id == guest_external_service_user_id,
        )
        .first()
    )
    if external_user:
        return external_user

    external_user = ExternalUserModel(
        external_user_id=uuid.uuid4().hex,
        group_id=group_id,
        external_service_type=ExternalServiceTypeEnum.WEB,
        external_service_user_id=guest_external_service_user_id,
        display_name=f"Guest_{session_id[:8]}",
        email=None,
        picture_url=None,
    )
    db.add(external_user)
    db.flush()
    return external_user


def get_or_create_line_external_user(
    db: Session,
    group_id: str,
    line_user_id: str,
) -> ExternalUserModel:
    """
    LINEユーザー向けに ExternalUser を作成/取得する。
    """
    normalized_line_user_id = validate_external_session_id(line_user_id)
    external_user = (
        db.query(ExternalUserModel)
        .filter(
            ExternalUserModel.group_id == group_id,
            ExternalUserModel.external_service_type == ExternalServiceTypeEnum.LINE,
            ExternalUserModel.external_service_user_id == normalized_line_user_id,
        )
        .one_or_none()
    )
    if external_user:
        return external_user

    external_user = ExternalUserModel(
        external_user_id=uuid.uuid4().hex,
        group_id=group_id,
        external_service_type=ExternalServiceTypeEnum.LINE,
        external_service_user_id=normalized_line_user_id,
        display_name=f"LINE User {normalized_line_user_id[-4:]}",
    )
    db.add(external_user)
    db.flush()
    return external_user


def resolve_web_external_user_and_session(
    db: Session,
    group_id: str,
    chat_entry_web: ChatEntryWebModel | None,
    request_session_id: str,
    external_auth_token: str | None,
) -> ExternalSessionResolution:
    """
    Webチャネル向け外部ユーザー解決。
    - JWT連携有効: token claimsでExternalUserを作成/更新
    - JWT連携無効: guest ExternalUserを作成
    - どちらも session_id は web:{chat_entry_id}:{external_user_id} に正規化
    """
    resolved_session_id = validate_external_session_id(request_session_id)
    if not chat_entry_web:
        return ExternalSessionResolution(external_user=None, resolved_session_id=resolved_session_id)

    if chat_entry_web.is_embed_user_sync_enabled:
        token = (external_auth_token or "").strip()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="埋め込み先アプリ連携が有効なため externalAuthToken が必須です",
            )

        claims = _decode_embed_user_token(chat_entry_web, token)
        user_id_claim = (chat_entry_web.embed_user_id_claim or "sub").strip() or "sub"
        name_claim = (chat_entry_web.embed_user_name_claim or "name").strip() or "name"
        email_claim = (chat_entry_web.embed_user_email_claim or "email").strip() or "email"
        picture_claim = (chat_entry_web.embed_user_picture_claim or "picture").strip() or "picture"

        external_service_user_id = str(claims.get(user_id_claim, "")).strip()
        if not external_service_user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"トークンに外部ユーザーIDクレーム ({user_id_claim}) が含まれていません",
            )

        display_name = str(claims.get(name_claim, "")).strip() or f"WebUser_{external_service_user_id[:8]}"
        picture_url = str(claims.get(picture_claim, "")).strip() or None
        email = str(claims.get(email_claim, "")).strip() or None

        external_user = (
            db.query(ExternalUserModel)
            .filter(
                ExternalUserModel.group_id == group_id,
                ExternalUserModel.external_service_type == ExternalServiceTypeEnum.WEB,
                ExternalUserModel.external_service_user_id == external_service_user_id,
            )
            .first()
        )
        if not external_user:
            external_user = ExternalUserModel(
                external_user_id=uuid.uuid4().hex,
                group_id=group_id,
                external_service_type=ExternalServiceTypeEnum.WEB,
                external_service_user_id=external_service_user_id,
                display_name=display_name,
                email=email,
                picture_url=picture_url,
            )
            db.add(external_user)
            db.flush()
        else:
            external_user.display_name = display_name
            external_user.email = email
            external_user.picture_url = picture_url
    else:
        scoped_external_user_id = extract_external_user_id_from_web_scoped_session(resolved_session_id)
        if scoped_external_user_id:
            # 既に web:{chat_entry_id}:{external_user_id} 形式のセッションIDが渡された場合は、
            # external_user_id で既存ユーザーを再利用する（chatごとの再生成を防ぐ）。
            external_user = (
                db.query(ExternalUserModel)
                .filter(
                    ExternalUserModel.group_id == group_id,
                    ExternalUserModel.external_service_type == ExternalServiceTypeEnum.WEB,
                    ExternalUserModel.external_user_id == scoped_external_user_id,
                )
                .first()
            )
            if not external_user:
                # 既存ユーザーが見つからない場合のみ、fallbackでゲストユーザーを解決する。
                external_user = get_or_create_guest_external_user(db, group_id, scoped_external_user_id)
        else:
            external_user = get_or_create_guest_external_user(db, group_id, resolved_session_id)

    resolved_session_id = compose_web_scoped_session_id(
        chat_entry_id=chat_entry_web.chat_entry_id,
        external_user_id=external_user.external_user_id,
    )
    return ExternalSessionResolution(external_user=external_user, resolved_session_id=resolved_session_id)


def build_external_history_lookup_candidates(
    db: Session,
    chat_entry_id: int,
    request_session_id: str,
    group_id: str | None = None,
) -> tuple[set[str], set[str]]:
    """
    外部履歴検索用の候補セットを返す。
    戻り値は (session_id_candidates, external_user_id_candidates)。
    """
    normalized_session_id = validate_external_session_id(request_session_id)
    session_id_candidates = {normalized_session_id}
    external_user_id_candidates: set[str] = set()

    parsed_external_user_id = extract_external_user_id_from_web_scoped_session(normalized_session_id)
    if parsed_external_user_id:
        external_user_id_candidates.add(parsed_external_user_id)
        session_id_candidates.add(compose_web_scoped_session_id(chat_entry_id, parsed_external_user_id))

    # 既存形式互換
    external_user_id_candidates.add(normalized_session_id)
    external_user_id_candidates.add(derive_legacy_external_user_id_from_session(normalized_session_id))

    guest_external_service_user_id = f"guest:{normalized_session_id}"
    guest_external_user_query = db.query(ExternalUserModel).filter(
        ExternalUserModel.external_service_type == ExternalServiceTypeEnum.WEB,
        ExternalUserModel.external_service_user_id == guest_external_service_user_id,
    )
    if group_id:
        guest_external_user_query = guest_external_user_query.filter(ExternalUserModel.group_id == group_id)
    guest_external_user = guest_external_user_query.first()
    if guest_external_user:
        external_user_id_candidates.add(guest_external_user.external_user_id)
        session_id_candidates.add(compose_web_scoped_session_id(chat_entry_id, guest_external_user.external_user_id))

    # LINE互換: session_id が line_user_id の場合を考慮
    line_external_user_query = db.query(ExternalUserModel).filter(
        ExternalUserModel.external_service_type == ExternalServiceTypeEnum.LINE,
        ExternalUserModel.external_service_user_id == normalized_session_id,
    )
    if group_id:
        line_external_user_query = line_external_user_query.filter(ExternalUserModel.group_id == group_id)
    line_external_user = line_external_user_query.first()
    if line_external_user:
        external_user_id_candidates.add(line_external_user.external_user_id)

    return session_id_candidates, external_user_id_candidates
