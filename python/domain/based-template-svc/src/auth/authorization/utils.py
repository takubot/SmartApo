# app/permissions/utils.py


from sqlalchemy.orm import Session

from .permission_map import GROUP_PERMISSION_MAP, TENANT_PERMISSION_MAP
from .roles import fetch_group_role, fetch_tenant_role


def check_permission(
    db: Session,
    user_id: str,
    action: str,
    group_id: str | None = None,
) -> bool:
    """
    テナントロール/グループロールに基づき、指定のactionが可能かどうかを判定。
    """
    # --- 1) テナントレベルのアクションか？ ---
    if action in TENANT_PERMISSION_MAP:
        allowed_tenant_roles = TENANT_PERMISSION_MAP[action]
        tenant_role = fetch_tenant_role(db, user_id)
        return (tenant_role in allowed_tenant_roles) if tenant_role else False

    # --- 2) グループレベルのアクションか？ ---
    if action in GROUP_PERMISSION_MAP:
        if not group_id:
            # グループアクションなのにgroup_idが指定されていない場合はFalse
            return False
        allowed_group_roles = GROUP_PERMISSION_MAP[action]
        group_role = fetch_group_role(db, user_id, group_id)
        return (group_role in allowed_group_roles) if group_role else False

    # それ以外は権限なし
    return False
