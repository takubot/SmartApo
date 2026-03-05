// app/(dialer)/call-lists/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable, type Column } from "@/components/dialer";
import { useCallLists } from "@/hooks/dialer/useDialerSwr";
import type { CallListResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type CallListRow = CallListResponseSchemaType & { id: string };

const columns: Column<CallListRow>[] = [
  { key: "name", label: "リスト名" },
  { key: "description", label: "説明" },
  { key: "contactCount", label: "件数", align: "center" },
  {
    key: "createdAt",
    label: "作成日",
    render: (item) => new Date(item.createdAt).toLocaleDateString("ja-JP"),
  },
];

export default function CallListsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCallLists(page);

  const rows: CallListRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.callListId,
  }));

  return (
    <div>
      <PageHeader
        title="コールリスト"
        description="架電対象リストの管理"
        createHref="/call-lists/new"
        createLabel="新規リスト"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/call-lists/${item.id}`)}
        emptyTitle="コールリストがありません"
        emptyCreateHref="/call-lists/new"
      />
    </div>
  );
}
