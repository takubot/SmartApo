"""
app/alembic/env.py
───────────────────────────────────────────────────────────────────────────────
“最強” テンプレートを **app/src/model/** 構成に合わせて調整した完全版。

機能概要
-------------------------------------------------------------------------------
1.  app/src を PYTHONPATH に追加してからモデルを import
2.  model/*.py を自動ロードして Base.metadata に全テーブルを登録
3.  naming_convention が未設定ならデフォルトをセット
4.  Settings 由来の DB URL を動的に採用（同期 / 非同期どちらも OK）
5.  compare_type / compare_server_default で型差分も検出
6.  async_db=True なら `mysql+aiomysql://` で非同期エンジンを生成
"""

from __future__ import annotations

import asyncio
import importlib
import logging
import sys
from pathlib import Path
from typing import cast

from alembic import context
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

# ─────────────────────────────────────────────────────────────────────────────
# 1) PYTHONPATH に `app/src` を追加
# ─────────────────────────────────────────────────────────────────────────────
THIS_DIR = Path(__file__).resolve()  # …/app/alembic/env.py
SRC_DIR = THIS_DIR.parents[1] / "src"  # …/app/src
sys.path.append(str(SRC_DIR))

# ─────────────────────────────────────────────────────────────────────────────
# 2) アプリの設定 & Base を import
# ─────────────────────────────────────────────────────────────────────────────
from src.database_utils.database import settings  # noqa: E402  (app/src/databese.py に DBSettings がある想定)
from src.models.tables.declarative_base import Base  # noqa: E402  (declarative_base())

logger = logging.getLogger("alembic.env")

print(f">>> 使用中の SQLALCHEMY_URL: {settings.sync_database_url}")


# ─────────────────────────────────────────────────────────────────────────────
# 3) model/*.py を自動 import して metadata にテーブルを登録
# ─────────────────────────────────────────────────────────────────────────────
def import_all_models() -> None:
    model_dir = SRC_DIR / "model"
    for py in model_dir.glob("*.py"):
        # __init__.py や _private.py はスキップ
        if py.stem.startswith("_") or py.stem == "__init__":
            continue
        importlib.import_module(f"model.{py.stem}")


import_all_models()

