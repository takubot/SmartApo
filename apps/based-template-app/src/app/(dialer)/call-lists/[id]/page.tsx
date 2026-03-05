// app/(dialer)/call-lists/[id]/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Spinner } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import { useCallList } from "@/hooks/dialer/useDialerSwr";

export default function CallListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: list, isLoading } = useCallList(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!list) {
    return <div className="text-center py-20 text-gray-500">リストが見つかりません</div>;
  }

  return (
    <div>
      <PageHeader
        title={list.name}
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/call-lists")}
          >
            一覧へ
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">リスト情報</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">リスト名</dt>
                <dd className="font-medium">{list.name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">登録件数</dt>
                <dd className="font-medium">{list.contactCount}件</dd>
              </div>
              {list.source && (
                <div>
                  <dt className="text-gray-500">インポート元</dt>
                  <dd className="font-medium">{list.source}</dd>
                </div>
              )}
              {list.description && (
                <div className="col-span-2">
                  <dt className="text-gray-500">説明</dt>
                  <dd className="font-medium">{list.description}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">作成日</dt>
                <dd className="font-medium">
                  {new Date(list.createdAt).toLocaleString("ja-JP")}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">更新日</dt>
                <dd className="font-medium">
                  {new Date(list.updatedAt).toLocaleString("ja-JP")}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
