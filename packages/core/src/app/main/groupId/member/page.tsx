// app/(group)/member-management/page.tsx
"use client";

import { onAuthStateChanged } from "firebase/auth";
import { Edit, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { LoadingScreen } from "@common/LoadingScreen";
import { auth } from "@lib/firebase";
import { useGroupContext } from "../layout-client";
import { useRoleContext } from "../../../../context/role/useRoleContext";
import { TenantAdminAddMemberModal } from "./components/TenantAdminAddMemberModal";
import { EmailInviteModal } from "./components/EmailInviteModal";

/* ==== HeroUI ==== */
import { Alert } from "@heroui/alert";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Badge, Button, Checkbox, Input, Spinner } from "@heroui/react";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";

/* ==== API Contracts ==== */
import {
  delete_user_from_group_v2_user_to_group_delete__group_id___user_id__delete,
  list_group_users_v2_user_to_group_list__group_id__get,
  list_users_v2_user_list_get,
  update_user_in_group_v2_user_to_group_update__group_id___user_id__put,
} from "@repo/api-contracts/based_template/service";
import type { UserToGroupUpdateRequestSchemaType } from "@repo/api-contracts/based_template/zschema";

/* ─────────────────── 型定義 ─────────────────── */
export type Role = "GROUP_OWNER" | "GROUP_MANAGER" | "GROUP_MEMBER";

interface User {
  user_id: string;
  username?: string;
  email?: string;
  role: Role;
}

interface Group {
  groupId: string;
  groupName: string;
  groupDescription?: string;
  tag: string;
  members: User[];
}

/* ─────────────────── ラベル & バッジ色 ─────────────────── */
const roleLabelJa: Record<Role, string> = {
  GROUP_OWNER: "オーナー",
  GROUP_MANAGER: "マネージャー",
  GROUP_MEMBER: "メンバー",
};

const roleBadgeColor: Record<Role, "secondary" | "warning" | "success"> = {
  GROUP_OWNER: "secondary",
  GROUP_MANAGER: "warning",
  GROUP_MEMBER: "success",
};

