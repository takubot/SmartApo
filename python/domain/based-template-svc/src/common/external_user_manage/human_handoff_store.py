from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import firebase_admin
from firebase_admin import firestore
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from ...auth.authentication.firebase_init import initialize_firebase
from ...common.env_config import TENANT_ID, get_settings
from ...models.tables.model_defs import ChatHistoryModel, ChatSpaceModel, UserChatLogModel
from ...models.tables.enum import ChatTypeEnum
from ...routers.notification.service import create_notification

logger = logging.getLogger(__name__)

_ROOT_COLLECTION = "handoff_sessions"
_MESSAGES_SUBCOLLECTION = "messages"
_TENANT_COLLECTION = "handoff_tenants"
_GROUP_COLLECTION = "groups"
@dataclass(frozen=True)
class FirestoreHandoffMessage:
    message_id: str
    content: str
    sender_type: str
    created_at_iso: str
    response_mode: str | None = None
    friend_chat_status: str | None = None
    operator_user_id: str | None = None
    operator_name: str | None = None


@dataclass(frozen=True)
class FirestoreHandoffState:
    chat_space_id: int
    response_mode: str
    friend_chat_status: str | None
    operator_user_id: str | None
    operator_name: str | None
    updated_at_iso: str | None


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_client() -> firestore.Client | None:
    try:
        if not firebase_admin._apps:
            initialize_firebase()
        settings = get_settings()
        database_id = (settings.firestore_database_id or "").strip()
        # 名前付きDBを使用する場合は明示的に渡す
        if database_id and database_id not in {"(default)", "default"}:
            return firestore.client(database_id=database_id)
        return firestore.client()
    except Exception as exc:
        logger.warning("Firestore client initialization failed: %s", exc)
        return None


def _tenant_ref(client: firestore.Client):
    return client.collection(_TENANT_COLLECTION).document(TENANT_ID)


def _session_ref(client: firestore.Client, chat_space_id: int):
    return _tenant_ref(client).collection(_ROOT_COLLECTION).document(str(chat_space_id))


def _group_session_ref(client: firestore.Client, group_id: str, chat_space_id: int):
    return (
        _tenant_ref(client)
        .collection(_GROUP_COLLECTION)
        .document(group_id)
        .collection(_ROOT_COLLECTION)
        .document(str(chat_space_id))
    )


def is_handoff_mode(response_mode: str | None, friend_chat_status: str | None) -> bool:
    if (response_mode or "").upper() == "FRIEND":
        return True
    return (friend_chat_status or "").upper() in {"WAITING", "IN_PROGRESS", "ANSWERED"}


