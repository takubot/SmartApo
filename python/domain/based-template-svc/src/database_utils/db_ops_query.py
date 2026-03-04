#!/usr/bin/env python3
"""
DB schema diff & SQL generator (print-only) for based-template-svc

- モデル(Base.metadata) と 実DBを比較し、整合のためのDDLのみを標準出力に表示
- SQLの実行は一切行わない（print only）
- MySQL 方言を前提

Usage:
  cd python/domain/based-template-svc
  uv run python src/database_utils/db_ops_query.py
  # or with flags
  uv run python src/database_utils/db_ops_query.py --only=create        # CREATE のみ
  uv run python src/database_utils/db_ops_query.py --only=alter         # ALTER のみ
  uv run python src/database_utils/db_ops_query.py --only=drop          # DROP (コメントアウト) のみ
"""

from __future__ import annotations

import argparse
import re
import sys
from logging import getLogger
from pathlib import Path

# Ensure service root on path (so `import src...` works even when run as a script)
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

logger = getLogger(__name__)

try:
    from sqlalchemy import MetaData, Table, inspect
    from sqlalchemy.engine import Connection
    from sqlalchemy.schema import CreateTable

    from src.database_utils.database import sync_engine
    from src.models.tables import Base
except Exception as e:  # pragma: no cover
    print(f"Import error: {e}")
    print("cd python/domain/based-template-svc && uv sync")
    sys.exit(1)


def load_db_metadata(conn: Connection) -> MetaData:
    db_md = MetaData()
    db_md.reflect(bind=conn)
    return db_md


def get_database_name() -> str:
    """データベース名を取得する"""
    return sync_engine.url.database


def get_model_metadata() -> MetaData:
    return Base.metadata


def compute_table_sets(model_md: MetaData, db_md: MetaData) -> tuple[set[str], set[str], set[str]]:
    model_tables = set(model_md.tables.keys())
    db_tables = set(db_md.tables.keys())
    return model_tables - db_tables, db_tables - model_tables, model_tables & db_tables


# ---------- Type normalization helpers ----------
_bool_like = {"bool", "boolean", "tinyint(1)"}
_int_like = {"int", "integer"}


def normalize_type_name(type_str: str) -> str:
    s = type_str.strip().lower()
    s = re.sub(r"\s+", " ", s)
    # unify synonyms
    if s in _bool_like:
        return "tinyint(1)"
    if s in _int_like:
        return "int"
    # remove charset/collation noise if present
    s = re.sub(r" character set \w+", "", s)
    s = re.sub(r" collate \w+", "", s)
    return s


def get_db_columns_info(table_name: str) -> dict[str, dict[str, object]]:
    insp = inspect(sync_engine)
    cols = insp.get_columns(table_name)
    info: dict[str, dict[str, object]] = {}
    for c in cols:
        # c['type'] is a TypeEngine; compile to dialect-specific string
        type_name = normalize_type_name(c["type"].compile(dialect=sync_engine.dialect))
        info[c["name"]] = {
            "nullable": bool(c.get("nullable", True)),
            "type": type_name,
        }
    return info


def get_model_columns_info(table: Table) -> dict[str, dict[str, object]]:
    info: dict[str, dict[str, object]] = {}
    for c in table.columns:
        type_name = normalize_type_name(c.type.compile(dialect=sync_engine.dialect))
        info[c.name] = {
            "nullable": bool(c.nullable),
            "type": type_name,
        }
    return info


def generate_create_table_sql(table: Table, database_name: str) -> str:
    """データベース名を含むCREATE TABLE文を生成"""
    sql = str(CreateTable(table).compile(dialect=sync_engine.dialect)).rstrip("; ")
    # データベース名を追加
    sql = sql.replace(f"CREATE TABLE `{table.name}`", f"CREATE TABLE `{database_name}`.`{table.name}`")
    return sql + ";"


