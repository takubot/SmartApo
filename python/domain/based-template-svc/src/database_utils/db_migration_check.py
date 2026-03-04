#!/usr/bin/env python3
"""
Read-only migration health checker for based-template-svc.

What this script does:
- Reads Alembic version state (current/head/pending)
- Compares SQLAlchemy models(Base.metadata) vs actual DB tables
- Detects suspicious "partially applied migration" patterns
- Prints diagnostics only (no write / no migration execution)
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Final

from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import MetaData, inspect, text

# Add service root to import path:
# .../based-template-svc/src/database_utils/db_migration_check.py -> .../based-template-svc
project_root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(project_root))

from src.database_utils.database import sync_engine
from src.models.tables import Base

ALEMBIC_INI_PATH: Final[Path] = project_root / "alembic.ini"

# Known high-risk migration patterns can be listed here for proactive warnings.
# If a revision is pending but its "new tables" already exist, it is often a
# sign of a partially applied migration or an alembic_version mismatch.
RISKY_REVISION_TABLES: Final[dict[str, tuple[str, ...]]] = {
    "8afea8b7696a": (
        "booking_block",
        "booking_menu",
        "booking_settings",
        "custom_form",
        "reference_link",
        "reference_link_to_file_association",
    ),
}


def reflect_db_metadata() -> MetaData:
    md = MetaData()
    with sync_engine.connect() as conn:
        md.reflect(bind=conn)
    return md


def get_alembic_state() -> tuple[tuple[str, ...], tuple[str, ...], tuple[str, ...]]:
    cfg = Config(str(ALEMBIC_INI_PATH))
    script = ScriptDirectory.from_config(cfg)
    heads = tuple(script.get_heads())

    with sync_engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        current_heads = tuple(ctx.get_current_heads())

    pending = tuple(h for h in heads if h not in current_heads)
    return current_heads, heads, pending


def table_exists(table_name: str) -> bool:
    inspector = inspect(sync_engine)
    return inspector.has_table(table_name)


def safe_count(table_name: str) -> int | None:
    if not table_exists(table_name):
        return None
    with sync_engine.connect() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`")).scalar() or 0)


def print_section(title: str) -> None:
    print()
    print("=" * 80)
    print(title)
    print("=" * 80)


def _normalize_type_repr(type_obj: object) -> str:
    return str(type_obj).replace(" ", "").lower()


def _normalize_server_default(default_obj: object | None) -> str | None:
    if default_obj is None:
        return None
    default_arg = getattr(default_obj, "arg", default_obj)
    return str(default_arg).strip().lower()


def compare_table_columns(model_table: object, db_table: object) -> list[str]:
    model_columns = {column.name: column for column in model_table.columns}
    db_columns = {column.name: column for column in db_table.columns}

    issues: list[str] = []

    missing_in_db_columns = sorted(set(model_columns) - set(db_columns))
    extra_in_db_columns = sorted(set(db_columns) - set(model_columns))

    for column_name in missing_in_db_columns:
        issues.append(f"[MISSING_COLUMN] model -> DB: `{column_name}`")
    for column_name in extra_in_db_columns:
        issues.append(f"[EXTRA_COLUMN] DB only: `{column_name}`")

    common_columns = sorted(set(model_columns) & set(db_columns))
    for column_name in common_columns:
        model_column = model_columns[column_name]
        db_column = db_columns[column_name]

        model_type = _normalize_type_repr(model_column.type)
        db_type = _normalize_type_repr(db_column.type)
        if model_type != db_type:
            issues.append(
                f"[TYPE_MISMATCH] `{column_name}` model={model_column.type} db={db_column.type}"
            )

        if bool(model_column.nullable) != bool(db_column.nullable):
            issues.append(
                f"[NULLABLE_MISMATCH] `{column_name}` model={model_column.nullable} db={db_column.nullable}"
            )

        if bool(model_column.primary_key) != bool(db_column.primary_key):
            issues.append(
                f"[PK_MISMATCH] `{column_name}` model={model_column.primary_key} db={db_column.primary_key}"
            )

        model_default = _normalize_server_default(model_column.server_default)
        db_default = _normalize_server_default(db_column.server_default)
        if model_default != db_default:
            issues.append(
                f"[DEFAULT_MISMATCH] `{column_name}` model={model_default} db={db_default}"
            )

    return issues


def main() -> int:
    print("=" * 80)
    print("based-template-svc | Migration Health Check (READ ONLY)")
    print("=" * 80)
    print("DB target:", sync_engine.url)

    # 1) Alembic state
    try:
        current_heads, heads, pending = get_alembic_state()
    except Exception as e:
        print_section("Alembic State")
        print("[ERROR] Failed to read Alembic state:", e)
        return 1

    print_section("Alembic State")
    print("current_heads:", current_heads if current_heads else "(none)")
    print("heads       :", heads if heads else "(none)")
    print("pending     :", pending if pending else "(none)")

    # 2) Model vs DB table diff
    try:
        model_metadata = Base.metadata
        db_metadata = reflect_db_metadata()
        model_tables = set(model_metadata.tables.keys())
        db_tables = set(db_metadata.tables.keys())
    except Exception as e:
        print_section("Schema Diff")
        print("[ERROR] Failed to read schema metadata:", e)
        return 1

    missing_in_db = sorted(model_tables - db_tables)
    extra_in_db = sorted(db_tables - model_tables)
    common_tables = sorted(model_tables & db_tables)

    print_section("Schema Diff (Model vs DB)")
    print("model tables :", len(model_tables))
    print("db tables    :", len(db_tables))
    print("missing_in_db:", len(missing_in_db))
    print("extra_in_db  :", len(extra_in_db))
    print("common       :", len(common_tables))

    if missing_in_db:
        print()
        print("[WARN] Tables defined in model but missing in DB:")
        for name in missing_in_db:
            print(" -", name)

    if extra_in_db:
        print()
        print("[INFO] Tables existing in DB but not in model:")
        for name in extra_in_db:
            print(" -", name)

    # 2.1) Column-level diff for common tables
    tables_with_column_issues = 0
    total_column_issues = 0
    print_section("Column Diff (common tables)")
    for table_name in common_tables:
        model_table = model_metadata.tables[table_name]
        db_table = db_metadata.tables[table_name]
        column_issues = compare_table_columns(model_table, db_table)
        if not column_issues:
            continue

        tables_with_column_issues += 1
        total_column_issues += len(column_issues)
        print(f"[WARN] `{table_name}` has {len(column_issues)} column-level mismatch(es):")
        for issue in column_issues:
            print(" -", issue)

    if tables_with_column_issues == 0:
        print("[OK] No column-level mismatch in common tables.")
    else:
        print()
        print(
            f"[WARN] Column-level mismatches found in {tables_with_column_issues} table(s), "
            f"total issues: {total_column_issues}"
        )

    # 3) Partial-apply risk checks
    print_section("Risk Checks")
    risk_found = False

    # Check known risky revisions
    pending_set = set(pending)
    for rev, expected_tables in RISKY_REVISION_TABLES.items():
        if rev not in pending_set:
            continue
        existing = [t for t in expected_tables if t in db_tables]
        if existing:
            risk_found = True
            print(f"[RISK] Revision {rev} is pending, but some of its tables already exist:")
            for t in existing:
                print(" -", t)
            print("       -> Possible partial apply or alembic_version mismatch.")

    # Old/new coexistence check for reference-link migration
    form_exists = "form" in db_tables
    ref_exists = "reference_link" in db_tables
    ffa_exists = "form_to_file_association" in db_tables
    rfa_exists = "reference_link_to_file_association" in db_tables
    if (form_exists and ref_exists) or (ffa_exists and rfa_exists):
        risk_found = True
        print("[RISK] Legacy and new link tables coexist:")
        print(f" - form / reference_link: {form_exists} / {ref_exists}")
        print(f" - form_to_file_association / reference_link_to_file_association: {ffa_exists} / {rfa_exists}")
        print("       -> Verify migration order and data copy completeness.")

    # Data volume visibility for manual decision-making
    form_count = safe_count("form")
    ref_count = safe_count("reference_link")
    ffa_count = safe_count("form_to_file_association")
    rfa_count = safe_count("reference_link_to_file_association")
    print()
    print("Counts (if table exists):")
    print(" - form:", form_count if form_count is not None else "N/A")
    print(" - reference_link:", ref_count if ref_count is not None else "N/A")
    print(" - form_to_file_association:", ffa_count if ffa_count is not None else "N/A")
    print(" - reference_link_to_file_association:", rfa_count if rfa_count is not None else "N/A")

    if not risk_found:
        print("[OK] No high-risk partial-apply pattern detected by this checker.")

    print()
    print("Done (read-only).")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
