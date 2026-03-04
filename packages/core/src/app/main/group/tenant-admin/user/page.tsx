"use client";

import { onAuthStateChanged } from "firebase/auth";
import {
  Download,
  Edit,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { auth } from "@lib/firebase";

/* ==== HeroUI ==== */
import { Alert } from "@heroui/alert";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Checkbox,
  Input,
  Spinner,
} from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { Select, SelectItem } from "@heroui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { LoadingScreen } from "@common/LoadingScreen";

/* ==== API Contracts ==== */
import {
  create_user_list_v2_user_create_user_list_post,
  create_user_v2_user_create_post,
  delete_user_v2_user_delete__user_id__delete,
  list_users_v2_user_list_get,
  update_user_v2_user_update__user_id__patch,
} from "@repo/api-contracts/based_template/service";

/* ==== 一括登録専用ヘルパー ==== */
/**
 * 一括登録用の安全なヘルパー関数
 * API Contracts関数を直接使用して完璧な型安全性を確保
 */
async function bulkCreateUsers(
  users: Array<{
    userId: string;
    userName: string;
    email: string;
    tenantRole: Role;
    frontendUrl: string;
  }>,
) {
  // バックエンドのBulkUserCreateSchemaと完璧に整合性を保つ
  // バックエンド: user_id, user_name, email, tenant_role, frontend_url, password
  // フロントエンド: userId, userName, email, tenantRole, frontendUrl, password
  const apiUsers = users.map((user) => ({
    userId: user.userId, // user_id (alias: userId)
    userName: user.userName, // user_name (alias: userName) - 必須
    email: user.email, // email - オプショナル
    tenantRole: user.tenantRole, // tenant_role (alias: tenantRole) - 必須
    frontendUrl: user.frontendUrl, // frontend_url (alias: frontendUrl) - オプショナル
    password: undefined, // password - オプショナル（未設定時は自動生成）
  }));

  // API Contracts関数を直接使用（完璧な型安全性）
  return await create_user_list_v2_user_create_user_list_post({
    users: apiUsers,
  });
}

/* ─────────────────── 型定義 ─────────────────── */
type Role = "TENANT_ADMIN" | "TENANT_MANAGER" | "TENANT_MEMBER";

interface User {
  user_id: string;
  username?: string;
  email?: string;
  role: Role;
}

// ラベル・バッジ色マッピング
const roleLabelJa: Record<Role, string> = {
  TENANT_ADMIN: "管理者",
  TENANT_MANAGER: "マネージャー",
  TENANT_MEMBER: "メンバー",
};

const roleBadgeColor: Record<Role, "secondary" | "warning" | "success"> = {
  TENANT_ADMIN: "secondary",
  TENANT_MANAGER: "warning",
  TENANT_MEMBER: "success",
};

/* =================================================
 * 組織メンバー管理ページ（テナント管理配下）
 * ================================================= */
