"""settings.py
Pydantic v2 の *Settings Source* を使って構成を解決するモジュール。

優先順位は次のとおりです。

1. **初期化キーワード引数**（テスト用）- 使わない
2. **環境変数** — ENV 変数を利用
3. **.env** — 本ファイルと同じディレクトリに配置
4. **Google Secret Manager** — シークレット名 `smartapo-config-{ENV}` を想定
5. **pydanticのデフォルト値** — すべてのソースで値が見つからなかったときにだけデフォルトを使う

Google Secret Manager には *Application Default Credentials* で接続するため、
**サービスアカウント JSON キーは不要** です。ローカル開発では次のコマンドで
認証してください。

```bash
gcloud auth application-default login
```

ENV の値による動作:
* `ENV=local` (デフォルト)  → .env のみ利用
* `ENV=dev/stg/prod`        → Secret Manager からシークレットを取得
"""
#
from __future__ import annotations

import io
import json
import os
from functools import lru_cache
from typing import Any

from dotenv import dotenv_values  # pip install python-dotenv
from google.cloud import secretmanager  # pip install google-cloud-secret-manager
from pydantic import Field, SecretStr, field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

# ---------------------------------------------------------------------------
# Application settings
# ---------------------------------------------------------------------------

GCP_PROJECT_ID = "smartapo"

TENANT_ID = os.getenv("TENANT_ID", "based-template-vbf6m")
TENANT_NAME = os.getenv("TENANT_NAME", "based-template")
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")


class GoogleSecretManagerSingleSource(PydanticBaseSettingsSource):
    """
    1 つの Secret に全設定を格納するための SettingsSource。
    指定された必須キーが存在しない場合はエラーを発生させる。
    """

    def __init__(
        self,
        settings_cls: type[BaseSettings],
        *,
        project_id: str,
        secret_name: str,
        required_keys: set[str] | None = None,
    ) -> None:
        super().__init__(settings_cls)
        self.project_id = project_id
        self.secret_name = secret_name
        self.required_keys = required_keys or set()
        self._cache: dict[str, str] | None = None

    def get_field_value(
        self,
        field: FieldInfo,
        field_name: str,
    ) -> tuple[Any, str, bool]:
        data = self._load_secret()
        alias = field.alias or field_name

        if alias in data:
            value = data[alias]
            return value, field_name, self.field_is_complex(field)

        if alias in self.required_keys:
            raise ValueError(
                f"Required secret '{alias}' not found in Secret Manager "
                f"(secret: '{self.secret_name}', project: '{self.project_id}')"
            )

        return None, field_name, False

    def __call__(self) -> dict[str, Any]:  # noqa: D401
        return self._load_secret()

    def _load_secret(self) -> dict[str, str]:
        if self._cache is not None:
            print(f"Secret '{self.secret_name}' はキャッシュを利用します。")
            return self._cache

        print(f"Secret '{self.secret_name}' をSecret Managerから読み込みます。")

        try:
            client = secretmanager.SecretManagerServiceClient()
        except Exception as e:
            print(f"[WARN] Secret Managerクライアントの作成に失敗しました: {e}")
            self._cache = {}
            return self._cache

        name = f"projects/{self.project_id}/secrets/{self.secret_name}/versions/latest"

        print(f"アクセス先のSecret: {name}")

        try:
            payload = client.access_secret_version(name=name).payload.data.decode("utf-8")
        except Exception as e:
            print(f"[ERROR] Secretの読み込みに失敗しました: {name}")
            print(f"[ERROR] 詳細: {e}")
            self._cache = {}
            return self._cache

        raw: dict[str, str] = {}
        try:
            if payload.lstrip().startswith("{"):
                raw = json.loads(payload)
            else:
                raw = dotenv_values(stream=io.StringIO(payload))
        except json.JSONDecodeError as e:
            print(f"[ERROR] JSONのパースに失敗しました: {e}")
            self._cache = {}
            return self._cache
        except Exception as e:
            print(f"[ERROR] パース中に予期せぬエラーが発生しました: {e}")
            self._cache = {}
            return self._cache

        self._cache = raw
        return raw


