#!/usr/bin/env python3
"""
Mock data creation script for based-template-svc (BigQuery)

実行方法:
1. DOPPELディレクトリから実行:
   npm run uv:create:mock --group_id=YOUR_GROUP_ID

2. 直接実行したい場合:
   cd python/domain/based-template-svc
   uv run python src/database_utils/db_mock.py --group-id YOUR_GROUP_ID
"""

import sys
import argparse
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.database_utils.database import sync_engine
from sqlalchemy.orm import sessionmaker
from src.routers.mock.service import create_mock_data

def main():
    parser = argparse.ArgumentParser(description="Create mock data for a specific group.")
    parser.add_argument("--group-id", type=str, required=True, help="The group ID to create mock data for.")
    args = parser.parse_args()

    Session = sessionmaker(bind=sync_engine)
    with Session() as session:
        try:
            print(f"Creating mock data for group: {args.group_id}...")
            result = create_mock_data(session, args.group_id)
            session.commit()
            print(f"[OK] {result['message']}")
        except Exception as e:
            session.rollback()
            print(f"[ERROR] Failed to create mock data: {e}")
            sys.exit(1)

if __name__ == "__main__":
    main()
