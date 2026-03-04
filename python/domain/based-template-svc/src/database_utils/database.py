"""
db.py – SQLAlchemy 接続設定 & 運用ユーティリティ
================================================

* 同期・非同期のDBセッションを両方提供し、ハイブリッド利用に対応
* 環境変数でロギング／プール構成／サーバレス最適化を一元管理
* FastAPI などでそのまま依存関係として使える get_sync_session / get_async_session を提供
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Generator
from logging import getLogger
from typing import Final, TypedDict

from fastapi import HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from ..common.env_config import get_settings
from ..models.tables import Base  # Baseの定義場所に応じてパスを調整

logger = getLogger(__name__)

# --------------------------------------------------------------------------- #
# 1) Engine & Session シングルトン
# --------------------------------------------------------------------------- #

settings = get_settings()

IS_SERVERLESS: Final[bool] = settings.env == "serverless"

# ── create_engine() の共通引数を組み立て ───────────────────────────────────
engine_kwargs: dict[str, object] = {
    # ロギング
    # "echo": settings.env != "prod",  # prod 以外は SQL を出力
    "future": True,  # 2.0 スタイル
    # プール関連
    "pool_pre_ping": True,
    "pool_recycle": settings.db_pool_recycle,
    "pool_timeout": settings.db_pool_timeout,
    "pool_size": settings.db_pool_size,
    "max_overflow": settings.db_max_overflow,
}
if IS_SERVERLESS:
    # Cloud Run / Lambda などではプールを持たない
    engine_kwargs["poolclass"] = NullPool
    # サーバレスは pool_* オプションが効かないので削除
    for k in ("pool_size", "max_overflow"):
        engine_kwargs.pop(k, None)

# ── 同期 Engine & SessionMaker ─────────────────────────────────────────────
sync_engine: Final[Engine] = create_engine(settings.sync_database_url, **engine_kwargs)
SyncSessionLocal: Final[sessionmaker[Session]] = sessionmaker(
    bind=sync_engine, expire_on_commit=False, autoflush=False, future=True
)

# ── 非同期 Engine & SessionMaker ───────────────────────────────────────────
async_engine: Final[AsyncEngine] = create_async_engine(settings.async_database_url, **engine_kwargs)
AsyncSessionLocal: Final[async_sessionmaker[AsyncSession]] = async_sessionmaker(
    bind=async_engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


# --------------------------------------------------------------------------- #
# 2) Session 取得ユーティリティ（FastAPIのDI用）
# --------------------------------------------------------------------------- #
def get_sync_session() -> Generator[Session, None, None]:
    """[同期] DI用のDBセッション取得関数"""
    session = SyncSessionLocal()
    try:
        yield session
        session.commit()
    except SQLAlchemyError:
        logger.exception("Database error occurred. Rolling back transaction.")
        session.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="A database error occurred.")
    except Exception as e:
        logger.exception("An unexpected application error occurred. Rolling back transaction.")
        session.rollback()
        raise e
    finally:
        session.close()


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """[非同期] DI用のDBセッション取得関数"""
    session = AsyncSessionLocal()
    try:
        yield session
        await session.commit()
    except SQLAlchemyError:
        logger.exception("Database error occurred. Rolling back transaction.")
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="A database error occurred.")
    except Exception as e:
        logger.exception("An unexpected application error occurred. Rolling back transaction.")
        await session.rollback()
        raise e
    finally:
        await session.close()


# --------------------------------------------------------------------------- #
# 3) 運用便利関数
# --------------------------------------------------------------------------- #


def create_all_tables_sync() -> None:
    """[同期] 全テーブルを作成"""
    Base.metadata.create_all(bind=sync_engine)
    logger.info("All tables created (sync)")


def drop_all_tables_sync() -> None:
    """[同期] 全テーブルを削除（開発環境のみ）"""
    if settings.env not in {"dev", "ci", "test", "local"}:
        raise RuntimeError(f"Refuse to drop all tables in '{settings.env}' environment.")

    Base.metadata.drop_all(bind=sync_engine)
    logger.warning("All tables dropped (sync) - env: %s", settings.env)


async def drop_all_tables_async() -> None:
    """[非同期] 全テーブルを削除（開発環境のみ）"""
    if settings.env not in {"dev", "ci", "test", "local"}:
        raise RuntimeError(f"Refuse to drop all tables in '{settings.env}' environment.")

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    logger.warning("All tables dropped (async) - env: %s", settings.env)


async def ping_async() -> None:
    """[非同期] `SELECT 1` で非同期DB接続を確認。"""
    async with async_engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Async database connection OK")


def ping_sync() -> None:
    """[同期] `SELECT 1` で同期DB接続を確認。"""
    with sync_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("Sync database connection OK")


async def drop_and_create_database_if_dev_async() -> None:
    """[非同期]【開発 / CI 専用】非同期DBを再作成。"""
    if settings.env not in {"dev", "ci", "test"}:
        raise RuntimeError(f"Refuse to recreate database in '{settings.env}' env.")

    # 既存の接続をすべて切断してからDBを削除・作成する必要がある場合がある
    # ここではシンプルな実行例を示す
    async with async_engine.connect() as conn:
        await conn.execution_options(isolation_level="AUTOCOMMIT")
        await conn.execute(text(f"DROP DATABASE IF EXISTS `{settings.effective_db_name}`"))
        await conn.execute(text(f"CREATE DATABASE `{settings.effective_db_name}`"))
    logger.warning("Async database recreated (env=%s)", settings.env)


def drop_and_create_database_if_dev_sync() -> None:
    """[同期]【開発 / CI 専用】同期DBを再作成。"""
    if settings.env not in {"dev", "ci", "test"}:
        raise RuntimeError(f"Refuse to recreate database in '{settings.env}' env.")

    with sync_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS `{settings.effective_db_name}`"))
        conn.execute(text(f"CREATE DATABASE `{settings.effective_db_name}`"))
    logger.warning("Sync database recreated (env=%s)", settings.env)


# --------------------------------------------------------------------------- #
# 4) 型補助 (IDE 補完向け)
# --------------------------------------------------------------------------- #


class DBSessionDict(TypedDict, total=False):
    """
    session.info で使う任意データの型定義例。
    同期・非同期セッションで共通して利用可能。

    Example:
        session.info["trace_id"] = "abc-123"
        session.info["user_id"] = "user-xyz"
    """

    trace_id: str
    user_id: str


# --------------------------------------------------------------------------- #
# 5) CLI 実行時の動作
# --------------------------------------------------------------------------- #


async def main_cli():
    """
    `$ python -m app.db` などで実行した際の動作。
    """

    await ping_async()
    ping_sync()

    if settings.env in {"dev", "ci", "test"}:
        # 同期・非同期で同じDBを操作するため、どちらか片方の実行で十分
        # ここでは同期版を例として実行
        drop_and_create_database_if_dev_sync()
    else:
        print("Skipping database recreation (not in dev/ci/test env).")


if __name__ == "__main__":  # pragma: no cover
    # このスクリプトを直接実行した際の動作
    asyncio.run(main_cli())
