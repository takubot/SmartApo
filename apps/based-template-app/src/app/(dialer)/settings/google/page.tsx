// app/(dialer)/settings/google/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, Button, Spinner, Chip } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Unlink, BookUser, CalendarDays, Sheet } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useGoogleIntegrations } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

const FEATURES = [
  {
    icon: BookUser,
    label: "Google Contacts",
    description: "Google連絡先から架電先を同期",
  },
  {
    icon: CalendarDays,
    label: "Google Calendar",
    description: "コールバック予定をGoogleカレンダーに連携",
  },
  {
    icon: Sheet,
    label: "Google Sheets",
    description: "スプレッドシートからコールリストをインポート",
  },
];

const STATUS_LABELS: Record<string, string> = {
  connected: "接続済み",
  not_connected: "未接続",
  error: "エラー",
  token_expired: "トークン期限切れ",
};

const STATUS_COLORS: Record<
  string,
  "success" | "default" | "warning" | "danger"
> = {
  connected: "success",
  not_connected: "default",
  error: "danger",
  token_expired: "danger",
};

export default function GoogleSettingsPage() {
  const { data, isLoading, mutate } = useGoogleIntegrations();
  const [connecting, setConnecting] = useState(false);

  const handleOAuthMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data?.type !== "google-oauth-callback") return;

      const { code, state } = event.data;
      if (!code) return;

      try {
        await apiClient.post("/google/callback", {
          code,
          state,
          redirectUri: `${window.location.origin}/settings/google/callback`,
        });
        addToast({ title: "Google連携が完了しました", color: "success" });
        mutate();
      } catch {
        addToast({ title: "Google連携に失敗しました", color: "danger" });
      }
    },
    [mutate],
  );

  useEffect(() => {
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [handleOAuthMessage]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const integration = (data?.integrations ?? []).find(
    (i) => i.integrationType === "google",
  );
  const currentStatus = integration?.status ?? "not_connected";
  const isConnected =
    currentStatus === "connected" || currentStatus === "syncing";

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/settings/google/callback`;
      const res = await apiClient.get(
        `/google/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
      const popup = window.open(
        res.data.authUrl,
        "google-auth",
        "width=500,height=600,scrollbars=yes",
      );
      if (!popup) {
        addToast({
          title: "ポップアップがブロックされています。許可してください。",
          color: "warning",
        });
      }
    } catch {
      addToast({ title: "認証URLの取得に失敗しました", color: "danger" });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration) return;
    try {
      await apiClient.delete(`/google/${integration.integrationId}`);
      addToast({ title: "Google連携を解除しました", color: "success" });
      mutate();
    } catch {
      addToast({ title: "切断に失敗しました", color: "danger" });
    }
  };

  return (
    <div>
      <PageHeader
        title="Google連携"
        description="Googleアカウントを接続して各種サービスと連携"
      />

      <div className="max-w-2xl space-y-4">
        {/* 接続カード */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                  <GoogleLogo size={28} />
                </div>
                <div>
                  <p className="font-semibold text-base">Googleアカウント</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip
                      size="sm"
                      color={STATUS_COLORS[currentStatus] ?? "default"}
                      variant="flat"
                    >
                      {STATUS_LABELS[currentStatus] ?? currentStatus}
                    </Chip>
                  </div>
                </div>
              </div>

              {isConnected ? (
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  startContent={<Unlink size={14} />}
                  onPress={handleDisconnect}
                >
                  切断
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  {(currentStatus === "token_expired" ||
                    currentStatus === "error") && (
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      startContent={<Unlink size={14} />}
                      onPress={handleDisconnect}
                    >
                      切断
                    </Button>
                  )}
                  <Button
                    color="primary"
                    isLoading={connecting}
                    onPress={handleConnect}
                    startContent={
                      !connecting ? <GoogleLogo size={18} /> : undefined
                    }
                  >
                    {currentStatus === "token_expired" ||
                    currentStatus === "error"
                      ? "再接続"
                      : "Googleアカウントを接続"}
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* 利用可能な機能一覧 */}
        <Card shadow="sm">
          <CardBody className="p-6">
            <p className="text-sm font-semibold text-gray-700 mb-3">
              {isConnected ? "利用可能な機能" : "接続すると利用できる機能"}
            </p>
            <div className="space-y-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.label}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isConnected
                        ? "bg-green-50 border border-green-100"
                        : "bg-gray-50 border border-gray-100"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={
                        isConnected ? "text-green-600" : "text-gray-400"
                      }
                    />
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          isConnected ? "text-green-800" : "text-gray-600"
                        }`}
                      >
                        {feature.label}
                      </p>
                      <p className="text-xs text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
