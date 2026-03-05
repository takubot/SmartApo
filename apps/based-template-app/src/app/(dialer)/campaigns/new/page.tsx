// app/(dialer)/campaigns/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Button,
  Divider,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import apiClient from "@/lib/apiClient";
import type { CampaignCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

const WEEKDAYS = [
  { value: 0, label: "月" },
  { value: 1, label: "火" },
  { value: 2, label: "水" },
  { value: 3, label: "木" },
  { value: 4, label: "金" },
  { value: 5, label: "土" },
  { value: 6, label: "日" },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignCreateSchemaType>({
    name: "",
    description: undefined,
    maxConcurrentCalls: 10,
    predictiveRatio: "1.20",
    maxAbandonRate: "3.00",
    dailyStartTime: "09:00:00",
    dailyEndTime: "18:00:00",
    activeDays: [0, 1, 2, 3, 4],
    maxAttemptsPerContact: 3,
    retryIntervalMinutes: 30,
    ringTimeoutSeconds: 30,
    wrapUpSeconds: 30,
    callerId: undefined,
  });

  const updateField = <K extends keyof CampaignCreateSchemaType>(
    key: K,
    value: CampaignCreateSchemaType[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      addToast({ title: "キャンペーン名は必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post("/campaigns", form);
      addToast({ title: "キャンペーンを作成しました", color: "success" });
      router.push(`/campaigns/${res.data.campaignId}`);
    } catch {
      addToast({ title: "作成に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="新規キャンペーン"
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.back()}
          >
            戻る
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">
        {/* 基本情報 */}
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">基本情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="キャンペーン名"
              placeholder="例: 2026年3月新規開拓"
              value={form.name}
              onValueChange={(v) => updateField("name", v)}
              isRequired
            />
            <Textarea
              label="説明"
              placeholder="キャンペーンの説明"
              value={form.description ?? ""}
              onValueChange={(v) => updateField("description", v || undefined)}
            />
            <Input
              label="発信者番号"
              placeholder="+81XXXXXXXXXX"
              value={form.callerId ?? ""}
              onValueChange={(v) => updateField("callerId", v || undefined)}
            />
          </CardBody>
        </Card>

        {/* 架電設定 */}
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">架電設定</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="最大同時通話数"
                value={String(form.maxConcurrentCalls)}
                onValueChange={(v) =>
                  updateField("maxConcurrentCalls", Number(v) || 1)
                }
              />
              <Input
                label="プレディクティブ倍率"
                value={String(form.predictiveRatio)}
                onValueChange={(v) => updateField("predictiveRatio", v)}
              />
            </div>
            <Input
              label="放棄率上限 (%)"
              value={String(form.maxAbandonRate)}
              onValueChange={(v) => updateField("maxAbandonRate", v)}
            />
            <Divider />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                label="架電開始時刻"
                value={form.dailyStartTime?.slice(0, 5)}
                onValueChange={(v) => updateField("dailyStartTime", v + ":00")}
              />
              <Input
                type="time"
                label="架電終了時刻"
                value={form.dailyEndTime?.slice(0, 5)}
                onValueChange={(v) => updateField("dailyEndTime", v + ":00")}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">稼働曜日</p>
              <div className="flex gap-2">
                {WEEKDAYS.map((d) => {
                  const days = (form.activeDays ?? []) as number[];
                  const active = days.includes(d.value);
                  return (
                    <Button
                      key={d.value}
                      size="sm"
                      variant={active ? "solid" : "flat"}
                      color={active ? "primary" : "default"}
                      onPress={() =>
                        updateField(
                          "activeDays",
                          active
                            ? days.filter((x) => x !== d.value)
                            : [...days, d.value].sort(),
                        )
                      }
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </div>
            </div>
            <Divider />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="最大試行回数"
                value={String(form.maxAttemptsPerContact)}
                onValueChange={(v) =>
                  updateField("maxAttemptsPerContact", Number(v) || 3)
                }
              />
              <Input
                type="number"
                label="リトライ間隔(分)"
                value={String(form.retryIntervalMinutes)}
                onValueChange={(v) =>
                  updateField("retryIntervalMinutes", Number(v) || 30)
                }
              />
              <Input
                type="number"
                label="呼出タイムアウト(秒)"
                value={String(form.ringTimeoutSeconds)}
                onValueChange={(v) =>
                  updateField("ringTimeoutSeconds", Number(v) || 30)
                }
              />
              <Input
                type="number"
                label="後処理時間(秒)"
                value={String(form.wrapUpSeconds)}
                onValueChange={(v) =>
                  updateField("wrapUpSeconds", Number(v) || 30)
                }
              />
            </div>
          </CardBody>
        </Card>

        {/* 保存 */}
        <div className="flex justify-end">
          <Button
            color="primary"
            size="lg"
            startContent={<Save size={16} />}
            isLoading={saving}
            onPress={handleSubmit}
          >
            キャンペーンを作成
          </Button>
        </div>
      </div>
    </div>
  );
}
