"use client";

import { ToastProvider } from "@heroui/react";
import React, { useEffect } from "react";

import Header from "./header";
import { initializeGlobalErrorToast } from "@common/errorHandler";

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // APIエラー（特に402リミット超過）を監視してトーストを表示
  useEffect(() => {
    initializeGlobalErrorToast();
  }, []);

  return (
    <>
      <ToastProvider placement="bottom-right" />
      <div className="flex flex-col h-screen bg-gray-100">
        {/* Header に currentPage, workspaces, selectedGroup を渡す */}
        <Header />

        {/* メインコンテンツ領域 */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </>
  );
}
