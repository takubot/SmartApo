#!/usr/bin/env python3
"""
BigQuery テーブル作成スクリプト for based-template-svc

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

from logging import getLogger

from sqlalchemy.exc import SQLAlchemyError

try:
    from src.database_utils.database import sync_engine
    from src.models.tables import Base

    print("[OK] Successfully imported all required modules")
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("Please ensure dependencies are installed:")
    print("  cd python/domain/based-template-svc")
    print("  uv sync")
    sys.exit(1)

logger = getLogger(__name__)


def create_all_tables_sync() -> None:
    """[同期] BigQuery上に全テーブルを作成"""
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("All tables created successfully on BigQuery")
        print("[OK] All tables created successfully on BigQuery!")
    except SQLAlchemyError as e:
        logger.error("Failed to create all tables: %s", e)
        print(f"[ERROR] Failed to create tables: {e}")
        raise


def main() -> None:
    """テーブル作成のみを実行するエントリーポイント"""
    print("=" * 60)
    print("based-template-svc | Create BigQuery Tables")
    print(f"Dataset: {sync_engine.url}")
    print("=" * 60)
    try:
        create_all_tables_sync()
    finally:
        try:
            sync_engine.dispose()
        except Exception:
            pass


if __name__ == "__main__":  # pragma: no cover
    main()
