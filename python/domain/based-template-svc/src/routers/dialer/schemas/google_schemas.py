"""Google連携スキーマ"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from ....common.schemas.base_schema import BaseSchema


class GoogleAuthUrlResponseSchema(BaseSchema):
    auth_url: str


class GoogleCallbackSchema(BaseSchema):
    code: str
    state: Optional[str] = None
    redirect_uri: Optional[str] = None


class GoogleIntegrationStatusSchema(BaseSchema):
    integration_id: str
    integration_type: str
    status: str
    last_synced_at: Optional[datetime] = None


class GoogleIntegrationListSchema(BaseSchema):
    integrations: list[GoogleIntegrationStatusSchema]


class GooglePickerConfigSchema(BaseSchema):
    access_token: str
    api_key: str
    app_id: str
