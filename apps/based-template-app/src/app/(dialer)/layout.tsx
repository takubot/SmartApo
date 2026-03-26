// app/(dialer)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { DialerSidebar } from "@/components/dialer";
import Softphone from "@/components/dialer/Softphone";
import { useAuth } from "../providers";
import { useCurrentUser, useSipConfig } from "@/hooks/dialer/useDialerSwr";
import type { SipConfig } from "@/hooks/dialer/useWebRTCPhone";

export default function DialerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // ログインユーザーを自動作成・取得
  useCurrentUser(user?.displayName);

  // SIP設定を取得
  const { data: sipConfigData } = useSipConfig();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const sipConfig: SipConfig | null = sipConfigData
    ? {
        wssUrl: sipConfigData.wssUrl,
        extension: sipConfigData.extension,
        password: sipConfigData.password,
        domain: sipConfigData.domain,
        autoAnswer: sipConfigData.autoAnswer,
      }
    : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DialerSidebar />
      <main className="flex-1 ml-60 p-6 transition-all duration-200">
        {children}
      </main>
      {sipConfig && <Softphone sipConfig={sipConfig} />}
    </div>
  );
}
