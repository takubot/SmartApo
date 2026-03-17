// app/(dialer)/users/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tooltip,
  Snippet,
  addToast,
  useDisclosure,
} from "@heroui/react";
import { Monitor, Plus, Trash2 } from "lucide-react";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/dialer";
import { useUsers, type DialerUserType } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

type UserRow = DialerUserType & { id: string };

interface CreatedCredentials {
  email: string;
  password: string;
  displayName: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useUsers();
  const createModal = useDisclosure();
  const credentialModal = useDisclosure();

  // 追加フォーム
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newExtension, setNewExtension] = useState("");
  const [creating, setCreating] = useState(false);

  // 作成後の認証情報表示
  const [createdCreds, setCreatedCreds] = useState<CreatedCredentials | null>(
    null,
  );

  // 削除
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewExtension("");
  };

  const handleCreate = async (onClose: () => void) => {
    if (!newEmail.trim() || !newPassword.trim() || !newName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post("/users", {
        email: newEmail.trim(),
        password: newPassword.trim(),
        display_name: newName.trim(),
        extension: newExtension.trim() || null,
      });
      await mutate();
      // 認証情報を保持してからフォームを閉じる
      setCreatedCreds({
        email: newEmail.trim(),
        password: newPassword.trim(),
        displayName: newName.trim(),
      });
      resetForm();
      onClose();
      // 認証情報モーダルを開く
      credentialModal.onOpen();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? String(
              (err as { response?: { data?: { detail?: string } } }).response
                ?.data?.detail ?? "追加に失敗しました",
            )
          : "追加に失敗しました";
      addToast({ title: msg, color: "danger" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (deletingId === userId) {
      try {
        await apiClient.delete(`/users/${userId}`);
        await mutate();
        addToast({ title: "ユーザーを削除しました", color: "success" });
      } catch {
        addToast({ title: "削除に失敗しました", color: "danger" });
      } finally {
        setDeletingId(null);
      }
    } else {
      setDeletingId(userId);
      setTimeout(
        () => setDeletingId((prev) => (prev === userId ? null : prev)),
        3000,
      );
    }
  };

  const columns: Column<UserRow>[] = [
    { key: "displayName", label: "ユーザー名" },
    { key: "extension", label: "内線" },
    {
      key: "status",
      label: "ステータス",
      render: (item) => <StatusBadge status={item.status} category="user" />,
    },
    {
      key: "actions",
      label: "",
      width: 60,
      align: "center",
      render: (item) => (
        <Tooltip
          content={deletingId === item.id ? "もう一度押して削除" : "削除"}
          color={deletingId === item.id ? "danger" : "default"}
        >
          <Button
            isIconOnly
            size="sm"
            variant={deletingId === item.id ? "solid" : "light"}
            color="danger"
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={14} />
          </Button>
        </Tooltip>
      ),
    },
  ];

  const rows: UserRow[] = (data ?? []).map((item) => ({
    ...item,
    id: item.userId,
  }));

  return (
    <div>
      <PageHeader
        title="ユーザー"
        description="ログインユーザーは自動で登録されます"
        actions={
          <>
            <Button
              variant="flat"
              color="primary"
              startContent={<Monitor size={16} />}
              onPress={() => router.push("/users/status-board")}
            >
              ステータスボード
            </Button>
            <Button
              color="primary"
              startContent={<Plus size={16} />}
              onPress={createModal.onOpen}
            >
              ユーザー追加
            </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        onRowClick={(item) => router.push(`/users/${item.id}`)}
        emptyTitle="ユーザーがいません"
        emptyDescription="ダイヤラーにアクセスすると自動で登録されます"
      />

      {/* 追加モーダル */}
      <Modal
        isOpen={createModal.isOpen}
        onOpenChange={createModal.onOpenChange}
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>ユーザー追加</ModalHeader>
              <ModalBody className="space-y-3">
                <Input
                  label="メールアドレス"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onValueChange={setNewEmail}
                  isRequired
                  autoFocus
                />
                <Input
                  label="パスワード"
                  type="password"
                  placeholder="6文字以上"
                  value={newPassword}
                  onValueChange={setNewPassword}
                  isRequired
                />
                <Input
                  label="表示名"
                  placeholder="山田 太郎"
                  value={newName}
                  onValueChange={setNewName}
                  isRequired
                />
                <Input
                  label="内線番号（任意）"
                  placeholder="空欄で自動採番"
                  value={newExtension}
                  onValueChange={setNewExtension}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  キャンセル
                </Button>
                <Button
                  color="primary"
                  isLoading={creating}
                  isDisabled={
                    !newEmail.trim() || !newPassword.trim() || !newName.trim()
                  }
                  onPress={() => handleCreate(onClose)}
                >
                  追加
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 作成完了 — ログイン情報表示モーダル */}
      <Modal
        isOpen={credentialModal.isOpen}
        onOpenChange={credentialModal.onOpenChange}
        placement="center"
        isDismissable={false}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>ユーザーを作成しました</ModalHeader>
              <ModalBody className="space-y-4">
                <p className="text-sm text-gray-600">
                  以下のログイン情報をユーザーに共有してください。
                  パスワードはこの画面を閉じると再表示できません。
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">表示名</p>
                    <p className="text-sm font-medium">
                      {createdCreds?.displayName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      メールアドレス
                    </p>
                    <Snippet
                      size="sm"
                      variant="flat"
                      symbol=""
                      className="w-full"
                    >
                      {createdCreds?.email ?? ""}
                    </Snippet>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">パスワード</p>
                    <Snippet
                      size="sm"
                      variant="flat"
                      symbol=""
                      className="w-full"
                    >
                      {createdCreds?.password ?? ""}
                    </Snippet>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  onPress={() => {
                    setCreatedCreds(null);
                    onClose();
                  }}
                >
                  閉じる
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
