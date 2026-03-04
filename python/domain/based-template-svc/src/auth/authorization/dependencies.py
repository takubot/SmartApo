# app/permissions/require.py


from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from ...auth.authentication.dependencies import get_user_id
from ...database_utils.database import get_sync_session
from .utils import check_permission
from .permission_map import get_japanese_permission_error_message, get_required_roles_for_action


def require_tenant_permission(action: str):
    """
    テナントレベルのアクションに対する権限チェック用の依存関数。
    group_id は不要。
    """

    def dependency(
        db: Session = Depends(get_sync_session),
        user_id: str = Depends(get_user_id),
    ):
        if not check_permission(db, user_id, action, group_id=None):
            required_roles = get_required_roles_for_action(action)
            error_message = get_japanese_permission_error_message(action, required_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message,
            )

    return dependency


def require_group_permission(action: str):
    """
    グループレベルのアクションに対する権限チェック用の依存関数。
    パスパラメータから group_id を受け取り、チェックする。
    """

    def dependency(
        group_id: str = Path(..., description="対象のグループID"),
        db: Session = Depends(get_sync_session),
        user_id: str = Depends(get_user_id),
    ):
        if not check_permission(db, user_id, action, group_id):
            required_roles = get_required_roles_for_action(action)
            error_message = get_japanese_permission_error_message(action, required_roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=error_message,
            )

    return dependency
