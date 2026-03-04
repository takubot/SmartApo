/**
 * 権限管理統合モジュール
 * すべての権限関連のロジックを一箇所にまとめる
 */

// ============================================================================
// 1) 型定義
// ============================================================================
export type TenantRole =
  | "TENANT_SETTING_ADMIN"
  | "TENANT_ADMIN"
  | "TENANT_MANAGER"
  | "TENANT_MEMBER";
export type GroupRole = "GROUP_OWNER" | "GROUP_MANAGER" | "GROUP_MEMBER";

export interface PagePermission {
  // テナント権限（最低限必要な権限）
  requiredTenantRole?: TenantRole;
  // グループ権限（最低限必要な権限）
  requiredGroupRole?: GroupRole;
  // 両方の権限が必要かどうか（デフォルト: false = どちらか一方でOK）
  requireBoth?: boolean;
}

export interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

export interface PermissionContext {
  tenantRole: string;
  groupRole: string;
  isAuthChecked: boolean;
  isLoading: boolean;
  hasError: boolean;
}

// ============================================================================
// 2) 権限設定
// ============================================================================
export const PAGE_PERMISSIONS: Record<string, PagePermission> = {
  // ダッシュボード - 全員アクセス可能
  "/dashboard": {},

  // データ検索 - グループメンバー以上
  "/dataTable": {
    requiredGroupRole: "GROUP_MEMBER",
  },

  // ボット管理 - グループマネージャー以上
  "/chatBot": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // ファイル管理 - グループマネージャー以上
  "/file": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // 参照リンク管理 - グループマネージャー以上
  "/reference-link": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // カテゴリー管理 - グループマネージャー以上
  "/category": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // チャット - 全員アクセス可能
  "/chat": {},

  // メンバー管理 - グループマネージャー以上
  "/member": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // 外部ユーザー管理 - グループマネージャー以上
  "/externalUserManage": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // 組織管理 (テナント管理配下の専用ページに移動済み)

  // URL管理 - グループマネージャー以上
  "/chatEntry": {
    requiredGroupRole: "GROUP_MANAGER",
  },

  // フロー管理 - グループマネージャー以上
  "/flow": {
    requiredGroupRole: "GROUP_MANAGER",
  },
};

export const MENU_ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "ダッシュボード", icon: "BarChart3" },
  { href: "/dataTable", label: "データ検索", icon: "Search" },
  { href: "/chatBot", label: "ボット管理", icon: "Bot" },
  { href: "/file", label: "ファイル管理", icon: "FileText" },
  { href: "/reference-link", label: "参照リンク管理", icon: "FormInput" },
  { href: "/category", label: "カテゴリー管理", icon: "Tag" },
  { href: "/chat", label: "チャット", icon: "MessageSquare" },
  { href: "/member", label: "メンバー管理", icon: "User" },
  { href: "/externalUserManage", label: "外部ユーザー管理", icon: "Users" },
  // 組織管理はテナント管理 (/main/group/tenant-admin) 側のメニューで扱う
  { href: "/chatEntry", label: "URL管理", icon: "LinkIcon" },
];

