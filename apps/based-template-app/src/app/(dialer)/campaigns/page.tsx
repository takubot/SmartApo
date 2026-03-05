// app/(dialer)/campaigns/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, DataTable, StatusBadge, type Column } from "@/components/dialer";
import { useCampaigns } from "@/hooks/dialer/useDialerSwr";
import type { CampaignResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type CampaignRow = CampaignResponseSchemaType & { id: string };

const columns: Column<CampaignRow>[] = [
  { key: "name", label: "キャンペーン名" },
  {
    key: "status",
    label: "ステータス",
    render: (item) => <StatusBadge status={item.status} category="campaign" />,
  },
  {
    key: "progress",
    label: "進捗",
    render: (item) => (
      <span className="text-sm">
        {item.completedContacts} / {item.totalContacts}
      </span>
    ),
  },
  {
    key: "answerRate",
    label: "応答率",
    render: (item) => {
      const rate = item.totalCalls > 0 ? item.totalAnswered / item.totalCalls : 0;
      return `${(rate * 100).toFixed(1)}%`;
    },
  },
  {
    key: "createdAt",
    label: "作成日",
    render: (item) =>
      new Date(item.createdAt).toLocaleDateString("ja-JP"),
  },
];

export default function CampaignsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCampaigns(page);

  const rows: CampaignRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.campaignId,
  }));

  return (
    <div>
      <PageHeader
        title="キャンペーン"
        description="架電キャンペーンの管理"
        createHref="/campaigns/new"
        createLabel="新規キャンペーン"
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/campaigns/${item.id}`)}
        emptyTitle="キャンペーンがありません"
        emptyDescription="新しいキャンペーンを作成して架電を開始しましょう"
        emptyCreateHref="/campaigns/new"
      />
    </div>
  );
}
