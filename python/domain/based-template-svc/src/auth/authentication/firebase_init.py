# app/auth/firebase_init.py
from pathlib import Path

import firebase_admin
from firebase_admin import _apps as _firebase_apps  # type: ignore[attr-defined]
from firebase_admin import credentials

from ...common.env_config import Settings, get_settings

CRED_PATH = Path.cwd() / "auth.json"  # 認証 JSON を結合


def initialize_firebase() -> None:
    """
    Firebase Admin SDK を初期化する。
    - ADC が見つかればそのまま使用
    - 見つからない場合のみ、環境変数 GOOGLE_APPLICATION_CREDENTIALS を参照
    """
    if _firebase_apps:
        return  # すでに初期化済み

    settings: Settings = get_settings()

    try:
        # まずは ADC (Application Default Credentials) を試みる
        print(f"Initializing Firebase with project ID: {settings.gcp_project_id}")
        firebase_admin.initialize_app(options={"projectId": settings.gcp_project_id})
    except ValueError as err:
        # ADC が無い場合は明示的な証明書を試す
        if not CRED_PATH.exists():
            raise RuntimeError(
                "Firebase credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or configure ADC."
            ) from err
        firebase_admin.initialize_app(
            credentials.Certificate(CRED_PATH), options={"projectId": settings.gcp_project_id}
        )
