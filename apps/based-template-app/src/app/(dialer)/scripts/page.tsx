// app/(dialer)/scripts/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable, type Column } from "@/components/dialer";
import { useScripts } from "@/hooks/dialer/useDialerSwr";
import type { ScriptResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type ScriptRow = ScriptResponseSchemaType & { id: string };

const columns: Column<ScriptRow>[] = [
  { key: "name", label: "タイトル" },
  {
    key: "version",
    label: "バージョン",
    render: (item) => `v${item.version}`,
    align: "center",
  },
  {
    key: "isDefault",
    label: "状態",
    render: (item) => (
      <span
        className={`text-xs font-medium ${item.isDefault ? "text-green-600" : "text-gray-400"}`}
      >
        {item.isDefault ? "デフォルト" : "-"}
      </span>
    ),
  },
  {
    key: "updatedAt",
    label: "更新日",
    render: (item) => new Date(item.updatedAt).toLocaleDateString("ja-JP"),
  },
];

export default function ScriptsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useScripts(page);

  const rows: ScriptRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.scriptId,
  }));

  return (
    <div>
      <PageHeader
        title="スクリプト"
        description="架電スクリプトの管理"
        createHref="/scripts/new"
        createLabel="新規スクリプト"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/scripts/${item.id}`)}
        emptyTitle="スクリプトがありません"
        emptyCreateHref="/scripts/new"
      />
    </div>
  );
}
