"use client";
import { ToastProvider } from "@heroui/react";
import React, { createContext, useContext, useEffect, useState } from "react";
import { LoadingScreen } from "@common/LoadingScreen";
import {
  GroupRoleProvider,
  useGroupRoleContext,
} from "../../../context/role/groupRoleContext";
import { useTenantRoleContext } from "../../../context/role";
import { usePermissionCheck, getRedirectPath } from "@lib/permissions";
import { useRouter, usePathname } from "next/navigation";
import Header from "./header";
import Sidebar from "./sidebar";
import { initializeGlobalErrorToast } from "@common/errorHandler";

// ============================================================================
// 1) GroupContext定義（groupIdのみ管理）
// ============================================================================
const GroupContext = createContext<string>("");

function useGroupContext() {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error(
      "useGroupContext must be used within GroupContext.Provider",
    );
  }
  return context;
}

// ============================================================================
// 2) 統合されたデータコンテキスト（後方互換性のため）
// ============================================================================
function useGroupDataContext() {
  const tenantRoleContext = useTenantRoleContext();
  const groupRoleContext = useGroupRoleContext();

  return {
    // グループ関連
    displayGroupList: groupRoleContext.displayGroupList,
    allGroupList: groupRoleContext.allGroupList,
    currentGroup: groupRoleContext.currentGroup,

    // ユーザー関連
    user: groupRoleContext.user,
    userProfile: tenantRoleContext.userProfile,
    groupRole: groupRoleContext.groupRole,

    // ローディング状態
    isGroupDataLoading: groupRoleContext.isGroupDataLoading,
    isUserDataLoading:
      groupRoleContext.isUserDataLoading || tenantRoleContext.isUserDataLoading,
    isAuthChecked: groupRoleContext.isAuthChecked,

    // エラー状態
    isGroupDataError: groupRoleContext.isGroupDataError,
    isUserDataError:
      groupRoleContext.isUserDataError || tenantRoleContext.isUserDataError,
  };
}

// ============================================================================
// 3) 権限チェックコンポーネント
// ============================================================================
function PermissionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tenantRoleContext = useTenantRoleContext();
  const groupRoleContext = useGroupRoleContext();
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);

  // パスからgroupIdを抽出
  const pathSegments = pathname.split("/");
  const groupId = pathSegments[2]; // /main/[groupId]/[page] の [groupId] 部分

  // 権限コンテキストを統合
  const permissionContext = {
    tenantRole: tenantRoleContext.tenantRole,
    groupRole: groupRoleContext.groupRole,
    isAuthChecked:
      tenantRoleContext.isAuthChecked && groupRoleContext.isAuthChecked,
    isLoading:
      tenantRoleContext.isUserDataLoading || groupRoleContext.isUserDataLoading,
    hasError:
      tenantRoleContext.isUserDataError || groupRoleContext.isUserDataError,
  };

  const { checkAccess, isLoading, hasError, isAuthChecked, groupRole } =
    usePermissionCheck(permissionContext);

  useEffect(() => {
    // 認証チェックが完了していない場合は何もしない
    if (!isAuthChecked) {
      return;
    }

    // ローディング中やエラー時は何もしない
    if (isLoading || hasError) {
      return;
    }

    // パスからページパスを抽出
    // /main/[groupId]/[page] の形式から [page] 部分を取得
    const pathSegments = pathname.split("/");
    const pagePath = pathSegments[pathSegments.length - 1];
    const fullPagePath = `/${pagePath}`;

    // 権限チェック
    const hasAccess = checkAccess(fullPagePath);

    if (!hasAccess) {
      console.warn(`アクセス権限がありません: ${fullPagePath}`);

      // 権限に応じたリダイレクト先を取得
      const redirectPath = getRedirectPath(groupRole, groupId);
      router.replace(redirectPath);
    }

    setHasCheckedAccess(true);
  }, [
    pathname,
    checkAccess,
    isLoading,
    hasError,
    isAuthChecked,
    router,
    groupRole,
    groupId,
  ]);

  // 認証チェックが完了していない場合
  if (!isAuthChecked) {
    return <LoadingScreen message="認証を確認しています..." />;
  }

  // ローディング中はフォールバックまたは何も表示しない
  if (isLoading) {
    return <LoadingScreen message="権限を確認しています..." />;
  }

  // エラー時はフォールバックまたは何も表示しない
  if (hasError) {
    return <LoadingScreen message="エラーが発生しました..." />;
  }

  // アクセス権限チェックが完了していない場合
  if (!hasCheckedAccess) {
    return <LoadingScreen message="権限を確認しています..." />;
  }

  // 権限チェックが完了したら子コンポーネントを表示
  return <>{children}</>;
}

// ============================================================================
// 4) LayoutClientコンポーネント
// ============================================================================
export type LayoutClientProps = {
  children: React.ReactNode;
  groupId: string;
};

export function LayoutClient({ children, groupId }: LayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // APIエラー（特に402リミット超過）を監視してトーストを表示
  useEffect(() => {
    initializeGlobalErrorToast();
  }, []);

  // 初期ローディング状態の管理
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 500); // 最低限のローディング表示時間

    return () => clearTimeout(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // 初期ローディング中の表示
  if (isInitialLoading) {
    return (
      <LoadingScreen fullScreen message="グループ環境を準備しています..." />
    );
  }

  return (
    // GroupContext で groupId を下層に共有し、GroupRoleProviderでデータ管理
    <GroupContext.Provider value={groupId}>
      <GroupRoleProvider groupId={groupId}>
        <>
          <ToastProvider placement="bottom-right" />
          <div className="flex flex-col h-screen bg-gray-100">
            {/* ヘッダー - ハンバーガーメニューボタンを内包 */}
            <div className="bg-white shadow-sm relative z-30 flex-shrink-0">
              <Header
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={toggleSidebar}
              />
            </div>

            <div className="flex flex-1 overflow-hidden relative min-h-0">
              {/* オーバーレイ（モバイル時のサイドバー背景） */}
              {isSidebarOpen && (
                <div
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-[40] backdrop-blur-sm transition-opacity duration-300"
                  onClick={closeSidebar}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      closeSidebar();
                    }
                  }}
                  aria-label="サイドバーを閉じる"
                  role="button"
                  tabIndex={0}
                />
              )}

              {/* サイドバー */}
              <div
                className={`
                  fixed lg:relative lg:translate-x-0 inset-y-0 left-0 z-[45] 
                  transform transition-transform duration-300 ease-in-out
                  ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
                  lg:transform-none lg:shadow-none shadow-2xl
                `}
              >
                <Sidebar onClose={closeSidebar} />
              </div>

              {/* メインコンテンツ */}
              <main className="flex-1 overflow-y-auto overflow-x-hidden w-full min-w-0">
                <PermissionGuard>{children}</PermissionGuard>
              </main>
            </div>
          </div>
        </>
      </GroupRoleProvider>
    </GroupContext.Provider>
  );
}

// ============================================================================
// 4) 他のコンポーネントで使えるフックをエクスポート
// ============================================================================
export { useGroupContext, useGroupDataContext };
