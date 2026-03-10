// app/(dialer)/contacts/new/page.tsx
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
import type { ContactCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

export default function NewContactPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ContactCreateSchemaType>({
    lastName: "",
    firstName: "",
    phonePrimary: "",
    lastNameKana: undefined,
    firstNameKana: undefined,
    companyName: undefined,
    department: undefined,
    position: undefined,
    phoneSecondary: undefined,
    phoneMobile: undefined,
    email: undefined,
    postalCode: undefined,
    prefecture: undefined,
    city: undefined,
    addressLine: undefined,
    notes: undefined,
    tags: undefined,
  });

  const updateField = <K extends keyof ContactCreateSchemaType>(
    key: K,
    value: ContactCreateSchemaType[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.lastName.trim() || !form.firstName.trim()) {
      addToast({ title: "姓名は必須です", color: "warning" });
      return;
    }
    if (!form.phonePrimary.trim()) {
      addToast({ title: "電話番号は必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post("/contacts", form);
      addToast({ title: "コンタクトを登録しました", color: "success" });
      router.push("/contacts");
    } catch {
      addToast({ title: "登録に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="新規コンタクト"
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
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="姓"
                value={form.lastName}
                onValueChange={(v) => updateField("lastName", v)}
                isRequired
              />
              <Input
                label="名"
                value={form.firstName}
                onValueChange={(v) => updateField("firstName", v)}
                isRequired
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="姓（カナ）"
                value={form.lastNameKana ?? ""}
                onValueChange={(v) =>
                  updateField("lastNameKana", v || undefined)
                }
              />
              <Input
                label="名（カナ）"
                value={form.firstNameKana ?? ""}
                onValueChange={(v) =>
                  updateField("firstNameKana", v || undefined)
                }
              />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">連絡先</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="電話番号（メイン）"
              placeholder="09012345678"
              value={form.phonePrimary}
              onValueChange={(v) => updateField("phonePrimary", v)}
              isRequired
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="電話番号（サブ）"
                value={form.phoneSecondary ?? ""}
                onValueChange={(v) =>
                  updateField("phoneSecondary", v || undefined)
                }
              />
              <Input
                label="携帯電話"
                value={form.phoneMobile ?? ""}
                onValueChange={(v) =>
                  updateField("phoneMobile", v || undefined)
                }
              />
            </div>
            <Input
              label="メールアドレス"
              type="email"
              value={form.email ?? ""}
              onValueChange={(v) => updateField("email", v || undefined)}
            />
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">所属情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="会社名"
              value={form.companyName ?? ""}
              onValueChange={(v) => updateField("companyName", v || undefined)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="部署"
                value={form.department ?? ""}
                onValueChange={(v) => updateField("department", v || undefined)}
              />
              <Input
                label="役職"
                value={form.position ?? ""}
                onValueChange={(v) => updateField("position", v || undefined)}
              />
            </div>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">その他</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Textarea
              label="メモ"
              value={form.notes ?? ""}
              onValueChange={(v) => updateField("notes", v || undefined)}
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
