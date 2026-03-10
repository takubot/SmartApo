// app/(dialer)/settings/twilio/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Spinner,
  Chip,
  Switch,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, TestTube, Link2 } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useTwilioConfig } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";
import type { TwilioConfigSchemaType } from "@repo/api-contracts/based_template/zschema";
import { updateSetupStatus } from "@/lib/setupStatus";

export default function TwilioSettingsPage() {
  const { data: config, isLoading, mutate } = useTwilioConfig();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const [form, setForm] = useState<TwilioConfigSchemaType>({
    accountSid: "",
    authToken: "",
    twimlAppSid: undefined,
    phoneNumbers: undefined,
    defaultCallerId: undefined,
    recordingEnabled: true,
  });

  useEffect(() => {
    if (config) {
      setForm({
        accountSid: config.accountSid ?? "",
        authToken: "",
        twimlAppSid: config.twimlAppSid ?? undefined,
        phoneNumbers: config.phoneNumbers ?? undefined,
        defaultCallerId: config.defaultCallerId ?? undefined,
        recordingEnabled: config.recordingEnabled,
      });
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put("/settings/twilio", form);
      addToast({ title: "保存しました", color: "success" });
      mutate();
      if (form.accountSid) updateSetupStatus({ twilioAccount: true });
      if (form.defaultCallerId) updateSetupStatus({ twilioPhoneNumber: true });
      if (apiBaseUrl) updateSetupStatus({ twilioWebhook: true });
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await apiClient.post("/settings/twilio/test");
      if (res.data.success) {
        addToast({ title: "接続成功", color: "success" });
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
      <PageHeader title="Twilio設定" description="Twilioアカウントの接続設定" />

      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">接続状態:</span>
          <Chip
            size="sm"
            color={config?.accountSid ? "success" : "warning"}
            variant="flat"
          >
            {config?.accountSid ? "設定済み" : "未設定"}
          </Chip>
        </div>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">アカウント情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="Account SID"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.accountSid}
              onValueChange={(v) => setForm((p) => ({ ...p, accountSid: v }))}
            />
            <Input
              label="Auth Token"
              type="password"
              placeholder="設定済みの場合は空欄のまま"
              value={form.authToken}
              onValueChange={(v) => setForm((p) => ({ ...p, authToken: v }))}
            />
            <Input
              label="TwiML App SID"
              placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.twimlAppSid ?? ""}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, twimlAppSid: v || undefined }))
              }
            />
            <Input
              label="デフォルト発信者番号"
              placeholder="+81XXXXXXXXXX"
              value={form.defaultCallerId ?? ""}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, defaultCallerId: v || undefined }))
              }
            />
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-2">
              <p className="text-xs font-medium text-gray-500">
                Webhook URL（環境変数から自動設定）
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400">Voice URL</p>
                <p className="text-xs font-mono text-gray-600">
                  {apiBaseUrl}/v2/dialer/webhooks/twilio/voice
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-400">Status Callback URL</p>
                <p className="text-xs font-mono text-gray-600">
                  {apiBaseUrl}/v2/dialer/webhooks/twilio/status
                </p>
              </div>
              <p className="text-[11px] text-gray-400">
                NEXT_PUBLIC_API_URL 環境変数から取得されます
              </p>
            </div>
            <Switch
              isSelected={form.recordingEnabled}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, recordingEnabled: v }))
              }
            >
              通話録音を有効にする
            </Switch>
            <div className="flex gap-3 justify-end">
              <Button
                variant="flat"
                startContent={<TestTube size={16} />}
                isLoading={testing}
                onPress={handleTest}
              >
                接続テスト
              </Button>
              <Button
                color="primary"
                startContent={<Save size={16} />}
                isLoading={saving}
                onPress={handleSave}
              >
                保存
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
