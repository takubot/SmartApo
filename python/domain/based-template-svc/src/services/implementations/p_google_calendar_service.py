import logging
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from google.oauth2 import service_account, credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from ..interfaces.i_calendar_service import ICalendarService
from ...common.env_config import get_settings

logger = logging.getLogger(__name__)

class GoogleCalendarService(ICalendarService):
    """
    Google Calendar APIを使用したカレンダーサービスの実装。
    OAuth2によるユーザーごとの連携と、サービスアカウントによる操作の両方をサポート。
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.client_config = {
            "web": {
                "client_id": self.settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": self.settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        }

    def _get_service(self, credentials_info: Optional[Dict[str, Any]] = None):
        """
        Google API Service インスタンスを取得する。
        credentials_info があれば OAuth2 ユーザーとして、なければサービスアカウントとして振る舞う。
        """
        if credentials_info:
            creds = credentials.Credentials.from_authorized_user_info(credentials_info)
            return build('calendar', 'v3', credentials=creds)
        
        if self.settings.GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO:
            info = json.loads(self.settings.GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO)
            creds = service_account.Credentials.from_service_account_info(
                info, scopes=['https://www.googleapis.com/auth/calendar']
            )
            return build('calendar', 'v3', credentials=creds)
        
        return None

    # --- OAuth2 Flow ---
    def get_auth_url(self, redirect_uri: str, state: Optional[str] = None) -> str:
        flow = Flow.from_client_config(
            self.client_config,
            scopes=['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
            redirect_uri=redirect_uri
        )
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent' # リフレッシュトークンを確実に取得するため
        )
        return auth_url

    def fetch_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        flow = Flow.from_client_config(
            self.client_config,
            scopes=['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
            redirect_uri=redirect_uri
        )
        flow.fetch_token(code=code)
        creds = flow.credentials
        return {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }

    def exchange_code(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """ルーターから統一的に呼べるよう fetch_token をラップ"""
        result = self.fetch_token(code, redirect_uri)
        return {
            "access_token": result["token"],
            "refresh_token": result["refresh_token"],
            "expiry": result.get("expiry"),
        }

    def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        creds = credentials.Credentials(
            None,
            refresh_token=refresh_token,
            token_uri=self.client_config["web"]["token_uri"],
            client_id=self.client_config["web"]["client_id"],
            client_secret=self.client_config["web"]["client_secret"]
        )
        from google.auth.transport.requests import Request
        creds.refresh(Request())
        return {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }

    # --- Event Management ---
    def create_event(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        title: str,
        start_at: datetime,
        end_at: datetime,
        description: Optional[str] = None,
        color_hex: Optional[str] = None
    ) -> Optional[str]:
        service = self._get_service(credentials_info)
        if not service: return None

        event = {
            'summary': title,
            'description': description,
            'start': {'dateTime': start_at.isoformat()},
            'end': {'dateTime': end_at.isoformat()},
        }
        if color_hex:
            event['colorId'] = self._map_hex_to_google_color_id(color_hex)

        try:
            created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
            return created_event.get('id')
        except Exception as e:
            logger.error(f"Error creating Google Calendar event: {e}")
            return None

    def update_event(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        event_id: str,
        title: Optional[str] = None,
        start_at: Optional[datetime] = None,
        end_at: Optional[datetime] = None,
        description: Optional[str] = None,
        color_hex: Optional[str] = None
    ) -> bool:
        service = self._get_service(credentials_info)
        if not service: return False

        try:
            event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            if title is not None: event['summary'] = title
            if description is not None: event['description'] = description
            if start_at is not None: event['start'] = {'dateTime': start_at.isoformat()}
            if end_at is not None: event['end'] = {'dateTime': end_at.isoformat()}
            if color_hex is not None: event['colorId'] = self._map_hex_to_google_color_id(color_hex)

            service.events().update(calendarId=calendar_id, eventId=event_id, body=event).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating Google Calendar event: {e}")
            return False

    def delete_event(self, credentials_info: Dict[str, Any], calendar_id: str, event_id: str) -> bool:
        service = self._get_service(credentials_info)
        if not service: return False

        try:
            service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting Google Calendar event: {e}")
            return False

    def add_attendee(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        event_id: str,
        email: str,
        display_name: Optional[str] = None
    ) -> bool:
        service = self._get_service(credentials_info)
        if not service: return False

        try:
            event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            attendees = event.get('attendees', [])
            attendees.append({
                'email': email,
                'displayName': display_name
            })
            event['attendees'] = attendees

            service.events().update(calendarId=calendar_id, eventId=event_id, body=event).execute()
            return True
        except Exception as e:
            logger.error(f"Error adding attendee to Google Calendar event: {e}")
            return False

    # --- Sync & Webhook ---
    def watch_events(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        webhook_url: str,
        channel_id: str
    ) -> Dict[str, Any]:
        service = self._get_service(credentials_info)
        if not service: return {}

        body = {
            'id': channel_id,
            'type': 'web_hook',
            'address': webhook_url
        }
        try:
            return service.events().watch(calendarId=calendar_id, body=body).execute()
        except Exception as e:
            logger.error(f"Error starting watch on Google Calendar: {e}")
            return {}

    def stop_watch(
        self,
        credentials_info: Dict[str, Any],
        resource_id: str,
        channel_id: str
    ) -> bool:
        service = self._get_service(credentials_info)
        if not service: return False

        body = {
            'id': channel_id,
            'resourceId': resource_id
        }
        try:
            service.channels().stop(body=body).execute()
            return True
        except Exception as e:
            logger.error(f"Error stopping watch on Google Calendar: {e}")
            return False

    def list_events_delta(
        self,
        credentials_info: Dict[str, Any],
        calendar_id: str,
        sync_token: Optional[str] = None
    ) -> Dict[str, Any]:
        service = self._get_service(credentials_info)
        if not service: return {}

        try:
            # nextSyncTokenがある場合はそれを使用して差分のみ取得
            return service.events().list(
                calendarId=calendar_id,
                syncToken=sync_token,
                singleEvents=True # 繰り返しイベントを個別のインスタンスとして取得
            ).execute()
        except Exception as e:
            logger.error(f"Error listing delta events from Google Calendar: {e}")
            return {}

    def _map_hex_to_google_color_id(self, hex_color: str) -> str:
        """
        Google CalendarのcolorId (1-11) へのマッピング。
        """
        color_map = {
            "#3b82f6": "9",  # Blueberry
            "#ef4444": "11", # Tomato
            "#10b981": "10", # Basil
            "#f59e0b": "6",  # Tangerine
            "#8b5cf6": "3",  # Grape
        }
        return color_map.get(hex_color.lower(), "9")
