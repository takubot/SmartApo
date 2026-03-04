#!/usr/bin/env python3
"""
Database create script for based-template-svc

実行方法:
1. DOPPELディレクトリから実行:
   npm run uv:create:table

2. 直接実行したい場合:
   cd python/domain/based-template-svc
   uv run python src/database_utils/db_ops.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

"""
db_ops.py – データベース作成ユーティリティ
==========================================

* based-template-svc の全テーブルを作成する専用スクリプト
* 破壊的な操作（DROP/RECREATE）は提供しない
"""

import asyncio
from logging import getLogger

from sqlalchemy.exc import SQLAlchemyError

try:
    from src.database_utils.database import async_engine, sync_engine
    from src.models.tables import Base

    # Windows(cp932)の標準出力で絵文字/記号がUnicodeEncodeErrorになることがあるためASCIIで出力する
    print("[OK] Successfully imported all required modules")
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("Please ensure dependencies are installed:")
    print("  cd python/domain/based-template-svc")
    print("  uv sync")
    print("  uv run python src/db_ops.py")
    sys.exit(1)

logger = getLogger(__name__)


def create_all_tables_sync() -> None:
    """
    [同期] 全テーブルを作成

    Raises:
        SQLAlchemyError: データベース操作でエラーが発生した場合
    """
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("All tables created successfully (sync)")
        print("[OK] All tables created successfully!")
    except SQLAlchemyError as e:
        logger.error("Failed to create all tables (sync): %s", e)
        print(f"[ERROR] Failed to create tables: {e}")
        raise


async def create_all_tables_async() -> None:
    """
    [非同期] 全テーブルを作成

    Raises:
        SQLAlchemyError: データベース操作でエラーが発生した場合
    """
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("All tables created successfully (async)")
        print("[OK] All tables created successfully!")
    except SQLAlchemyError as e:
        logger.error("Failed to create all tables (async): %s", e)
        print(f"[ERROR] Failed to create tables: {e}")
        raise
async def main() -> None:
    """テーブル作成のみを実行するエントリーポイント"""
    print("=" * 60)
    print("based-template-svc | Create Tables")
    print("=" * 60)
    try:
        await create_all_tables_async()
    finally:
        try:
            await async_engine.dispose()
        except Exception:
            pass
        try:
            sync_engine.dispose()
        except Exception:
            pass


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(main())