class Settings(BaseSettings):
    """アプリケーション全体の構成値を集約するクラス。"""

    # ---------------------------------------------------------------------
    # Core / runtime
    # ---------------------------------------------------------------------
    env: str = Field(default="dev", alias="ENV")
    allow_origins: list[str] = Field(default=["*"], alias="ALLOW_ORIGINS")
    gcp_project_id: str = Field(default="smartapo", alias="GCP_PROJECT_ID")

    # ---------------------------------------------------------------------
    # BigQuery
    # ---------------------------------------------------------------------
    bigquery_dataset: str = Field(default="", alias="BIGQUERY_DATASET")

    # ---------------------------------------------------------------------
    # Google Calendar API
    # ---------------------------------------------------------------------
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO: str = Field(default="", alias="GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO")
    GOOGLE_CALENDAR_CLIENT_ID: str = Field(default="", alias="GOOGLE_CALENDAR_CLIENT_ID")
    GOOGLE_CALENDAR_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_CALENDAR_CLIENT_SECRET")
    GOOGLE_CALENDAR_REDIRECT_URI: str = Field(default="", alias="GOOGLE_CALENDAR_REDIRECT_URI")

    # ---------------------------------------------------------------------
    # Google Contacts API
    # ---------------------------------------------------------------------
    GOOGLE_CONTACTS_CLIENT_ID: str = Field(default="", alias="GOOGLE_CONTACTS_CLIENT_ID")
    GOOGLE_CONTACTS_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_CONTACTS_CLIENT_SECRET")

    # ---------------------------------------------------------------------
    # Google Sheets API
    # ---------------------------------------------------------------------
    GOOGLE_SHEETS_CLIENT_ID: str = Field(default="", alias="GOOGLE_SHEETS_CLIENT_ID")
    GOOGLE_SHEETS_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_SHEETS_CLIENT_SECRET")

    # ---------------------------------------------------------------------
    # Twilio
    # ---------------------------------------------------------------------
    TWILIO_ACCOUNT_SID: str = Field(default="", alias="TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN: str = Field(default="", alias="TWILIO_AUTH_TOKEN")
    TWILIO_WEBHOOK_BASE_URL: str = Field(default="", alias="TWILIO_WEBHOOK_BASE_URL")

    # ---------------------------------------------------------------------
    # Gmail / SMTP
    # ---------------------------------------------------------------------
    GMAIL_SENDER_EMAIL: str = Field(default="", alias="GMAIL_SENDER_EMAIL")
    SMTP_SERVER: str = Field(default="", alias="SMTP_SERVER")
    SMTP_PORT: str = Field(default="", alias="SMTP_PORT")
    GMAIL_APP_PASSWORD: str = Field(default="", alias="GMAIL_APP_PASSWORD")

    # ---------------------------------------------------------------------
    # Pydantic config & sources
    # ---------------------------------------------------------------------

    @field_validator("env")
    @classmethod
    def check_not_empty(cls, v):
        value_to_check = v.get_secret_value() if isinstance(v, SecretStr) else v
        if not value_to_check:
            raise ValueError("APIキーやIDに空文字は許可されていません。")
        return v

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        """
        ソースの優先順位を定義します。

        **ローカル環境 (ENV=local)**:
        1. env_settings - 環境変数
        2. init_settings - 初期化時のキーワード引数（テスト用）
        3. app_secret_source - Secret Manager

        **クラウド環境 (ENV=dev/stg/prod)**:
        1. app_secret_source - Secret Manager
        2. env_settings - 環境変数
        3. init_settings - 初期化時のキーワード引数（テスト用）
        """
        env_value = os.getenv("ENV", "local").lower()

        if env_value == "local":
            from pathlib import Path

            env_file = Path(__file__).parent / ".env"
            if env_file.exists():
                env_vars = dotenv_values(env_file)
                for key, value in env_vars.items():
                    if key not in os.environ:
                        os.environ[key] = value

        app_secret_source = GoogleSecretManagerSingleSource(
            settings_cls,
            project_id=GCP_PROJECT_ID,
            secret_name=f"smartapo-config-{env_value}",
            required_keys={
                "ENV",
                "GCP_PROJECT_ID",
                "BIGQUERY_DATASET",
            },
        )

        if env_value == "local":
            return (
                env_settings,
                init_settings,
                app_secret_source,
            )

        return (
            app_secret_source,
            env_settings,
            init_settings,
        )

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @property
    def effective_dataset_id(self) -> str:
        """実際に使用するBigQueryデータセットIDを動的に生成する。"""
        if self.bigquery_dataset:
            return self.bigquery_dataset
        if self.env == "local":
            return f"{TENANT_NAME.replace('-', '_')}_dev"
        return f"{TENANT_NAME.replace('-', '_')}_{self.env}"

    @property
    def bigquery_url(self) -> str:
        """BigQuery SQLAlchemy接続URLを組み立てる。"""
        return f"bigquery://{self.gcp_project_id}/{self.effective_dataset_id}"

    # Flags -------------------------------------------------------------

    @property
    def is_production(self) -> bool:  # noqa: D401
        return self.env == "prod"

    @property
    def is_staging(self) -> bool:  # noqa: D401
        return self.env == "stg"

    @property
    def is_development(self) -> bool:  # noqa: D401
        return self.env == "dev"

    @property
    def is_local(self) -> bool:  # noqa: D401
        return self.env == "local"


# ---------------------------------------------------------------------------
# Singleton instance
# ---------------------------------------------------------------------------


@lru_cache
def get_settings() -> Settings:  # FastAPI 依存解決用
    return Settings()


__all__ = ["get_settings", "Settings"]
