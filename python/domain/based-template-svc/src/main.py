from __future__ import annotations

from typing import Final

from fastapi import Depends
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from pydantic import SecretStr

from .app import create_app
from .auth.authentication.basic_auth import basic_auth
from .common.env_config import Settings, get_settings

app: Final = create_app()


@app.get("/docs", include_in_schema=False)
async def docs(current_user=Depends(basic_auth)):
    return get_swagger_ui_html(openapi_url=app.openapi_url, title=app.title + "- docs")


@app.get("/redoc")
async def redoc_html(current_user=Depends(basic_auth)):
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
    )


@app.get("/health", responses={404: {"description": "Not Found"}})
def health_check():
    return {"ok": True}


@app.get("/settings", response_model=dict, tags=["Settings"], responses={401: {"description": "Unauthorized"}})
def show_settings(settings: Settings = Depends(get_settings)):
    """
    現在のアプリケーション設定を返します。

    - `ENV` 環境変数に基づいて、読み込まれる設定ソースが動的に変わります。
    - `SecretStr` で保護されたフィールド（例: パスワード）は、
      セキュリティのため `**********` としてマスクされます。
    """
    # .model_dump() を使って、エイリアスを適用した辞書を取得
    # by_alias=True を指定することで、`env` の代わりに `ENV` のようなエイリアスがキーになります。
    settings_dict = settings.model_dump(by_alias=True)

    # SettingsモデルのフィールドをイテレートしてSecretStr型を見つけ、マスク処理を行う
    # settingsインスタンスを直接イテレートすることで、各フィールドの値にアクセスできます。
    for field_name, value in settings:
        # 【修正】Pydantic V2の非推奨警告を避けるため、model_fieldsはインスタンス(settings)からではなく、
        # クラス(Settings)からアクセスします。
        field_info = Settings.model_fields.get(field_name)
        if not field_info:
            continue

        alias = field_info.alias or field_name

        # 値がSecretStrのインスタンスであれば、辞書内の対応する値をマスクする
        if isinstance(value, SecretStr):
            if alias in settings_dict:
                settings_dict[alias] = "**********"

    return settings_dict


if __name__ == "__main__":
    import uvicorn

    settings: Settings = get_settings()

    host = "localhost" if settings.is_local else "0.0.0.0"
    log_level = "DEBUG" if settings.is_local else "INFO"
    print(f"Starting server at http://{host}:8080 with log level {log_level}")
    print(f"Environment: {settings.env}")
    uvicorn.run(
        "python.domain.based-template-svc.src.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
    )
