from ...common.env_config import get_settings
from ...services.implementations.p_file_validator import PFileValidator
from ...services.implementations.p_gcs_file_storage_client import PGCSFileStoragClient
from ...services.implementations.p_gmail_service import GmailService
from ...services.implementations.p_google_calendar_service import GoogleCalendarService
from ...services.implementations.p_outlook_calendar_service import OutlookCalendarService
from ...services.interfaces.i_email_service import IEmailService
from ...services.interfaces.i_calendar_service import ICalendarService
from ...models.tables.enum import CalendarProviderEnum


def get_file_storage_client() -> PGCSFileStoragClient:
    return PGCSFileStoragClient()


def get_file_validator_client() -> PFileValidator:
    return PFileValidator()


def get_email_service() -> IEmailService:
    env_settings = get_settings()
    return GmailService(env_settings)


def get_calendar_service(provider: CalendarProviderEnum = CalendarProviderEnum.GOOGLE) -> ICalendarService:
    if provider == CalendarProviderEnum.OUTLOOK:
        return OutlookCalendarService()
    return GoogleCalendarService()


# -- Dialer --


def get_telephony_service():
    from ...services.implementations.p_freeswitch_service import PFreeSwitchService

    return PFreeSwitchService()


def get_contact_sync_service():
    from ...services.implementations.p_google_contacts_service import (
        PGoogleContactsService,
    )

    return PGoogleContactsService()


def get_sheets_service():
    from ...services.implementations.p_google_sheets_service import (
        PGoogleSheetsService,
    )

    return PGoogleSheetsService()


def get_predictive_dialer_service():
    from ...services.implementations.p_predictive_dialer_service import (
        PPredictiveDialerService,
    )

    return PPredictiveDialerService()