/* ─────────────────── コンポーネント ─────────────────── */
export function MemberManagementPage() {
  /* ===== context ===== */
  const groupId = useGroupContext();
  const { isTenantAdmin } = useRoleContext();

  /* ===== SWR fetchers ===== */
  const allUsersFetcher = async () => {
    try {
      return await list_users_v2_user_list_get();
    } catch (error) {
      throw new Error("全ユーザーデータの取得に失敗しました");
    }
  };

  const groupUsersFetcher = async (groupId: string) => {
    try {
      return await list_group_users_v2_user_to_group_list__group_id__get(
        groupId,
      );
    } catch (error) {
      throw new Error("グループデータの取得に失敗しました");
    }
  };

  /* ===== SWR hooks ===== */
  const {
    data: allUsersData = [],
    error: allUsersError,
    isLoading: isAllUsersLoading,
  } = useSWR("all-users", allUsersFetcher);

  const {
    data: groupUsersData,
    error: groupUsersError,
    isLoading: isGroupLoading,
    mutate: mutateGroupData,
  } = useSWR(groupId ? `group-users-${groupId}` : null, () =>
    groupUsersFetcher(groupId!),
  );

  /* ===== local state ===== */
  const [group, setGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);

  // add member
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEmailInviteModalOpen, setIsEmailInviteModalOpen] = useState(false);

  // edit member
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // delete member
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ===== サーバーデータ → ローカル ===== */
  useEffect(() => {
    if (groupUsersData?.userListInGroup) {
      const mapped: Group = {
        groupId: groupId!,
        groupName: "グループ内メンバー", // グループ名は別途取得が必要
        groupDescription: undefined,
        tag: "",
        members: groupUsersData.userListInGroup.map((m: any) => ({
          user_id: m.userId,
          username: m.userName ?? undefined,
          email: m.email ?? undefined,
          role: m.groupRole as Role,
        })),
      };
      setGroup(mapped);
    }
  }, [groupUsersData, groupId]);

  /* ===== 追加可能ユーザー ===== */
  const availableUsers = useMemo<User[]>(() => {
    if (!group || !Array.isArray(allUsersData)) return [];
    const mapped = allUsersData.map((u: any) => ({
      user_id: u.userId,
      username: u.userName ?? undefined,
      email: u.email ?? undefined,
      role: "GROUP_MEMBER" as Role,
    }));
    return mapped.filter(
      (u: User) => !group.members.some((m) => m.user_id === u.user_id),
    );
  }, [allUsersData, group]);

  /* ===== CSVファイル処理 ===== */
  const validateRole = (role: string): boolean => {
    return [
      "GROUP_OWNER",
      "GROUP_MANAGER",
      "GROUP_MEMBER",
      "オーナー",
      "マネージャー",
      "メンバー",
    ].includes(role);
  };

  // API値を日本語ロール名に変換（プレビュー用）
  const convertApiRoleToJapanese = (apiRole: string): string => {
    const roleMap: { [key: string]: string } = {
      GROUP_OWNER: "オーナー",
      GROUP_MANAGER: "マネージャー",
      GROUP_MEMBER: "メンバー",
    };
    return roleMap[apiRole] || "メンバー";
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("CSVファイルを選択してください");
      return;
    }

    setCsvFile(file);
    setIsProcessingCsv(true);

    Papa.parse(file, {
      header: false,
      encoding: "UTF-8",
      complete: (results) => {
        try {
          const data = results.data as string[][];

          if (data.length === 0) {
            setError("CSVファイルが空です");
            setIsProcessingCsv(false);
            return;
          }

          const headers = data[0];
          if (
            !headers ||
            headers.length !== 2 ||
            headers[0] !== "ユーザーID" ||
            headers[1] !== "権限"
          ) {
            setError(
              "CSVのヘッダーが正しくありません。「ユーザーID」「権限」の順序で作成してください。",
            );
            setIsProcessingCsv(false);
            return;
          }

          const processedData = data
            .slice(1)
            .filter((row) => row.length >= 2 && row[0] && row[1])
            .map((row, index) => {
              const userId = row[0]?.trim() || "";
              const role = row[1]?.trim() || "";
              const errors: string[] = [];

              if (!userId) {
                errors.push("ユーザーIDが空です");
              }

              if (!role) {
                errors.push("権限が空です");
              } else if (!validateRole(role)) {
                errors.push(
                  "無効な権限です（オーナー、マネージャー、メンバー のいずれかを入力してください）",
                );
              }

              if (userId && group?.members.some((m) => m.user_id === userId)) {
                errors.push("既にグループに参加済みのユーザーです");
              }

              return {
                userId,
                role,
                isValid: errors.length === 0,
                errors,
              };
            });

          setCsvData(processedData);
        } catch (error) {
          setError("CSVファイルの処理中にエラーが発生しました");
        } finally {
          setIsProcessingCsv(false);
        }
      },
      error: (error) => {
        setError(`CSVファイルの読み込みに失敗しました: ${error.message}`);
        setIsProcessingCsv(false);
      },
    });
  };

  /* ===== toast error ===== */
  useEffect(() => {
    if (groupUsersError) {
      handleErrorWithUI(groupUsersError, "グループデータ取得", setError);
    }
    if (allUsersError) {
      handleErrorWithUI(allUsersError, "ユーザーデータ取得", setError);
    }
  }, [groupUsersError, allUsersError]);

  /* ===== 検索機能 ===== */
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = useMemo(() => {
    if (!group?.members) return [];
    if (!searchTerm) return group.members;

    const term = searchTerm.toLowerCase();
    return group.members.filter(
      (member) =>
        member.username?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.user_id.toLowerCase().includes(term),
    );
  }, [group?.members, searchTerm]);

  /* ===== 一括選択機能 ===== */
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(),
  );
  const [isAllSelected, setIsAllSelected] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(
        new Set(filteredMembers.map((member) => member.user_id)),
      );
    } else {
      setSelectedMemberIds(new Set());
    }
    setIsAllSelected(checked);
  };

  const handleSelectMember = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedMemberIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedMemberIds(newSelected);
    setIsAllSelected(newSelected.size === filteredMembers.length);
  };

  /* ===== Firebaseユーザー情報 ===== */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  /* ===== 一括削除機能 ===== */
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // 自分自身の削除を防ぐフィルター
  const deletableMemberIds = useMemo(() => {
    return new Set(
      Array.from(selectedMemberIds).filter(
        (memberId) => memberId !== currentUserId,
      ),
    );
  }, [selectedMemberIds, currentUserId]);

  const handleBulkDelete = async () => {
    if (deletableMemberIds.size === 0 || isBulkDeleting) return;

    // モーダルを即時に閉じる
    const idsToDelete = Array.from(deletableMemberIds);
    const skippedCount = selectedMemberIds.size - deletableMemberIds.size;
    setIsBulkDeleteModalOpen(false);

    setIsBulkDeleting(true);
    try {
      const deletePromises = idsToDelete.map((userId) =>
        delete_user_from_group_v2_user_to_group_delete__group_id___user_id__delete(
          groupId!,
          userId,
        ),
      );

      await Promise.all(deletePromises);
      await mutateGroupData();
      setSelectedMemberIds(new Set());
      setIsAllSelected(false);

      let message = `${deletePromises.length}人のメンバーを削除しました。`;
      if (skippedCount > 0) {
        message += ` (自分自身は削除できないためスキップしました)`;
      }

      showSuccessToast(`メンバー一括削除 (${deletePromises.length}件)`);
    } catch (e: unknown) {
      handleErrorWithUI(e, "メンバー一括削除", setError);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /* ===== CSVアップロード用 state ===== */
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<
    Array<{
      userId: string;
      role: string;
      isValid: boolean;
      errors: string[];
    }>
  >([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ===== メンバー更新 ===== */
  const handleUpdateMember = async () => {
    if (!groupId || !editingMember || isUpdating) return;

    setIsUpdating(true);
    try {
      const requestData: UserToGroupUpdateRequestSchemaType = {
        groupRole: editingMember.role,
      };

      await update_user_in_group_v2_user_to_group_update__group_id___user_id__put(
        groupId,
        editingMember.user_id,
        requestData,
      );

      await mutateGroupData();
      setIsEditModalOpen(false);

      showSuccessToast("メンバー更新");
    } catch (e: unknown) {
      handleErrorWithUI(e, "メンバー更新", setError);
    } finally {
      setIsUpdating(false);
    }
  };

  /* ===== メンバー削除 ===== */
  const handleDeleteMember = async () => {
    if (!groupId || !memberToDelete || isDeleting) return;

    // モーダルを先に閉じる
    const targetMember = memberToDelete;
    setIsDeleteModalOpen(false);

    setIsDeleting(true);
    try {
      await delete_user_from_group_v2_user_to_group_delete__group_id___user_id__delete(
        groupId,
        targetMember.user_id,
      );

      await mutateGroupData();

      showSuccessToast("メンバー削除");
    } catch (e: unknown) {
      handleErrorWithUI(e, "メンバー削除", setError);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ===== loading / error 表示 ===== */
  if (isGroupLoading || isAllUsersLoading) {
    return <LoadingScreen />;
  }

  if (!group) {
    const message = groupUsersError
      ? "グループデータの取得に失敗しました。"
      : "有効なグループを選択してください。";
    const color = groupUsersError ? "danger" : "warning";
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="bordered" color={color} className="max-w-md">
          <div className="font-bold mb-1">エラー!</div>
          <p>{message}</p>
        </Alert>
      </div>
    );
  }

  /* ─────────────────── JSX ─────────────────── */
  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                メンバー管理
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto py-8 max-w-5xl">
          {/* group header */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-2">
              {group.groupName}
            </h2>
            <p className="text-gray-600 mb-4">
              {group.groupDescription || "説明はありません"}
            </p>
            <Badge
              color="primary"
              variant="flat"
              className="text-sm uppercase tracking-wide"
            >
              {group.tag}
            </Badge>
          </div>

          {/* error alert */}
          {error && (
            <div className="mb-6">
              <Alert variant="bordered" color="danger" className="relative">
                <div className="font-bold mb-1">エラー!</div>
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="absolute top-2 right-2 text-danger"
                  aria-label="閉じる"
                >
                  <X size={20} />
                </button>
              </Alert>
            </div>
          )}

          {/* member table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-6 border-b border-default-200 gap-4">
              <h3 className="text-lg font-semibold text-gray-800">
                グループメンバー
              </h3>

              {/* 検索とアクションボタン */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* 検索バー */}
                <Input
                  placeholder="メンバーを検索..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  startContent={<Search size={16} />}
                  className="w-full sm:w-64"
                  size="sm"
                />

                {/* アクションボタン */}
                <div className="flex gap-2">
                  {selectedMemberIds.size > 0 && (
                    <Button
                      color="danger"
                      variant="solid"
                      size="sm"
                      startContent={<Trash2 size={16} />}
                      onPress={() => setIsBulkDeleteModalOpen(true)}
                    >
                      選択削除 ({selectedMemberIds.size})
                    </Button>
                  )}

                  <Button
                    color="primary"
                    variant="solid"
                    size="sm"
                    startContent={<UserPlus size={16} />}
                    onPress={() => {
                      if (isTenantAdmin) {
                        setIsAddModalOpen(true);
                      } else {
                        setIsEmailInviteModalOpen(true);
                      }
                    }}
                  >
                    追加
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 overflow-x-auto">
              <Table
                aria-label="メンバーリスト"
                shadow="none"
                className="min-w-full border-0"
              >
                <TableHeader>
                  <TableColumn>
                    <Checkbox
                      isSelected={isAllSelected}
                      onValueChange={handleSelectAll}
                      aria-label="全選択"
                    />
                  </TableColumn>
                  <TableColumn>ユーザー名</TableColumn>
                  <TableColumn>メール</TableColumn>
                  <TableColumn>権限</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell>
                        <Checkbox
                          isSelected={selectedMemberIds.has(member.user_id)}
                          onValueChange={(checked) =>
                            handleSelectMember(member.user_id, checked)
                          }
                          aria-label={`${member.username || member.user_id}を選択`}
                        />
                      </TableCell>
                      <TableCell>{member.username || "未設定"}</TableCell>
                      <TableCell>{member.email || "未設定"}</TableCell>
                      <TableCell>
                        <Badge
                          color={roleBadgeColor[member.role]}
                          variant="flat"
                          className="capitalize"
                        >
                          {roleLabelJa[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex gap-2">
                        <Button
                          variant="light"
                          color="primary"
                          onPress={() => {
                            setEditingMember(member);
                            setIsEditModalOpen(true);
                          }}
                          isIconOnly
                          size="sm"
                          aria-label="編集"
                          startContent={<Edit size={16} />}
                        />
                        <Button
                          variant="light"
                          color="danger"
                          onPress={() => {
                            setMemberToDelete(member);
                            setIsDeleteModalOpen(true);
                          }}
                          isIconOnly
                          size="sm"
                          aria-label="削除"
                          startContent={<Trash2 size={16} />}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* tenant admin add member modal */}
          <TenantAdminAddMemberModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            groupId={groupId!}
            availableUsers={availableUsers}
            onSuccess={() => {
              mutateGroupData();
              showSuccessToast("メンバー追加");
            }}
            onError={setError}
          />

          {/* email invite modal */}
          <EmailInviteModal
            isOpen={isEmailInviteModalOpen}
            onClose={() => setIsEmailInviteModalOpen(false)}
            groupId={groupId!}
            onSuccess={() => {
              mutateGroupData();
              showSuccessToast("メンバー招待");
            }}
            onError={setError}
          />

          {/* edit member modal */}
          <Modal
            isOpen={isEditModalOpen && !!editingMember}
            onClose={() => setIsEditModalOpen(false)}
            size="lg"
          >
            <ModalContent>
              <ModalHeader>メンバー編集</ModalHeader>
              <ModalBody>
                {editingMember && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="edit_username"
                        className="block text-sm font-medium mb-1"
                      >
                        ユーザー名
                      </label>
                      <Input
                        id="edit_username"
                        value={editingMember.username || ""}
                        isReadOnly
                        className="bg-default-100"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit_email"
                        className="block text-sm font-medium mb-1"
                      >
                        メール
                      </label>
                      <Input
                        id="edit_email"
                        value={editingMember.email || ""}
                        isReadOnly
                        className="bg-default-100"
                      />
                    </div>
                    <div>
                      <label
                        id="edit_role_label"
                        htmlFor="edit_role"
                        className="block text-sm font-medium mb-1"
                      >
                        権限
                      </label>
                      <Select
                        id="edit_role"
                        aria-labelledby="edit_role_label"
                        selectedKeys={new Set([editingMember.role])}
                        onSelectionChange={(keys) => {
                          const [key] = Array.from(keys);
                          setEditingMember({
                            ...editingMember,
                            role: key as Role,
                          });
                        }}
                      >
                        <SelectItem key="GROUP_OWNER" textValue="オーナー">
                          オーナー
                        </SelectItem>
                        <SelectItem key="GROUP_MEMBER" textValue="メンバー">
                          メンバー
                        </SelectItem>
                      </Select>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  color="default"
                  onPress={() => setIsEditModalOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="solid"
                  color="primary"
                  onPress={handleUpdateMember}
                  isDisabled={isUpdating}
                >
                  {isUpdating ? <Spinner size="sm" /> : "保存"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* delete confirm modal */}
          <Modal
            isOpen={isDeleteModalOpen && !!memberToDelete}
            onClose={() => setIsDeleteModalOpen(false)}
            size="lg"
          >
            <ModalContent>
              <ModalHeader>削除の確認</ModalHeader>
              <ModalBody>
                {memberToDelete && (
                  <p className="text-sm text-default-600 mb-2">
                    <span className="font-medium">
                      {memberToDelete.username || memberToDelete.user_id}
                    </span>{" "}
                    をこのグループから削除してもよろしいですか？
                    この操作は取り消せません。
                  </p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  color="default"
                  onPress={() => setIsDeleteModalOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="solid"
                  color="danger"
                  onPress={handleDeleteMember}
                  isDisabled={isDeleting}
                >
                  {isDeleting ? <Spinner size="sm" /> : "削除"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* 一括削除確認モーダル */}
          <Modal
            isOpen={isBulkDeleteModalOpen}
            onClose={() => setIsBulkDeleteModalOpen(false)}
            size="lg"
          >
            <ModalContent>
              <ModalHeader>一括削除の確認</ModalHeader>
              <ModalBody>
                <p className="text-sm text-default-600">
                  選択した{" "}
                  <span className="font-bold">{selectedMemberIds.size}人</span>{" "}
                  のメンバーをグループから削除してもよろしいですか？
                  この操作は取り消せません。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  color="default"
                  onPress={() => setIsBulkDeleteModalOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  variant="solid"
                  color="danger"
                  onPress={handleBulkDelete}
                  isDisabled={isBulkDeleting}
                >
                  {isBulkDeleting ? <Spinner size="sm" /> : "一括削除"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* CSV一括追加モーダル */}
          <Modal
            size="4xl"
            isOpen={isCsvModalOpen}
            onClose={() => setIsCsvModalOpen(false)}
          >
            <ModalContent>
              <ModalHeader>CSV一括追加</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  {/* ファイル選択 */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      CSVファイルを選択
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ヘッダー行：「ユーザーID」「権限」（この順序で固定）
                      <br />
                      権限は「オーナー」「マネージャー」「メンバー」のいずれかを入力
                    </p>
                  </div>

                  {/* プレビュー */}
                  {isProcessingCsv && (
                    <div className="flex items-center justify-center py-8">
                      <Spinner size="lg" />
                      <span className="ml-2">ファイルを処理しています...</span>
                    </div>
                  )}

                  {csvData.length > 0 && !isProcessingCsv && (
                    <div>
                      <h3 className="text-lg font-medium mb-2">プレビュー</h3>
                      <div className="max-h-64 overflow-auto border border-default-200 rounded-lg">
                        <Table aria-label="CSVプレビュー" shadow="none">
                          <TableHeader>
                            <TableColumn>ユーザーID</TableColumn>
                            <TableColumn>権限</TableColumn>
                            <TableColumn>状態</TableColumn>
                          </TableHeader>
                          <TableBody>
                            {csvData.map((item, index) => (
                              <TableRow
                                key={index}
                                className={!item.isValid ? "bg-danger-50" : ""}
                              >
                                <TableCell
                                  className={
                                    !item.isValid &&
                                    item.errors.some((e) =>
                                      e.includes("ユーザーID"),
                                    )
                                      ? "text-danger"
                                      : ""
                                  }
                                >
                                  {item.userId}
                                </TableCell>
                                <TableCell
                                  className={
                                    !item.isValid &&
                                    item.errors.some((e) => e.includes("権限"))
                                      ? "text-danger"
                                      : ""
                                  }
                                >
                                  {convertApiRoleToJapanese(item.role)}
                                </TableCell>
                                <TableCell>
                                  {item.isValid ? (
                                    <Badge color="success" variant="flat">
                                      有効
                                    </Badge>
                                  ) : (
                                    <div>
                                      <Badge color="danger" variant="flat">
                                        エラー
                                      </Badge>
                                      <div className="text-xs text-danger mt-1">
                                        {item.errors.map((error, i) => (
                                          <div key={i}>{error}</div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        有効: {csvData.filter((item) => item.isValid).length}件
                        / エラー:{" "}
                        {csvData.filter((item) => !item.isValid).length}件
                      </div>
                    </div>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="flat"
                  color="default"
                  onPress={() => {
                    setIsCsvModalOpen(false);
                    setCsvFile(null);
                    setCsvData([]);
                  }}
                >
                  キャンセル
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </div>
    </div>
  );
}
