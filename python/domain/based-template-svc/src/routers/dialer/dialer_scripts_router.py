"""スクリプトルーター"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_current_user
from ...database_utils.database import get_sync_session
from ...models.tables.model_defs import DialerCallScriptModel
from .schemas.script_schemas import ScriptCreateSchema, ScriptResponseSchema, ScriptUpdateSchema

router = APIRouter()
JST = timezone(timedelta(hours=9))


@router.get("", response_model=list[ScriptResponseSchema])
def list_scripts(
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    rows = db.execute(
        select(DialerCallScriptModel).where(
            DialerCallScriptModel.tenant_id == tenant_id,
            DialerCallScriptModel.is_deleted.is_(False),
        )
    ).scalars().all()
    return [ScriptResponseSchema.model_validate(r) for r in rows]


@router.post("", response_model=ScriptResponseSchema, status_code=201)
def create_script(
    body: ScriptCreateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    script = DialerCallScriptModel(tenant_id=tenant_id, **body.model_dump(exclude_none=True))
    db.add(script)
    db.flush()
    return ScriptResponseSchema.model_validate(script)


@router.get("/{script_id}", response_model=ScriptResponseSchema)
def get_script(
    script_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    script = db.execute(
        select(DialerCallScriptModel).where(
            DialerCallScriptModel.script_id == script_id,
            DialerCallScriptModel.tenant_id == tenant_id,
            DialerCallScriptModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not script:
        raise HTTPException(404, "スクリプトが見つかりません")
    return ScriptResponseSchema.model_validate(script)


@router.put("/{script_id}", response_model=ScriptResponseSchema)
def update_script(
    script_id: str,
    body: ScriptUpdateSchema,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    script = db.execute(
        select(DialerCallScriptModel).where(
            DialerCallScriptModel.script_id == script_id,
            DialerCallScriptModel.tenant_id == tenant_id,
            DialerCallScriptModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not script:
        raise HTTPException(404, "スクリプトが見つかりません")
    for key, val in body.model_dump(exclude_none=True).items():
        setattr(script, key, val)
    script.version += 1
    db.flush()
    return ScriptResponseSchema.model_validate(script)


@router.delete("/{script_id}", status_code=204)
def delete_script(
    script_id: str,
    auth: tuple[str, str] = Depends(get_current_user),
    db: Session = Depends(get_sync_session),
):
    _, tenant_id = auth
    script = db.execute(
        select(DialerCallScriptModel).where(
            DialerCallScriptModel.script_id == script_id,
            DialerCallScriptModel.tenant_id == tenant_id,
            DialerCallScriptModel.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not script:
        raise HTTPException(404, "スクリプトが見つかりません")
    script.is_deleted = True
    script.deleted_at = datetime.now(JST)
