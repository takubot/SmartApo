#!/usr/bin/env python3
"""BigQuery テーブル構造確認スクリプト"""

import sys
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from google.cloud import bigquery


def check_table_structure():
    """BigQuery上のテーブル構造を確認"""
    project_id = "smartapo"
    client = bigquery.Client(project=project_id)

    # データセット一覧を取得
    print("=== BigQuery データセット一覧 ===")
    datasets = list(client.list_datasets())
    if not datasets:
        print("データセットがありません。")
        print("セットアップを実行してください:")
        print("  uv run python scripts/setup_bigquery.py")
        return

    for dataset in datasets:
        dataset_id = dataset.dataset_id
        print(f"\n--- データセット: {dataset_id} ---")

        tables = list(client.list_tables(dataset_id))
        if not tables:
            print("  テーブルなし")
            continue

        for table_ref in tables:
            table = client.get_table(table_ref)
            print(f"\n  テーブル: {table.table_id} ({table.num_rows} rows)")
            for field in table.schema:
                print(f"    {field.name}: {field.field_type} {'NULLABLE' if field.mode == 'NULLABLE' else 'REQUIRED'}")


if __name__ == "__main__":
    check_table_structure()
