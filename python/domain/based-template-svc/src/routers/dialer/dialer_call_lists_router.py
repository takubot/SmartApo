"""コールリストルーター"""

from __future__ import annotations

import json
import re
from datetime import date as date_type
from datetime import datetime, timedelta, timezone
from logging import getLogger
from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query
from google.auth.exceptions import RefreshError
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...common.env_config import get_settings
from ...database_utils.database import get_sync_session
from ...models.tables.enum import (
    CallStatusEnum,
    GoogleIntegrationTypeEnum,
    GoogleSyncStatusEnum,
    TeleStatusEnum,
)
from ...models.tables.model_defs import (
    DialerCallListContactModel,
    DialerCallListModel,
    DialerCallLogModel,
    DialerContactModel,
    DialerGoogleIntegrationModel,
)
from ...services.implementations.di import get_sheets_service, get_telephony_service
from .calling_session import (
    create_session as create_calling_session,
    get_session,
    get_sids_to_cancel,
    mark_canceled,
    remove_session,
)
from .schemas.call_list_schemas import (
    CallListContactAddSchema,
    CallListContactDetailSchema,
    CallListCreateSchema,
    CallListResponseSchema,
    CallListUpdateSchema,
    CallResultRequestSchema,
    CallingSessionCallSchema,
    CallingSessionContactSchema,
    CallingSessionStatusSchema,
    SheetTabListSchema,
    SheetTabSchema,
    SheetsImportRequestSchema,
    SheetsImportResponseSchema,
    SheetsPreviewRequestSchema,
    SheetsPreviewResponseSchema,
    SheetsSyncResponseSchema,
    SpreadsheetItemSchema,
    SpreadsheetListSchema,
    StartCallingRequestSchema,
    StartCallingResponseSchema,
)
from .schemas.common_schemas import MessageResponse, PaginatedResponse

logger = getLogger(__name__)

router = APIRouter()
JST = timezone(timedelta(hours=9))

# スプシヘッダー → contactフィールドのデフォルトマッピング
DEFAULT_COLUMN_MAP: dict[str, str] = {
    # 氏名（フルネーム）
    "氏名": "name",
    "名前": "name",
    "フルネーム": "name",
    "担当者名": "name",
    "担当者": "name",
    "氏名カナ": "name_kana",
    "フリガナ": "name_kana",
    "カナ": "name_kana",
    # 姓・名（分割）
    "姓": "last_name",
    "名": "first_name",
    "姓（カナ）": "last_name_kana",
    "名（カナ）": "first_name_kana",
    # 電話
    "電話番号": "phone_primary",
    "電話": "phone_primary",
    "TEL": "phone_primary",
    "携帯": "phone_mobile",
    "携帯電話": "phone_mobile",
    "副電話番号": "phone_secondary",
    # その他
    "メール": "email",
    "メールアドレス": "email",
    "会社名": "company_name",
    "会社": "company_name",
    "部署": "department",
    "役職": "position",
    "郵便番号": "postal_code",
    "都道府県": "prefecture",
    "市区町村": "city",
    "住所": "address_line",
    "備考": "notes",
    "備考1": "notes",
    "メモ": "notes",
    "備考2": "notes2",
    "備考3": "notes3",
    # 日付
    "生年月日": "birth_date",
    "誕生日": "birth_date",
    "登録日": "registered_date",
    "リスト登録日": "registered_date",
    # 英語ヘッダー対応
    "name": "name",
    "full_name": "name",
    "name_kana": "name_kana",
    "last_name": "last_name",
    "first_name": "first_name",
    "phone": "phone_primary",
    "phone_primary": "phone_primary",
    "phone_mobile": "phone_mobile",
    "phone_secondary": "phone_secondary",
    "email": "email",
    "company": "company_name",
    "company_name": "company_name",
    "department": "department",
    "position": "position",
    "notes": "notes",
    "notes2": "notes2",
    "notes3": "notes3",
    "birth_date": "birth_date",
    "birthday": "birth_date",
    "registered_date": "registered_date",
}

CONTACT_FIELDS = {
    "name", "name_kana",
    "last_name", "first_name", "last_name_kana", "first_name_kana",
    "phone_primary", "phone_secondary", "phone_mobile", "email",
    "company_name", "department", "position",
    "postal_code", "prefecture", "city", "address_line",
    "notes", "notes2", "notes3",
    "birth_date", "registered_date",
}