def upsert_handoff_state(
    *,
    chat_space_id: int,
    group_id: str,
    response_mode: str,
    friend_chat_status: str | None,
    operator_user_id: str | None = None,
    operator_name: str | None = None,
) -> None:
    client = _ensure_client()
    if client is None:
        return

    now_iso = _utc_now_iso()
    payload = {
        "chatSpaceId": chat_space_id,
        "groupId": group_id,
        "responseMode": response_mode,
        "friendChatStatus": friend_chat_status,
        "operatorUserId": operator_user_id,
        "operatorName": operator_name,
        "updatedAtIso": now_iso,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    try:
        _session_ref(client, chat_space_id).set(payload, merge=True)
        _group_session_ref(client, group_id, chat_space_id).set(payload, merge=True)
    except Exception as exc:
        logger.warning("Failed to upsert handoff state. chat_space_id=%s error=%s", chat_space_id, exc)


def append_handoff_message(
    *,
    chat_space_id: int,
    group_id: str,
    content: str,
    sender_type: str,
    response_mode: str | None = None,
    friend_chat_status: str | None = None,
    operator_user_id: str | None = None,
    operator_name: str | None = None,
    source_channel: str | None = None,
) -> str | None:
    if not content.strip():
        return None

    client = _ensure_client()
    if client is None:
        return None

    now_iso = _utc_now_iso()
    session_ref = _session_ref(client, chat_space_id)
    message_ref = session_ref.collection(_MESSAGES_SUBCOLLECTION).document()
    payload = {
        "messageId": message_ref.id,
        "chatSpaceId": chat_space_id,
        "groupId": group_id,
        "content": content,
        "senderType": sender_type,
        "responseMode": response_mode,
        "friendChatStatus": friend_chat_status,
        "operatorUserId": operator_user_id,
        "operatorName": operator_name,
        "sourceChannel": source_channel,
        "createdAtIso": now_iso,
        "createdAt": firestore.SERVER_TIMESTAMP,
    }
    try:
        message_ref.set(payload)
        session_ref.set(
            {
                "chatSpaceId": chat_space_id,
                "groupId": group_id,
                "responseMode": response_mode or "FRIEND",
                "friendChatStatus": friend_chat_status,
                "operatorUserId": operator_user_id,
                "operatorName": operator_name,
                "lastMessageAtIso": now_iso,
                "updatedAtIso": now_iso,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        _group_session_ref(client, group_id, chat_space_id).set(
            {
                "chatSpaceId": chat_space_id,
                "groupId": group_id,
                "responseMode": response_mode or "FRIEND",
                "friendChatStatus": friend_chat_status,
                "operatorUserId": operator_user_id,
                "operatorName": operator_name,
                "lastMessageAtIso": now_iso,
                "updatedAtIso": now_iso,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        return message_ref.id
    except Exception as exc:
        logger.warning("Failed to append handoff message. chat_space_id=%s error=%s", chat_space_id, exc)
        return None


def get_handoff_state(chat_space_id: int) -> FirestoreHandoffState | None:
    client = _ensure_client()
    if client is None:
        return None

    try:
        snap = _session_ref(client, chat_space_id).get()
    except Exception as exc:
        logger.warning("Failed to fetch handoff state. chat_space_id=%s error=%s", chat_space_id, exc)
        return None
    if not snap.exists:
        return None
    data = snap.to_dict() or {}
    return FirestoreHandoffState(
        chat_space_id=chat_space_id,
        response_mode=(data.get("responseMode") or "AI"),
        friend_chat_status=data.get("friendChatStatus"),
        operator_user_id=data.get("operatorUserId"),
        operator_name=data.get("operatorName"),
        updated_at_iso=data.get("updatedAtIso"),
    )


def get_handoff_messages(chat_space_id: int, *, limit: int = 300) -> list[FirestoreHandoffMessage]:
    client = _ensure_client()
    if client is None:
        return []

    messages_ref = _session_ref(client, chat_space_id).collection(_MESSAGES_SUBCOLLECTION)
    query = messages_ref.order_by("createdAtIso").limit(max(1, min(limit, 1000)))

    results: list[FirestoreHandoffMessage] = []
    try:
        for snap in query.stream():
            data = snap.to_dict() or {}
            results.append(
                FirestoreHandoffMessage(
                    message_id=str(data.get("messageId") or snap.id),
                    content=str(data.get("content") or ""),
                    sender_type=str(data.get("senderType") or "system"),
                    created_at_iso=str(data.get("createdAtIso") or _utc_now_iso()),
                    response_mode=(data.get("responseMode") if isinstance(data.get("responseMode"), str) else None),
                    friend_chat_status=(
                        data.get("friendChatStatus") if isinstance(data.get("friendChatStatus"), str) else None
                    ),
                    operator_user_id=(
                        data.get("operatorUserId") if isinstance(data.get("operatorUserId"), str) else None
                    ),
                    operator_name=(data.get("operatorName") if isinstance(data.get("operatorName"), str) else None),
                )
            )
    except Exception as exc:
        logger.warning("Failed to fetch handoff messages. chat_space_id=%s error=%s", chat_space_id, exc)
        return []
    return results


def _get_chat_space(db: Session, chat_space_id: int) -> ChatSpaceModel | None:
    return db.query(ChatSpaceModel).filter(ChatSpaceModel.chat_space_id == chat_space_id).first()


def _split_user_identifiers(chat_space: ChatSpaceModel | None) -> tuple[str | None, str | None]:
    if not chat_space:
        return None, None
    if chat_space.external_user_id:
        external_user_id = chat_space.external_user_id
        session_id = external_user_id[4:] if external_user_id.startswith("ext_") else external_user_id
        return None, session_id
    return chat_space.user_id, None


def record_human_message(
    db: Session,
    chat_space_id: int,
    group_id: str,
    operator_id: str,
    message: str,
) -> int:
    """オペレーターからのメッセージを履歴とログに記録する"""
    chat_space = _get_chat_space(db, chat_space_id)
    user_id, session_id = _split_user_identifiers(chat_space)
    entry_id = chat_space.chat_entry_id if chat_space else None

    if chat_space:
        chat_space.response_mode = "FRIEND"
        chat_space.friend_chat_status = "ANSWERED"

    chat_history = ChatHistoryModel(
        chat_space_id=chat_space_id,
        bot_id=None,
        user_question="",
        formatted_user_question="",
        bot_answer=message,
        chat_type=ChatTypeEnum.HUMAN_OPERATOR,
        is_reference_link_display=False,
    )
    db.add(chat_history)
    db.flush()

    chat_log = UserChatLogModel(
        user_id=user_id,
        session_id=session_id,
        group_id=group_id,
        chat_space_id=chat_space_id,
        chat_history_id=chat_history.chat_history_id,
        bot_id=None,
        chat_question="",
        chat_answer=message,
        model="human",
        response_mode="FRIEND",
        friend_chat_status="ANSWERED",
        friend_chat_responded_user_id=operator_id,
        friend_chat_responded_at=datetime.now(),
        entry_id=entry_id,
    )
    db.add(chat_log)
    return chat_history.chat_history_id


def record_system_event(
    db: Session,
    chat_space_id: int,
    group_id: str,
    message: str,
    response_mode: str | None = None,
    friend_chat_status: str | None = None,
    operator_id: str | None = None,
) -> int | None:
    """システムイベントをチャット履歴として保存する"""
    chat_space = _get_chat_space(db, chat_space_id)
    if chat_space:
        if response_mode:
            chat_space.response_mode = response_mode
        if friend_chat_status:
            chat_space.friend_chat_status = friend_chat_status

    user_id, session_id = _split_user_identifiers(chat_space)
    entry_id = chat_space.chat_entry_id if chat_space else None

    chat_history = ChatHistoryModel(
        chat_space_id=chat_space_id,
        bot_id=None,
        user_question="",
        formatted_user_question="",
        bot_answer=message,
        chat_type=ChatTypeEnum.SYSTEM_EVENT,
        is_reference_link_display=False,
    )
    db.add(chat_history)
    db.flush()

    # システムイベントはchat_historyのみに保持し、user_chat_logには保存しない。
    return chat_history.chat_history_id


def set_human_handoff_status(
    db: Session,
    chat_space_id: int,
    group_id: str,
    status: str = "WAITING",
) -> None:
    """有人連携のステータスを更新または新規作成する"""
    latest_log = (
        db.query(UserChatLogModel)
        .filter(UserChatLogModel.chat_space_id == chat_space_id)
        .order_by(desc(UserChatLogModel.created_at))
        .first()
    )

    if latest_log:
        latest_log.response_mode = "FRIEND"
        latest_log.friend_chat_status = status
    chat_space = _get_chat_space(db, chat_space_id)
    if chat_space:
        chat_space.response_mode = "FRIEND"
        chat_space.friend_chat_status = status

    create_notification(
        db,
        group_id=group_id,
        title="有人対応待機",
        body="有人対応で待っている人がいます！",
        notification_type="HUMAN_HANDOFF_WAITING",
        data={"chatSpaceId": chat_space_id},
        chat_space_id=chat_space_id,
        external_user_id=getattr(chat_space, "external_user_id", None) if chat_space else None,
        dedupe_key=f"handoff_waiting_{chat_space_id}",
    )


def accept_human_handoff(db: Session, chat_space_id: int, group_id: str, operator_id: str) -> bool:
    """有人連携のリクエストを受け入れる"""
    latest_log = (
        db.query(UserChatLogModel)
        .filter(UserChatLogModel.chat_space_id == chat_space_id)
        .order_by(desc(UserChatLogModel.created_at))
        .first()
    )

    if latest_log:
        latest_log.response_mode = "FRIEND"
        latest_log.friend_chat_status = "IN_PROGRESS"
        latest_log.friend_chat_responded_user_id = operator_id
        latest_log.friend_chat_responded_at = datetime.now()
    chat_space = _get_chat_space(db, chat_space_id)
    if chat_space:
        chat_space.response_mode = "FRIEND"
        chat_space.friend_chat_status = "IN_PROGRESS"

    return True


def close_human_handoff(db: Session, chat_space_id: int, group_id: str) -> bool:
    """有人連携を終了しAIモードに戻す"""
    latest_log = (
        db.query(UserChatLogModel)
        .filter(UserChatLogModel.chat_space_id == chat_space_id)
        .order_by(desc(UserChatLogModel.created_at))
        .first()
    )

    if latest_log:
        latest_log.response_mode = "AI"
        latest_log.friend_chat_status = "CLOSED"
    chat_space = _get_chat_space(db, chat_space_id)
    if chat_space:
        chat_space.response_mode = "AI"
        chat_space.friend_chat_status = "CLOSED"

    create_notification(
        db,
        group_id=group_id,
        title="有人対応終了",
        body="担当者が対応を終了しました。",
        notification_type="HUMAN_HANDOFF_CLOSED",
        data={"chatSpaceId": chat_space_id},
        chat_space_id=chat_space_id,
        external_user_id=getattr(chat_space, "external_user_id", None) if chat_space else None,
        dedupe_key=f"handoff_closed_{chat_space_id}",
    )
    return True


def get_waiting_human_handoffs(db: Session, group_id: str) -> Iterable[UserChatLogModel]:
    """グループ内の待機中の有人対応リクエストを取得する"""
    subquery = (
        db.query(
            UserChatLogModel.chat_space_id,
            func.max(UserChatLogModel.created_at).label("max_created_at"),
        )
        .filter(UserChatLogModel.group_id == group_id)
        .group_by(UserChatLogModel.chat_space_id)
        .subquery()
    )

    waiting_logs = (
        db.query(UserChatLogModel)
        .join(
            subquery,
            (UserChatLogModel.chat_space_id == subquery.c.chat_space_id)
            & (UserChatLogModel.created_at == subquery.c.max_created_at),
        )
        .filter(
            UserChatLogModel.response_mode == "FRIEND",
            UserChatLogModel.friend_chat_status == "WAITING",
        )
        .all()
    )

    return waiting_logs
