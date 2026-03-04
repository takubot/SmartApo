from ...common.env_config import get_settings
from ...services.implementations.p_file_validator import PFileValidator
from ...services.implementations.p_gcs_file_storage_client import PGCSFileStoragClient
from ...services.implementations.p_gmail_service import GmailService
from ...services.implementations.p_openai import POpenAI
from ...services.implementations.p_google_calendar_service import GoogleCalendarService
from ...services.implementations.p_outlook_calendar_service import OutlookCalendarService
from ...services.interfaces.i_email_service import IEmailService
from ...services.interfaces.i_calendar_service import ICalendarService
from ...models.tables.enum import CalendarProviderEnum


def get_file_storage_client() -> PGCSFileStoragClient:
    """
    PGCSFileStoragClientインスタンスを生成・返却する依存関数。
    """
    return PGCSFileStoragClient()


def get_embedding_client() -> POpenAI:
    """
    POpenAIインスタンスを生成・返却する依存関数。
    """
    return POpenAI()


def get_file_validator_client() -> PFileValidator:
    """
    PFileValidatorインスタンスを生成・返却する依存関数。
    """
    return PFileValidator()


def get_email_service() -> IEmailService:
    """
    Gmail APIを用いたメール送信サービスを返す
    """
    env_settings = get_settings()
    return GmailService(env_settings)


def get_calendar_service(provider: CalendarProviderEnum = CalendarProviderEnum.GOOGLE) -> ICalendarService:
    """
    指定されたプロバイダーのカレンダーサービスを返す。
    """
    if provider == CalendarProviderEnum.OUTLOOK:
        return OutlookCalendarService()
    
    # デフォルトはGOOGLE
    return GoogleCalendarService()