def generate_alter_table_sql(model_table: Table, db_table: Table, database_name: str) -> list[str]:
    """データベース名を含むALTER TABLE文を生成"""
    stmts: list[str] = []

    model_cols = get_model_columns_info(model_table)
    db_cols = get_db_columns_info(db_table.name)

    # Add missing columns only
    for col_name in sorted(set(model_cols) - set(db_cols)):
        m = model_cols[col_name]
        ddl = f"ALTER TABLE `{database_name}`.`{model_table.name}` ADD COLUMN `{col_name}` {m['type']}"
        if not m["nullable"]:
            ddl += " NOT NULL"
        stmts.append(ddl + ";")

    # Modify columns only when there is a strict, material diff
    for col_name in sorted(set(model_cols) & set(db_cols)):
        m = model_cols[col_name]
        d = db_cols[col_name]

        needs_type_change = m["type"] != d["type"]
        needs_not_null = (not m["nullable"]) and bool(d["nullable"])  # tighten only

        if needs_type_change or needs_not_null:
            ddl = f"ALTER TABLE `{database_name}`.`{model_table.name}` MODIFY COLUMN `{col_name}` {m['type']}"
            if not m["nullable"]:
                ddl += " NOT NULL"
            stmts.append(ddl + ";")

    # Never DROP automatically; just comment out suggestions for extra columns
    for col_name in sorted(set(db_cols) - set(model_cols)):
        stmts.append(f"-- ALTER TABLE `{database_name}`.`{model_table.name}` DROP COLUMN `{col_name}`;")

    return stmts


def generate_drop_table_sql(table_name: str, database_name: str) -> str:
    """データベース名を含むDROP TABLE文を生成"""
    return f"-- DROP TABLE `{database_name}`.`{table_name}`;"


def main() -> None:
    parser = argparse.ArgumentParser(description="Print-only SQL for schema alignment (conservative)")
    parser.add_argument("--only", choices=["create", "alter", "drop"], help="出力対象を限定")
    args = parser.parse_args()

    database_name = get_database_name()

    print("=" * 80)
    print("データベーススキーマ差分 SQL 生成")
    print(f"データベース: {database_name}")
    print("=" * 80)
    print()

    with sync_engine.connect() as conn:
        db_md = load_db_metadata(conn)
        model_md = get_model_metadata()

        missing_tables, extra_tables, common_tables = compute_table_sets(model_md, db_md)

        # デバッグ情報を表示
        print("分析結果:")
        print(f"   新規テーブル: {len(missing_tables)} 個")
        print(f"   削除候補テーブル: {len(extra_tables)} 個")
        print(f"   共通テーブル: {len(common_tables)} 個")
        print()

        has_output = False

        # CREATE
        if args.only in (None, "create") and missing_tables:
            print("=" * 60)
            print("CREATE TABLE (新規テーブル作成)")
            print("=" * 60)
            for t in sorted(missing_tables):
                print(generate_create_table_sql(model_md.tables[t], database_name))
                print()
            has_output = True

        # ALTER (conservative)
        if args.only in (None, "alter"):
            alter_outputs = []
            for t in sorted(common_tables):
                stmts = generate_alter_table_sql(model_md.tables[t], db_md.tables[t], database_name)
                if stmts:
                    alter_outputs.extend(stmts)

            if alter_outputs:
                print("=" * 60)
                print("ALTER TABLE (テーブル構造変更)")
                print("=" * 60)
                for stmt in alter_outputs:
                    print(stmt)
                print()
                has_output = True
            elif common_tables:
                # ALTER文がない場合でも、共通テーブルがあることを表示
                print("=" * 60)
                print("ALTER TABLE (テーブル構造変更)")
                print("=" * 60)
                print("共通テーブルはありますが、構造変更は不要です。")
                print()
                has_output = True

        # DROP (commented)
        if args.only in (None, "drop") and extra_tables:
            print("=" * 60)
            print("DROP TABLE (削除候補 - コメントアウト)")
            print("=" * 60)
            for t in sorted(extra_tables):
                print(generate_drop_table_sql(t, database_name))
            print()
            has_output = True

    if not has_output:
        print("スキーマに変更はありません。")

    print("=" * 80)
    print("SQL生成完了")
    print("=" * 80)


if __name__ == "__main__":  # pragma: no cover
    main()
