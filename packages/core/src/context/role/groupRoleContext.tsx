"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../../lib/firebase";
import {
  get_group_list_by_user_id_v2_group_list__user_id__get,
  get_user_to_group_v2_user_to_group_get__group_id___user_id__get,
} from "@repo/api-contracts/based_template/service";
import type {
  GroupListResponseSchemaType,
  GroupResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useTenantRoleContext } from "./tenantRoleContext";

// ============================================================================
// 1) 型定義
// ============================================================================
type DisplayGroupItem = GroupResponseSchemaType & { groupRole: string };

interface GroupRoleResponse {
  groupRole: string;
}

interface GroupRoleContextType {
  // グループ関連
  displayGroupList: DisplayGroupItem[];
  allGroupList: GroupResponseSchemaType[];
  currentGroup: DisplayGroupItem | undefined;

  // ユーザー関連
  user: FirebaseUser | null;
  groupRole: string;

  // ローディング状態
  isGroupDataLoading: boolean;
  isUserDataLoading: boolean;
  isAuthChecked: boolean;

  // エラー状態
  isGroupDataError: boolean;
  isUserDataError: boolean;
}

// ============================================================================
// 2) Context定義
// ============================================================================
const GroupRoleContext = createContext<GroupRoleContextType | null>(null);

function useGroupRoleContext() {
  const context = useContext(GroupRoleContext);
  if (!context) {
    throw new Error(
      "useGroupRoleContext must be used within GroupRoleProvider",
    );
  }
  return context;
}

// ============================================================================
// 3) GroupRoleProvider コンポーネント
// ============================================================================
interface GroupRoleProviderProps {
  children: React.ReactNode;
  groupId: string;
}

export function GroupRoleProvider({
  children,
  groupId,
}: GroupRoleProviderProps) {
  // Firebase 認証状態
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // テナントロールを取得
  const { tenantRole } = useTenantRoleContext();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ユーザー所属グループ一覧取得（TENANT_ADMINの場合は全グループを返す）
  const {
    data: userGroupListData,
    error: userGroupListError,
    isLoading: isUserGroupListLoading,
  } = useSWR<GroupListResponseSchemaType>(
    user ? `user-group-list-${user.uid}` : null,
    user
      ? () => get_group_list_by_user_id_v2_group_list__user_id__get(user.uid)
      : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1分間キャッシュ
    },
  );

  // グループ内での権限取得
  const {
    data: groupRoleData,
    error: groupRoleError,
    isLoading: isGroupRoleLoading,
  } = useSWR<GroupRoleResponse>(
    user && groupId ? `user_to_group_${groupId}_${user.uid}` : null,
    user && groupId
      ? () =>
          get_user_to_group_v2_user_to_group_get__group_id___user_id__get(
            groupId,
            user.uid,
          )
      : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1分間キャッシュ
      errorRetryInterval: 5000,
    },
  );

  // データ処理
  const userGroupList = React.useMemo(
    () => userGroupListData?.groupList ?? [],
    [userGroupListData],
  );

  const groupRole = React.useMemo(() => {
    // TENANT_ADMINの場合は常にGROUP_OWNER
    if (
      tenantRole === "TENANT_ADMIN" ||
      tenantRole === "TENANT_SETTING_ADMIN"
    ) {
      return "GROUP_OWNER";
    }
    // 通常のユーザーはAPIから取得
    return groupRoleData?.groupRole ?? "";
  }, [tenantRole, groupRoleData]);

  // 表示用のグループリストを作成
  // 新しいエンドポイントは既にユーザーに紐づくグループ一覧を返す（TENANT_ADMINの場合は全グループ）
  const displayGroupList = React.useMemo<DisplayGroupItem[]>(() => {
    if (!userGroupList.length) return [];

    // TENANT_ADMINの場合は全グループをGROUP_OWNERとして表示
    if (
      tenantRole === "TENANT_ADMIN" ||
      tenantRole === "TENANT_SETTING_ADMIN"
    ) {
      return userGroupList.map((g: GroupResponseSchemaType) => ({
        ...g,
        groupRole: "GROUP_OWNER",
      }));
    }

    // 通常のユーザーは、各グループのロール情報を取得する必要がある
    // ただし、効率化のため、現在のグループのロールだけを取得し、
    // 他のグループは一時的に空文字列として扱う
    // 必要に応じて個別に取得する
    return userGroupList.map((g: GroupResponseSchemaType) => ({
      ...g,
      groupRole: g.groupId === groupId ? groupRole : "",
    }));
  }, [userGroupList, tenantRole, groupId, groupRole]);

  // 現在のグループを取得
  const currentGroup = displayGroupList.find((g) => g.groupId === groupId);

  // ローディング状態
  const isGroupDataLoading = isUserGroupListLoading;
  const isUserDataLoading = isGroupRoleLoading;

  // エラー状態
  const isGroupDataError = !!userGroupListError;
  // TENANT_ADMINの場合はgroupRoleErrorを無視
  const isUserDataError =
    tenantRole === "TENANT_ADMIN" || tenantRole === "TENANT_SETTING_ADMIN"
      ? false
      : !!groupRoleError;

  // 認証エラーチェック - ユーザーが未ログインまたはAPIエラーの場合はログインページにリダイレクト
  useEffect(() => {
    if (!authChecked) return;

    // エラーページの場合は認証チェックをスキップ
    if (
      typeof window !== "undefined" &&
      window.location.pathname.includes("/error")
    ) {
      return;
    }

    // TENANT_ADMINの場合はgroupRoleErrorを無視
    if (
      !user ||
      (isUserDataError &&
        tenantRole !== "TENANT_ADMIN" &&
        tenantRole !== "TENANT_SETTING_ADMIN")
    ) {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, [authChecked, user, isUserDataError, tenantRole]);

  const contextValue: GroupRoleContextType = {
    // グループ関連
    displayGroupList,
    allGroupList: userGroupList,
    currentGroup,

    // ユーザー関連
    user,
    groupRole,

    // ローディング状態
    isGroupDataLoading,
    isUserDataLoading,
    isAuthChecked: authChecked,

    // エラー状態
    isGroupDataError,
    isUserDataError,
  };

  return (
    <GroupRoleContext.Provider value={contextValue}>
      {children}
    </GroupRoleContext.Provider>
  );
}

// ============================================================================
// 4) エクスポート
// ============================================================================
export { useGroupRoleContext };
