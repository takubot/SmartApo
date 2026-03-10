#!/usr/bin/env python3
"""
WSL ターミナルで DB の状態を見やすく確認するための開発用 CLI。

使い方:
  uv run python src/database_utils/db_DEV.py overview
  uv run python src/database_utils/db_DEV.py tables
  uv run python src/database_utils/db_DEV.py schema --table dialer_contacts
  uv run python src/database_utils/db_DEV.py preview --table dialer_contacts --limit 5
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from src.database_utils.database import sync_engine

DEFAULT_PREVIEW_LIMIT = 5
MAX_PREVIEW_LIMIT = 50

def truncate(value: object, max_width: int = 40) -> str:
    """長い値をターミナル向けに短縮する。"""
    if value is None:
        return "NULL"

    text_value = str(value).replace("\n", "\\n")
    if len(text_value) <= max_width:
        return text_value
    return text_value[: max_width - 3] + "..."

def render_table(headers: list[str], rows: list[list[object]]) -> str:
    """シンプルなASCIIテーブルを描画する。"""
    normalized_rows = [[truncate(cell) for cell in row] for row in rows]
    widths = [len(header) for header in headers]

    for row in normalized_rows:
        for idx, cell in enumerate(row):
            widths[idx] = max(widths[idx], len(cell))

    def build_line(char: str = "-") -> str:
        return "+" + "+".join(char * (width + 2) for width in widths) + "+"

    def build_row(values: list[str]) -> str:
        return "| " + " | ".join(value.ljust(widths[idx]) for idx, value in enumerate(values)) + " |"

    lines = [build_line(), build_row(headers), build_line("=")]
    for row in normalized_rows:
        lines.append(build_row(row))
    lines.append(build_line())
    return "\n".join(lines)

def print_section(title: str) -> None:
    print()
    print("=" * 80)
    print(title)
    print("=" * 80)

def get_table_names() -> list[str]:
    inspector = inspect(sync_engine)
    return sorted(inspector.get_table_names())

def validate_table_name(table_name: str) -> str:
    table_names = get_table_names()
    if table_name not in table_names:
        available = ", ".join(table_names[:20])
        raise ValueError(
            f"Table '{table_name}' は存在しません。"
            f" 利用可能なテーブル例: {available}"
        )
    return table_name

def fetch_row_count(table_name: str) -> int:
    query = text(f"SELECT COUNT(*) AS count FROM `{table_name}`")
    with sync_engine.connect() as conn:
        return int(conn.execute(query).scalar_one())

def fetch_preview_rows(table_name: str, limit: int) -> tuple[list[str], list[list[object]]]:
    query = text(f"SELECT * FROM `{table_name}` LIMIT {limit}")
    with sync_engine.connect() as conn:
        result = conn.execute(query)
        headers = list(result.keys())
        rows = [list(row) for row in result.fetchall()]
    return headers, rows

def cmd_ping(_: argparse.Namespace) -> int:
    with sync_engine.connect() as conn:
        value = conn.execute(text("SELECT 1")).scalar_one()

    print_section("DB Connection OK")
    print(f"URL      : {sync_engine.url.render_as_string(hide_password=True)}")
    print(f"SELECT 1 : {value}")
    return 0

def cmd_tables(_: argparse.Namespace) -> int:
    table_names = get_table_names()

    print_section("Table List")
    if not table_names:
        print("テーブルはまだ存在しません。")
        return 0

    rows = [[idx + 1, name] for idx, name in enumerate(table_names)]
    print(render_table(["No", "Table"], rows))
    print(f"total tables: {len(table_names)}")
    return 0

def cmd_counts(_: argparse.Namespace) -> int:
    table_names = get_table_names()

    print_section("Row Counts")
    if not table_names:
        print("テーブルはまだ存在しません。")
        return 0

    rows: list[list[object]] = []
    for name in table_names:
        rows.append([name, fetch_row_count(name)])

    print(render_table(["Table", "Rows"], rows))
    return 0

def cmd_schema(args: argparse.Namespace) -> int:
    table_name = validate_table_name(args.table)
    inspector = inspect(sync_engine)
    columns = inspector.get_columns(table_name)
    primary_keys = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))

    print_section(f"Schema: {table_name}")
    rows: list[list[object]] = []
    for column in columns:
        rows.append(
            [
                column["name"],
                column["type"],
                "YES" if column.get("nullable") else "NO",
                "PK" if column["name"] in primary_keys else "",
                column.get("default"),
            ]
        )

    print(render_table(["Column", "Type", "Nullable", "Key", "Default"], rows))
    return 0

def cmd_preview(args: argparse.Namespace) -> int:
    table_name = validate_table_name(args.table)
    limit = max(1, min(args.limit, MAX_PREVIEW_LIMIT))
    headers, rows = fetch_preview_rows(table_name, limit)

    print_section(f"Preview: {table_name} (limit={limit})")
    print(f"total rows: {fetch_row_count(table_name)}")

    if not rows:
        print("データはまだありません。")
        return 0

    print(render_table(headers, rows))
    return 0

def cmd_overview(args: argparse.Namespace) -> int:
    table_names = get_table_names()
    limit = max(1, min(args.limit, MAX_PREVIEW_LIMIT))

    print_section("Database Overview")
    print(f"URL         : {sync_engine.url.render_as_string(hide_password=True)}")
    print(f"table count : {len(table_names)}")

    if not table_names:
        print("テーブルはまだ存在しません。")
        return 0

    summary_rows: list[list[object]] = []
    for name in table_names:
        summary_rows.append([name, fetch_row_count(name)])
    print()
    print(render_table(["Table", "Rows"], summary_rows))

    preview_targets = table_names[: args.preview_tables]
    for table_name in preview_targets:
        headers, rows = fetch_preview_rows(table_name, limit)
        print_section(f"Sample Rows: {table_name}")
        if not rows:
            print("データはまだありません。")
            continue
        print(render_table(headers, rows))

    return 0

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="DB 開発用ビューア")
    subparsers = parser.add_subparsers(dest="command", required=True)

    ping_parser = subparsers.add_parser("ping", help="DB接続確認")
    ping_parser.set_defaults(func=cmd_ping)

    tables_parser = subparsers.add_parser("tables", help="テーブル一覧")
    tables_parser.set_defaults(func=cmd_tables)

    counts_parser = subparsers.add_parser("counts", help="各テーブルの件数")
    counts_parser.set_defaults(func=cmd_counts)

    schema_parser = subparsers.add_parser("schema", help="テーブルのカラム一覧")
    schema_parser.add_argument("--table", required=True, help="対象テーブル名")
    schema_parser.set_defaults(func=cmd_schema)

    preview_parser = subparsers.add_parser("preview", help="テーブルデータを先頭から表示")
    preview_parser.add_argument("--table", required=True, help="対象テーブル名")
    preview_parser.add_argument("--limit", type=int, default=DEFAULT_PREVIEW_LIMIT, help="表示件数")
    preview_parser.set_defaults(func=cmd_preview)

    overview_parser = subparsers.add_parser("overview", help="テーブル件数と先頭データをまとめて表示")
    overview_parser.add_argument("--limit", type=int, default=3, help="各テーブルの表示件数")
    overview_parser.add_argument(
        "--preview-tables",
        type=int,
        default=5,
        help="先頭データを表示するテーブル数",
    )
    overview_parser.set_defaults(func=cmd_overview)

    return parser

def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        return args.func(args)
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        return 1
    except SQLAlchemyError as exc:
        print(f"[ERROR] Database error: {exc}")
        return 1
    finally:
        try:
            sync_engine.dispose()
        except Exception:
            pass

if __name__ == "__main__":
    raise SystemExit(main())
