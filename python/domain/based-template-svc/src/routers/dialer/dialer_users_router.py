"""ユーザールーター

ログインユーザーと自動連携し、手動でユーザーを登録する必要なし。
GET /me で自分のユーザー情報を取得（存在しなければ自動作成）。
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.enum import UserStatusEnum
from ...models.tables.model_defs import DialerUserModel
from .schemas.user_schemas import (
    UserCreateSchema,
    UserResponseSchema,
    UserStatusUpdateSchema,
    UserUpdateSchema,
)

router = APIRouter()
JST = timezone(timedelta(hours=9))
logger = getLogger(__name__)
_ENV = os.getenv("ENV", "local").lower()
_EXTENSION_START = 1001


def _next_extension(db: Session, tenant_id: str) -> str:
    """テナント内で使われていない次の内線番号を自動採番する"""
    existing = (
        db.execute(
            select(DialerUserModel.extension).where(
                DialerUserModel.tenant_id == tenant_id,
                DialerUserModel.extension.isnot(None),
                DialerUserModel.is_deleted.is_(False),
            )
        )
        .scalars()
        .all()
    )
    max_ext = max(
        (int(e) for e in existing if e and e.isdigit()),
        default=_EXTENSION_START - 1,
    )
    return str(max_ext + 1)


def _get_firebase_display_name(firebase_uid: str) -> str | None:
    """Firebase から表示名を取得する（取得できなければ None）"""
    if _ENV == "local":
        return None
    try:
        from firebase_admin import auth as firebase_auth

        fb_user = firebase_auth.get_user(firebase_uid)
        return fb_user.display_name or fb_user.email
    except Exception:
        return None


# ── 自分のユーザー情報 ──────────────────────────────────────


@router.get("/me", response_model=UserResponseSchema)
def get_or_create_my_user(
    display_name: str | None = Query(
        None, description="表示名（初回自動作成時に使用）"
    ),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ログインユーザーの情報を取得（なければ自動作成）

    フロントエンドはログイン後にこのエンドポイントを呼ぶだけで
    ユーザー登録が完了する。内線番号も自動採番される。
    """
    firebase_uid, tenant_id = auth

    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()

    if user:
        return UserResponseSchema.model_validate(user)

    # 表示名の決定: リクエスト > Firebase > デフォルト
    name = (
        display_name
        or _get_firebase_display_name(firebase_uid)
        or f"User-{firebase_uid[:8]}"
    )

    user = DialerUserModel(
        tenant_id=tenant_id,
        firebase_uid=firebase_uid,
        display_name=name,
        extension=_next_extension(db, tenant_id),
    )
    db.add(user)
    db.flush()

    logger.info(
        "ユーザー自動作成: firebase_uid=%s ext=%s name=%s",
        firebase_uid,
        user.extension,
        user.display_name,
    )
    return UserResponseSchema.model_validate(user)


@router.put("/me/status", response_model=UserResponseSchema)
def update_my_status(
    body: UserStatusUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """自分のステータスを変更"""
    firebase_uid, tenant_id = auth
    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "ユーザー情報が見つかりません")
    user.status = UserStatusEnum(body.status)
    user.status_changed_at = datetime.now(JST)
    db.flush()
    return UserResponseSchema.model_validate(user)


# ── 一覧・管理用エンドポイント ────────────────────────────────


