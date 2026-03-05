// app/(dialer)/contacts/import/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Divider } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Upload, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/dialer";
import apiClient from "@/lib/apiClient";
import type { BulkOperationResultType } from "@repo/api-contracts/based_template/zschema";

export default function ImportContactsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkOperationResultType | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiClient.post("/contacts/import/csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
      addToast({ title: "インポートが完了しました", color: "success" });
    } catch {
      addToast({ title: "インポートに失敗しました", color: "danger" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="CSVインポート"
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/contacts")}
          >
            コンタクト一覧
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">CSVファイル形式</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-600 mb-3">
              以下の列を含むCSVファイルをアップロードしてください。
            </p>
            <code className="block bg-gray-100 p-3 rounded text-xs">
              last_name, first_name, phone_primary, email, company_name, notes
            </code>
          </CardBody>
        </Card>

        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">ファイル選択</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <FileSpreadsheet size={40} className="mx-auto text-gray-400 mb-3" />
              {file ? (
                <p className="text-sm font-medium text-gray-700">{file.name}</p>
              ) : (
                <p className="text-sm text-gray-500">
                  クリックしてCSVファイルを選択
                </p>
              )}
            </div>

            <Button
              color="primary"
              startContent={<Upload size={16} />}
              isLoading={uploading}
              isDisabled={!file}
              onPress={handleUpload}
              className="w-full"
            >
              インポート開始
            </Button>
          </CardBody>
        </Card>

        {result && (
          <Card shadow="sm">
            <CardHeader>
              <h3 className="text-sm font-semibold">インポート結果</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {result.successCount + result.errorCount}
                  </p>
                  <p className="text-xs text-gray-500">総件数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {result.successCount}
                  </p>
                  <p className="text-xs text-gray-500">成功</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {result.errorCount}
                  </p>
                  <p className="text-xs text-gray-500">失敗</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded text-xs text-red-700 max-h-32 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
              <Divider className="my-3" />
              <Button
                variant="flat"
                className="w-full"
                onPress={() => router.push("/contacts")}
              >
                コンタクト一覧を確認
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
