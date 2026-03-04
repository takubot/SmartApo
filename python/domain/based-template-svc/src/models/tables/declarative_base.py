from datetime import datetime, timedelta, timezone

from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import expression

# from ...auth.dependency import require_current_account, require_current_membership, require_current_tenant

__all__ = ("Base",)

JST = timezone(timedelta(hours=9))  # UTC+9


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    """
    作成日時と更新日時を持つための Mixin
    """

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(JST),  # JSTでの現在時刻をデフォルトに設定
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(JST),  # 作成時にもJSTで時刻を設定
        onupdate=lambda: datetime.now(JST),  # 更新時にもJSTで時刻を設定
        nullable=False,
    )



class DeleteMixin:
    """
    削除フラグを持つための Mixin
    """

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=expression.false(),
        comment="論理削除フラグ",
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="削除日時",
    )
