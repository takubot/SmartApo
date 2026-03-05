"""Google People API を用いた連絡先同期サービス実装"""

from __future__ import annotations

from logging import getLogger
from typing import Any, Optional

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from ...common.env_config import get_settings
from ..interfaces.i_contact_sync_service import IContactSyncService

logger = getLogger(__name__)
settings = get_settings()

_SCOPES = ["https://www.googleapis.com/auth/contacts.readonly"]
_PERSON_FIELDS = (
    "names,emailAddresses,phoneNumbers,organizations,"
    "addresses,metadata"
)


class PGoogleContactsService(IContactSyncService):
    """Google People API による連絡先インポート・同期"""

    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        """OAuth認証URLを生成する"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CONTACTS_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CONTACTS_CLIENT_SECRET,
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
                    "client_id": settings.GOOGLE_CONTACTS_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CONTACTS_CLIENT_SECRET,
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

    def import_contacts(
        self, access_token: str, refresh_token: str
    ) -> list[dict[str, Any]]:
        """全連絡先をインポートする"""
        creds = self._build_credentials(access_token, refresh_token)
        service = build("people", "v1", credentials=creds)

        contacts: list[dict[str, Any]] = []
        next_page_token: str | None = None

        while True:
            resp = (
                service.people()
                .connections()
                .list(
                    resourceName="people/me",
                    pageSize=100,
                    personFields=_PERSON_FIELDS,
                    pageToken=next_page_token,
                )
                .execute()
            )
            for person in resp.get("connections", []):
                parsed = self._parse_person(person)
                if parsed:
                    contacts.append(parsed)

            next_page_token = resp.get("nextPageToken")
            if not next_page_token:
                break

        logger.info("Google Contacts インポート完了: %d件", len(contacts))
        return contacts

    # ── 差分同期 ─────────────────────────────────────────────

    def sync_contacts(
        self, access_token: str, refresh_token: str, sync_token: Optional[str] = None
    ) -> dict[str, Any]:
        """差分同期を実行する"""
        creds = self._build_credentials(access_token, refresh_token)
        service = build("people", "v1", credentials=creds)

        params: dict[str, Any] = {
            "resourceName": "people/me",
            "pageSize": 100,
            "personFields": _PERSON_FIELDS,
            "requestSyncToken": True,
        }
        if sync_token:
            params["syncToken"] = sync_token

        contacts: list[dict[str, Any]] = []
        next_page_token: str | None = None

        while True:
            if next_page_token:
                params["pageToken"] = next_page_token
            resp = service.people().connections().list(**params).execute()

            for person in resp.get("connections", []):
                parsed = self._parse_person(person)
                if parsed:
                    contacts.append(parsed)

            next_page_token = resp.get("nextPageToken")
            if not next_page_token:
                break

        return {
            "contacts": contacts,
            "next_sync_token": resp.get("nextSyncToken"),
        }

    # ── ヘルパー ─────────────────────────────────────────────

    def _build_credentials(self, access_token: str, refresh_token: str) -> Credentials:
        return Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CONTACTS_CLIENT_ID,
            client_secret=settings.GOOGLE_CONTACTS_CLIENT_SECRET,
        )

    @staticmethod
    def _parse_person(person: dict[str, Any]) -> dict[str, Any] | None:
        """People APIのレスポンスをフラットな辞書に変換する"""
        names = person.get("names", [])
        if not names:
            return None

        name = names[0]
        phones = person.get("phoneNumbers", [])
        if not phones:
            return None

        emails = person.get("emailAddresses", [])
        orgs = person.get("organizations", [])
        addresses = person.get("addresses", [])

        org = orgs[0] if orgs else {}
        addr = addresses[0] if addresses else {}

        return {
            "google_contact_id": person.get("resourceName", ""),
            "last_name": name.get("familyName", ""),
            "first_name": name.get("givenName", ""),
            "phone_primary": phones[0].get("value", ""),
            "phone_secondary": phones[1].get("value") if len(phones) > 1 else None,
            "phone_mobile": next(
                (p.get("value") for p in phones if p.get("type") == "mobile"),
                None,
            ),
            "email": emails[0].get("value") if emails else None,
            "company_name": org.get("name"),
            "department": org.get("department"),
            "position": org.get("title"),
            "postal_code": addr.get("postalCode"),
            "city": addr.get("city"),
            "address_line": addr.get("streetAddress"),
        }