export default function TenantAdminUserPage() {
  /* ---- SWR fetcher ---- */
  const usersFetcher = async () => {
    try {
      return await list_users_v2_user_list_get();
    } catch (error) {
      throw new Error("ユーザーデータの取得に失敗しました");
    }
  };

  /* ---- SWR hook ---- */
  const {
    data: allUsersRaw = [],
    error: usersError,
    isLoading,
    mutate,
  } = useSWR("all-users", usersFetcher);

  /* ---- allUsersRaw をローカル構造に変換 ---- */
  const members = useMemo<User[]>(() => {
    return allUsersRaw.map((u: any) => ({
      user_id: u.userId,
      username: u.userName ?? undefined,
      email: u.email ?? undefined,
      role: (u.tenantRole as Role) ?? "TENANT_MEMBER",
    }));
  }, [allUsersRaw]);

  /* ---- その他のローカル state ---- */
  const [error, setError] = useState<string | null>(null);

  /* ===== Firebaseユーザー情報 ===== */
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  /* ===== 検索機能 ===== */
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;

    const term = searchTerm.toLowerCase();
    return members.filter(
      (member) =>
        member.username?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.user_id.toLowerCase().includes(term),
    );
  }, [members, searchTerm]);

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

    // モーダルを即時閉じる
    const idsToDelete = Array.from(deletableMemberIds);
    const skippedCount = selectedMemberIds.size - deletableMemberIds.size;
    setIsBulkDeleteModalOpen(false);

    setIsBulkDeleting(true);
    try {
      const deletePromises = idsToDelete.map((userId) =>
        delete_user_v2_user_delete__user_id__delete(userId),
      );

      await Promise.all(deletePromises);
      await mutate();
      setSelectedMemberIds(new Set());
      setIsAllSelected(false);

      let message = `${deletePromises.length}人のメンバーを削除しました。`;
      if (skippedCount > 0) {
        message += ` (自分自身は削除できないためスキップしました)`;
      }

      showSuccessToast(`メンバー一括削除 (${deletePromises.length}件)`);
    } catch (e: any) {
      handleErrorWithUI(e, "メンバー一括削除", setError);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  /* -- 編集 / 削除用 state -- */
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* -- 追加用 state -- */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("TENANT_MEMBER");
  const [isAdding, setIsAdding] = useState(false);

  /* -- CSVアップロード用 state -- */
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<
    Array<{
      username: string;
      email: string;
      role: string;
      isValid: boolean;
      errors: string[];
    }>
  >([]);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- エラー処理 ---- */
  useEffect(() => {
    if (usersError && !error) {
      setError("ユーザーデータの取得に失敗しました");
    }
  }, [usersError, error]);

  useEffect(() => {
    if (error) {
      handleErrorWithUI({ message: error }, "エラー");
    }
  }, [error]);

  /* ===== メンバー追加 ===== */
  const handleAddMember = async () => {
    if (!newEmail.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (members.some((m) => m.email === newEmail.trim())) {
      setError("このメールアドレスは既に登録されています");
      return;
    }

    // モーダルを即時閉じる
    setIsAddModalOpen(false);

    setIsAdding(true);
    try {
      const frontendUrl = `${window.location.protocol}//${window.location.host}`;
      await create_user_v2_user_create_post({
        userId: crypto.randomUUID(),
        userName: newUsername.trim() || newEmail.trim(),
        email: newEmail.trim(),
        tenantRole: newRole,
        frontendUrl: frontendUrl,
        password: newPassword?.trim() || undefined,
      });
      await mutate(); // 最新化
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("TENANT_MEMBER");
      showSuccessToast("メンバー追加");
    } catch (e: any) {
      handleErrorWithUI(e, "メンバー追加", setError);
    } finally {
      setIsAdding(false);
    }
  };

  /* ===== メンバー更新 ===== */
  const handleUpdateMember = async () => {
    if (!editingMember) return;

    setIsUpdating(true);
    try {
      await update_user_v2_user_update__user_id__patch(editingMember.user_id, {
        userName: editingMember.username,
        tenantRole: editingMember.role,
      });
      await mutate();
      setIsEditModalOpen(false);

      showSuccessToast("メンバー更新");
    } catch (e: any) {
      handleErrorWithUI(e, "メンバー更新", setError);
    } finally {
      setIsUpdating(false);
    }
  };

  /* ===== メンバー削除 ===== */
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    // モーダルを即時閉じる
    const target = memberToDelete;
    setIsDeleteModalOpen(false);

    setIsDeleting(true);
    try {
      await delete_user_v2_user_delete__user_id__delete(target.user_id);
      await mutate();

      showSuccessToast("メンバー削除");
    } catch (e: any) {
      handleErrorWithUI(e, "メンバー削除", setError);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ===== CSVサンプルダウンロード ===== */
  const handleDownloadSample = () => {
    const sampleData = [
      ["ユーザー名", "メールアドレス", "権限"],
      ["田中太郎", "sample1@example.com", "メンバー"],
      ["佐藤花子", "sample2@example.com", "管理者"],
      ["山田次郎", "sample3@example.com", "マネージャー"],
    ];

    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const bom = "\uFEFF"; // BOMを追加して文字化けを防ぐ
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = "ユーザー登録サンプル.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /* ===== CSVファイル処理 ===== */
  const validateRole = (role: string): boolean => {
    return [
      "TENANT_ADMIN",
      "TENANT_MANAGER",
      "TENANT_MEMBER",
      "管理者",
      "マネージャー",
      "メンバー",
    ].includes(role);
  };

  // 日本語ロール名を英語のAPI値に変換
  const convertJapaneseRoleToApiRole = (japaneseRole: string): string => {
    const roleMap: { [key: string]: string } = {
      管理者: "TENANT_ADMIN",
      マネージャー: "TENANT_MANAGER",
      メンバー: "TENANT_MEMBER",
      TENANT_ADMIN: "TENANT_ADMIN",
      TENANT_MANAGER: "TENANT_MANAGER",
      TENANT_MEMBER: "TENANT_MEMBER",
    };
    return roleMap[japaneseRole] || "TENANT_MEMBER";
  };

  // API値を日本語ロール名に変換（プレビュー用）
  const convertApiRoleToJapanese = (apiRole: string): string => {
    const roleMap: { [key: string]: string } = {
      TENANT_ADMIN: "管理者",
      TENANT_MANAGER: "マネージャー",
      TENANT_MEMBER: "メンバー",
    };
    return roleMap[apiRole] || "メンバー";
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

          // ヘッダー行をチェック
          if (data.length === 0) {
            setError("CSVファイルが空です");
            setIsProcessingCsv(false);
            return;
          }

          const headers = data[0];
          if (
            !headers ||
            headers.length !== 3 ||
            headers[0] !== "ユーザー名" ||
            headers[1] !== "メールアドレス" ||
            headers[2] !== "権限"
          ) {
            setError(
              "CSVのヘッダーが正しくありません。「ユーザー名」「メールアドレス」「権限」の順序で作成してください。",
            );
            setIsProcessingCsv(false);
            return;
          }

          // データ行を処理
          const processedData = data
            .slice(1)
            .filter((row) => row.length >= 3 && row[0] && row[1] && row[2])
            .map((row) => {
              const username = row[0]?.trim() || "";
              const email = row[1]?.trim() || "";
              const role = row[2]?.trim() || "";
              const errors: string[] = [];

              if (!username) {
                errors.push("ユーザー名が空です");
              }

              if (!email) {
                errors.push("メールアドレスが空です");
              } else if (!validateEmail(email)) {
                errors.push("無効なメールアドレス形式です");
              }

              if (!role) {
                errors.push("権限が空です");
              } else if (!validateRole(role)) {
                errors.push(
                  "無効な権限です（管理者、マネージャー、メンバー のいずれかを入力してください）",
                );
              }

              // 重複メールアドレスチェック
              if (email && members.some((m) => m.email === email)) {
                errors.push("既に登録済みのメールアドレスです");
              }

              return {
                username,
                email,
                role,
                isValid: errors.length === 0,
                errors,
              };
            });

          setCsvData(processedData);
        } catch (err) {
          setError("CSVファイルの処理中にエラーが発生しました");
        } finally {
          setIsProcessingCsv(false);
        }
      },
      error: (err) => {
        setError(`CSVファイルの読み込みに失敗しました: ${err.message}`);
        setIsProcessingCsv(false);
      },
    });
  };

  /* ===== CSV一括アップロード ===== */
  const handleBulkUpload = async () => {
    const validData = csvData.filter((item) => item.isValid);

    if (validData.length === 0) {
      setError("有効なデータが存在しません");
      return;
    }

    setIsBulkUploading(true);
    try {
      // フロントエンドURLの取得（完全なURLを作成）
      const frontendUrl = `${window.location.protocol}//${window.location.host}`;

      // バックエンドのBulkUserCreateSchemaに完全に合致するユーザーリストを作成
      const bulkUserList = validData.map((item) => ({
        userId: crypto.randomUUID(),
        userName: item.username || item.email.split("@")[0] || item.email,
        email: item.email,
        tenantRole: convertJapaneseRoleToApiRole(item.role) as Role,
        frontendUrl: frontendUrl,
      }));

      // 一括登録専用ヘルパー関数を使用
      const result = await bulkCreateUsers(bulkUserList);

      await mutate();
      setIsCsvModalOpen(false);
      setCsvFile(null);
      setCsvData([]);

      // 結果の表示
      if (result.successCount > 0) {
        showSuccessToast(
          `ユーザー一括登録 (成功: ${result.successCount}件, 失敗: ${result.failureCount}件, メール送信: ${result.emailSentCount}件)`,
        );
      }

      // エラーがある場合は警告表示
      if (result.failureCount > 0) {
        const errorDetails = result.errors
          .map(
            (err: { line: number; reason: string }) =>
              `行${err.line}: ${err.reason}`,
          )
          .join("\n");
        handleErrorWithUI(
          {
            message:
              errorDetails.length > 200
                ? `${errorDetails.substring(0, 200)}...`
                : errorDetails,
          },
          `ユーザー一括登録 (${result.failureCount}件失敗)`,
          setError,
        );
      }
    } catch (e: any) {
      handleErrorWithUI(e, "ユーザー一括登録", setError);
    } finally {
      setIsBulkUploading(false);
    }
  };

  /* ===== ローディング ===== */
  if (isLoading) {
    return <LoadingScreen />;
  }

  /* ===== 取得失敗 ===== */
  if (usersError && members.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Alert variant="bordered" color="danger" className="max-w-md">
          <div className="font-bold mb-1">エラー!</div>
          <p>ユーザーデータの取得に失敗しました。</p>
        </Alert>
      </div>
    );
  }

  /* ============ 画面 ============ */
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
                組織メンバー管理
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0 space-y-2">
        {error && (
          <Alert
            variant="bordered"
            color="danger"
            className="relative animate-in fade-in slide-in-from-top-2"
            onClose={() => setError(null)}
          >
            <div className="font-semibold text-sm mb-1">
              エラーが発生しました
            </div>
            <p className="text-xs">{error}</p>
          </Alert>
        )}

        {/* --- アクションボタンエリア --- */}
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-3">
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              {/* 検索バー */}
              <div className="flex-1 w-full sm:w-auto min-w-0">
                <Input
                  placeholder="メンバーを検索..."
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  startContent={<Search size={14} />}
                  size="sm"
                  classNames={{
                    input: "text-xs",
                    inputWrapper: "h-8",
                  }}
                  aria-label="メンバー検索"
                />
              </div>

              {/* アクションボタン */}
              <div className="flex gap-2 flex-wrap">
                {/* CSV関連アクション */}
                <ButtonGroup variant="bordered" size="sm">
                  <Button
                    startContent={<Download size={14} />}
                    onPress={handleDownloadSample}
                    className="hidden sm:flex"
                    aria-label="CSVサンプルダウンロード"
                  >
                    サンプル
                  </Button>
                  <Button
                    startContent={<Upload size={14} />}
                    onPress={() => setIsCsvModalOpen(true)}
                    className="hidden sm:flex"
                    aria-label="CSV一括登録"
                  >
                    一括登録
                  </Button>
                </ButtonGroup>

                {selectedMemberIds.size > 0 && (
                  <Button
                    color="danger"
                    variant="solid"
                    size="sm"
                    startContent={<Trash2 size={14} />}
                    onPress={() => setIsBulkDeleteModalOpen(true)}
                    isDisabled={deletableMemberIds.size === 0}
                    aria-label={`${deletableMemberIds.size}人を削除`}
                  >
                    削除 ({deletableMemberIds.size})
                  </Button>
                )}

                {/* メインアクション - より目立つように */}
                <Button
                  size="sm"
                  color="primary"
                  variant="solid"
                  startContent={<UserPlus size={14} />}
                  onPress={() => setIsAddModalOpen(true)}
                  className="font-medium"
                  aria-label="メンバーを追加"
                >
                  追加
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* --- メンバー一覧テーブル --- */}
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-3 overflow-x-auto">
            {filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-default-400" />
                </div>
                <h3 className="text-sm font-semibold text-default-700 mb-1">
                  {searchTerm
                    ? "検索結果が見つかりませんでした"
                    : "メンバーが登録されていません"}
                </h3>
                <p className="text-xs text-default-500 mb-4">
                  {searchTerm
                    ? "検索条件を変更してお試しください"
                    : "「追加」ボタンからメンバーを追加してください"}
                </p>
                {!searchTerm && (
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<UserPlus size={14} />}
                    onPress={() => setIsAddModalOpen(true)}
                  >
                    メンバーを追加
                  </Button>
                )}
              </div>
            ) : (
              <Table
                aria-label="メンバーリスト"
                shadow="none"
                className="min-w-full"
                removeWrapper
              >
                <TableHeader>
                  <TableColumn width={50}>
                    <Checkbox
                      isSelected={isAllSelected}
                      onValueChange={handleSelectAll}
                      aria-label="全選択"
                    />
                  </TableColumn>
                  <TableColumn>
                    <span className="text-xs font-semibold">ユーザー名</span>
                  </TableColumn>
                  <TableColumn>
                    <span className="text-xs font-semibold">メール</span>
                  </TableColumn>
                  <TableColumn width={100}>
                    <span className="text-xs font-semibold">権限</span>
                  </TableColumn>
                  <TableColumn width={120}>
                    <span className="text-xs font-semibold">操作</span>
                  </TableColumn>
                </TableHeader>
                <TableBody emptyContent="メンバーが見つかりませんでした">
                  {filteredMembers.map((m) => (
                    <TableRow key={m.user_id}>
                      <TableCell>
                        <Checkbox
                          isSelected={selectedMemberIds.has(m.user_id)}
                          onValueChange={(checked) =>
                            handleSelectMember(m.user_id, checked)
                          }
                          aria-label={`${m.username || m.user_id}を選択`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">
                          {m.username || "未設定"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-default-600">
                          {m.email || "未設定"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          color={roleBadgeColor[m.role]}
                          variant="flat"
                          size="sm"
                          className="text-[10px]"
                        >
                          {roleLabelJa[m.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="light"
                            color="primary"
                            isIconOnly
                            size="sm"
                            aria-label={`${m.username || m.user_id}を編集`}
                            onPress={() => {
                              setEditingMember(m);
                              setIsEditModalOpen(true);
                            }}
                            className="min-w-8 h-8"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="light"
                            color="danger"
                            isIconOnly
                            size="sm"
                            aria-label={`${m.username || m.user_id}を削除`}
                            onPress={() => {
                              setMemberToDelete(m);
                              setIsDeleteModalOpen(true);
                            }}
                            isDisabled={m.user_id === currentUserId}
                            className="min-w-8 h-8"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* --- アカウント追加モーダル --- */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setNewUsername("");
            setNewEmail("");
            setNewPassword("");
            setNewRole("TENANT_MEMBER");
          }}
          size="lg"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="text-sm font-semibold">
              新しいメンバーを追加
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4 pt-2">
                <div>
                  <label
                    htmlFor="new-username"
                    className="block text-xs font-medium mb-1.5 text-default-700"
                  >
                    ユーザー名
                  </label>
                  <Input
                    id="new-username"
                    value={newUsername}
                    onValueChange={setNewUsername}
                    placeholder="任意"
                    size="sm"
                    classNames={{
                      input: "text-xs",
                    }}
                    aria-label="ユーザー名"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-email"
                    className="block text-xs font-medium mb-1.5 text-default-700"
                  >
                    メールアドレス{" "}
                    <span className="text-danger" aria-label="必須">
                      *
                    </span>
                  </label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onValueChange={setNewEmail}
                    placeholder="example@example.com"
                    isRequired
                    size="sm"
                    classNames={{
                      input: "text-xs",
                    }}
                    aria-label="メールアドレス（必須）"
                    errorMessage={
                      newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
                        ? "有効なメールアドレスを入力してください"
                        : undefined
                    }
                  />
                  <p className="text-[10px] text-default-500 mt-1.5">
                    このメールアドレスに招待と仮パスワードが送信されます
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium mb-1.5 text-default-700"
                  >
                    パスワード
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onValueChange={setNewPassword}
                    placeholder="未入力の場合は自動生成"
                    size="sm"
                    classNames={{
                      input: "text-xs",
                    }}
                    aria-label="パスワード（任意）"
                  />
                  <p className="text-[10px] text-default-500 mt-1.5">
                    空の場合、自動生成されたパスワードがメールで送信されます
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="new-role"
                    className="block text-xs font-medium mb-1.5 text-default-700"
                  >
                    権限{" "}
                    <span className="text-danger" aria-label="必須">
                      *
                    </span>
                  </label>
                  <Select
                    id="new-role"
                    selectedKeys={new Set([newRole])}
                    onSelectionChange={(keys) => {
                      const [key] = Array.from(keys);
                      setNewRole(key as Role);
                    }}
                    size="sm"
                    aria-label="権限（必須）"
                  >
                    <SelectItem key="TENANT_ADMIN">管理者</SelectItem>
                    {/* <SelectItem key="TENANT_MANAGER">マネージャー</SelectItem> */}
                    <SelectItem key="TENANT_MEMBER">メンバー</SelectItem>
                  </Select>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={() => {
                  setIsAddModalOpen(false);
                  setNewUsername("");
                  setNewEmail("");
                  setNewPassword("");
                  setNewRole("TENANT_MEMBER");
                }}
                isDisabled={isAdding}
              >
                キャンセル
              </Button>
              <Button
                variant="solid"
                color="primary"
                size="sm"
                onPress={handleAddMember}
                isDisabled={
                  !newEmail.trim() ||
                  isAdding ||
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())
                }
                isLoading={isAdding}
              >
                {isAdding ? "追加中..." : "追加"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* --- 編集モーダル --- */}
        <Modal
          isOpen={isEditModalOpen && !!editingMember}
          onClose={() => setIsEditModalOpen(false)}
          size="lg"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="text-sm font-semibold">
              メンバーを編集
            </ModalHeader>
            <ModalBody>
              {editingMember && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label
                      htmlFor="edit-username"
                      className="block text-xs font-medium mb-1.5 text-default-700"
                    >
                      ユーザー名
                    </label>
                    <Input
                      id="edit-username"
                      value={editingMember.username || ""}
                      onValueChange={(v) =>
                        setEditingMember({ ...editingMember, username: v })
                      }
                      size="sm"
                      classNames={{
                        input: "text-xs",
                      }}
                      aria-label="ユーザー名"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-email"
                      className="block text-xs font-medium mb-1.5 text-default-700"
                    >
                      メールアドレス
                    </label>
                    <Input
                      id="edit-email"
                      value={editingMember.email || ""}
                      isReadOnly
                      size="sm"
                      classNames={{
                        input: "text-xs",
                        inputWrapper: "bg-default-100",
                      }}
                      aria-label="メールアドレス（読み取り専用）"
                    />
                    <p className="text-[10px] text-default-500 mt-1.5">
                      メールアドレスは変更できません
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="edit-role"
                      className="block text-xs font-medium mb-1.5 text-default-700"
                    >
                      権限
                    </label>
                    <Select
                      id="edit-role"
                      selectedKeys={new Set([editingMember.role])}
                      onSelectionChange={(keys) => {
                        const [key] = Array.from(keys);
                        setEditingMember({
                          ...editingMember,
                          role: key as Role,
                        });
                      }}
                      size="sm"
                      aria-label="権限"
                    >
                      <SelectItem key="TENANT_ADMIN">管理者</SelectItem>
                      {/* <SelectItem key="TENANT_MANAGER">マネージャー</SelectItem> */}
                      <SelectItem key="TENANT_MEMBER">メンバー</SelectItem>
                    </Select>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={() => setIsEditModalOpen(false)}
                isDisabled={isUpdating}
              >
                キャンセル
              </Button>
              <Button
                variant="solid"
                color="primary"
                size="sm"
                onPress={handleUpdateMember}
                isDisabled={isUpdating}
                isLoading={isUpdating}
              >
                {isUpdating ? "保存中..." : "保存"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* --- 削除確認モーダル --- */}
        <Modal
          isOpen={isDeleteModalOpen && !!memberToDelete}
          onClose={() => setIsDeleteModalOpen(false)}
          size="md"
        >
          <ModalContent>
            <ModalHeader className="text-sm font-semibold text-danger">
              削除の確認
            </ModalHeader>
            <ModalBody>
              {memberToDelete && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-danger-50 rounded-lg border border-danger-200">
                    <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-5 h-5 text-danger-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-danger-700 mb-1">
                        この操作は取り消せません
                      </p>
                      <p className="text-xs text-default-600">
                        <span className="font-medium">
                          {memberToDelete.username || memberToDelete.user_id}
                        </span>
                        を組織から削除してもよろしいですか？
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={() => setIsDeleteModalOpen(false)}
                isDisabled={isDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="solid"
                color="danger"
                size="sm"
                onPress={handleDeleteMember}
                isDisabled={isDeleting}
                isLoading={isDeleting}
              >
                {isDeleting ? "削除中..." : "削除"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* --- CSV一括登録モーダル --- */}
        <Modal
          size="4xl"
          isOpen={isCsvModalOpen}
          onClose={() => {
            setIsCsvModalOpen(false);
            setCsvFile(null);
            setCsvData([]);
          }}
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="text-sm font-semibold">
              CSV一括登録
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4 pt-2">
                {/* ファイル選択 */}
                <div>
                  <label
                    htmlFor="csv-file"
                    className="block text-xs font-medium mb-2 text-default-700"
                  >
                    CSVファイルを選択
                  </label>
                  <input
                    id="csv-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-colors"
                    aria-label="CSVファイルを選択"
                  />
                  <div className="mt-2 p-2 bg-default-50 rounded-md border border-default-200">
                    <p className="text-[10px] text-default-600 font-medium mb-1">
                      ファイル形式:
                    </p>
                    <ul className="text-[10px] text-default-500 space-y-0.5 list-disc list-inside">
                      <li>
                        ヘッダー行：「ユーザー名」「メールアドレス」「権限」（この順序で固定）
                      </li>
                      <li>
                        権限は「管理者」「マネージャー」「メンバー」のいずれかを入力
                      </li>
                    </ul>
                  </div>
                </div>

                {/* プレビュー */}
                {isProcessingCsv && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Spinner size="lg" color="primary" />
                    <p className="text-xs text-default-600 mt-3">
                      ファイルを処理しています...
                    </p>
                  </div>
                )}

                {csvData.length > 0 && !isProcessingCsv && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-default-700">
                        プレビュー
                      </h3>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-success-600 font-medium">
                          有効: {csvData.filter((item) => item.isValid).length}
                          件
                        </span>
                        <span className="text-danger-600 font-medium">
                          エラー:{" "}
                          {csvData.filter((item) => !item.isValid).length}件
                        </span>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-auto border border-default-200 rounded-lg">
                      <Table
                        aria-label="CSVプレビュー"
                        shadow="none"
                        removeWrapper
                      >
                        <TableHeader>
                          <TableColumn>ユーザー名</TableColumn>
                          <TableColumn>メールアドレス</TableColumn>
                          <TableColumn width={100}>権限</TableColumn>
                          <TableColumn width={120}>状態</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {csvData.map((item, index) => (
                            <TableRow
                              key={index}
                              className={
                                !item.isValid
                                  ? "bg-danger-50/50 hover:bg-danger-50"
                                  : ""
                              }
                            >
                              <TableCell>
                                <div
                                  className={`text-xs ${
                                    !item.isValid &&
                                    item.errors.some((e) =>
                                      e.includes("ユーザー名"),
                                    )
                                      ? "text-danger font-medium"
                                      : "text-default-700"
                                  }`}
                                >
                                  {item.username || (
                                    <span className="text-default-400">
                                      未入力
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`text-xs ${
                                    !item.isValid &&
                                    item.errors.some((e) =>
                                      e.includes("メール"),
                                    )
                                      ? "text-danger font-medium"
                                      : "text-default-700"
                                  }`}
                                >
                                  {item.email || (
                                    <span className="text-default-400">
                                      未入力
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div
                                  className={`text-xs ${
                                    !item.isValid &&
                                    item.errors.some((e) => e.includes("権限"))
                                      ? "text-danger font-medium"
                                      : "text-default-700"
                                  }`}
                                >
                                  {convertApiRoleToJapanese(item.role)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {item.isValid ? (
                                  <Badge
                                    color="success"
                                    variant="flat"
                                    size="sm"
                                    className="text-[10px]"
                                  >
                                    有効
                                  </Badge>
                                ) : (
                                  <div className="space-y-1">
                                    <Badge
                                      color="danger"
                                      variant="flat"
                                      size="sm"
                                      className="text-[10px]"
                                    >
                                      エラー
                                    </Badge>
                                    <div className="text-[10px] text-danger space-y-0.5">
                                      {item.errors.map((err, i) => (
                                        <div key={i} className="leading-tight">
                                          {err}
                                        </div>
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
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={() => {
                  setIsCsvModalOpen(false);
                  setCsvFile(null);
                  setCsvData([]);
                }}
                isDisabled={isBulkUploading}
              >
                キャンセル
              </Button>
              <Button
                variant="solid"
                color="primary"
                size="sm"
                onPress={handleBulkUpload}
                isDisabled={
                  csvData.length === 0 ||
                  csvData.filter((item) => item.isValid).length === 0 ||
                  isBulkUploading
                }
                isLoading={isBulkUploading}
              >
                {isBulkUploading
                  ? "登録中..."
                  : `一括登録 (${
                      csvData.filter((item) => item.isValid).length
                    }件)`}
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
            <ModalHeader className="text-sm font-semibold text-danger">
              一括削除の確認
            </ModalHeader>
            <ModalBody>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-danger-50 rounded-lg border border-danger-200">
                  <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-danger-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-danger-700 mb-1">
                      この操作は取り消せません
                    </p>
                    <p className="text-xs text-default-600">
                      選択した{" "}
                      <span className="font-bold text-danger-700">
                        {deletableMemberIds.size}人
                      </span>
                      のメンバーを組織から削除してもよろしいですか？
                    </p>
                  </div>
                </div>
                {selectedMemberIds.has(currentUserId || "") && (
                  <Alert
                    variant="bordered"
                    color="warning"
                    className="text-xs"
                    size="sm"
                  >
                    <div className="font-medium">
                      注意: 自分自身は削除できないためスキップされます
                    </div>
                  </Alert>
                )}
              </div>
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="flat"
                color="default"
                size="sm"
                onPress={() => setIsBulkDeleteModalOpen(false)}
                isDisabled={isBulkDeleting}
              >
                キャンセル
              </Button>
              <Button
                variant="solid"
                color="danger"
                size="sm"
                onPress={handleBulkDelete}
                isDisabled={isBulkDeleting || deletableMemberIds.size === 0}
                isLoading={isBulkDeleting}
              >
                {isBulkDeleting ? "削除中..." : "一括削除"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