@router.get("", response_model=list[UserResponseSchema])
def list_users(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ユーザー一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [UserResponseSchema.model_validate(r) for r in rows]


@router.post("", response_model=UserResponseSchema, status_code=201)
def create_user(
    body: UserCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ユーザー登録（Identity Platform + DB）"""
    from firebase_admin import auth as firebase_auth

    _, tenant_id = auth

    # 1. Identity Platform に既存ユーザーがいるか確認
    try:
        existing_fb = firebase_auth.get_user_by_email(body.email)
        firebase_uid = existing_fb.uid
        logger.info("既存Firebaseユーザーを使用: email=%s uid=%s", body.email, firebase_uid)
    except firebase_auth.UserNotFoundError:
        # 2. Identity Platform にユーザーを作成
        fb_user = firebase_auth.create_user(
            email=body.email,
            password=body.password,
            display_name=body.display_name,
            email_verified=True,
        )
        firebase_uid = fb_user.uid
        logger.info("Firebaseユーザー作成: email=%s uid=%s", body.email, firebase_uid)
    except Exception as e:
        raise HTTPException(400, f"Firebaseユーザー作成に失敗しました: {e}")

    # 3. DB に既に同じ firebase_uid のユーザーがいないか確認
    existing_db = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.firebase_uid == firebase_uid,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if existing_db:
        raise HTTPException(409, "このメールアドレスのユーザーは既に登録されています")

    # 4. DB にユーザー登録
    ext = body.extension or _next_extension(db, tenant_id)
    user = DialerUserModel(
        tenant_id=tenant_id,
        firebase_uid=firebase_uid,
        display_name=body.display_name,
        extension=ext,
        skills=body.skills,
        max_concurrent_calls=body.max_concurrent_calls,
    )
    db.add(user)
    db.flush()
    return UserResponseSchema.model_validate(user)


@router.get("/status-board", response_model=list[UserResponseSchema])
def status_board(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """リアルタイムステータスボード"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        ).order_by(DialerUserModel.status)
    ).scalars().all()
    return [UserResponseSchema.model_validate(r) for r in rows]


@router.get("/available", response_model=list[UserResponseSchema])
def available_users(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """利用可能なユーザー一覧"""
    _, tenant_id = auth
    rows = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.status == UserStatusEnum.AVAILABLE,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [UserResponseSchema.model_validate(r) for r in rows]


@router.get("/{user_id}", response_model=UserResponseSchema)
def get_user(
    user_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ユーザー詳細"""
    _, tenant_id = auth
    user = _get_user(user_id, tenant_id, db)
    return UserResponseSchema.model_validate(user)


@router.put("/{user_id}", response_model=UserResponseSchema)
def update_user(
    user_id: str,
    body: UserUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ユーザー更新"""
    _, tenant_id = auth
    user = _get_user(user_id, tenant_id, db)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(user, key, val)
    db.flush()
    return UserResponseSchema.model_validate(user)


@router.put("/{user_id}/status", response_model=UserResponseSchema)
def update_user_status(
    user_id: str,
    body: UserStatusUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ステータス変更"""
    _, tenant_id = auth
    user = _get_user(user_id, tenant_id, db)
    user.status = UserStatusEnum(body.status)
    user.status_changed_at = datetime.now(JST)
    db.flush()
    return UserResponseSchema.model_validate(user)


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """ユーザー論理削除 + Identity Platform から削除"""
    from firebase_admin import auth as firebase_auth

    _, tenant_id = auth
    user = _get_user(user_id, tenant_id, db)

    # Identity Platform から削除
    try:
        firebase_auth.delete_user(user.firebase_uid)
        logger.info("Firebaseユーザー削除: uid=%s", user.firebase_uid)
    except firebase_auth.UserNotFoundError:
        logger.warning("Firebaseユーザーが見つかりません: uid=%s", user.firebase_uid)
    except Exception as e:
        logger.error("Firebaseユーザー削除失敗: uid=%s error=%s", user.firebase_uid, e)
        raise HTTPException(500, f"Identity Platformからの削除に失敗しました: {e}")

    # DB 論理削除
    user.is_deleted = True
    user.deleted_at = datetime.now(JST)
    db.flush()


def _get_user(user_id: str, tenant_id: str, db: Session) -> DialerUserModel:
    user = db.execute(
        select(DialerUserModel).where(
            DialerUserModel.user_id == user_id,
            DialerUserModel.tenant_id == tenant_id,
            DialerUserModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "ユーザーが見つかりません")
    return user
