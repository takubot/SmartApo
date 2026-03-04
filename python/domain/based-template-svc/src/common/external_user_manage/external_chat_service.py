from __future__ import annotations

import json
from collections.abc import Generator

from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .human_handoff_store import (
    append_handoff_message,
    get_handoff_state,
    is_handoff_mode,
)
from ...models.tables.model_defs import ChatSpaceModel


def get_or_create_external_chat_space(
    db: Session,
    *,
    group_id: str,
    external_user_id: str,
    chat_entry_id: int,
    requested_chat_space_id: int | None,
) -> int:
    """外部チャット用に chat_entry_id が必ず入った ChatSpace を取得/作成する。"""
    if requested_chat_space_id is not None:
        requested_space = (
            db.query(ChatSpaceModel)
            .filter(
                ChatSpaceModel.chat_space_id == requested_chat_space_id,
                ChatSpaceModel.group_id == group_id,
                ChatSpaceModel.external_user_id == external_user_id,
                ChatSpaceModel.is_deleted == False,
            )
            .first()
        )
        if requested_space:
            if requested_space.chat_entry_id is None:
                requested_space.chat_entry_id = chat_entry_id
                db.commit()
            elif requested_space.chat_entry_id != chat_entry_id:
                new_space = ChatSpaceModel(
                    group_id=group_id,
                    user_id=None,
                    external_user_id=external_user_id,
                    chat_entry_id=chat_entry_id,
                )
                db.add(new_space)
                db.commit()
                return new_space.chat_space_id
            return requested_space.chat_space_id

    existing_spaces = (
        db.query(ChatSpaceModel)
        .filter(
            ChatSpaceModel.group_id == group_id,
            ChatSpaceModel.external_user_id == external_user_id,
            ChatSpaceModel.chat_entry_id == chat_entry_id,
            ChatSpaceModel.is_deleted == False,
        )
        .order_by(ChatSpaceModel.created_at.desc())
        .all()
    )

    for space in existing_spaces:
        if is_handoff_mode(space.response_mode, space.friend_chat_status):
            return space.chat_space_id
        fs_state = get_handoff_state(space.chat_space_id)
        if fs_state and is_handoff_mode(fs_state.response_mode, fs_state.friend_chat_status):
            return space.chat_space_id

    if existing_spaces:
        return existing_spaces[0].chat_space_id

    new_space = ChatSpaceModel(
        group_id=group_id,
        user_id=None,
        external_user_id=external_user_id,
        chat_entry_id=chat_entry_id,
    )
    db.add(new_space)
    db.commit()
    return new_space.chat_space_id


def store_external_user_message_if_handoff_active(
    db: Session,
    *,
    chat_space_id: int,
    group_id: str,
    message: str,
    source_channel: str,
) -> bool:
    """
    有人対応中であれば Firestore に外部ユーザーメッセージを保存して True を返す。
    それ以外は何もしないで False を返す。
    """
    chat_space = (
        db.query(ChatSpaceModel)
        .filter(ChatSpaceModel.chat_space_id == chat_space_id)
        .first()
    )
    if not message.strip():
        return False

    fs_state = get_handoff_state(chat_space_id)
    response_mode = (
        fs_state.response_mode
        if fs_state and fs_state.response_mode
        else (chat_space.response_mode if chat_space else None)
    )
    friend_chat_status = (
        fs_state.friend_chat_status
        if fs_state and fs_state.friend_chat_status is not None
        else (chat_space.friend_chat_status if chat_space else None)
    )

    if not is_handoff_mode(response_mode, friend_chat_status):
        return False

    append_handoff_message(
        chat_space_id=chat_space_id,
        group_id=group_id,
        content=message,
        sender_type="user",
        response_mode=response_mode,
        friend_chat_status=friend_chat_status,
        operator_user_id=fs_state.operator_user_id if fs_state else None,
        operator_name=fs_state.operator_name if fs_state else None,
        source_channel=source_channel,
    )
    return True


def build_handoff_ack_streaming_response(session_id: str) -> StreamingResponse:
    """有人対応中に AI 応答を止めるための共通 ACK ストリーム。"""

    def _stream() -> Generator[str, None, None]:
        yield "event: answer_type\ndata: {\"type\":\"handoff\"}\n\n"
        payload = {
            "chatId": None,
            "sessionId": session_id,
            "fileReferenceLinkJson": {"files": [], "links": []},
        }
        yield f"event: chat_complete\ndata: {json.dumps(payload, ensure_ascii=True)}\n\n"

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
