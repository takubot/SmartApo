// app/(dialer)/dnc/page.tsx
"use client";

import { useState } from "react";
import {
  Input,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { Plus } from "lucide-react";
import { PageHeader, DataTable, type Column } from "@/components/dialer";
import { useDncList } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";
import type { DncResponseSchemaType, DncCreateSchemaType } from "@repo/api-contracts/based_template/zschema";

type DncRow = DncResponseSchemaType & { id: string };

const columns: Column<DncRow>[] = [
  { key: "phoneNumber", label: "電話番号" },
  { key: "reason", label: "理由" },
  {
    key: "createdAt",
    label: "登録日",
    render: (item) => new Date(item.createdAt).toLocaleDateString("ja-JP"),
  },
];

export default function DncPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, mutate } = useDncList(page);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const rows: DncRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.dncId,
  }));

  const handleAdd = async () => {
    if (!phone.trim()) return;
    setSaving(true);
    try {
      const body: DncCreateSchemaType = { phoneNumber: phone, reason: reason || undefined };
      await apiClient.post("/dnc", body);
      addToast({ title: "DNCに追加しました", color: "success" });
      setPhone("");
      setReason("");
      onOpenChange();
      mutate();
    } catch {
      addToast({ title: "追加に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="DNCリスト"
        description="架電禁止番号の管理"
        actions={
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            onPress={onOpen}
          >
            番号追加
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="DNCリストは空です"
        emptyDescription="架電禁止番号を追加してください"
      />

      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>DNC番号追加</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="電話番号"
                  placeholder="09012345678"
                  value={phone}
                  onValueChange={setPhone}
                  isRequired
                />
                <Textarea
                  label="理由"
                  placeholder="登録理由"
                  value={reason}
                  onValueChange={setReason}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  キャンセル
                </Button>
                <Button
                  color="primary"
                  isLoading={saving}
                  onPress={handleAdd}
                >
                  追加
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
