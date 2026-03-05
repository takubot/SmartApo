// app/(dialer)/call-lists/new/page.tsx
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
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import apiClient from "@/lib/apiClient";
import type { CallListCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

export default function NewCallListPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CallListCreateSchemaType>({
    name: "",
    description: undefined,
  });

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      addToast({ title: "リスト名は必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post("/call-lists", form);
      addToast({ title: "リストを作成しました", color: "success" });
      router.push(`/call-lists/${res.data.callListId}`);
    } catch {
      addToast({ title: "作成に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="新規コールリスト"
        actions={
          <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => router.back()}>
            戻る
          </Button>
        }
      />
      <div className="max-w-2xl">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">リスト情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="リスト名"
              value={form.name}
              onValueChange={(v) => setForm((p) => ({ ...p, name: v }))}
              isRequired
            />
            <Textarea
              label="説明"
              value={form.description ?? ""}
              onValueChange={(v) => setForm((p) => ({ ...p, description: v || undefined }))}
            />
            <div className="flex justify-end">
              <Button
                color="primary"
                startContent={<Save size={16} />}
                isLoading={saving}
                onPress={handleSubmit}
              >
                作成
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
