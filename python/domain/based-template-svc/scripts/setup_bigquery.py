#!/usr/bin/env python3
"""
BigQuery セットアップスクリプト for based-template-svc

このスクリプトは以下を実行します:
1. BigQuery データセットの作成（存在しない場合）
2. SQLAlchemy モデルに基づくテーブルの作成

前提条件:
- gcloud CLI がインストールされていること
- ADC認証済みであること: gcloud auth application-default login
- GCPプロジェクト: smartapo

実行方法:
  cd python/domain/based-template-svc
  uv run python scripts/setup_bigquery.py

  # 特定の環境を指定する場合
  ENV=dev uv run python scripts/setup_bigquery.py
  ENV=stg uv run python scripts/setup_bigquery.py
  ENV=prod uv run python scripts/setup_bigquery.py

  # データセット名を直接指定する場合
  BIGQUERY_DATASET=my_dataset uv run python scripts/setup_bigquery.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# プロジェクトルートをPythonパスに追加
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def setup_bigquery(drop_existing: bool = False) -> None:
    """BigQuery データセットとテーブルをセットアップ"""
    from google.cloud import bigquery
    from google.cloud.exceptions import Conflict

    from src.common.env_config import get_settings
    from src.database_utils.database import create_all_tables_sync, sync_engine
    from src.models.tables import Base

    settings = get_settings()

    project_id = settings.gcp_project_id
    dataset_id = settings.effective_dataset_id
    location = settings.gcp_region

    print("=" * 60)
    print("BigQuery Setup for based-template-svc")
    print("=" * 60)
    print(f"  GCP Project:  {project_id}")
    print(f"  Dataset:      {dataset_id}")
    print(f"  Location:     {location}")
    print(f"  Environment:  {settings.env}")
    print(f"  BigQuery URL: {settings.bigquery_url}")
    print("=" * 60)
    print()

    # Step 1: データセット作成
    print("[Step 1] データセットの作成...")
    client = bigquery.Client(project=project_id)
    dataset_ref = bigquery.Dataset(f"{project_id}.{dataset_id}")
    dataset_ref.location = location

    try:
        client.create_dataset(dataset_ref)
        print(f"  [OK] データセット '{dataset_id}' を作成しました。")
    except Conflict:
        print(f"  [INFO] データセット '{dataset_id}' は既に存在します。")

    # Step 2: テーブル作成
    print()
    print("[Step 2] テーブルの作成...")

    if drop_existing:
        print("  [WARN] 既存テーブルを削除してから再作成します...")
        existing_tables = list(client.list_tables(dataset_id))
        for table_ref in existing_tables:
            client.delete_table(table_ref, not_found_ok=True)
            print(f"    削除: {table_ref.table_id}")

    try:
        create_all_tables_sync()
        print("  [OK] 全テーブルの作成が完了しました。")
    except Exception as e:
        print(f"  [ERROR] テーブル作成に失敗しました: {e}")
        sys.exit(1)

    # Step 3: 確認
    print()
    print("[Step 3] テーブル一覧の確認...")
    tables = list(client.list_tables(dataset_id))
    if tables:
        for table_ref in tables:
            table = client.get_table(table_ref)
            print(f"  - {table.table_id} ({table.num_rows} rows, {len(table.schema)} columns)")
    else:
        print("  テーブルが見つかりません。")

    print()
    print("=" * 60)
    print("セットアップ完了!")
    print("=" * 60)


def print_setup_commands() -> None:
    """BigQuery セットアップに必要なgcloudコマンドを表示"""
    print("""
=== BigQuery セットアップ手順 ===

1. GCP プロジェクトの設定:
   gcloud config set project smartapo

2. ADC認証:
   gcloud auth application-default login

3. BigQuery API の有効化:
   gcloud services enable bigquery.googleapis.com

4. (オプション) サービスアカウントの作成:
   gcloud iam service-accounts create smartapo-backend \\
     --display-name="SmartApo Backend"

   gcloud projects add-iam-policy-binding smartapo \\
     --member="serviceAccount:smartapo-backend@smartapo.iam.gserviceaccount.com" \\
     --role="roles/bigquery.dataEditor"

   gcloud projects add-iam-policy-binding smartapo \\
     --member="serviceAccount:smartapo-backend@smartapo.iam.gserviceaccount.com" \\
     --role="roles/bigquery.jobUser"

5. このスクリプトでデータセットとテーブルを作成:
   cd python/domain/based-template-svc
   uv run python scripts/setup_bigquery.py

6. (オプション) bq コマンドで手動確認:
   bq ls smartapo:based_template_dev
   bq show smartapo:based_template_dev.dialer_contacts
""")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="BigQuery セットアップスクリプト",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--commands",
        action="store_true",
        help="セットアップに必要なgcloudコマンドを表示",
    )
    parser.add_argument(
        "--drop",
        action="store_true",
        help="既存テーブルを削除してから再作成 (開発環境のみ)",
    )
    args = parser.parse_args()

    if args.commands:
        print_setup_commands()
        return

    setup_bigquery(drop_existing=args.drop)


if __name__ == "__main__":
    main()
