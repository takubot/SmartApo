#!/usr/bin/env python3
"""
Read-only migration health checker for based-template-svc (BigQuery版).

- SQLAlchemy models(Base.metadata) vs BigQuery上の実テーブルを比較
- 診断結果のみ表示（書き込みなし）
"""

from __future__ import annotations

import sys
from pathlib import Path

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import MetaData, inspect, text

from src.database_utils.database import sync_engine
from src.models.tables import Base


def reflect_bq_metadata() -> MetaData:
    md = MetaData()
    with sync_engine.connect() as conn:
        md.reflect(bind=conn)
    return md


def main() -> int:
    print("=" * 80)
    print("based-template-svc | Schema Health Check (READ ONLY / BigQuery)")
    print("=" * 80)
    print("BigQuery URL:", sync_engine.url)

    try:
        model_metadata = Base.metadata
        bq_metadata = reflect_bq_metadata()
        model_tables = set(model_metadata.tables.keys())
        bq_tables = set(bq_metadata.tables.keys())
    except Exception as e:
        print(f"[ERROR] Failed to read schema metadata: {e}")
        return 1

    missing_in_bq = sorted(model_tables - bq_tables)
    extra_in_bq = sorted(bq_tables - model_tables)
    common_tables = sorted(model_tables & bq_tables)

    print()
    print("Schema Diff (Model vs BigQuery)")
    print("-" * 40)
    print("model tables :", len(model_tables))
    print("bq tables    :", len(bq_tables))
    print("missing_in_bq:", len(missing_in_bq))
    print("extra_in_bq  :", len(extra_in_bq))
    print("common       :", len(common_tables))

    if missing_in_bq:
        print()
        print("[WARN] Tables defined in model but missing in BigQuery:")
        for name in missing_in_bq:
            print(" -", name)

    if extra_in_bq:
        print()
        print("[INFO] Tables existing in BigQuery but not in model:")
        for name in extra_in_bq:
            print(" -", name)

    # Column-level diff
    tables_with_issues = 0
    for table_name in common_tables:
        model_cols = {c.name for c in model_metadata.tables[table_name].columns}
        bq_cols = {c.name for c in bq_metadata.tables[table_name].columns}

        missing = model_cols - bq_cols
        extra = bq_cols - model_cols

        if missing or extra:
            tables_with_issues += 1
            print(f"\n[WARN] `{table_name}` has column mismatches:")
            for col in sorted(missing):
                print(f"  + missing in BQ: {col}")
            for col in sorted(extra):
                print(f"  - extra in BQ: {col}")

    if tables_with_issues == 0:
        print("\n[OK] No column-level mismatch in common tables.")

    print()
    print("Done (read-only).")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
