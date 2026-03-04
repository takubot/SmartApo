"use client";

import { useTenantRoleContext } from "./tenantRoleContext";
import { useGroupRoleContext } from "./groupRoleContext";

/**
 * tenantRoleとgroupRoleを統合して取得する便利なフック
 * コンポーネントで頻繁に使用される権限情報を簡単に取得できる
 */
export function useRoleContext() {
  const tenantRoleContext = useTenantRoleContext();
  const groupRoleContext = useGroupRoleContext();

  return {
    // テナント権限
    tenantRole: tenantRoleContext.tenantRole,
    userProfile: tenantRoleContext.userProfile,
    user: tenantRoleContext.user,

    // グループ権限
    groupRole: groupRoleContext.groupRole,
    currentGroup: groupRoleContext.currentGroup,
    displayGroupList: groupRoleContext.displayGroupList,

    // ローディング状態
    isTenantRoleLoading: tenantRoleContext.isUserDataLoading,
    isGroupRoleLoading: groupRoleContext.isUserDataLoading,
    isAuthChecked: tenantRoleContext.isAuthChecked,

    // エラー状態
    isTenantRoleError: tenantRoleContext.isUserDataError,
    isGroupRoleError: groupRoleContext.isUserDataError,

    // 便利な判定関数
    isTenantAdmin: tenantRoleContext.tenantRole === "TENANT_ADMIN",
    isTenantManager: tenantRoleContext.tenantRole === "TENANT_MANAGER",
    isGroupOwner: groupRoleContext.groupRole === "GROUP_OWNER",
    isGroupManager: groupRoleContext.groupRole === "GROUP_MANAGER",
    isGroupMember: groupRoleContext.groupRole === "GROUP_MEMBER",

    // 権限チェック関数
    hasTenantPermission: (requiredRole: "TENANT_ADMIN" | "TENANT_MANAGER") => {
      const role = tenantRoleContext.tenantRole;
      if (requiredRole === "TENANT_ADMIN") {
        return role === "TENANT_ADMIN";
      }
      if (requiredRole === "TENANT_MANAGER") {
        return role === "TENANT_ADMIN" || role === "TENANT_MANAGER";
      }
      return false;
    },

    hasGroupPermission: (
      requiredRole: "GROUP_OWNER" | "GROUP_MANAGER" | "GROUP_MEMBER",
    ) => {
      const role = groupRoleContext.groupRole;
      if (requiredRole === "GROUP_OWNER") {
        return role === "GROUP_OWNER";
      }
      if (requiredRole === "GROUP_MANAGER") {
        return role === "GROUP_OWNER" || role === "GROUP_MANAGER";
      }
      if (requiredRole === "GROUP_MEMBER") {
        return (
          role === "GROUP_OWNER" ||
          role === "GROUP_MANAGER" ||
          role === "GROUP_MEMBER"
        );
      }
      return false;
    },
  };
}
