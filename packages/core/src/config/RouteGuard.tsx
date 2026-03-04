"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTenantRoleContext } from "../context/role";
import { useGroupRoleContext } from "../context/role/groupRoleContext";
import { usePermissionCheck, getRedirectPath } from "../lib/permissions";

interface RouteGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ルートガードコンポーネント
 * ページアクセス時の権限チェックを行う
 */
export function RouteGuard({ children, fallback }: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tenantRoleContext = useTenantRoleContext();
  const groupRoleContext = useGroupRoleContext();
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

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
      setAccessDenied(true);

      // パスからgroupIdを抽出
      const pathSegments = pathname.split("/");
      const groupId = pathSegments[2]; // /main/[groupId]/[page] の [groupId] 部分

      // 権限に応じたリダイレクト先を取得
      const redirectPath = getRedirectPath(groupRole, groupId);
      router.replace(redirectPath);
    } else {
      setAccessDenied(false);
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
  ]);

  // 認証チェックが完了していない場合
  if (!isAuthChecked) {
    return fallback || null;
  }

  // ローディング中はフォールバックまたは何も表示しない
  if (isLoading) {
    return fallback || null;
  }

  // エラー時はフォールバックまたは何も表示しない
  if (hasError) {
    return fallback || null;
  }

  // アクセス権限チェックが完了していない場合
  if (!hasCheckedAccess) {
    return fallback || null;
  }

  // アクセス拒否された場合
  if (accessDenied) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            アクセス権限がありません
          </h3>
          <p className="text-gray-600 mb-4">
            このページにアクセスする権限がありません。
          </p>
          <button
            onClick={() => router.push("/main/chat")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            チャットに戻る
          </button>
        </div>
      </div>
    );
  }

  // 権限チェックが完了したら子コンポーネントを表示
  return <>{children}</>;
}

/**
 * ページレベルでの権限チェック用フック
 * 個別のページコンポーネントで使用
 */
export function useRouteGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const tenantRoleContext = useTenantRoleContext();
  const groupRoleContext = useGroupRoleContext();
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);

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
    const pathSegments = pathname.split("/");
    const pagePath = pathSegments[pathSegments.length - 1];
    const fullPagePath = `/${pagePath}`;

    // 権限チェック
    const accessResult = checkAccess(fullPagePath);
    setHasAccess(accessResult);

    if (!accessResult) {
      console.warn(`アクセス権限がありません: ${fullPagePath}`);

      // パスからgroupIdを抽出
      const pathSegments = pathname.split("/");
      const groupId = pathSegments[2]; // /main/[groupId]/[page] の [groupId] 部分

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
  ]);

  return {
    isLoading: isLoading || !isAuthChecked || !hasCheckedAccess,
    hasError,
    hasAccess,
    isAuthChecked,
  };
}
