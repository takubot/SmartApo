#!/usr/bin/env python3
"""
Identity Platform に管理者ユーザーを作成するスクリプト

実行方法:
  npm run uv:create:mock
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import _apps as _firebase_apps

from src.common.env_config import get_settings


def initialize_firebase() -> None:
    if _firebase_apps:
        return
    settings = get_settings()
    firebase_admin.initialize_app(options={"projectId": settings.gcp_project_id})


ADMIN_USER = {
    "email": "admin@example.com",
    "password": "admin1234",
    "display_name": "管理者",
}


def create_admin_user() -> None:
    email = ADMIN_USER["email"]
    password = ADMIN_USER["password"]
    display_name = ADMIN_USER["display_name"]

    try:
        existing = firebase_auth.get_user_by_email(email)
        print(f"[SKIP] ユーザーは既に存在します: {email} (uid: {existing.uid})")
        return
    except firebase_auth.UserNotFoundError:
        pass

    user = firebase_auth.create_user(
        email=email,
        password=password,
        display_name=display_name,
        email_verified=True,
    )
    print(f"[OK] 管理者ユーザーを作成しました")
    print(f"  email: {email}")
    print(f"  password: {password}")
    print(f"  display_name: {display_name}")
    print(f"  uid: {user.uid}")


def main() -> None:
    print("Firebase Admin SDK を初期化中...")
    initialize_firebase()
    print("管理者ユーザーを作成中...")
    create_admin_user()
    print("完了")


if __name__ == "__main__":
    main()
