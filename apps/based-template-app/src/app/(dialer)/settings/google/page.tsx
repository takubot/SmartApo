// app/(dialer)/settings/google/page.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Button,
  Spinner,
  Chip,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { RefreshCw, Link2, Unlink } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useGoogleIntegrations } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

const INTEGRATION_LABELS: Record<string, string> = {
  contacts: "Google Contacts",
  calendar: "Google Calendar",
  gmail: "Gmail",
  sheets: "Google Sheets",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "接続済み",
  not_connected: "未接続",
  syncing: "同期中",
  error: "エラー",
  token_expired: "トークン期限切れ",
};

export default function GoogleSettingsPage() {
  const { data, isLoading, mutate } = useGoogleIntegrations();
  const [connecting, setConnecting] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleConnect = async (type: string) => {
    setConnecting(type);
    try {
      const res = await apiClient.get(`/google/auth-url?type=${type}`);
      window.open(res.data.authUrl, "_blank", "width=500,height=600");
    } catch {
      addToast({ title: "認証URLの取得に失敗しました", color: "danger" });
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (type: string) => {
    try {
      await apiClient.post(`/google/sync?type=${type}`);
      addToast({ title: "同期を開始しました", color: "success" });
      mutate();
    } catch {
      addToast({ title: "同期に失敗しました", color: "danger" });
    }
  };

  const handleDisconnect = async (type: string) => {
    try {
      await apiClient.delete(`/google/disconnect?type=${type}`);
      addToast({ title: "切断しました", color: "success" });
      mutate();
    } catch {
      addToast({ title: "切断に失敗しました", color: "danger" });
    }
  };

  const integrations = data?.integrations ?? [];

  return (
    <div>
      <PageHeader
        title="Google連携"
        description="Googleサービスとの連携設定"
      />

      <div className="max-w-2xl space-y-4">
        {["contacts", "calendar", "gmail", "sheets"].map((type) => {
          const integration = integrations.find(
            (i) => i.integrationType === type,
          );
          const isConnected = integration?.status === "connected";

          return (
            <Card key={type} shadow="sm">
              <CardBody className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Link2 size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {INTEGRATION_LABELS[type] ?? type}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Chip
                        size="sm"
                        color={isConnected ? "success" : "default"}
                        variant="flat"
                      >
                        {STATUS_LABELS[integration?.status ?? "not_connected"] ?? integration?.status}
                      </Chip>
                      {integration?.lastSyncedAt && (
                        <span className="text-xs text-gray-400">
                          最終同期:{" "}
                          {new Date(integration.lastSyncedAt).toLocaleString(
                            "ja-JP",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<RefreshCw size={14} />}
                        onPress={() => handleSync(type)}
                      >
                        同期
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        startContent={<Unlink size={14} />}
                        onPress={() => handleDisconnect(type)}
                      >
                        切断
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      color="primary"
                      startContent={<Link2 size={14} />}
                      isLoading={connecting === type}
                      onPress={() => handleConnect(type)}
                    >
                      接続
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
