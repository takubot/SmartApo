// app/(dialer)/agents/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Input, Button } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import apiClient from "@/lib/apiClient";
import { useAuth } from "@/app/providers";
import type { AgentCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

export default function NewAgentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<AgentCreateSchemaType>({
    displayName: "",
    userId: user?.uid ?? "",
    extension: undefined,
    skills: undefined,
    maxConcurrentCalls: 1,
  });

  const updateField = <K extends keyof AgentCreateSchemaType>(
    key: K,
    value: AgentCreateSchemaType[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.displayName.trim()) {
      addToast({ title: "表示名は必須です", color: "warning" });
      return;
    }
    if (!form.userId.trim()) {
      addToast({ title: "ユーザーIDは必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/agents", form);
      addToast({ title: "エージェントを登録しました", color: "success" });
      router.push("/agents");
    } catch {
      addToast({ title: "登録に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="新規エージェント"
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
      <div className="max-w-2xl space-y-6">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">基本情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="表示名"
              placeholder="山田 太郎"
              value={form.displayName}
              onValueChange={(v) => updateField("displayName", v)}
              isRequired
            />
            <Input
              label="ユーザーID"
              description="ログイン中のユーザーIDが自動入力されます"
              value={form.userId}
              onValueChange={(v) => updateField("userId", v)}
              isRequired
            />
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">オプション</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="内線番号"
              placeholder="1001"
              value={form.extension ?? ""}
              onValueChange={(v) => updateField("extension", v || undefined)}
            />
            <Input
              label="スキル"
              placeholder="営業, サポート（カンマ区切り）"
              value={form.skills?.join(", ") ?? ""}
              onValueChange={(v) =>
                updateField(
                  "skills",
                  v
                    ? v
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : undefined,
                )
              }
            />
            <Input
              label="最大同時通話数"
              type="number"
              value={String(form.maxConcurrentCalls ?? 1)}
              onValueChange={(v) =>
                updateField("maxConcurrentCalls", Number(v) || 1)
              }
            />
            <div className="flex justify-end pt-2">
              <Button
                color="primary"
                startContent={<Save size={16} />}
                isLoading={saving}
                onPress={handleSubmit}
              >
                登録
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
