#!/usr/bin/env python3
"""
MySQL テーブルをリセット（削除→再作成→モック投入）するスクリプト

実行方法:
  npm run uv:reset:table
"""

from __future__ import annotations

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from logging import getLogger

import sqlalchemy
from sqlalchemy.exc import SQLAlchemyError

try:
    from src.database_utils.database import sync_engine
    from src.database_utils.db_mock import main as create_mock
    from src.models.tables import Base

    print("[OK] Successfully imported all required modules")
except ImportError as e:
    print(f"[ERROR] Import error: {e}")
    print("Please ensure dependencies are installed:")
    print("  cd python/domain/based-template-svc")
    print("  uv sync")
    sys.exit(1)

logger = getLogger(__name__)


def drop_all_tables() -> None:
    """全テーブルを削除（旧テーブルの FK 制約も考慮）"""
    try:
        with sync_engine.connect() as conn:
            conn.execute(sqlalchemy.text("SET FOREIGN_KEY_CHECKS = 0"))
            # 現在のメタデータに含まれるテーブルを削除
            Base.metadata.drop_all(bind=conn)
            # メタデータに含まれない旧テーブルも削除
            conn.execute(sqlalchemy.text("DROP TABLE IF EXISTS dialer_agent_campaigns"))
            conn.execute(sqlalchemy.text("DROP TABLE IF EXISTS dialer_agents"))
            conn.execute(sqlalchemy.text("SET FOREIGN_KEY_CHECKS = 1"))
            conn.commit()
        logger.info("All tables dropped successfully")
        print("[OK] All tables dropped successfully!")
    except SQLAlchemyError as e:
        logger.error("Failed to drop tables: %s", e)
        print(f"[ERROR] Failed to drop tables: {e}")
        raise


def create_all_tables() -> None:
    """全テーブルを作成"""
    try:
        Base.metadata.create_all(bind=sync_engine)
        logger.info("All tables created successfully")
        print("[OK] All tables created successfully!")
    except SQLAlchemyError as e:
        logger.error("Failed to create tables: %s", e)
        print(f"[ERROR] Failed to create tables: {e}")
        raise


def main() -> None:
    print("=" * 60)
    print("based-template-svc | Reset MySQL Tables")
    print(f"Database: {sync_engine.url}")
    print("=" * 60)

    print()
    print("[1/3] Dropping all tables...")
    drop_all_tables()

    print()
    print("[2/3] Creating all tables...")
    create_all_tables()

    print()
    print("[3/3] Creating mock data...")
    try:
        create_mock()
    except Exception as e:
        print(f"[WARN] Mock data creation failed (non-fatal): {e}")

    print()
    print("=" * 60)
    print("Reset complete!")
    print("=" * 60)

    try:
        sync_engine.dispose()
    except Exception:
        pass


if __name__ == "__main__":
    main()
