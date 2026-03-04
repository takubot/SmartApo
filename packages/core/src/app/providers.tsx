// app/providers.tsx
"use client";

import React from "react";
import { HeroUIProvider } from "@heroui/react";
import { TenantRoleProvider } from "../context/role";
import { usePathname } from "next/navigation";

// 内部ユーザー用のProvider（認証が必要）
function InternalProviders({ children }: { children: React.ReactNode }) {
  return <TenantRoleProvider>{children}</TenantRoleProvider>;
}

// 外部ユーザー用のProvider（認証不要）
function ExternalProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 認証不要のパス（ログインページ、パスワードリセットページなど）
  const isAuthFreePath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/resetPassword") ||
    pathname.startsWith("/entryUuid") ||
    // 例: /{entryUuid}/chatScript や /{entryUuid}/fullChat は外部ウィジェット用
    /^\/[^/]+\/chatScript(\b|\/|\?|#)/.test(pathname) ||
    /^\/[^/]+\/fullChat(\b|\/|\?|#)/.test(pathname) ||
    // LINE ミニアプリ用ページも外部ユーザー向け
    /^\/[^/]+\/LINE(\b|\/|\?|#)/.test(pathname);

  return (
    <HeroUIProvider>
      {isAuthFreePath ? (
        <ExternalProviders>{children}</ExternalProviders>
      ) : (
        <InternalProviders>{children}</InternalProviders>
      )}
    </HeroUIProvider>
  );
}
