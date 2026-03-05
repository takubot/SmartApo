// app/(dialer)/contacts/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Button } from "@heroui/react";
import { Search, Upload } from "lucide-react";
import { PageHeader, DataTable, type Column } from "@/components/dialer";
import { useContacts } from "@/hooks/dialer/useDialerSwr";
import type { ContactResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type ContactRow = ContactResponseSchemaType & { id: string };

const columns: Column<ContactRow>[] = [
  {
    key: "name",
    label: "氏名",
    render: (item) => `${item.lastName} ${item.firstName}`,
  },
  { key: "phonePrimary", label: "電話番号" },
  { key: "companyName", label: "会社名" },
  { key: "status", label: "ステータス" },
  {
    key: "createdAt",
    label: "登録日",
    render: (item) => new Date(item.createdAt).toLocaleDateString("ja-JP"),
  },
];

export default function ContactsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data, isLoading } = useContacts(page, 20, query);

  const rows: ContactRow[] = (data?.items ?? []).map((item) => ({
    ...item,
    id: item.contactId,
  }));

  const handleSearch = () => {
    setQuery(search);
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="コンタクト"
        description="架電先の管理"
        createHref="/contacts/new"
        createLabel="新規登録"
        actions={
          <Button
            variant="flat"
            startContent={<Upload size={16} />}
            onPress={() => router.push("/contacts/import")}
          >
            CSVインポート
          </Button>
        }
      />

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="氏名・電話番号・会社名で検索"
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          startContent={<Search size={16} className="text-gray-400" />}
          className="max-w-md"
        />
        <Button color="primary" variant="flat" onPress={handleSearch}>
          検索
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        page={page}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        onRowClick={(item) => router.push(`/contacts/${item.id}`)}
        emptyTitle="コンタクトがありません"
        emptyDescription="新しいコンタクトを登録するかCSVでインポートしてください"
        emptyCreateHref="/contacts/new"
      />
    </div>
  );
}
