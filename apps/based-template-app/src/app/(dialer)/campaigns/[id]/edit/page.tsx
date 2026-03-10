// app/(dialer)/campaigns/[id]/edit/page.tsx
"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Button,
  Spinner,
  Divider,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useCampaign } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";
import type { CampaignUpdateSchemaType } from "@repo/api-contracts/based_template/zschema";

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];

export default function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CampaignUpdateSchemaType>({});

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        description: campaign.description ?? null,
        maxConcurrentCalls: campaign.maxConcurrentCalls,
        predictiveRatio: campaign.predictiveRatio,
        dailyStartTime: campaign.dailyStartTime,
        dailyEndTime: campaign.dailyEndTime,
        activeDays: campaign.activeDays ?? null,
        maxAbandonRate: campaign.maxAbandonRate,
        maxAttemptsPerContact: campaign.maxAttemptsPerContact,
        retryIntervalMinutes: campaign.retryIntervalMinutes,
        ringTimeoutSeconds: campaign.ringTimeoutSeconds,
        wrapUpSeconds: campaign.wrapUpSeconds,
        callListId: campaign.callListId ?? null,
        scriptId: campaign.scriptId ?? null,
        callerId: campaign.callerId ?? null,
      });
    }
  }, [campaign]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const updateField = <K extends keyof CampaignUpdateSchemaType>(
    key: K,
    value: CampaignUpdateSchemaType[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/campaigns/${id}`, form);
      addToast({ title: "保存しました", color: "success" });
      router.push(`/campaigns/${id}`);
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="キャンペーン編集"
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
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">基本情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="キャンペーン名"
              value={form.name ?? ""}
              onValueChange={(v) => updateField("name", v)}
              isRequired
            />
            <Textarea
              label="説明"
              value={form.description ?? ""}
              onValueChange={(v) => updateField("description", v)}
            />
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">架電設定</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                label="最大同時通話数"
                value={String(form.maxConcurrentCalls ?? 10)}
                onValueChange={(v) =>
                  updateField("maxConcurrentCalls", Number(v))
                }
              />
              <Input
                label="プレディクティブ倍率"
                value={String(form.predictiveRatio ?? "1.20")}
                onValueChange={(v) => updateField("predictiveRatio", v)}
              />
            </div>
            <Divider />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                label="開始時刻"
                value={form.dailyStartTime ?? "09:00"}
                onValueChange={(v) => updateField("dailyStartTime", v)}
              />
              <Input
                type="time"
                label="終了時刻"
                value={form.dailyEndTime ?? "18:00"}
                onValueChange={(v) => updateField("dailyEndTime", v)}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">稼働曜日</p>
              <div className="flex gap-2">
                {WEEKDAYS.map((d, i) => {
                  const days = (form.activeDays ?? []) as number[];
                  const active = days.includes(i);
                  return (
                    <Button
                      key={i}
                      size="sm"
                      variant={active ? "solid" : "flat"}
                      color={active ? "primary" : "default"}
                      onPress={() =>
                        updateField(
                          "activeDays",
                          active
                            ? days.filter((x) => x !== i)
                            : [...days, i].sort(),
                        )
                      }
                    >
                      {d}
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
                value={String(form.maxAttemptsPerContact ?? 3)}
                onValueChange={(v) =>
                  updateField("maxAttemptsPerContact", Number(v))
                }
              />
              <Input
                type="number"
                label="リトライ間隔(分)"
                value={String(form.retryIntervalMinutes ?? 30)}
                onValueChange={(v) =>
                  updateField("retryIntervalMinutes", Number(v))
                }
              />
              <Input
                type="number"
                label="呼出タイムアウト(秒)"
                value={String(form.ringTimeoutSeconds ?? 30)}
                onValueChange={(v) =>
                  updateField("ringTimeoutSeconds", Number(v))
                }
              />
              <Input
                type="number"
                label="後処理時間(秒)"
                value={String(form.wrapUpSeconds ?? 30)}
                onValueChange={(v) => updateField("wrapUpSeconds", Number(v))}
              />
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-end">
          <Button
            color="primary"
            size="lg"
            startContent={<Save size={16} />}
            isLoading={saving}
            onPress={handleSave}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
