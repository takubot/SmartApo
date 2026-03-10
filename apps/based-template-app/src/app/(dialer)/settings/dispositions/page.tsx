// app/(dialer)/settings/dispositions/page.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Switch,
  useDisclosure,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Plus, GripVertical, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useDispositions } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";
import type {
  DispositionResponseSchemaType,
  DispositionCreateSchemaType,
} from "@repo/api-contracts/based_template/zschema";

const DISPOSITION_TYPES = [
  { value: "positive", label: "成功" },
  { value: "negative", label: "不達" },
  { value: "neutral", label: "保留" },
  { value: "unreachable", label: "架電不可" },
  { value: "system", label: "システム" },
];

interface DispositionForm {
  name: string;
  dispositionType: string;
  requiresCallback: boolean;
  isFinal: boolean;
  displayOrder: number;
  colorCode: string;
}

const DEFAULT_FORM: DispositionForm = {
  name: "",
  dispositionType: "positive",
  requiresCallback: false,
  isFinal: false,
  displayOrder: 0,
  colorCode: "",
};

export default function DispositionsSettingsPage() {
  const { data, isLoading, mutate } = useDispositions();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [form, setForm] = useState<DispositionForm>(DEFAULT_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dispositions = (data?.items ?? []) as DispositionResponseSchemaType[];

  const openNew = () => {
    setForm(DEFAULT_FORM);
    setEditId(null);
    onOpen();
  };

  const openEdit = (item: DispositionResponseSchemaType) => {
    setForm({
      name: item.name,
      dispositionType: item.dispositionType,
      requiresCallback: item.requiresCallback,
      isFinal: item.isFinal,
      displayOrder: item.displayOrder,
      colorCode: item.colorCode ?? "",
    });
    setEditId(item.dispositionId);
    onOpen();
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body: DispositionCreateSchemaType = {
        name: form.name,
        dispositionType: form.dispositionType,
        requiresCallback: form.requiresCallback,
        isFinal: form.isFinal,
        displayOrder: form.displayOrder,
        colorCode: form.colorCode || undefined,
      };
      if (editId) {
        await apiClient.put(`/dispositions/${editId}`, body);
      } else {
        await apiClient.post("/dispositions", body);
      }
      addToast({ title: "保存しました", color: "success" });
      onOpenChange();
      mutate();
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/dispositions/${id}`);
      addToast({ title: "削除しました", color: "success" });
      mutate();
    } catch {
      addToast({ title: "削除に失敗しました", color: "danger" });
    }
  };

  return (
    <div>
      <PageHeader
        title="架電結果設定"
        description="コール結果（Disposition）の管理"
        actions={
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            onPress={openNew}
          >
            追加
          </Button>
        }
      />

      <div className="max-w-2xl">
        <Card shadow="sm">
          <CardBody className="p-0">
            {dispositions.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                架電結果が設定されていません
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {dispositions.map((d) => (
                  <div
                    key={d.dispositionId}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={14} className="text-gray-300" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-gray-400">
                          {DISPOSITION_TYPES.find(
                            (t) => t.value === d.dispositionType,
                          )?.label ?? d.dispositionType}
                          {d.requiresCallback && " | 折返し必須"}
                          {d.isFinal && " | 最終結果"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        isIconOnly
                        variant="light"
                        onPress={() => openEdit(d)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        size="sm"
                        isIconOnly
                        variant="light"
                        color="danger"
                        onPress={() => handleDelete(d.dispositionId)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>
                {editId ? "架電結果を編集" : "架電結果を追加"}
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="名前"
                  value={form.name}
                  onValueChange={(v) => setForm((p) => ({ ...p, name: v }))}
                  isRequired
                />
                <Select
                  label="タイプ"
                  selectedKeys={[form.dispositionType]}
                  onSelectionChange={(keys) => {
                    const val = Array.from(keys)[0] as string;
                    if (val) setForm((p) => ({ ...p, dispositionType: val }));
                  }}
                >
                  {DISPOSITION_TYPES.map((t) => (
                    <SelectItem key={t.value}>{t.label}</SelectItem>
                  ))}
                </Select>
                <Switch
                  isSelected={form.requiresCallback}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, requiresCallback: v }))
                  }
                >
                  折返し必須
                </Switch>
                <Switch
                  isSelected={form.isFinal}
                  onValueChange={(v) => setForm((p) => ({ ...p, isFinal: v }))}
                >
                  最終結果
                </Switch>
                <Input
                  label="表示順"
                  type="number"
                  value={String(form.displayOrder)}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, displayOrder: Number(v) || 0 }))
                  }
                />
                <Input
                  label="カラーコード"
                  placeholder="#FF0000"
                  value={form.colorCode}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, colorCode: v }))
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  キャンセル
                </Button>
                <Button color="primary" isLoading={saving} onPress={handleSave}>
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
