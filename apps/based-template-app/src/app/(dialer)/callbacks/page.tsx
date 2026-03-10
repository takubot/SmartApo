// app/(dialer)/callbacks/page.tsx
"use client";

import { useState } from "react";
import { Chip } from "@heroui/react";
import { PageHeader, DataTable, type Column } from "@/components/dialer";
import { useCallbacks } from "@/hooks/dialer/useDialerSwr";
import type { CallbackResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type CallbackRow = CallbackResponseSchemaType & { id: string };

const PRIORITY_COLORS: Record<string, "danger" | "warning" | "default"> = {
  high: "danger",
  urgent: "danger",
  medium: "warning",
  low: "default",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "緊急",
  high: "高",
  medium: "中",
  low: "低",
};

const columns: Column<CallbackRow>[] = [
  { key: "contactId", label: "連絡先ID" },
  {
    key: "scheduledAt",
    label: "予定日時",
    render: (item) =>
      new Date(item.scheduledAt).toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
  },
  {
    key: "priority",
    label: "優先度",
    render: (item) => (
      <Chip
        size="sm"
        color={PRIORITY_COLORS[item.priority] ?? "default"}
        variant="flat"
      >
        {PRIORITY_LABELS[item.priority] ?? item.priority}
      </Chip>
    ),
  },
  {
    key: "isCompleted",
    label: "状態",
    render: (item) =>
      item.isCompleted ? (
        <Chip size="sm" color="success" variant="flat">
          完了
        </Chip>
      ) : (
        <Chip size="sm" color="warning" variant="flat">
          未完了
        </Chip>
      ),
  },
  { key: "notes", label: "メモ" },
];

export default function CallbacksPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCallbacks(page);

  const rows: CallbackRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.callbackId,
  }));

  return (
    <div>
      <PageHeader title="コールバック" description="折り返し架電の管理" />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        emptyTitle="コールバックはありません"
      />
    </div>
  );
}
