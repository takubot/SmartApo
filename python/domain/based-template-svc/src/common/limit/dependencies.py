from typing import Annotated

from fastapi import Depends, Path

from ...database_utils.database import get_sync_session
from .service import LimitService
from sqlalchemy.orm import Session


def get_limit_service(session: Session = Depends(get_sync_session)) -> LimitService:
    """
    LimitServiceを取得するDependency
    """
    return LimitService(session)


class LimitCheckerBase:
    """リミットチェック用Dependencyの基底クラス"""
    def __init__(self, increment: int = 1):
        self.increment = increment


class EnsureGroupLimit(LimitCheckerBase):
    """グループ作成時の制限チェック（テナントリミットのみ）"""
    def __call__(self, service: LimitService = Depends(get_limit_service)):
        service.check_group_limit(self.increment)


class EnsureBotLimit(LimitCheckerBase):
    """Bot作成時の制限チェック"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_bot_limit(group_id, self.increment)


class EnsureChatEntryLimit(LimitCheckerBase):
    """ChatEntry作成時の制限チェック"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_chat_entry_limit(group_id, self.increment)


class EnsurePageLimit(LimitCheckerBase):
    """ファイル/ページ追加時の制限チェック"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_page_limit(group_id, self.increment)


class EnsureUserLimit(LimitCheckerBase):
    """ユーザー追加時の制限チェック（グループ所属）"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_user_limit(group_id, self.increment)


class EnsureTenantUserLimit(LimitCheckerBase):
    """ユーザー作成時の制限チェック（テナントリミットのみ）"""
    def __call__(self, service: LimitService = Depends(get_limit_service)):
        service.check_tenant_user_limit(self.increment)


class EnsureMonthlyChatLimit(LimitCheckerBase):
    """チャット実行時の制限チェック"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_monthly_chat_limit(group_id, self.increment)


class EnsureMonthlyImageLimit(LimitCheckerBase):
    """画像生成実行時の制限チェック"""
    def __call__(
        self,
        group_id: Annotated[str, Path(..., description="グループID")],
        service: LimitService = Depends(get_limit_service),
    ):
        service.check_monthly_image_limit(group_id, self.increment)