# ─────────────────────────────────────────────────────────────────────────────
# 4) Naming Convention が未設定なら付与
# ─────────────────────────────────────────────────────────────────────────────
if not Base.metadata.naming_convention:
    Base.metadata.naming_convention = {
        "ix": "ix_%(table_name)s_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }

target_metadata = Base.metadata
print(">>> インポート済テーブル一覧:", Base.metadata.tables.keys())

# ─────────────────────────────────────────────────────────────────────────────
# 5) 自動生成結果の並べ替え（再帰的にFK→Index/Unique→Tableの順へ）
# ─────────────────────────────────────────────────────────────────────────────
from alembic.operations.ops import (
    CreateForeignKeyOp,
    CreateIndexOp,
    CreateTableOp,
    DropConstraintOp,
    DropIndexOp,
    DropTableOp,
    MigrateOperation,
    ModifyTableOps,
)


def _flatten_ops(op: MigrateOperation) -> list[MigrateOperation]:
    """任意の op から再帰的に子opを抽出して一次元化."""
    out: list[MigrateOperation] = []
    if isinstance(op, ModifyTableOps):
        # ModifyTableOps は table 単位の子opsを持つ
        for child in op.ops:
            out.extend(_flatten_ops(child))
    elif hasattr(op, "ops") and isinstance(op.ops, (list, tuple)):
        for child in op.ops:
            out.extend(_flatten_ops(child))
    else:
        out.append(op)
    return out


def _collect_all_ops(ops: list[MigrateOperation]) -> list[MigrateOperation]:
    flat: list[MigrateOperation] = []
    for op in ops:
        flat.extend(_flatten_ops(op))
    return flat


def _sort_for_upgrade(all_ops: list[MigrateOperation]) -> list[MigrateOperation]:
    fk_drops: list[MigrateOperation] = []
    cons_drops: list[MigrateOperation] = []  # unique / check / unknown 等
    idx_drops: list[MigrateOperation] = []
    tbl_drops: list[MigrateOperation] = []
    others: list[MigrateOperation] = []

    for op in all_ops:
        if isinstance(op, DropConstraintOp):
            ctype = getattr(op, "constraint_type", None)
            if ctype in {"foreignkey", "fk"}:
                fk_drops.append(op)
            else:
                cons_drops.append(op)
        elif isinstance(op, DropIndexOp):
            idx_drops.append(op)
        elif isinstance(op, DropTableOp):
            tbl_drops.append(op)
        else:
            others.append(op)

    # FK → （その他の制約）→ Index → Table → その他
    return fk_drops + cons_drops + idx_drops + tbl_drops + others


def _sort_for_downgrade(all_ops: list[MigrateOperation]) -> list[MigrateOperation]:
    tbl_creates: list[MigrateOperation] = []
    idx_creates: list[MigrateOperation] = []
    fk_creates: list[MigrateOperation] = []
    others: list[MigrateOperation] = []

    for op in all_ops:
        if isinstance(op, CreateTableOp):
            tbl_creates.append(op)
        elif isinstance(op, CreateIndexOp):
            idx_creates.append(op)
        elif isinstance(op, CreateForeignKeyOp):
            fk_creates.append(op)
        else:
            others.append(op)

    # Table → Index/Unique → FK → その他
    return tbl_creates + idx_creates + fk_creates + others


def process_revision_directives(context, revision, directives):
    script = directives[0]
    if hasattr(script, "upgrade_ops") and getattr(script.upgrade_ops, "ops", None):
        flat = _collect_all_ops(list(script.upgrade_ops.ops))
        script.upgrade_ops.ops = _sort_for_upgrade(flat)
    if hasattr(script, "downgrade_ops") and getattr(script.downgrade_ops, "ops", None):
        flat = _collect_all_ops(list(script.downgrade_ops.ops))
        script.downgrade_ops.ops = _sort_for_downgrade(flat)


# ─────────────────────────────────────────────────────────────────────────────
# 6) 差分判定フック（必要に応じて除外ロジックを書く）
# ─────────────────────────────────────────────────────────────────────────────
def include_object(obj, name, type_, reflected, compare_to):
    # 例: テスト用テーブルを除外したい場合はここで bool を返す
    return True


# ─────────────────────────────────────────────────────────────────────────────
# 7) エンジン生成
# ─────────────────────────────────────────────────────────────────────────────
def get_engine(async_: bool = False) -> Engine | AsyncEngine:
    url = settings.sync_database_url
    if async_:
        # pymysql → aiomysql / psycopg2 → asyncpg など自動置換
        url = url.replace("mysql+pymysql", "mysql+aiomysql")
        return create_async_engine(url, poolclass=pool.NullPool)  # type: ignore[arg-type]
    return create_engine(url, poolclass=pool.NullPool, future=True)  # type: ignore[return-value]


# ─────────────────────────────────────────────────────────────────────────────
# 8) オフラインモード
# ─────────────────────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    context.configure(
        url=settings.sync_database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
        dialect_opts={"paramstyle": "named"},
        process_revision_directives=process_revision_directives,
    )
    with context.begin_transaction():
        context.run_migrations()


# ─────────────────────────────────────────────────────────────────────────────
# 9) オンライン (同期)
# ─────────────────────────────────────────────────────────────────────────────
def run_sync_migrations() -> None:
    # engine = cast(Engine, get_engine(async_=False))
    engine = get_engine(async_=False)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
            process_revision_directives=process_revision_directives,
        )
        with context.begin_transaction():
            context.run_migrations()


# ─────────────────────────────────────────────────────────────────────────────
# 10) オンライン (非同期)
# ─────────────────────────────────────────────────────────────────────────────
async def run_async_migrations() -> None:
    async_engine = cast(AsyncEngine, get_engine(async_=True))
    async with async_engine.connect() as connection:
        await connection.run_sync(
            lambda conn: context.configure(
                connection=conn,
                target_metadata=target_metadata,
                include_object=include_object,
                compare_type=True,
                compare_server_default=True,
                process_revision_directives=process_revision_directives,
            )
        )
        async with connection.begin():
            await connection.run_sync(context.run_migrations)


# ─────────────────────────────────────────────────────────────────────────────
# 11) エントリーポイント
# ─────────────────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    if getattr(settings, "async_db", False):
        asyncio.run(run_async_migrations())
    else:
        run_sync_migrations()
