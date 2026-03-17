"""settings.py
Pydantic v2 の *Settings Source* を使って構成を解決するモジュール。

優先順位は次のとおりです。

1. **初期化キーワード引数**（テスト用）- 使わない
2. **.env** — ローカル実行時は本ファイルと同じディレクトリの `.env` を優先
3. **環境変数** — `.env` にない値の補完に利用
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
from pathlib import Path
from typing import Any

from dotenv import dotenv_values  # pip install python-dotenv
from pydantic import Field, SecretStr, field_validator
from pydantic.fields import FieldInfo
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)

try:
    from google.cloud import secretmanager  # pip install google-cloud-secret-manager
except ImportError:  # pragma: no cover
    secretmanager = None

# ---------------------------------------------------------------------------
# Application settings
# ---------------------------------------------------------------------------

GCP_PROJECT_ID = "smartapo"

TENANT_ID = os.getenv("TENANT_ID", "based-template-vbf6m")
TENANT_NAME = os.getenv("TENANT_NAME", "based-template")
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")
LOCAL_ENV_FILE = Path(__file__).with_name(".env")


@lru_cache(maxsize=1)
def load_local_env_vars() -> dict[str, str]:
    """ローカル開発用 `.env` を読み込む。"""
    if not LOCAL_ENV_FILE.exists():
        return {}

    return {
        key: value
        for key, value in dotenv_values(LOCAL_ENV_FILE).items()
        if key is not None and value is not None
    }


def get_bootstrap_env() -> str:
    """Settings初期化前に利用するENV値を解決する。"""
    local_env_value = load_local_env_vars().get("ENV")
    if local_env_value:
        return local_env_value.lower()

    env_value = os.getenv("ENV")
    if env_value:
        return env_value.lower()

    return "local"


def apply_local_env_overrides() -> None:
    """ローカル実行では `.env` の値をプロセス環境へ反映する。"""
    for key, value in load_local_env_vars().items():
        os.environ[key] = value


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

        if secretmanager is None:
            print("[WARN] google-cloud-secret-manager が未インストールのため Secret Manager を利用できません。")
            self._cache = {}
            return self._cache

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
    # MySQL
    # ---------------------------------------------------------------------
    mysql_host: str = Field(default="localhost", alias="MYSQL_HOST")
    mysql_port: int = Field(default=3306, alias="MYSQL_PORT")
    mysql_user: str = Field(default="root", alias="MYSQL_USER")
    mysql_password: str = Field(default="root", alias="MYSQL_PASSWORD")
    mysql_database: str = Field(default="based_template_dev", alias="MYSQL_DATABASE")

    # ---------------------------------------------------------------------
    # Google OAuth (共通: Sheets / Contacts / Calendar で同じクライアントを使用)
    # ---------------------------------------------------------------------
    GOOGLE_OAUTH_CLIENT_ID: str = Field(default="", alias="GOOGLE_OAUTH_CLIENT_ID")
    GOOGLE_OAUTH_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_OAUTH_CLIENT_SECRET")
    GOOGLE_PICKER_API_KEY: str = Field(default="", alias="GOOGLE_PICKER_API_KEY")

    # ---------------------------------------------------------------------
    # Google Calendar 追加設定 (サービスアカウント: サーバー間通信用、任意)
    # ---------------------------------------------------------------------
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO: str = Field(default="", alias="GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO")

    # ---------------------------------------------------------------------
    # FreeSWITCH ESL
    # ---------------------------------------------------------------------
    FREESWITCH_ESL_HOST: str = Field(default="", alias="FREESWITCH_ESL_HOST")
    FREESWITCH_ESL_PORT: int = Field(default=8021, alias="FREESWITCH_ESL_PORT")
    FREESWITCH_ESL_PASSWORD: str = Field(default="", alias="FREESWITCH_ESL_PASSWORD")
    FREESWITCH_SIP_GATEWAY: str = Field(default="", alias="FREESWITCH_SIP_GATEWAY")
    FREESWITCH_WSS_URL: str = Field(default="", alias="FREESWITCH_WSS_URL")

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

    @field_validator("allow_origins", mode="before")
    @classmethod
    def parse_allow_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            return [v]
        return ["*"]

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
        env_file=str(LOCAL_ENV_FILE),
        env_file_encoding="utf-8",
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
        1. dotenv_settings - `.env`
        2. env_settings - 環境変数
        3. init_settings - 初期化時のキーワード引数（テスト用）
        4. app_secret_source - Secret Manager

        **クラウド環境 (ENV=dev/stg/prod)**:
        1. app_secret_source - Secret Manager
        2. env_settings - 環境変数
        3. init_settings - 初期化時のキーワード引数（テスト用）
        """
        env_value = get_bootstrap_env()

        if env_value == "local":
            apply_local_env_overrides()

        app_secret_source = GoogleSecretManagerSingleSource(
            settings_cls,
            project_id=GCP_PROJECT_ID,
            secret_name=f"smartapo-config-{env_value}",
            required_keys={
                "ENV",
                "GCP_PROJECT_ID",
            },
        )

        if env_value == "local":
            return (
                dotenv_settings,
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
    def mysql_url(self) -> str:
        """MySQL SQLAlchemy接続URLを組み立てる。"""
        return (
            f"mysql+pymysql://{self.mysql_user}:{self.mysql_password}"
            f"@{self.mysql_host}:{self.mysql_port}/{self.mysql_database}"
            f"?charset=utf8mb4"
        )

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
