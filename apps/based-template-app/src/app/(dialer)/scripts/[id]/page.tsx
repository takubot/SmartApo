// app/(dialer)/scripts/[id]/page.tsx
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
  Switch,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Save, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useScript } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";
import type { ScriptCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

export default function ScriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  const { data, isLoading } = useScript(isNew ? null : id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ScriptCreateSchemaType>({
    name: "",
    content: undefined,
    isDefault: false,
  });

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        content: data.content ?? undefined,
        isDefault: data.isDefault,
      });
    }
  }, [data]);

  if (!isNew && isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast({ title: "タイトルは必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await apiClient.post("/scripts", form);
        addToast({ title: "作成しました", color: "success" });
        router.replace(`/scripts/${res.data.scriptId}`);
      } else {
        await apiClient.put(`/scripts/${id}`, form);
        addToast({ title: "保存しました", color: "success" });
      }
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={isNew ? "新規スクリプト" : "スクリプト編集"}
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/scripts")}
          >
            一覧へ
          </Button>
        }
      />
      <div className="max-w-3xl space-y-6">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">スクリプト情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="タイトル"
              value={form.name}
              onValueChange={(v) => setForm((p) => ({ ...p, name: v }))}
              isRequired
            />
            <Switch
              isSelected={form.isDefault ?? false}
              onValueChange={(v) => setForm((p) => ({ ...p, isDefault: v }))}
            >
              デフォルトスクリプト
            </Switch>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">スクリプト内容</h3>
          </CardHeader>
          <CardBody>
            <Textarea
              placeholder="架電時のスクリプトを記入..."
              value={form.content ?? ""}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, content: v || undefined }))
              }
              minRows={12}
              classNames={{ input: "font-mono text-sm" }}
            />
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
            {isNew ? "作成" : "保存"}
          </Button>
        </div>
      </div>
    </div>
  );
}
