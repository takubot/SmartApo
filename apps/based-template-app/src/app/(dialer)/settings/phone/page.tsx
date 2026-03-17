"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { TestTube, Wifi, WifiOff, Server, Users } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { usePhoneConfig } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

export default function PhoneSettingsPage() {
  const { data: config, isLoading, mutate } = usePhoneConfig();
  const [testing, setTesting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        freeswitchVersion?: string;
      }>("/settings/phone/test");
      if (res.data.success) {
        addToast({
          title: `FreeSWITCH接続成功 (${res.data.freeswitchVersion ?? ""})`,
          color: "success",
        });
        mutate();
      } else {
        addToast({
          title: `接続失敗: ${res.data.message}`,
          color: "danger",
        });
      }
    } catch {
      addToast({ title: "テストに失敗しました", color: "danger" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <PageHeader title="電話設定" description="FreeSWITCH PBXの接続状態" />

      <div className="max-w-2xl space-y-6">
        {/* 接続状態 */}
        <div className="flex items-center gap-2">
          {config?.eslConnected ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-red-400" />
          )}
          <span className="text-sm text-gray-600">ESL接続:</span>
          <Chip
            size="sm"
            color={config?.eslConnected ? "success" : "danger"}
            variant="flat"
          >
            {config?.eslConnected ? "接続中" : "未接続"}
          </Chip>
        </div>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">FreeSWITCH状態</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Server size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">SIPゲートウェイ</p>
                  <p className="text-sm font-medium">
                    {config?.sipGateway ?? "未設定"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">登録中ユーザー</p>
                  <p className="text-sm font-medium">
                    {config?.registeredUsers ?? 0}名
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
              <p className="text-xs font-medium text-gray-500">
                接続設定（環境変数から取得）
              </p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>
                  ESLホスト・ポート・パスワードはサーバー環境変数
                  <code className="bg-gray-200 px-1 rounded">
                    FREESWITCH_ESL_*
                  </code>
                  で設定します。
                </p>
                <p>
                  SIPゲートウェイ名は
                  <code className="bg-gray-200 px-1 rounded">
                    FREESWITCH_SIP_GATEWAY
                  </code>
                  で設定します。
                </p>
                <p>ユーザーのSIP内線番号はログイン時に自動採番されます。</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="flat"
                startContent={<TestTube size={16} />}
                isLoading={testing}
                onPress={handleTest}
              >
                接続テスト
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
