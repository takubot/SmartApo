#!/usr/bin/env python3
"""
DB ER diagram generator (PNG) for based-template-svc

- SQLAlchemyモデル(Base.metadata)からER図を生成し、PNGファイルとして出力
- database.pyの接続設定を使用
- MySQL 方言を前提

Usage:
  cd python/domain/based-template-svc
  uv run python src/db_ops_er.py
  # or with custom output path
  uv run python src/db_ops_er.py --output er_diagram.png
"""

from __future__ import annotations

import argparse
import sys
from logging import getLogger
from pathlib import Path

# Ensure project root on path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

logger = getLogger(__name__)

try:
    from eralchemy import render_er

    from src.database_utils.database import sync_engine
    from src.models.tables import Base
except Exception as e:  # pragma: no cover
    print(f"Import error: {e}")
    print("cd python/domain/based-template-svc && uv sync")
    sys.exit(1)


def get_database_url() -> str:
    """データベースURLを取得する"""
    return str(sync_engine.url)


def generate_er_diagram(output_path: str) -> None:
    """ER図をPNGファイルとして生成"""
    database_url = get_database_url()
    output_file = Path(output_path)

    print("=" * 80)
    print("ER図生成")
    print(f"データベース: {database_url}")
    print(f"出力先: {output_file.absolute()}")
    print("=" * 80)
    print()

    try:
        # eralchemyを使用してER図を生成
        # Base.metadataから直接生成する方法
        # render_erは文字列パスを期待するため、Pathオブジェクトを文字列に変換
        render_er(Base.metadata, str(output_file))
        print(f"✅ ER図を生成しました: {output_file.absolute()}")
    except Exception as e:
        logger.exception("ER図生成中にエラーが発生しました")
        print(f"❌ エラー: {e}")
        sys.exit(1)

    print("=" * 80)
    print("ER図生成完了")
    print("=" * 80)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate ER diagram from SQLAlchemy models (PNG)")
    parser.add_argument(
        "--output",
        "-o",
        default="er_diagram.png",
        help="出力ファイルパス (デフォルト: er_diagram.png)",
    )
    args = parser.parse_args()

    generate_er_diagram(args.output)


if __name__ == "__main__":  # pragma: no cover
    main()

