#!/usr/bin/env python3
"""
BigQuery スキーマ確認スクリプト for based-template-svc

- モデル(Base.metadata) と BigQuery上の実テーブルを比較
- 差分情報を標準出力に表示（SQLの実行は行わない）

Usage:
  cd python/domain/based-template-svc
  uv run python src/database_utils/db_ops_query.py
"""

from __future__ import annotations

import sys
from logging import getLogger
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

logger = getLogger(__name__)

try:
    from sqlalchemy import MetaData, inspect

    from src.database_utils.database import sync_engine
    from src.models.tables import Base
except Exception as e:  # pragma: no cover
    print(f"Import error: {e}")
    print("cd python/domain/based-template-svc && uv sync")
    sys.exit(1)


def load_bq_metadata() -> MetaData:
    """BigQueryから現在のメタデータを取得"""
    bq_md = MetaData()
    with sync_engine.connect() as conn:
        bq_md.reflect(bind=conn)
    return bq_md


def get_dataset_name() -> str:
    """データセット名を取得する"""
    return str(sync_engine.url)


def main() -> None:
    dataset_name = get_dataset_name()

    print("=" * 80)
    print("BigQuery スキーマ差分確認")
    print(f"データセット: {dataset_name}")
    print("=" * 80)
    print()

    with sync_engine.connect() as conn:
        bq_md = MetaData()
        bq_md.reflect(bind=conn)
        model_md = Base.metadata

        model_tables = set(model_md.tables.keys())
        bq_tables = set(bq_md.tables.keys())

        missing_tables = model_tables - bq_tables
        extra_tables = bq_tables - model_tables
        common_tables = model_tables & bq_tables

        print("分析結果:")
        print(f"  モデル定義テーブル: {len(model_tables)} 個")
        print(f"  BigQuery上テーブル: {len(bq_tables)} 個")
        print(f"  新規テーブル (未作成): {len(missing_tables)} 個")
        print(f"  BigQueryのみ: {len(extra_tables)} 個")
        print(f"  共通テーブル: {len(common_tables)} 個")
        print()

        if missing_tables:
            print("=" * 60)
            print("未作成テーブル (CREATE TABLE が必要)")
            print("=" * 60)
            for t in sorted(missing_tables):
                print(f"  - {t}")
            print()

        if extra_tables:
            print("=" * 60)
            print("BigQueryのみに存在するテーブル")
            print("=" * 60)
            for t in sorted(extra_tables):
                print(f"  - {t}")
            print()

        if common_tables:
            print("=" * 60)
            print("共通テーブル (カラム差分チェック)")
            print("=" * 60)
            for t in sorted(common_tables):
                model_cols = {c.name for c in model_md.tables[t].columns}
                bq_cols = {c.name for c in bq_md.tables[t].columns}

                missing_cols = model_cols - bq_cols
                extra_cols = bq_cols - model_cols

                if missing_cols or extra_cols:
                    print(f"  [{t}]")
                    for col in sorted(missing_cols):
                        print(f"    + 追加が必要: {col}")
                    for col in sorted(extra_cols):
                        print(f"    - BigQueryのみ: {col}")
                else:
                    print(f"  [{t}] OK")
            print()

    print("=" * 80)
    print("スキーマ確認完了")
    print("=" * 80)


if __name__ == "__main__":  # pragma: no cover
    main()
