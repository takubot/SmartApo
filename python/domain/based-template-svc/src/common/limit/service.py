import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...models.tables import (
    BotModel,
    ChatEntryModel,
    FileOutlineModel,
    TenantConfigModel,
    UserChatLogModel,
    UserGroupModel,
    UserModel,
    UserToGroupAssociation,
)
from .schemas import GroupLimitInfo, LimitInfo, TenantLimitInfo

logger = logging.getLogger(__name__)


class LimitService:
    """
    テナントおよびグループのリソース制限を確認・取得するサービス
    """

    def __init__(self, session: Session):
        self.session = session
        self._tenant_config_cache: Optional[TenantConfigModel] = None

    def _get_tenant_config(self) -> TenantConfigModel:
        """テナント設定を取得（リクエスト内でキャッシュ）"""
        if self._tenant_config_cache:
            return self._tenant_config_cache

        stmt = select(TenantConfigModel).limit(1)
        config = self.session.execute(stmt).scalars().first()
        if not config:
            logger.warning("TenantConfigModel not found. Assuming no limits.")
            config = TenantConfigModel()
        
        self._tenant_config_cache = config
        return config

    def _get_group(self, group_id: str) -> UserGroupModel:
        """グループを取得"""
        stmt = select(UserGroupModel).where(
            UserGroupModel.group_id == group_id,
            UserGroupModel.is_deleted == False,
        )
        group = self.session.execute(stmt).scalars().first()
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Group not found: {group_id}",
            )
        return group

    # --------------------------------------------------------------------------
    # Usage Counting Methods (Internal)
    # --------------------------------------------------------------------------

    def _get_usage_monthly_chat(self, group_id: Optional[str] = None) -> int:
        """当月のチャット数（UserChatLog）を取得"""
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        query = select(func.count(UserChatLogModel.chat_log_id)).where(
            UserChatLogModel.created_at >= start_of_month,
            UserChatLogModel.is_deleted == False,
        )
        if group_id:
            query = query.where(UserChatLogModel.group_id == group_id)

        return self.session.execute(query).scalar() or 0

    def _get_usage_monthly_image(self, group_id: Optional[str] = None) -> int:
        """当月の画像生成数（UserChatLog、generated_image_gcs_urlがNULLでないもの）を取得"""
        now = datetime.now(timezone.utc)
        start_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)

        query = select(func.count(UserChatLogModel.chat_log_id)).where(
            UserChatLogModel.created_at >= start_of_month,
            UserChatLogModel.is_deleted == False,
            UserChatLogModel.generated_image_gcs_url.isnot(None),
        )
        if group_id:
            query = query.where(UserChatLogModel.group_id == group_id)

        return self.session.execute(query).scalar() or 0

    def _get_usage_page(self, group_id: Optional[str] = None) -> int:
        """ページ総数（FileOutline.page_count）を取得"""
        query = select(func.sum(FileOutlineModel.page_count)).where(
            FileOutlineModel.is_deleted == False
        )
        if group_id:
            query = query.where(FileOutlineModel.group_id == group_id)

        result = self.session.execute(query).scalar()
        return result or 0

    def _get_usage_group(self) -> int:
        """グループ数（UserGroup）を取得"""
        query = select(func.count(UserGroupModel.group_id)).where(
            UserGroupModel.is_deleted == False
        )
        return self.session.execute(query).scalar() or 0

    def _get_usage_chat_entry(self, group_id: Optional[str] = None) -> int:
        """ChatEntry数を取得"""
        query = select(func.count(ChatEntryModel.chat_entry_id))
        if group_id:
            query = query.where(ChatEntryModel.group_id == group_id)
        return self.session.execute(query).scalar() or 0

    def _get_usage_bot(self, group_id: Optional[str] = None) -> int:
        """Bot数を取得"""
        query = select(func.count(BotModel.bot_id))
        if group_id:
            query = query.where(BotModel.group_id == group_id)
        return self.session.execute(query).scalar() or 0

    def _get_usage_user(self, group_id: Optional[str] = None) -> int:
        """User数を取得"""
        if group_id:
            # グループ所属ユーザー数
            query = select(func.count(UserToGroupAssociation.user_id)).where(
                UserToGroupAssociation.group_id == group_id
            )
            return self.session.execute(query).scalar() or 0
        else:
            # テナント全体ユーザー数
            query = select(func.count(UserModel.user_id))
            return self.session.execute(query).scalar() or 0

    def _build_limit_info(self, limit: int | None, current: int) -> LimitInfo:
        """LimitInfoオブジェクトを生成"""
        remaining = None
        is_exceeded = False
        if limit is not None:
            remaining = max(0, limit - current)
            is_exceeded = current > limit
            
        return LimitInfo(
            limit=limit,
            current=current,
            is_exceeded=is_exceeded,
            remaining=remaining
        )

    def _check_limit_value(self, limit: int | None, current: int, increment: int, name: str):
        """汎用的なリミットチェックロジック"""
        if limit is not None:
            if current + increment > limit:
                # 日本語エラーメッセージのためのマッピング
                name_map = {
                    "Tenant Monthly Chat": "テナントの月間チャット数",
                    "Group Monthly Chat": "グループの月間チャット数",
                    "Tenant Monthly Image": "テナントの月間画像生成数",
                    "Group Monthly Image": "グループの月間画像生成数",
                    "Tenant Page": "テナントのページ数",
                    "Group Page": "グループのページ数",
                    "Tenant Group": "テナントのグループ作成数",
                    "Tenant Chat Entry": "テナントのチャットエントリ数",
                    "Group Chat Entry": "グループのチャットエントリ数",
                    "Tenant Bot": "テナントのボット数",
                    "Group Bot": "グループのボット数",
                    "Tenant User": "テナントのユーザー数",
                    "Group User": "グループのユーザー数"
                }
                
                jp_name = name_map.get(name, name)
                
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail=f"{jp_name}の上限を超過しました。上限: {limit}, 現在: {current}, 要求: {increment}"
                )

    # --------------------------------------------------------------------------
    # Public Limit Retrieval Methods
    # --------------------------------------------------------------------------

    def get_tenant_limits(self) -> TenantLimitInfo:
        """テナント全体のリミット状況を取得"""
        config = self._get_tenant_config()

        return TenantLimitInfo(
            monthly_chat=self._build_limit_info(config.monthly_max_chat_count, self._get_usage_monthly_chat()),
            monthly_image=self._build_limit_info(config.monthly_max_image_count, self._get_usage_monthly_image()),
            page=self._build_limit_info(config.max_page_count, self._get_usage_page()),
            group=self._build_limit_info(config.max_group_count, self._get_usage_group()),
            chat_entry=self._build_limit_info(config.max_chat_entry_count, self._get_usage_chat_entry()),
            bot=self._build_limit_info(config.max_bot_count, self._get_usage_bot()),
            user=self._build_limit_info(config.max_user_count, self._get_usage_user()),
        )

    def get_group_limits(self, group_id: str) -> GroupLimitInfo:
        """指定グループのリミット状況を取得"""
        group = self._get_group(group_id)

        return GroupLimitInfo(
            group_id=group_id,
            monthly_chat=self._build_limit_info(group.monthly_max_chat_count, self._get_usage_monthly_chat(group_id)),
            monthly_image=self._build_limit_info(group.monthly_max_image_count, self._get_usage_monthly_image(group_id)),
            page=self._build_limit_info(group.max_page_count, self._get_usage_page(group_id)),
            chat_entry=self._build_limit_info(group.max_chat_entry_count, self._get_usage_chat_entry(group_id)),
            bot=self._build_limit_info(group.max_bot_count, self._get_usage_bot(group_id)),
            user=self._build_limit_info(group.max_user_count, self._get_usage_user(group_id)),
        )

    # --------------------------------------------------------------------------
    # Public Limit Check Methods (Dependency Injection targets)
    # --------------------------------------------------------------------------

    def check_monthly_chat_limit(self, group_id: str, increment: int = 1):
        """月間チャット数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_monthly_chat()
        self._check_limit_value(tenant_config.monthly_max_chat_count, tenant_current, increment, "Tenant Monthly Chat")

        # 2. Group Check
        group = self._get_group(group_id)
        group_current = self._get_usage_monthly_chat(group_id)
        self._check_limit_value(group.monthly_max_chat_count, group_current, increment, "Group Monthly Chat")

    def check_monthly_image_limit(self, group_id: str, increment: int = 1):
        """月間画像生成数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_monthly_image()
        self._check_limit_value(tenant_config.monthly_max_image_count, tenant_current, increment, "Tenant Monthly Image")

        # 2. Group Check
        group = self._get_group(group_id)
        group_current = self._get_usage_monthly_image(group_id)
        self._check_limit_value(group.monthly_max_image_count, group_current, increment, "Group Monthly Image")

    def check_page_limit(self, group_id: str, increment: int = 1):
        """ページ数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_page()
        self._check_limit_value(tenant_config.max_page_count, tenant_current, increment, "Tenant Page")

        # 2. Group Check
        group = self._get_group(group_id)
        group_current = self._get_usage_page(group_id)
        self._check_limit_value(group.max_page_count, group_current, increment, "Group Page")

    def check_group_limit(self, increment: int = 1):
        """グループ作成数の制限チェック（テナントのみ）"""
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_group()
        self._check_limit_value(tenant_config.max_group_count, tenant_current, increment, "Tenant Group")

    def check_chat_entry_limit(self, group_id: str, increment: int = 1):
        """ChatEntry作成数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_chat_entry()
        self._check_limit_value(tenant_config.max_chat_entry_count, tenant_current, increment, "Tenant Chat Entry")

        # 2. Group Check
        group = self._get_group(group_id)
        group_current = self._get_usage_chat_entry(group_id)
        self._check_limit_value(group.max_chat_entry_count, group_current, increment, "Group Chat Entry")

    def check_bot_limit(self, group_id: str, increment: int = 1):
        """Bot作成数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_bot()
        self._check_limit_value(tenant_config.max_bot_count, tenant_current, increment, "Tenant Bot")

        # 2. Group Check
        group = self._get_group(group_id)
        group_current = self._get_usage_bot(group_id)
        self._check_limit_value(group.max_bot_count, group_current, increment, "Group Bot")

    def check_user_limit(self, group_id: str | None = None, increment: int = 1):
        """User追加数の制限チェック（テナント＆グループ）"""
        # 1. Tenant Check (Total Users)
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_user()
        self._check_limit_value(tenant_config.max_user_count, tenant_current, increment, "Tenant User")

        # 2. Group Check (Users in Group) - Only if group_id is provided
        if group_id:
            group = self._get_group(group_id)
            group_current = self._get_usage_user(group_id)
            self._check_limit_value(group.max_user_count, group_current, increment, "Group User")

    def check_tenant_user_limit(self, increment: int = 1):
        """User追加数の制限チェック（テナントのみ）"""
        # Tenant Check (Total Users)
        tenant_config = self._get_tenant_config()
        tenant_current = self._get_usage_user()
        self._check_limit_value(tenant_config.max_user_count, tenant_current, increment, "Tenant User")
