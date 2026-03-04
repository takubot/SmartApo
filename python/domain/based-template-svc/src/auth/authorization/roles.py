# app/permissions/roles.py

from sqlalchemy.orm import Session

from ...models.tables.enum import GroupRoleEnum
from ...models.tables.model_defs import UserModel, UserToGroupAssociation


def fetch_tenant_role(db: Session, user_id: str) -> str | None:
    """
    ユーザーIDに紐づくテナントロールを返す
    """
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    return user.tenant_role if user else None


def fetch_group_role(db: Session, user_id: str, group_id: str) -> GroupRoleEnum:
    """
    ユーザーIDに紐づくグループロールを返す
    TENANT_ADMINまたはTENANT_SETTING_ADMINの場合は、アソシエーションがなくてもGROUP_OWNERを返す
    """
    # まずテナントロールをチェック
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if user and user.tenant_role in ("TENANT_ADMIN", "TENANT_SETTING_ADMIN"):
        return GroupRoleEnum.GROUP_OWNER
    
    # 通常のアソシエーションからグループロールを取得
    assoc = (
        db.query(UserToGroupAssociation)
        .filter(
            UserToGroupAssociation.user_id == user_id,
            UserToGroupAssociation.group_id == group_id,
        )
        .one()
    )
    return assoc.group_role


def fetch_user_to_group_association(db: Session, user_id: str, group_id: str) -> UserToGroupAssociation | None:
    """
    ユーザーとグループの関連付けを取得する
    TENANT_ADMINまたはTENANT_SETTING_ADMINの場合は、アソシエーションがなくてもGROUP_OWNERロールで仮想的な関連付けを返す
    通常ユーザーの場合は、アソシエーションが存在しない場合はNoneを返す
    """
    # まずテナントロールをチェック
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if user and user.tenant_role in ("TENANT_ADMIN", "TENANT_SETTING_ADMIN"):
        # テナント管理者の場合は、アソシエーションがなくてもGROUP_OWNERとして扱う
        # 仮想的なUserToGroupAssociationオブジェクトを作成して返す
        from ...models.tables.model_defs import UserGroupModel
        
        # グループが存在するかチェック
        group = db.query(UserGroupModel).filter(UserGroupModel.group_id == group_id).first()
        if group is None:
            return None
        
        # 仮想的なアソシエーションオブジェクトを作成
        virtual_assoc = UserToGroupAssociation(
            user_id=user_id,
            group_id=group_id,
            group_role=GroupRoleEnum.GROUP_OWNER,
        )
        return virtual_assoc
    
    # 通常のアソシエーションから取得
    assoc = (
        db.query(UserToGroupAssociation)
        .filter(
            UserToGroupAssociation.user_id == user_id,
            UserToGroupAssociation.group_id == group_id,
        )
        .one_or_none()
    )
    return assoc
