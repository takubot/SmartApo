"""
app/alembic/env.py
---
BigQuery 対応の Alembic マイグレーション環境設定。

機能概要:
1. app/src を PYTHONPATH に追加してからモデルを import
2. model/*.py を自動ロードして Base.metadata に全テーブルを登録
3. Settings 由来の BigQuery URL を動的に採用
4. compare_type で型差分も検出
"""

from __future__ import annotations

import importlib
import logging
import sys
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Engine

# PYTHONPATH に src を追加
THIS_DIR = Path(__file__).resolve()
SRC_DIR = THIS_DIR.parents[1] / "src"
sys.path.append(str(SRC_DIR))

from src.database_utils.database import settings  # noqa: E402
from src.models.tables.declarative_base import Base  # noqa: E402

logger = logging.getLogger("alembic.env")

print(f">>> 使用中の BigQuery URL: {settings.bigquery_url}")


# model/*.py を自動 import
def import_all_models() -> None:
    model_dir = SRC_DIR / "model"
    for py in model_dir.glob("*.py"):
        if py.stem.startswith("_") or py.stem == "__init__":
            continue
        importlib.import_module(f"model.{py.stem}")


import_all_models()

# Naming Convention
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


# 差分判定フック
def include_object(obj, name, type_, reflected, compare_to):
    return True


# エンジン生成
def get_engine() -> Engine:
    return create_engine(settings.bigquery_url, poolclass=pool.NullPool, future=True)


# オフラインモード
def run_migrations_offline() -> None:
    context.configure(
        url=settings.bigquery_url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# オンライン (同期)
def run_sync_migrations() -> None:
    engine = get_engine()
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# エントリーポイント
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_sync_migrations()
