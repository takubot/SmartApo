"""settings.py
Pydantic v2 の *Settings Source* を使って構成を解決するモジュール。

優先順位は次のとおりです。

1. **初期化キーワード引数**（テスト用）- 使わない
2. **環境変数** — ENV 変数を利用
3. **.env** — 本ファイルと同じディレクトリに配置
4. **Google Secret Manager** — シークレット名 `lineko-config-{ENV}` を想定
5. **pydanticのデフォルト値** — すべてのソースで値が見つからなかったときにだけデフォルトを使う

Google Secret Manager には *Application Default Credentials* で接続するため、
**サービスアカウント JSON キーは不要** です。ローカル開発では次のコマンドで
認証してください。

```bash
gcloud auth application-default login
```

ENV の値による動作:
* `ENV=dev` (デフォルト)  → .env のみ利用
* `ENV=prod`               → Secret Manager から本番用シークレットを取得

必要パッケージ:

```bash
pip install pydantic pydantic-settings
```
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

TENANT_ID = os.getenv("TENANT_ID", "based-template-vbf6m")
# TENANT_ID = os.getenv("TENANT_ID", "based-template-7gkxo")
TENANT_NAME = os.getenv("TENANT_NAME", "based-template")
ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*")
OPENAI_MODEL = "gpt-4.1-nano-2025-04-14"
OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
TEMPERATURE = 0.0


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

    # ------------------------------------------------------------------ #
    # ① フィールドごとに値を返す (必須)
    # ------------------------------------------------------------------ #
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

        # キーが存在せず、かつ必須キーリストに含まれている場合はエラーを発生させる
        if alias in self.required_keys:
            raise ValueError(
                f"Required secret '{alias}' not found in Secret Manager "
                f"(secret: '{self.secret_name}', project: '{self.project_id}')"
            )

        return None, field_name, False

    # ------------------------------------------------------------------ #
    # ② dict 全量を返すメソッド (必須)
    # ------------------------------------------------------------------ #
    def __call__(self) -> dict[str, Any]:  # noqa: D401
        # Pydantic が "source を丸ごと dict として扱う" ときに呼ばれる
        return self._load_secret()

    # ------------------------------------------------------------------ #
    # 内部 util
    # ------------------------------------------------------------------ #
    def _load_secret(self) -> dict[str, str]:
        # 1. キャッシュが利用された場合にログを出力
        if self._cache is not None:
            print(f"Secret '{self.secret_name}' はキャッシュを利用します。")
            return self._cache

        print(f"Secret '{self.secret_name}' をSecret Managerから読み込みます。")
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{self.project_id}/secrets/{self.secret_name}/versions/latest"

        print(f"アクセス先のSecret: {name}")

        try:
            payload = client.access_secret_version(name=name).payload.data.decode("utf-8")
        except Exception as e:
            # Secret自体にアクセスできない場合のエラー
            print(f"[ERROR] Secretの読み込みに失敗しました: {name}")
            print(f"[ERROR] 詳細: {e}")
            self._cache = {}
            return self._cache

        # 2. Secret Managerから取得した生データをそのまま表示（reprで特殊文字も可視化）
        # print("-" * 50)
        # print("取得した生のペイロード (reprで表示):")
        # print(repr(payload))
        # print("-" * 50)

        raw: dict[str, str] = {}
        try:
            # 3. ペイロードの形式を判断
            if payload.lstrip().startswith("{"):
                print("[DEBUG] JSON形式と判断し、json.loadsでパースします。")
                raw = json.loads(payload)
            else:
                print("[DEBUG] dotenv形式と判断し、dotenv_valuesでパースします。")
                raw = dotenv_values(stream=io.StringIO(payload))

        # 4. JSONのパースエラーを具体的に捕捉
        except json.JSONDecodeError as e:
            print("[ERROR] JSONのパースに失敗しました。フォーマットが不正です。")
            print(f"[ERROR] JSONDecodeError: {e}")
            print(
                "[ERROR] Secret Manager上のシークレットに、エスケープされていない改行や、末尾のカンマなどがないか確認してください。"
            )
            # アプリケーションがクラッシュしないように空のdictを返す
            self._cache = {}
            return self._cache
        # 5. その他の予期せぬエラーを捕捉
        except Exception as e:
            print(f"[ERROR] パース中に予期せぬエラーが発生しました: {e}")
            self._cache = {}
            return self._cache

        # print(f"[DEBUG] パース成功。結果: {raw}")
        self._cache = raw
        return raw


class Settings(BaseSettings):
    """アプリケーション全体の構成値を集約するクラス。"""

    # ---------------------------------------------------------------------
    # Core / runtime
    # ---------------------------------------------------------------------
    env: str = Field(default="dev", alias="ENV")
    # allow_originsはtenantごとに変わるものだが、現状はリストに全テナントを入れて、共通のものを使用する
    allow_origins: list[str] = Field(default=["*"], alias="ALLOW_ORIGINS")
    gcp_project_id: str = Field(default="doopel-dev-461016", alias="GCP_PROJECT_ID")
    gcp_region: str = Field(default="asia-northeast1", alias="GCP_REGION")
    chunk_generator_job_name: str = Field(default="chunk-generator-job", alias="CHUNK_GENERATOR_JOB_NAME")

    # OpenAI APIキー
    OPENAI_API_KEY: str = Field(default="", alias="OPENAI_API_KEY")
    ANTHROPIC_API_KEY: str = Field(default="", alias="ANTHROPIC_API_KEY")
    GOOGLE_API_KEY: str = Field(default="", alias="GOOGLE_API_KEY")
    PERPLEXITY_API_KEY: str = Field(default="", alias="PERPLEXITY_API_KEY")
    LANGSMITH_API_KEY: str = Field(default="", alias="LANGSMITH_API_KEY")
    LANGSMITH_ENDPOINT: str = Field(
        default="https://api.smith.langchain.com",
        alias="LANGSMITH_ENDPOINT",
    )
    LANGSMITH_PROJECT_NAME: str = Field(
        default="based-template-chat-agent",
        alias="LANGSMITH_PROJECT_NAME",
    )
    # Google Calendar API (Service Account JSON or API Key)
    GOOGLE_CALENDAR_API_KEY: str = Field(default="", alias="GOOGLE_CALENDAR_API_KEY")
    GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO: str = Field(default="", alias="GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO")
    GOOGLE_CALENDAR_CLIENT_ID: str = Field(default="", alias="GOOGLE_CALENDAR_CLIENT_ID")
    GOOGLE_CALENDAR_CLIENT_SECRET: str = Field(default="", alias="GOOGLE_CALENDAR_CLIENT_SECRET")
    GOOGLE_CALENDAR_REDIRECT_URI: str = Field(default="", alias="GOOGLE_CALENDAR_REDIRECT_URI")
    # Cloud Translation API（Google Translation v2; API key）
    DOPPEL_TRANSLATION_API_KEY: str = Field(default="", alias="DOPPEL_TRANSLATION_API_KEY")

    # Azure OpenAI（Web Search 用：Responses API /openai/v1/）
    AZURE_OPENAI_API_KEY: str = Field(default="", alias="AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_ENDPOINT: str = Field(default="", alias="AZURE_OPENAI_ENDPOINT")
    AZURE_OPENAI_DEPLOYMENT: str = Field(default="", alias="AZURE_OPENAI_DEPLOYMENT")

    # 現在の設定（Google Workspace - 問題の可能性あり）
    GMAIL_SENDER_EMAIL: str = Field(default="", alias="GMAIL_SENDER_EMAIL")
    SMTP_SERVER: str = Field(default="", alias="SMTP_SERVER")
    SMTP_PORT: str = Field(default="", alias="SMTP_PORT")
    GMAIL_APP_PASSWORD: str = Field(default="", alias="GMAIL_APP_PASSWORD")
    
    # ---------------------------------------------------------------------
    # Service JWT
    # ---------------------------------------------------------------------
    # jwt_private_key: SecretStr = Field(default=SecretStr("dev-secret-key-for-external-auth"), alias="JWT_PRIVATE_KEY")
    # jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    # jwt_expire_minutes: int = Field(default=60, alias="JWT_EXPIRE_MINUTES")
    # jwt_api_issuer: str = Field(default="", alias="JWT_API_ISSUER")
    # jwt_api_audience: str = Field(default="", alias="JWT_API_AUDIENCE")
    # jwt_public_key_by_kid: dict[str, str] = Field(default={}, alias="JWT_PUBLIC_KEY_BY_KID")
    # ---------------------------------------------------------------------
    # Database
    # ---------------------------------------------------------------------

    db_user: str = Field(default="root", alias="DB_USER")
    db_password: SecretStr = Field(default=SecretStr("rootpass"), alias="DB_PASSWORD")
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: str = Field(default="3306", alias="DB_PORT")
    db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=3600, alias="DB_POOL_RECYCLE")
    firestore_database_id: str = Field(default="doppel-dev-firestore-db", alias="FIRESTORE_DATABASE_ID")
    web_push_vapid_public_key: str = Field(default="", alias="WEB_PUSH_VAPID_PUBLIC_KEY")
    web_push_vapid_private_key: str = Field(default="", alias="WEB_PUSH_VAPID_PRIVATE_KEY")
    web_push_vapid_subject: str = Field(default="mailto:admin@example.com", alias="WEB_PUSH_VAPID_SUBJECT")


    # ---------------------------------------------------------------------
    # Cloud Spanner
    # ---------------------------------------------------------------------

    spanner_project_id: str = Field(default="doppel-dev-461016", alias="SPANNER_PROJECT_ID")
    spanner_instance_id: str = Field(default="doppel-instance", alias="SPANNER_INSTANCE_ID")
    spanner_database_id: str = Field(default="", alias="SPANNER_DATABASE_ID")
    spanner_emulator_host: str = Field(default="", alias="SPANNER_EMULATOR_HOST")
    # ---------------------------------------------------------------------
    # Pydantic config & sources
    # ---------------------------------------------------------------------

    @field_validator("env")
    @classmethod
    def check_not_empty(cls, v):
        """
        渡された値（SecretStr もしくは str）が空文字でないことを検証する。
        """
        # SecretStrの場合は .get_secret_value() で中身を取得
        value_to_check = v.get_secret_value() if isinstance(v, SecretStr) else v

        if not value_to_check:
            # Pydantic v2ではAssertionErrorの代わりにValueErrorを推奨
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

        環境別の優先順位（高い順）：

        **ローカル環境 (ENV=local)**:
        1. init_settings - 初期化時のキーワード引数（テスト用）
        2. env_settings - 環境変数
        3. app_secret_source - アプリ固有のSecret Manager
        4. db_secret_source - DB設定用Secret Manager

        **クラウド環境 (ENV=dev/stg/prod)**:
        1. app_secret_source - アプリ固有のSecret Manager
        2. db_secret_source - DB設定用Secret Manager
        3. env_settings - 環境変数
        4. init_settings - 初期化時のキーワード引数（テスト用）

        ENVの値による動作:
        * 全環境で doppel-shared-db-{env} + doppel-{TENANT_NAME}-svc-{env} を使用
        """
        # 環境変数を直接確認（Pydanticの設定解決前に判定）
        env_value = os.getenv("ENV", "local").lower()

        # local環境の場合のみ.envファイルを読み込み
        if env_value == "local":
            from pathlib import Path

            env_file = Path(__file__).parent / ".env"
            if env_file.exists():
                env_vars = dotenv_values(env_file)
                for key, value in env_vars.items():
                    if key not in os.environ:  # 既存の環境変数を上書きしない
                        os.environ[key] = value

        # 共通の設定用Secret Manager
        core_secret_source = GoogleSecretManagerSingleSource(
            settings_cls,
            project_id="654609130723",
            secret_name=f"doppel-shared-core-{env_value}",
            required_keys={
                "ENV",
                "ALLOW_ORIGINS",
                "GCP_PROJECT_ID",
                "OPENAI_API_KEY",
                "GMAIL_SENDER_EMAIL",
                "SMTP_SERVER",
                "SMTP_PORT",
                "GMAIL_APP_PASSWORD",
            },
        )

        # 共通のDB設定用Secret Manager
        db_secret_source = GoogleSecretManagerSingleSource(
            settings_cls,
            project_id="654609130723",
            secret_name=f"doppel-shared-db-{env_value}",
            required_keys={
                "DB_USER",
                "DB_PASSWORD",
                "DB_HOST",
                "DB_PORT",
                "DB_NAME",
                "DB_POOL_SIZE",
                "DB_MAX_OVERFLOW",
                "DB_POOL_TIMEOUT",
                "DB_POOL_RECYCLE",
                "SPANNER_PROJECT_ID",
                "SPANNER_INSTANCE_ID",
            },
        )

        # アプリケーション固有の設定用Secret Manager
        # これはtenantごとに変わるものなので、現状は使用しない
        # app_secret_source = GoogleSecretManagerSingleSource(
        #     settings_cls, project_id="654609130723", secret_name=f"doppel-{TENANT_NAME}-svc-{env_value}"
        # )

        # 環境別の優先順位を設定
        if env_value == "local":
            # local は .env / 環境変数による上書きを最優先にする
            # （例: DB_CONFIG と GCP_PROJECT_ID をローカルから切り替える）
            return (
                env_settings,  # 優先度1: 環境変数
                init_settings,  # 優先度2: 初期化時のキーワード引数（テスト用）
                core_secret_source,  # 優先度3: Core設定
                db_secret_source,  # 優先度4: DB設定用Secret Manager
                # app_secret_source,  # 優先度5: アプリ固有のSecret Manager
            )

        # クラウド環境(stg/prod/dev): Secret Manager を優先する
        return (
            core_secret_source,  # 優先度1: Core設定
            db_secret_source,  # 優先度2: DB設定用Secret Manager
            # app_secret_source,  # 優先度3: アプリ固有のSecret Manager
            env_settings,  # 優先度4: 環境変数
            init_settings,  # 優先度5: 初期化時のキーワード引数（テスト用）
        )

    def __init__(self, **values):
        super().__init__(**values)
        # ログ出力: 実際に採用されたDB接続情報
        # logger.info("[Settings] Final configuration:")
        # logger.info(f"[Settings] - Environment: {self.env}")
        # logger.info(f"[Settings] - DB_HOST: {self.db_host}")
        # logger.info(f"[Settings] - DB_PORT: {self.db_port}")
        # logger.info(f"[Settings] - DB_USER: {self.db_user}")
        # logger.info(f"[Settings] - Database URL: {self.sync_database_url}")

    # ------------------------------------------------------------------
    # Convenience helpers
    # ------------------------------------------------------------------

    @property
    def effective_db_name(self) -> str:
        """実際に使用するデータベース名を動的に生成する。"""
        if self.env == "local":
            return f"{TENANT_NAME.replace('-', '_')}_dev_db"
        return f"{TENANT_NAME.replace('-', '_')}_{self.env}_db"

    @property
    def effective_spanner_database_id(self) -> str:
        """実際に使用するSpannerデータベースIDを動的に生成する。"""
        if self.spanner_database_id:
            return self.spanner_database_id
        return f"{TENANT_NAME.replace('-', '_')}_{self.env}"

    def setup_spanner_emulator_if_needed(self) -> None:
        """ローカルエミュレーター環境の場合、Spannerエミュレーターホストを設定する"""
        if self.env in {"test"} and not self.spanner_emulator_host:
            import os

            os.environ["SPANNER_EMULATOR_HOST"] = "localhost:9010"

    @property
    def sync_database_url(self) -> str:
        """[同期用] 個別フィールドから SQLAlchemy URL を組み立てる。"""
        driver = "mysql+pymysql"
        password = self.db_password.get_secret_value()
        # migration時はdb_hostを外部IPにするのが早い
        if self.env == "local":
            db_config = os.getenv("DB_CONFIG")
            if db_config:
                return f"{driver}://{db_config}"  # DB_CONFIGは完全なURLなので、そのまま返す
            else:
                return f"{driver}://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.effective_db_name}?charset=utf8mb4"
        else:
            return f"{driver}://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.effective_db_name}?charset=utf8mb4"

    @property
    def async_database_url(self) -> str:
        """[非同期用] 個別フィールドから SQLAlchemy URL を組み立てる。"""
        driver = "mysql+aiomysql"
        password = self.db_password.get_secret_value()
        if self.env == "local":
            db_config = os.getenv("DB_CONFIG")
            if db_config:
                return f"{driver}://{db_config}"  # DB_CONFIGは完全なURLなので、そのまま返す
            else:
                return f"{driver}://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.effective_db_name}?charset=utf8mb4"
        else:
            return f"{driver}://{self.db_user}:{password}@{self.db_host}:{self.db_port}/{self.effective_db_name}?charset=utf8mb4"

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
    """
    設定クラスのインスタンスを返す依存性注入用の関数
    lru_cacheデコレータにより、初回以降はキャッシュされたインスタンスが返される
    """
    return Settings()


__all__ = ["get_settings", "Settings"]