// ============================================================================
// 3) 権限チェック関数
// ============================================================================
function checkTenantRole(userRole: string, requiredRole: TenantRole): boolean {
  const roleHierarchy: Record<TenantRole, number> = {
    TENANT_MEMBER: 1,
    TENANT_MANAGER: 2,
    TENANT_ADMIN: 3,
    TENANT_SETTING_ADMIN: 4,
  };

  const userLevel = roleHierarchy[userRole as TenantRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

function checkGroupRole(userRole: string, requiredRole: GroupRole): boolean {
  const roleHierarchy: Record<GroupRole, number> = {
    GROUP_MEMBER: 1,
    GROUP_MANAGER: 2,
    GROUP_OWNER: 3,
  };

  const userLevel = roleHierarchy[userRole as GroupRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * ページアクセス権限チェック
 */
export function hasPageAccess(
  path: string,
  tenantRole: string,
  groupRole: string,
): boolean {
  // エラーページは誰でもアクセス可能
  if (path === "/error") {
    return true;
  }

  // TENANT_ADMINの場合はすべてのページにアクセス可能
  if (tenantRole === "TENANT_ADMIN") {
    return true;
  }

  // GROUP_MEMBERの場合はチャットページのみアクセス可能
  if (groupRole === "GROUP_MEMBER") {
    return path === "/chat";
  }

  const permission = PAGE_PERMISSIONS[path];

  // 権限設定がない場合はアクセス可能
  if (!permission) {
    return true;
  }

  const {
    requiredTenantRole,
    requiredGroupRole,
    requireBoth = false,
  } = permission;

  // テナント権限チェック
  const hasTenantAccess = requiredTenantRole
    ? checkTenantRole(tenantRole, requiredTenantRole)
    : true;

  // グループ権限チェック
  const hasGroupAccess = requiredGroupRole
    ? checkGroupRole(groupRole, requiredGroupRole)
    : true;

  // 両方必要かどうかで判定
  if (requireBoth) {
    return hasTenantAccess && hasGroupAccess;
  } else {
    // どちらか一方が設定されている場合は、その権限のみで判定
    if (requiredTenantRole && !requiredGroupRole) {
      return hasTenantAccess;
    }
    if (!requiredTenantRole && requiredGroupRole) {
      return hasGroupAccess;
    }
    // 両方設定されている場合は、どちらか一方でOK
    return hasTenantAccess || hasGroupAccess;
  }
}

/**
 * サイドバーメニュー用の権限チェック
 */
export function getVisibleMenuItems(
  tenantRole: string,
  groupRole: string,
): MenuItem[] {
  // TENANT_ADMINの場合はすべてのメニューを表示
  if (tenantRole === "TENANT_ADMIN") {
    return MENU_ITEMS.filter((item) => item.href !== "/error");
  }

  // GROUP_MEMBERの場合はチャットのみ表示
  if (groupRole === "GROUP_MEMBER") {
    return MENU_ITEMS.filter((item) => item.href === "/chat");
  }

  return MENU_ITEMS.filter((item) => {
    // エラーページはサイドバーに表示しない
    if (item.href === "/error") {
      return false;
    }
    return hasPageAccess(item.href, tenantRole, groupRole);
  });
}

/**
 * 権限チェック用のカスタムフック
 */
export function usePermissionCheck(context: PermissionContext) {
  const { tenantRole, groupRole, isAuthChecked, isLoading, hasError } = context;

  // 権限チェック関数
  const checkAccess = (path: string): boolean => {
    if (!isAuthChecked || isLoading) {
      return false; // ローディング中はアクセス不可
    }

    if (hasError) {
      return false; // エラー時はアクセス不可
    }

    return hasPageAccess(path, tenantRole, groupRole);
  };

  // サイドバーメニュー用の表示可能アイテム
  const visibleMenuItems = getVisibleMenuItems(tenantRole, groupRole);

  // 特定の権限レベルチェック
  const hasTenantPermission = (requiredRole: TenantRole): boolean => {
    if (!isAuthChecked || isLoading || hasError) {
      return false;
    }

    const roleHierarchy: Record<TenantRole, number> = {
      TENANT_MEMBER: 1,
      TENANT_MANAGER: 2,
      TENANT_ADMIN: 3,
      TENANT_SETTING_ADMIN: 4,
    };

    const userLevel = roleHierarchy[tenantRole as TenantRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  };

  const hasGroupPermission = (requiredRole: GroupRole): boolean => {
    if (!isAuthChecked || isLoading || hasError) {
      return false;
    }

    const roleHierarchy: Record<GroupRole, number> = {
      GROUP_MEMBER: 1,
      GROUP_MANAGER: 2,
      GROUP_OWNER: 3,
    };

    const userLevel = roleHierarchy[groupRole as GroupRole] || 0;
    const requiredLevel = roleHierarchy[requiredRole];

    return userLevel >= requiredLevel;
  };

  return {
    // 基本情報
    tenantRole,
    groupRole,

    // ローディング状態
    isLoading,
    isAuthChecked,

    // エラー状態
    hasError,

    // 権限チェック関数
    checkAccess,
    hasTenantPermission,
    hasGroupPermission,

    // サイドバー用
    visibleMenuItems,
  };
}

/**
 * 権限なし時のリダイレクト先を決定
 * @param groupRole ユーザーのグループ権限
 * @param groupId グループID（オプション）
 */
export function getRedirectPath(groupRole: string, groupId?: string): string {
  if (groupRole === "GROUP_MEMBER") {
    return groupId ? `/main/${groupId}/chat` : "/main/chat";
  }
  return groupId ? `/main/${groupId}/error` : "/main/error";
}
