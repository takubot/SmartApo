// app/(dialer)/users/[id]/page.tsx
"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Input,
  Select,
  SelectItem,
  Divider,
  addToast,
} from "@heroui/react";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/dialer";
import { useUser } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

const STATUS_OPTIONS = [
  { value: "offline", label: "オフライン" },
  { value: "available", label: "待機中" },
  { value: "on_call", label: "通話中" },
  { value: "wrap_up", label: "後処理" },
  { value: "on_break", label: "休憩" },
  { value: "lunch", label: "ランチ" },
];

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: user, isLoading, mutate } = useUser(id);

  const [displayName, setDisplayName] = useState("");
  const [extension, setExtension] = useState("");
  const [status, setStatus] = useState("");
  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState("1");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // データ読み込み後にフォーム初期化
  if (user && !initialized) {
    setDisplayName(user.displayName);
    setExtension(user.extension ?? "");
    setStatus(user.status);
    setMaxConcurrentCalls(String(user.maxConcurrentCalls));
    setInitialized(true);
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/users/${id}`, {
        display_name: displayName,
        extension: extension || null,
        max_concurrent_calls: Number(maxConcurrentCalls),
      });
      // ステータスが変更された場合は別エンドポイント
      if (status !== user?.status) {
        await apiClient.put(`/users/${id}/status`, { status });
      }
      await mutate();
      addToast({ title: "保存しました", color: "success" });
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await apiClient.delete(`/users/${id}`);
      addToast({ title: "ユーザーを削除しました", color: "success" });
      router.push("/users");
    } catch {
      addToast({ title: "削除に失敗しました", color: "danger" });
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-gray-500">
        ユーザーが見つかりません
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={user.displayName}
        description={`内線: ${user.extension ?? "未設定"}`}
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/users")}
          >
            一覧へ
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* 基本情報カード */}
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">基本情報</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input
              label="表示名"
              value={displayName}
              onValueChange={setDisplayName}
              isRequired
            />
            <Input
              label="内線番号"
              value={extension}
              onValueChange={setExtension}
              description="SIP内線番号（例: 1001）"
            />
            <Select
              label="ステータス"
              selectedKeys={status ? [status] : []}
              onSelectionChange={(keys) => {
                const val = Array.from(keys)[0];
                if (val) setStatus(String(val));
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value}>{opt.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="最大同時通話数"
              type="number"
              value={maxConcurrentCalls}
              onValueChange={setMaxConcurrentCalls}
              min={1}
              max={10}
            />
          </CardBody>
        </Card>

        {/* 現在のステータス */}
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">現在の状態</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">ステータス</dt>
                <dd>
                  <StatusBadge status={user.status} category="user" />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Firebase UID</dt>
                <dd className="font-mono text-xs break-all">
                  {user.firebaseUid}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">登録日時</dt>
                <dd>{new Date(user.createdAt).toLocaleString("ja-JP")}</dd>
              </div>
              <div>
                <dt className="text-gray-500">最終更新</dt>
                <dd>{new Date(user.updatedAt).toLocaleString("ja-JP")}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {/* アクションボタン */}
        <div className="flex justify-between">
          <Button
            color="danger"
            variant={confirmDelete ? "solid" : "flat"}
            startContent={<Trash2 size={16} />}
            isLoading={deleting}
            onPress={handleDelete}
          >
            {confirmDelete ? "本当に削除する" : "ユーザーを削除"}
          </Button>
          {confirmDelete && (
            <Button variant="flat" onPress={() => setConfirmDelete(false)}>
              キャンセル
            </Button>
          )}
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isLoading={saving}
            onPress={handleSave}
            isDisabled={!displayName.trim()}
          >
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
