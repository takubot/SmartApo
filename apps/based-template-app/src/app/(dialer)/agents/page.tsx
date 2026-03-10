// app/(dialer)/agents/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Monitor } from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/dialer";
import { useAgents } from "@/hooks/dialer/useDialerSwr";
import type { AgentResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type AgentRow = AgentResponseSchemaType & { id: string };

const columns: Column<AgentRow>[] = [
  { key: "displayName", label: "エージェント名" },
  { key: "userId", label: "ユーザーID" },
  {
    key: "status",
    label: "ステータス",
    render: (item) => <StatusBadge status={item.status} category="agent" />,
  },
  { key: "extension", label: "内線" },
];

export default function AgentsPage() {
  const router = useRouter();
  const { data, isLoading } = useAgents();

  const rows: AgentRow[] = (data ?? []).map((item) => ({
    ...item,
    id: item.agentId,
  }));

  return (
    <div>
      <PageHeader
        title="エージェント"
        description="エージェントの管理"
        createHref="/agents/new"
        createLabel="新規エージェント"
        actions={
          <Button
            variant="flat"
            color="primary"
            startContent={<Monitor size={16} />}
            onPress={() => router.push("/agents/status-board")}
          >
            ステータスボード
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyTitle="エージェントがいません"
        emptyDescription="エージェントを追加してください"
      />
    </div>
  );
}
