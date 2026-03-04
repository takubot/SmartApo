# app/permissions/permission_map.py

# アクション名の日本語マッピング
ACTION_NAMES_JP = {
    "CREATE_NEW_GROUP": "新しいグループの作成",
    "VIEW_ALL_GROUPS": "全グループの閲覧",
    "CHAT_ALL_GROUPS_BOT": "全グループでのBOTとのチャット",
    "VIEW_INVITED_GROUP": "招待されたグループの閲覧",
    "EDIT_INVITED_GROUP": "招待されたグループの編集",
    "DELETE_INVITED_GROUP": "招待されたグループの削除",
    "INVITE_ACCOUNT_GROUP": "グループへのアカウント招待",
    "VIEW_ACCOUNT_GROUP": "グループアカウントの閲覧",
    "EDIT_ACCOUNT_GROUP": "グループアカウントの編集",
    "REMOVE_ACCOUNT_GROUP": "グループアカウントの削除",
    "CREATE_BOT_IN_GROUP": "グループ内BOTの作成",
    "VIEW_BOT_IN_GROUP": "グループ内BOTの閲覧",
    "EDIT_BOT_IN_GROUP": "グループ内BOTの編集",
    "DELETE_BOT_IN_GROUP": "グループ内BOTの削除",
    "UPLOAD_FILE_IN_GROUP": "グループ内ファイルのアップロード",
    "VIEW_FILE_IN_GROUP": "グループ内ファイルの閲覧",
    "DOWNLOAD_FILE_IN_GROUP": "グループ内ファイルのダウンロード",
    "DELETE_FILE_IN_GROUP": "グループ内ファイルの削除",
    "CREATE_QA_IN_GROUP": "グループ内QAの作成",
    "VIEW_QA_IN_GROUP": "グループ内QAの閲覧",
    "EDIT_QA_IN_GROUP": "グループ内QAの編集",
    "DELETE_QA_IN_GROUP": "グループ内QAの削除",
    "CHAT_BOT_IN_GROUP": "グループ内BOTとのチャット",
    "VIEW_CHAT_LOG_IN_GROUP": "グループ内チャットログの閲覧",
    "CREATE_CHAT_ENDPOINT_IN_GROUP": "グループ内チャットエンドポイントの作成",
    "CREATE_FLOW_IN_GROUP": "グループ内フローの作成",
    "VIEW_FLOW_IN_GROUP": "グループ内フローの閲覧",
    "UPDATE_FLOW_IN_GROUP": "グループ内フローの更新",
    "EDIT_FLOW_IN_GROUP": "グループ内フローの編集",
    "DELETE_FLOW_IN_GROUP": "グループ内フローの削除",
    "EXECUTE_CHAT_FLOW_IN_GROUP": "グループ内チャットフローの実行",
    "VIEW_CHAT_FLOW_HISTORY_IN_GROUP": "グループ内チャットフロー履歴の閲覧",
}

# ロール名の日本語マッピング
ROLE_NAMES_JP = {
    "TENANT_SETTING_ADMIN": "テナント設定管理者",
    "TENANT_ADMIN": "テナント管理者",
    "TENANT_MANAGER": "テナントマネージャー",
    "GROUP_OWNER": "グループオーナー",
    "GROUP_MANAGER": "グループマネージャー",
    "GROUP_MEMBER": "グループメンバー",
}

# テナントロールで許可されるアクション
TENANT_PERMISSION_MAP = {
    # アクション名: [許可されるテナントロール一覧]
    "CREATE_NEW_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "TENANT_MANAGER"],
    "VIEW_ALL_GROUPS": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN"],
    "CHAT_ALL_GROUPS_BOT": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN"],
}

# グループロールで許可されるアクション
GROUP_PERMISSION_MAP = {
    # アクション名: [許可されるグループロール一覧]
    "VIEW_INVITED_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "EDIT_INVITED_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DELETE_INVITED_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER"],
    # アカウント招待の権限
    "INVITE_ACCOUNT_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "VIEW_ACCOUNT_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "EDIT_ACCOUNT_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "REMOVE_ACCOUNT_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER"],
    # BOT関連の権限
    "CREATE_BOT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "VIEW_BOT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER", "GROUP_MEMBER"],
    "EDIT_BOT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DELETE_BOT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # ファイル関連の権限
    "UPLOAD_FILE_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "VIEW_FILE_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DOWNLOAD_FILE_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DELETE_FILE_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # QA関連の権限
    "CREATE_QA_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "VIEW_QA_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "EDIT_QA_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DELETE_QA_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # BOTとの会話の権限
    "CHAT_BOT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER", "GROUP_MEMBER"],
    # BOTとの会話ログの権限
    "VIEW_CHAT_LOG_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # チャットエンドポイント
    "CREATE_CHAT_ENDPOINT_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # フロー関連の権限
    "CREATE_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "VIEW_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER", "GROUP_MEMBER"],
    "UPDATE_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "EDIT_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    "DELETE_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER"],
    # チャットフロー関連の権限
    "EXECUTE_CHAT_FLOW_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER", "GROUP_MEMBER"],
    "VIEW_CHAT_FLOW_HISTORY_IN_GROUP": ["TENANT_SETTING_ADMIN", "TENANT_ADMIN", "GROUP_OWNER", "GROUP_MANAGER", "GROUP_MEMBER"],
}


def get_japanese_permission_error_message(action: str, required_roles: list[str], user_role: str = None) -> str:
    """
    権限エラーメッセージを日本語で生成する関数
    
    Args:
        action: アクション名
        required_roles: 必要なロール一覧
        user_role: ユーザーの現在のロール（オプション）
    
    Returns:
        日本語のエラーメッセージ
    """
    action_jp = ACTION_NAMES_JP.get(action, action)
    required_roles_jp = [ROLE_NAMES_JP.get(role, role) for role in required_roles]
    
    if user_role:
        user_role_jp = ROLE_NAMES_JP.get(user_role, user_role)
        message = f"権限がありません。{action_jp}を実行するには、{', '.join(required_roles_jp)}のいずれかのロールが必要です。現在のロール: {user_role_jp}"
    else:
        message = f"権限がありません。{action_jp}を実行するには、{', '.join(required_roles_jp)}のいずれかのロールが必要です。"
    
    return message


def get_required_roles_for_action(action: str) -> list[str]:
    """
    アクションに必要なロール一覧を取得する関数
    
    Args:
        action: アクション名
    
    Returns:
        必要なロール一覧
    """
    # テナントレベルのアクションかチェック
    if action in TENANT_PERMISSION_MAP:
        return TENANT_PERMISSION_MAP[action]
    
    # グループレベルのアクションかチェック
    if action in GROUP_PERMISSION_MAP:
        return GROUP_PERMISSION_MAP[action]
    
    # 見つからない場合は空のリストを返す
    return []