def _get_google_integration(
    tenant_id: str, db: Session
) -> DialerGoogleIntegrationModel:
    """テナントのGoogle統合連携設定を取得"""
    integration = db.execute(
        select(DialerGoogleIntegrationModel).where(
            DialerGoogleIntegrationModel.tenant_id == tenant_id,
            DialerGoogleIntegrationModel.integration_type
            == GoogleIntegrationTypeEnum.GOOGLE,
            DialerGoogleIntegrationModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not integration:
        raise HTTPException(
            400,
            "Googleが連携されていません。設定 > 外部連携 > Google連携からアカウントを接続してください。",
        )
    if integration.status == GoogleSyncStatusEnum.NOT_CONNECTED or not integration.refresh_token:
        raise HTTPException(
            401,
            "Googleのアクセストークンが無効です。設定 > 外部連携 > Google連携から再接続してください。",
        )
    if integration.status in (GoogleSyncStatusEnum.ERROR, GoogleSyncStatusEnum.TOKEN_EXPIRED):
        # refresh_tokenが残っていればリトライ可能 — リフレッシュ成功でCONNECTEDに復帰
        logger.warning(
            "Google integration in %s state, attempting recovery: tenant=%s",
            integration.status.value,
            tenant_id,
        )
    return integration


def _get_refreshed_credentials(
    integration: DialerGoogleIntegrationModel, db: Session
) -> Credentials:
    """トークンをリフレッシュし、最新のaccess_tokenをDBに保存して返す"""
    settings = get_settings()
    creds = Credentials(
        token=integration.access_token,
        refresh_token=integration.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
        client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
    )
    try:
        creds.refresh(Request())
    except RefreshError:
        integration.status = GoogleSyncStatusEnum.TOKEN_EXPIRED
        db.flush()
        logger.warning(
            "Google token refresh failed: tenant=%s integration=%s",
            integration.tenant_id,
            integration.integration_id,
        )
        raise HTTPException(
            401,
            "Googleのアクセストークンが期限切れです。設定 > 外部連携 > Google連携から再接続してください。",
        )
    # リフレッシュ成功 → 常にCONNECTEDに復帰 & トークン保存
    integration.access_token = creds.token
    if integration.status != GoogleSyncStatusEnum.CONNECTED:
        integration.status = GoogleSyncStatusEnum.CONNECTED
    db.flush()
    return creds


def _build_column_mapping(
    headers: list[str], custom_mapping: dict[str, str] | None
) -> dict[str, str]:
    """ヘッダーからカラムマッピングを構築

    custom_mapping が指定された場合はそれだけを使用し、デフォルトとマージしない。
    ユーザーが明示的に「スキップ」した列が復活しないようにするため。
    """
    mapping: dict[str, str] = {}
    if custom_mapping:
        # ユーザー指定のマッピングのみ使用（空文字 = スキップ）
        for header, field in custom_mapping.items():
            if field and field in CONTACT_FIELDS:
                mapping[header] = field
    else:
        # デフォルト自動検出
        for header in headers:
            h = header.strip()
            if h in DEFAULT_COLUMN_MAP and DEFAULT_COLUMN_MAP[h] in CONTACT_FIELDS:
                mapping[h] = DEFAULT_COLUMN_MAP[h]
    return mapping


def _suggest_column_mapping(headers: list[str]) -> dict[str, str]:
    """ヘッダーからデフォルトマッピングの候補を返す（プレビュー用）"""
    suggested: dict[str, str] = {}
    used_fields: set[str] = set()
    for header in headers:
        h = header.strip()
        if h in DEFAULT_COLUMN_MAP:
            field = DEFAULT_COLUMN_MAP[h]
            if field in CONTACT_FIELDS and field not in used_fields:
                suggested[h] = field
                used_fields.add(field)
    return suggested


_DATE_FIELDS = {"birth_date", "registered_date"}


def _parse_date(val: str) -> date_type | None:
    """様々な日付形式を解析する (YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY 等)"""
    val = val.strip()
    if not val:
        return None
    # 数字とセパレータのみ抽出
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%Y年%m月%d日"):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    # 8桁数字 (20000101)
    if re.match(r"^\d{8}$", val):
        try:
            return datetime.strptime(val, "%Y%m%d").date()
        except ValueError:
            pass
    return None


def _row_to_contact_data(
    row: dict[str, str], mapping: dict[str, str]
) -> dict[str, str | date_type]:
    """スプシの1行をcontactフィールドのdictに変換"""
    data: dict[str, str | date_type] = {}
    for header, field in mapping.items():
        val = row.get(header, "").strip()
        if val:
            if field in _DATE_FIELDS:
                parsed = _parse_date(val)
                if parsed:
                    data[field] = parsed
            else:
                data[field] = val

    # name → last_name / first_name の自動補完
    name_val = data.get("name")
    if name_val and isinstance(name_val, str) and not data.get("last_name"):
        parts = name_val.split(None, 1)
        data["last_name"] = parts[0]
        if len(parts) > 1 and not data.get("first_name"):
            data["first_name"] = parts[1]
    name_kana_val = data.get("name_kana")
    if name_kana_val and isinstance(name_kana_val, str) and not data.get("last_name_kana"):
        parts = name_kana_val.split(None, 1)
        data["last_name_kana"] = parts[0]
        if len(parts) > 1 and not data.get("first_name_kana"):
            data["first_name_kana"] = parts[1]

    return data


# ════════════════════════════════════════════════════════════════
# 基本CRUD
# ════════════════════════════════════════════════════════════════


@router.get("", response_model=PaginatedResponse)
def list_call_lists(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    q = select(DialerCallListModel).where(
        DialerCallListModel.tenant_id == tenant_id,
        DialerCallListModel.is_deleted.is_(False),
    )
    count_q = select(func.count()).select_from(DialerCallListModel).where(
        DialerCallListModel.tenant_id == tenant_id,
        DialerCallListModel.is_deleted.is_(False),
    )
    total = db.execute(count_q).scalar() or 0
    rows = (
        db.execute(
            q.order_by(DialerCallListModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        .scalars()
        .all()
    )
    return PaginatedResponse(
        items=[CallListResponseSchema.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=CallListResponseSchema, status_code=201)
def create_call_list(
    body: CallListCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = DialerCallListModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(cl)
    db.flush()
    return CallListResponseSchema.model_validate(cl)


@router.get("/{call_list_id}", response_model=CallListResponseSchema)
def get_call_list(
    call_list_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    return CallListResponseSchema.model_validate(cl)


@router.put("/{call_list_id}", response_model=CallListResponseSchema)
def update_call_list(
    call_list_id: str,
    body: CallListUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(cl, key, val)
    db.flush()
    return CallListResponseSchema.model_validate(cl)


@router.delete("/{call_list_id}", status_code=204)
def delete_call_list(
    call_list_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    cl.is_deleted = True
    cl.deleted_at = datetime.now(JST)


@router.post("/{call_list_id}/contacts", response_model=MessageResponse, status_code=201)
def add_contacts(
    call_list_id: str,
    body: CallListContactAddSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    count = 0
    for cid in body.contact_ids:
        existing = db.execute(
            select(DialerCallListContactModel).where(
                DialerCallListContactModel.call_list_id == call_list_id,
                DialerCallListContactModel.contact_id == cid,
            )
        ).scalar_one_or_none()
        if not existing:
            db.add(DialerCallListContactModel(call_list_id=call_list_id, contact_id=cid))
            count += 1
    cl.contact_count += count
    db.flush()
    return MessageResponse(message=f"{count}件追加しました")


@router.delete("/{call_list_id}/contacts/{contact_id}", status_code=204)
def remove_contact(
    call_list_id: str,
    contact_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)
    rec = db.execute(
        select(DialerCallListContactModel).where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerCallListContactModel.contact_id == contact_id,
        )
    ).scalar_one_or_none()
    if rec:
        db.delete(rec)
        cl.contact_count = max(0, cl.contact_count - 1)


@router.get("/{call_list_id}/contacts", response_model=PaginatedResponse)
def list_call_list_contacts(
    call_list_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """コールリスト内コンタクト一覧"""
    _, tenant_id = auth
    _get_call_list(call_list_id, tenant_id, db)

    base_q = (
        select(func.count())
        .select_from(DialerCallListContactModel)
        .join(
            DialerContactModel,
            DialerCallListContactModel.contact_id == DialerContactModel.contact_id,
        )
        .where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerContactModel.is_deleted.is_(False),
        )
    )
    total = db.execute(base_q).scalar() or 0

    rows = db.execute(
        select(DialerContactModel, DialerCallListContactModel)
        .join(
            DialerCallListContactModel,
            DialerCallListContactModel.contact_id == DialerContactModel.contact_id,
        )
        .where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerContactModel.is_deleted.is_(False),
        )
        .order_by(DialerContactModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for contact, clc in rows:
        items.append(
            CallListContactDetailSchema(
                contact_id=contact.contact_id,
                last_name=contact.last_name or "",
                first_name=contact.first_name or "",
                phone_primary=contact.phone_primary,
                phone_secondary=contact.phone_secondary,
                phone_mobile=contact.phone_mobile,
                email=contact.email,
                company_name=contact.company_name,
                tele_status=clc.tele_status.value if clc.tele_status else "none",
                tele_note=clc.tele_note,
                total_calls=contact.total_calls or 0,
                last_called_at=contact.last_called_at,
            )
        )

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total else 0,
    )


@router.post(
    "/{call_list_id}/start-calling",
    response_model=StartCallingResponseSchema,
)
def start_calling(
    call_list_id: str,
    body: StartCallingRequestSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """コールリストの架電を開始（プレディクティブコール）"""
    _, tenant_id = auth
    _get_call_list(call_list_id, tenant_id, db)

    svc = get_telephony_service()

    caller_id = body.caller_id
    if not caller_id:
        raise HTTPException(400, "発信者番号が指定されていません。")

    # 架電対象のコンタクトを取得
    q = (
        select(DialerContactModel, DialerCallListContactModel)
        .join(
            DialerCallListContactModel,
            DialerCallListContactModel.contact_id == DialerContactModel.contact_id,
        )
        .where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerContactModel.is_deleted.is_(False),
        )
    )
    if body.contact_ids:
        # 指定されたコンタクトのみ
        q = q.where(DialerContactModel.contact_id.in_(body.contact_ids))
    else:
        # 未架電のコンタクトのみ
        q = q.where(
            DialerCallListContactModel.tele_status == TeleStatusEnum.NONE,
        )
    q = q.limit(body.max_concurrent_calls)
    pending = db.execute(q).all()

    if not pending:
        return StartCallingResponseSchema(
            initiated_count=0,
            message="架電対象のコンタクトがありません",
        )

    initiated = 0
    session_calls: list[tuple[str, str, str | None, str]] = []

    for contact, _clc in pending:
        try:
            result = svc.initiate_call(
                to=contact.phone_primary,
                from_=caller_id,
                voice_url="",
                status_callback_url="",
            )
            log = DialerCallLogModel(
                tenant_id=tenant_id,
                contact_id=contact.contact_id,
                phone_number_dialed=contact.phone_primary,
                caller_id_used=caller_id,
                call_uuid=result.get("call_sid"),
                call_status=CallStatusEnum.DIALING,
            )
            db.add(log)
            session_calls.append((
                log.call_log_id,
                contact.contact_id,
                result.get("call_sid"),
                contact.phone_primary,
            ))
            initiated += 1
        except Exception:
            logger.exception(
                "Failed to initiate call to contact %s", contact.contact_id
            )

    db.flush()

    # セッション作成
    session_id = None
    if session_calls:
        session = create_calling_session(
            call_list_id=call_list_id,
            tenant_id=tenant_id,
            calls=session_calls,
        )
        session_id = session.session_id

    return StartCallingResponseSchema(
        initiated_count=initiated,
        message=f"{initiated}件の架電を開始しました",
        session_id=session_id,
    )


# ════════════════════════════════════════════════════════════════
# プレディクティブコール セッション
# ════════════════════════════════════════════════════════════════


@router.get(
    "/{call_list_id}/calling-session/{session_id}",
    response_model=CallingSessionStatusSchema,
)
def get_calling_session_status(
    call_list_id: str,
    session_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """セッション状態取得（ポーリング用）"""
    _, tenant_id = auth
    session = get_session(session_id)
    if not session or session.tenant_id != tenant_id:
        raise HTTPException(404, "セッションが見つかりません")

    # コンタクト情報を取得
    contact_ids = [e.contact_id for e in session.calls.values()]
    contacts = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id.in_(contact_ids)
        )
    ).scalars().all()
    contact_map = {c.contact_id: c for c in contacts}

    calls = []
    for entry in session.calls.values():
        c = contact_map.get(entry.contact_id)
        calls.append(CallingSessionCallSchema(
            call_log_id=entry.call_log_id,
            contact_id=entry.contact_id,
            status=entry.status,
            phone_number=entry.phone_number,
            contact_name=f"{c.last_name} {c.first_name}" if c else "",
            company_name=c.company_name if c else None,
        ))

    connected_contact = None
    if session.connected_call_log_id:
        connected_entry = session.calls.get(session.connected_call_log_id)
        if connected_entry:
            c = contact_map.get(connected_entry.contact_id)
            if c:
                connected_contact = CallingSessionContactSchema(
                    contact_id=c.contact_id,
                    last_name=c.last_name,
                    first_name=c.first_name,
                    phone_primary=c.phone_primary,
                    phone_secondary=c.phone_secondary,
                    phone_mobile=c.phone_mobile,
                    email=c.email,
                    company_name=c.company_name,
                    department=c.department,
                    position=c.position,
                )

    return CallingSessionStatusSchema(
        session_id=session.session_id,
        calls=calls,
        connected_call_log_id=session.connected_call_log_id,
        connected_contact=connected_contact,
        is_complete=session.is_terminal,
    )


@router.post(
    "/{call_list_id}/calling-session/{session_id}/result",
    response_model=MessageResponse,
)
def submit_call_result(
    call_list_id: str,
    session_id: str,
    body: CallResultRequestSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """架電結果登録（テレアポ状況・メモ保存）"""
    _, tenant_id = auth
    session = get_session(session_id)
    if not session or session.tenant_id != tenant_id:
        raise HTTPException(404, "セッションが見つかりません")

    if not session.connected_call_log_id:
        raise HTTPException(400, "接続された通話がありません")

    connected = session.calls[session.connected_call_log_id]

    # 1. 通話ログ更新
    call_log = db.execute(
        select(DialerCallLogModel).where(
            DialerCallLogModel.call_log_id == connected.call_log_id
        )
    ).scalar_one_or_none()
    if call_log:
        if body.notes:
            call_log.notes = body.notes
        if body.disposition_id:
            call_log.disposition_id = body.disposition_id

    # 2. コールリスト内コンタクトのテレアポ状況更新
    clc = db.execute(
        select(DialerCallListContactModel).where(
            DialerCallListContactModel.call_list_id == call_list_id,
            DialerCallListContactModel.contact_id == connected.contact_id,
        )
    ).scalar_one_or_none()
    if clc:
        clc.tele_status = TeleStatusEnum(body.tele_status)
        if body.tele_note is not None:
            clc.tele_note = body.tele_note

    # 3. コンタクトマスタの通話回数・最終架電日更新
    contact = db.execute(
        select(DialerContactModel).where(
            DialerContactModel.contact_id == connected.contact_id
        )
    ).scalar_one_or_none()
    if contact:
        contact.total_calls = (contact.total_calls or 0) + 1
        contact.last_called_at = datetime.now(timezone(timedelta(hours=9)))

    # 4. 未接続コンタクトの状況も更新
    for entry in session.calls.values():
        if entry.call_log_id == session.connected_call_log_id:
            continue
        other_clc = db.execute(
            select(DialerCallListContactModel).where(
                DialerCallListContactModel.call_list_id == call_list_id,
                DialerCallListContactModel.contact_id == entry.contact_id,
            )
        ).scalar_one_or_none()
        if other_clc and other_clc.tele_status == TeleStatusEnum.NONE:
            if entry.status in ("busy",):
                other_clc.tele_status = TeleStatusEnum.BUSY
            elif entry.status in ("no_answer", "canceled", "failed"):
                other_clc.tele_status = TeleStatusEnum.NOT_REACHED

    db.flush()

    # 5. セッション削除
    remove_session(session_id)

    return MessageResponse(message="架電結果を保存しました")


@router.post(
    "/{call_list_id}/calling-session/{session_id}/end-call",
    response_model=MessageResponse,
)
def end_session_call(
    call_list_id: str,
    session_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """接続中の通話を終了"""
    _, tenant_id = auth
    session = get_session(session_id)
    if not session or session.tenant_id != tenant_id:
        raise HTTPException(404, "セッションが見つかりません")

    if not session.connected_call_log_id:
        raise HTTPException(400, "接続中の通話がありません")

    connected = session.calls[session.connected_call_log_id]
    if connected.call_uuid and connected.status in ("in_progress", "ringing"):
        svc = get_telephony_service()
        try:
            svc.end_call(connected.call_uuid)
        except Exception:
            logger.exception("Failed to end call %s", connected.call_uuid)

    return MessageResponse(message="通話を終了しました")


@router.post(
    "/{call_list_id}/calling-session/{session_id}/cancel",
    response_model=MessageResponse,
)
def cancel_calling_session(
    call_list_id: str,
    session_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
):
    """セッション全通話キャンセル"""
    _, tenant_id = auth
    session = get_session(session_id)
    if not session or session.tenant_id != tenant_id:
        raise HTTPException(404, "セッションが見つかりません")

    svc = get_telephony_service()
    for entry in session.calls.values():
        if entry.status in ("dialing", "ringing", "in_progress"):
            if entry.call_uuid:
                try:
                    svc.end_call(entry.call_uuid)
                except Exception:
                    logger.exception("Failed to cancel call %s", entry.call_uuid)

    remove_session(session_id)
    return MessageResponse(message="全通話をキャンセルしました")


# ════════════════════════════════════════════════════════════════
# Google Sheets 連携
# ════════════════════════════════════════════════════════════════


@router.get("/sheets/spreadsheets", response_model=SpreadsheetListSchema)
def list_spreadsheets(
    search: str = Query("", description="ファイル名検索"),
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Googleドライブからスプレッドシート一覧を取得"""
    _, tenant_id = auth
    integration = _get_google_integration(tenant_id, db)
    creds = _get_refreshed_credentials(integration, db)
    drive = build("drive", "v3", credentials=creds)

    q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
    if search.strip():
        escaped = search.strip().replace("'", "\\'")
        q += f" and name contains '{escaped}'"

    result = drive.files().list(
        q=q,
        fields="files(id, name, modifiedTime)",
        orderBy="modifiedTime desc",
        pageSize=50,
    ).execute()

    items = [
        SpreadsheetItemSchema(
            spreadsheet_id=f["id"],
            name=f["name"],
            modified_time=f.get("modifiedTime"),
        )
        for f in result.get("files", [])
    ]
    return SpreadsheetListSchema(items=items)


@router.get(
    "/sheets/spreadsheets/{spreadsheet_id}/tabs",
    response_model=SheetTabListSchema,
)
def list_sheet_tabs(
    spreadsheet_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """スプレッドシート内のシートタブ一覧を取得"""
    _, tenant_id = auth
    integration = _get_google_integration(tenant_id, db)
    creds = _get_refreshed_credentials(integration, db)
    sheets_svc = build("sheets", "v4", credentials=creds)
    spreadsheet = sheets_svc.spreadsheets().get(
        spreadsheetId=spreadsheet_id,
        fields="sheets.properties(sheetId,title)",
    ).execute()

    items = [
        SheetTabSchema(
            sheet_id=s["properties"]["sheetId"],
            title=s["properties"]["title"],
        )
        for s in spreadsheet.get("sheets", [])
    ]
    return SheetTabListSchema(items=items)


@router.post("/sheets/preview", response_model=SheetsPreviewResponseSchema)
def preview_sheet(
    body: SheetsPreviewRequestSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """スプレッドシートのプレビュー取得（ヘッダー＋最初の5行 + 生データ）"""
    _, tenant_id = auth
    integration = _get_google_integration(tenant_id, db)
    creds = _get_refreshed_credentials(integration, db)
    token = creds.token

    # ── 1. 生データ（row 1〜20）をヘッダー選択UIに返す ──
    raw_rows: list[list[str]] = []
    try:
        sheets_api = build("sheets", "v4", credentials=creds)
        raw_range = f"{body.sheet_name}!A1:Z20" if body.sheet_name else "A1:Z20"
        raw_result = (
            sheets_api.spreadsheets()
            .values()
            .get(spreadsheetId=body.spreadsheet_id, range=raw_range)
            .execute()
        )
        raw_values: list[list[str]] = raw_result.get("values", [])
        if raw_values:
            max_cols = max(len(r) for r in raw_values)
            raw_rows = [r + [""] * (max_cols - len(r)) for r in raw_values]
    except Exception:
        logger.warning("Failed to fetch raw rows for preview")

    # ── 2. header_row 以降の全データ取得（ヘッダー解析 + 件数カウント） ──
    svc = get_sheets_service()
    hr = max(body.header_row, 1)
    full_range_str = f"A{hr}:Z"
    full_range_name = (
        f"{body.sheet_name}!{full_range_str}" if body.sheet_name else full_range_str
    )
    all_rows = svc.import_from_sheet(
        access_token=token,
        refresh_token=integration.refresh_token,
        spreadsheet_id=body.spreadsheet_id,
        range_name=full_range_name,
    )

    if not all_rows:
        return SheetsPreviewResponseSchema(
            headers=[], rows=[], total_rows=0, raw_rows=raw_rows,
            suggested_mapping={},
        )

    headers = list(all_rows[0].keys())
    preview_rows = all_rows[:5]
    suggested = _suggest_column_mapping(headers)

    return SheetsPreviewResponseSchema(
        headers=headers,
        rows=preview_rows,
        total_rows=len(all_rows),
        raw_rows=raw_rows,
        suggested_mapping=suggested,
    )


@router.post("/sheets/import", response_model=SheetsImportResponseSchema)
def import_from_sheets(
    body: SheetsImportRequestSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Google Sheetsとコールリストを連携（メタデータのみ保存、連絡先は同期で取得）"""
    _, tenant_id = auth
    # Google連携チェック
    integration = _get_google_integration(tenant_id, db)
    _get_refreshed_credentials(integration, db)

    # カラムマッピング検証
    mapping: dict[str, str] = {}
    if body.column_mapping:
        for header, field in body.column_mapping.items():
            if field and field in CONTACT_FIELDS:
                mapping[header] = field

    if "phone_primary" not in mapping.values():
        raise HTTPException(
            400,
            "電話番号のカラムを特定できません。ヘッダーに「電話番号」「電話」「phone」「phone_primary」のいずれかを含めてください。",
        )

    hr = max(body.header_row, 1)

    # コールリスト作成（メタデータのみ、連絡先は同期エンドポイントで取得）
    cl = DialerCallListModel(
        tenant_id=tenant_id,
        name=body.list_name,
        description=body.list_description,
        source="google_sheets",
        spreadsheet_id=body.spreadsheet_id,
        sheet_name=body.sheet_name,
        sheet_range=body.range_name,
        header_row=hr,
        column_mapping=json.dumps(mapping, ensure_ascii=False),
    )
    db.add(cl)
    db.flush()

    logger.info(
        "Sheets connect: tenant=%s list=%s spreadsheet=%s",
        tenant_id, cl.call_list_id, body.spreadsheet_id,
    )

    return SheetsImportResponseSchema(
        call_list_id=cl.call_list_id,
        name=cl.name,
        imported_count=0,
        skipped_count=0,
        message="スプレッドシートと連携しました。データは自動で同期されます。",
    )


@router.post(
    "/{call_list_id}/sheets/sync",
    response_model=SheetsSyncResponseSchema,
)
def sync_from_sheets(
    call_list_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    """Google Sheetsからコールリストを再同期"""
    _, tenant_id = auth
    cl = _get_call_list(call_list_id, tenant_id, db)

    if cl.source != "google_sheets" or not cl.spreadsheet_id:
        raise HTTPException(400, "このリストはGoogle Sheets連携ではありません")

    integration = _get_google_integration(tenant_id, db)
    creds = _get_refreshed_credentials(integration, db)
    token = creds.token

    # 同期中ステータスに更新
    integration.status = GoogleSyncStatusEnum.SYNCING
    db.flush()

    try:
        svc = get_sheets_service()

        hr = cl.header_row or 1
        range_name = f"A{hr}:Z"
        if cl.sheet_name:
            range_name = f"{cl.sheet_name}!{range_name}"

        rows = svc.import_from_sheet(
            access_token=token,
            refresh_token=integration.refresh_token,
            spreadsheet_id=cl.spreadsheet_id,
            range_name=range_name,
        )

        if not rows:
            integration.status = GoogleSyncStatusEnum.CONNECTED
            db.flush()
            return SheetsSyncResponseSchema(
                added_count=0, updated_count=0, removed_count=0,
                message="スプレッドシートにデータがありません",
            )

        # 保存済みマッピングを復元
        mapping: dict[str, str] = {}
        if cl.column_mapping:
            mapping = json.loads(cl.column_mapping)
        else:
            headers = list(rows[0].keys())
            mapping = _build_column_mapping(headers, None)

        # 既存の紐付け済みcontact_idを取得
        existing_links = db.execute(
            select(DialerCallListContactModel).where(
                DialerCallListContactModel.call_list_id == call_list_id,
            )
        ).scalars().all()
        existing_contact_ids = {link.contact_id for link in existing_links}

        new_contact_ids: set[str] = set()
        added_count = 0
        updated_count = 0

        for row in rows:
            contact_data = _row_to_contact_data(row, mapping)
            if not contact_data.get("phone_primary"):
                continue
            if not contact_data.get("last_name"):
                contact_data["last_name"] = "不明"
            if not contact_data.get("first_name"):
                contact_data["first_name"] = ""

            existing = db.execute(
                select(DialerContactModel).where(
                    DialerContactModel.tenant_id == tenant_id,
                    DialerContactModel.phone_primary == contact_data["phone_primary"],
                    DialerContactModel.is_deleted.is_(False),
                )
            ).scalar_one_or_none()

            if existing:
                contact = existing
                for field, val in contact_data.items():
                    if field != "phone_primary" and val:
                        setattr(contact, field, val)
                updated_count += 1
            else:
                contact = DialerContactModel(tenant_id=tenant_id, **contact_data)
                db.add(contact)
                db.flush()

            new_contact_ids.add(contact.contact_id)

            if contact.contact_id not in existing_contact_ids:
                db.add(
                    DialerCallListContactModel(
                        call_list_id=call_list_id,
                        contact_id=contact.contact_id,
                    )
                )
                added_count += 1

        # スプシから消えた連絡先の紐付けを解除
        removed_ids = existing_contact_ids - new_contact_ids
        removed_count = 0
        for cid in removed_ids:
            link = db.execute(
                select(DialerCallListContactModel).where(
                    DialerCallListContactModel.call_list_id == call_list_id,
                    DialerCallListContactModel.contact_id == cid,
                )
            ).scalar_one_or_none()
            if link:
                db.delete(link)
                removed_count += 1

        cl.contact_count = len(new_contact_ids)
        cl.last_sheet_synced_at = datetime.now(JST)
        integration.status = GoogleSyncStatusEnum.CONNECTED
        integration.last_synced_at = datetime.now(JST)
        db.flush()

        logger.info(
            "Sheets sync: tenant=%s list=%s added=%d updated=%d removed=%d",
            tenant_id, call_list_id, added_count, updated_count, removed_count,
        )

        return SheetsSyncResponseSchema(
            added_count=added_count,
            updated_count=updated_count,
            removed_count=removed_count,
            message=f"同期完了: 追加{added_count}件 / 更新{updated_count}件 / 削除{removed_count}件",
        )
    except HTTPException:
        raise
    except Exception as e:
        integration.status = GoogleSyncStatusEnum.ERROR
        db.flush()
        logger.exception(
            "Sheets sync failed: tenant=%s list=%s error=%s",
            tenant_id, call_list_id, str(e),
        )
        raise HTTPException(500, f"同期中にエラーが発生しました: {e}")


# ════════════════════════════════════════════════════════════════
# ヘルパー
# ════════════════════════════════════════════════════════════════


def _get_call_list(call_list_id: str, tenant_id: str, db: Session) -> DialerCallListModel:
    cl = db.execute(
        select(DialerCallListModel).where(
            DialerCallListModel.call_list_id == call_list_id,
            DialerCallListModel.tenant_id == tenant_id,
            DialerCallListModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not cl:
        raise HTTPException(404, "コールリストが見つかりません")
    return cl
