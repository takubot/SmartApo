from pydantic import BaseModel, Field


class LimitInfo(BaseModel):
    limit: int | None = Field(None, description="上限数 (Noneの場合は無制限)")
    current: int = Field(..., description="現在の使用数")
    is_exceeded: bool = Field(..., description="上限を超過しているかどうか")
    remaining: int | None = Field(None, description="残り数 (Noneの場合は無制限)")


class TenantLimitInfo(BaseModel):
    monthly_chat: LimitInfo = Field(..., description="月間チャット数")
    monthly_image: LimitInfo = Field(..., description="月間画像生成数")
    page: LimitInfo = Field(..., description="ページ数")
    group: LimitInfo = Field(..., description="グループ数")
    chat_entry: LimitInfo = Field(..., description="ChatEntry数")
    bot: LimitInfo = Field(..., description="Bot数")
    user: LimitInfo = Field(..., description="User数")


class GroupLimitInfo(BaseModel):
    group_id: str = Field(..., description="グループID")
    monthly_chat: LimitInfo = Field(..., description="月間チャット数")
    monthly_image: LimitInfo = Field(..., description="月間画像生成数")
    page: LimitInfo = Field(..., description="ページ数")
    chat_entry: LimitInfo = Field(..., description="ChatEntry数")
    bot: LimitInfo = Field(..., description="Bot数")
    user: LimitInfo = Field(..., description="User数")
