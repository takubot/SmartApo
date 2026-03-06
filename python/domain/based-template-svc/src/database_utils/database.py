"""
db.py – BigQuery + SQLAlchemy 接続設定 & 運用ユーティリティ
============================================================

* BigQuery を SQLAlchemy 経由で利用（sqlalchemy-bigquery）
* 同期セッションを提供（BigQuery は非同期ドライバ未対応）
* FastAPI の依存関係として get_sync_session を提供
"""

from __future__ import annotations

import asyncio
from collections.abc import Generator
from logging import getLogger
from typing import Final, TypedDict

from fastapi import HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from ..common.env_config import get_settings
from ..models.tables import Base

logger = getLogger(__name__)

# --------------------------------------------------------------------------- #
# 1) Engine & Session シングルトン
# --------------------------------------------------------------------------- #

settings = get_settings()

# BigQuery Engine（プール不要 — BigQuery は HTTP API ベース）
engine_kwargs: dict[str, object] = {
    "future": True,
}

sync_engine: Final[Engine] = create_engine(settings.bigquery_url, **engine_kwargs)
SyncSessionLocal: Final[sessionmaker[Session]] = sessionmaker(
    bind=sync_engine, expire_on_commit=False, autoflush=False, future=True
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


# --------------------------------------------------------------------------- #
# 3) 運用便利関数
# --------------------------------------------------------------------------- #


def create_all_tables_sync() -> None:
    """[同期] 全テーブルを作成"""
    Base.metadata.create_all(bind=sync_engine)
    logger.info("All tables created (sync)")


def ping_sync() -> None:
    """[同期] BigQuery接続確認"""
    with sync_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logger.info("BigQuery connection OK")


# --------------------------------------------------------------------------- #
# 4) 型補助 (IDE 補完向け)
# --------------------------------------------------------------------------- #


class DBSessionDict(TypedDict, total=False):
    trace_id: str
    user_id: str


# --------------------------------------------------------------------------- #
# 5) CLI 実行時の動作
# --------------------------------------------------------------------------- #


def main_cli():
    """`$ python -m database` などで実行した際の動作。"""
    ping_sync()
    print(f"BigQuery connection OK: {settings.bigquery_url}")


if __name__ == "__main__":  # pragma: no cover
    main_cli()
