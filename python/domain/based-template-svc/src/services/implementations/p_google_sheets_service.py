"""Google Sheets API を用いたスプレッドシートサービス実装"""

from __future__ import annotations

from logging import getLogger
from typing import Any, Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from ...common.env_config import get_settings
from ..interfaces.i_sheets_service import ISheetsService

logger = getLogger(__name__)
settings = get_settings()

_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


class PGoogleSheetsService(ISheetsService):
    """Google Sheets API v4 によるインポート・エクスポート"""

    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """OAuth認証URLを生成する"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=_SCOPES,
            redirect_uri=redirect_uri,
        )
        url, _ = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            state=state,
        )
        return url

    def exchange_code(self, code: str, redirect_uri: str) -> dict[str, Any]:
        """認可コードをトークンに交換する"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=_SCOPES,
            redirect_uri=redirect_uri,
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        return {
            "access_token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None,
        }

    # ── インポート ───────────────────────────────────────────

    def import_from_sheet(
        self,
        access_token: str,
        refresh_token: str,
        spreadsheet_id: str,
        range_name: str,
    ) -> list[dict[str, Any]]:
        """スプレッドシートからデータを読み込む（1行目=ヘッダー）"""
        service = self._build_service(access_token, refresh_token)
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=spreadsheet_id, range=range_name)
            .execute()
        )
        values = result.get("values", [])
        if len(values) < 2:
            return []

        headers = values[0]
        rows: list[dict[str, Any]] = []
        for row in values[1:]:
            record = {}
            for i, header in enumerate(headers):
                record[header] = row[i] if i < len(row) else ""
            rows.append(record)

        logger.info("Sheets インポート: %d行", len(rows))
        return rows

    # ── エクスポート ─────────────────────────────────────────

    def export_to_sheet(
        self,
        access_token: str,
        refresh_token: str,
        spreadsheet_id: str,
        range_name: str,
        data: list[list[Any]],
    ) -> bool:
        """スプレッドシートにデータを書き込む"""
        service = self._build_service(access_token, refresh_token)
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="USER_ENTERED",
            body={"values": data},
        ).execute()
        logger.info("Sheets エクスポート: %d行", len(data))
        return True

    # ── レポート作成 ─────────────────────────────────────────

    def create_report_sheet(
        self,
        access_token: str,
        refresh_token: str,
        title: str,
        headers: list[str],
        rows: list[list[Any]],
    ) -> str:
        """新規スプレッドシートを作成してデータを書き込む"""
        service = self._build_service(access_token, refresh_token)
        spreadsheet = (
            service.spreadsheets()
            .create(body={"properties": {"title": title}})
            .execute()
        )
        spreadsheet_id = spreadsheet["spreadsheetId"]

        all_data = [headers, *rows]
        service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range="A1",
            valueInputOption="USER_ENTERED",
            body={"values": all_data},
        ).execute()

        logger.info("レポートシート作成: id=%s rows=%d", spreadsheet_id, len(rows))
        return spreadsheet_id

    # ── ヘルパー ─────────────────────────────────────────────

    def _build_service(self, access_token: str, refresh_token: str):
        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_OAUTH_CLIENT_ID,
            client_secret=settings.GOOGLE_OAUTH_CLIENT_SECRET,
        )
        return build("sheets", "v4", credentials=creds)
