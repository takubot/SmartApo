"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import useSWR from "swr";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { get_user_v2_user_get__user_id__get } from "@repo/api-contracts/based_template/service";
import type { UserResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

// ============================================================================
// 1) 型定義
// ============================================================================
interface TenantRoleContextType {
  // ユーザー関連
  user: FirebaseUser | null;
  userProfile: UserResponseSchemaType | undefined;
  tenantRole: string;

  // ローディング状態
  isUserDataLoading: boolean;
  isAuthChecked: boolean;

  // エラー状態
  isUserDataError: boolean;
}

// ============================================================================
// 2) Context定義
// ============================================================================
const TenantRoleContext = createContext<TenantRoleContextType | null>(null);

function useTenantRoleContext() {
  const context = useContext(TenantRoleContext);
  if (!context) {
    throw new Error(
      "useTenantRoleContext must be used within TenantRoleProvider",
    );
  }
  return context;
}

// ============================================================================
// 3) TenantRoleProvider コンポーネント
// ============================================================================
interface TenantRoleProviderProps {
  children: React.ReactNode;
}

export function TenantRoleProvider({ children }: TenantRoleProviderProps) {
  // Firebase 認証状態
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // ユーザープロフィール取得（tenantRoleを含む）
  const {
    data: userProfileData,
    error: userProfileError,
    isLoading: isUserProfileLoading,
  } = useSWR<UserResponseSchemaType>(
    user ? `user_profile_${user.uid}` : null,
    user ? () => get_user_v2_user_get__user_id__get(user.uid) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5分間キャッシュ
      errorRetryInterval: 10000,
    },
  );

  // データ処理
  const tenantRole = userProfileData?.tenantRole ?? "";

  // ローディング状態
  const isUserDataLoading = isUserProfileLoading;

  // エラー状態
  const isUserDataError = !!userProfileError;

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

    if (!user || isUserDataError) {
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, [authChecked, user, isUserDataError]);

  const contextValue: TenantRoleContextType = {
    // ユーザー関連
    user,
    userProfile: userProfileData,
    tenantRole,

    // ローディング状態
    isUserDataLoading,
    isAuthChecked: authChecked,

    // エラー状態
    isUserDataError,
  };

  return (
    <TenantRoleContext.Provider value={contextValue}>
      {children}
    </TenantRoleContext.Provider>
  );
}

// ============================================================================
// 4) エクスポート
// ============================================================================
export { useTenantRoleContext };
