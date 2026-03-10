// app/(dialer)/call-logs/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/dialer";
import { useCallLogs } from "@/hooks/dialer/useDialerSwr";
import type { CallLogResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type CallLogRow = CallLogResponseSchemaType & { id: string };

const columns: Column<CallLogRow>[] = [
  { key: "contactId", label: "連絡先ID" },
  { key: "phoneNumberDialed", label: "電話番号" },
  {
    key: "callStatus",
    label: "結果",
    render: (item) => <StatusBadge status={item.callStatus} category="call" />,
  },
  {
    key: "durationSeconds",
    label: "通話時間",
    render: (item) => {
      const m = Math.floor(item.durationSeconds / 60);
      const s = item.durationSeconds % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    },
  },
  {
    key: "initiatedAt",
    label: "日時",
    render: (item) =>
      item.initiatedAt
        ? new Date(item.initiatedAt).toLocaleString("ja-JP", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
  },
];

export default function CallLogsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCallLogs(page);

  const rows: CallLogRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.callLogId,
  }));

  return (
    <div>
      <PageHeader title="通話ログ" description="架電履歴の確認" />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/call-logs/${item.id}`)}
        emptyTitle="通話ログがありません"
      />
    </div>
  );
}
