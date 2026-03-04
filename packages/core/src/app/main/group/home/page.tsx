"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Card, CardBody } from "@heroui/react";
import { Input } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import {
  TrashIcon,
  CogIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import GroupConfigModal, {
  type GroupConfigData,
} from "./components/GroupConfigModal";
import useSWR, { mutate as globalMutate } from "swr";
import { auth } from "../../../../lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useTenantRoleContext } from "../../../../context/role/tenantRoleContext";
import { LoadingScreen } from "@common/LoadingScreen";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

import {
  get_group_list_by_user_id_v2_group_list__user_id__get,
  delete_group_v2_group_delete__group_id__delete,
  get_group_config_v2_group_config__group_id__get,
  switch_group_config_v2_group_switch_group_config__group_id__put,
  update_group_v2_group_update__group_id__put,
  copy_group_v2_group_copy__group_id__post,
} from "@repo/api-contracts/based_template/service";
import type { GroupResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

/**
 * カスタムフック: ユーザーのグループリストの取得
 * SWRキーはuser-group-listで統一
 */
function useGroupListByUser() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  const { data, error, mutate } = useSWR(
    user ? `user-group-list-${user.uid}` : null,
    user
      ? async () => {
          const response =
            await get_group_list_by_user_id_v2_group_list__user_id__get(
              user.uid,
            );
          return response; // SWRキー共有のためレスポンス形を統一
        }
      : null,
  );
  return {
    groupList: data?.groupList || [],
    isLoading: (!error && !data) || !authChecked,
    isError: error,
    mutate,
  };
}

/**
 * カスタムフック: グループ設定の取得
 * @param groupId - グループID（nullの場合は取得しない）
 */
function useGroupConfig(groupId: string | null) {
  const { data, error, mutate } = useSWR(
    groupId ? ["groupConfig", groupId] : null,
    () =>
      groupId ? get_group_config_v2_group_config__group_id__get(groupId) : null,
  );
  return {
    groupConfig: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

/**
 * APIリクエスト関数のエイリアス
 * 可読性向上のため、長い関数名を短縮
 */
const GroupDeleteRequest = delete_group_v2_group_delete__group_id__delete;
const GroupConfigUpdateRequest =
  switch_group_config_v2_group_switch_group_config__group_id__put;
const GroupUpdateRequest = update_group_v2_group_update__group_id__put;

/**
 * 空状態コンポーネント
 * データがない場合や検索結果がない場合に表示
 */
function EmptyState({
  message,
  description,
  icon: Icon = FolderIcon,
  actionLabel,
  onAction,
}: {
  message: string;
  description?: string;
  icon?: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="w-full border border-dashed border-default-200 bg-white">
      <CardBody className="p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-default-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-default-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">{message}</h3>
            {description && (
              <p className="text-sm text-default-500 max-w-md mx-auto">
                {description}
              </p>
            )}
          </div>
          {actionLabel && onAction && (
            <Button color="primary" onPress={onAction} className="mt-2">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export default function GroupListPage() {
  const router = useRouter();

  // テナントロールを取得
  const { tenantRole } = useTenantRoleContext();

  // ユーザーが所属しているグループのみを取得（TENANT_ADMINの場合は全グループ）
  const {
    groupList: userGroupList,
    isLoading: isUserGroupLoading,
    isError: isUserGroupError,
    mutate: mutateUserGroups,
  } = useGroupListByUser();

  // 各グループに対する権限を格納するMap（userGroupListから直接取得）
  const [groupRoles, setGroupRoles] = useState<Map<string, string>>(new Map());

  // 削除確認モーダル
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // 設定モーダル用の状態
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configGroupId, setConfigGroupId] = useState<string | null>(null);
  const [initialGroupData, setInitialGroupData] = useState({
    groupName: "",
    groupDescription: "",
    tag: "",
  });
  const { groupConfig, mutate: mutateConfig } = useGroupConfig(configGroupId);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copySourceGroup, setCopySourceGroup] =
    useState<GroupResponseSchemaType | null>(null);
  const [copyFormValues, setCopyFormValues] = useState({
    targetGroupName: "",
    targetGroupDescription: "",
    targetTag: "",
  });

  // ▼ 「子ボタンが押されたかどうか」を判定するためのフラグ
  const [childPressed, setChildPressed] = useState(false);

  // 検索機能の状態
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [processingGroupIds, setProcessingGroupIds] = useState<string[]>([]);

  // userGroupListから権限情報を設定
  // TENANT_ADMINの場合は全グループをGROUP_OWNERとして扱う
  useEffect(() => {
    if (userGroupList.length === 0) return;

    const roleMap = new Map<string, string>();
    userGroupList.forEach((group: GroupResponseSchemaType) => {
      if (
        tenantRole === "TENANT_ADMIN" ||
        tenantRole === "TENANT_SETTING_ADMIN"
      ) {
        roleMap.set(group.groupId, "GROUP_OWNER");
      } else {
        // 通常のユーザーの場合、グループロール情報を取得する必要がある
        // ここでは一時的に空文字列として扱う
        roleMap.set(group.groupId, "");
      }
    });
    setGroupRoles(roleMap);
  }, [userGroupList, tenantRole]);

  // 権限チェック関数
  const canDeleteGroup = (groupId: string): boolean => {
    const role = groupRoles.get(groupId);
    return (
      role === "GROUP_OWNER" ||
      role === "TENANT_ADMIN" ||
      role === "TENANT_SETTING_ADMIN"
    );
  };

  const canEditGroupConfig = (groupId: string): boolean => {
    const role = groupRoles.get(groupId);
    return (
      role === "GROUP_OWNER" ||
      role === "GROUP_MANAGER" ||
      role === "TENANT_ADMIN" ||
      role === "TENANT_SETTING_ADMIN"
    );
  };

  /**
   * 親カードのクリックハンドラー
   * 子ボタンが押された場合は処理をスキップし、通常時はチャット画面に遷移
   */
  const handleCardPress = React.useCallback(
    (groupId: string) => {
      if (childPressed) {
        setChildPressed(false);
        return;
      }
      router.push(`/main/${groupId}/chat`);
    },
    [childPressed, router],
  );

  /**
   * 子ボタンのクリックを処理する共通ハンドラー
   * 親カードのクリックを防ぐためにchildPressedフラグを設定
   */
  const handleChildButtonClick = React.useCallback(() => {
    setChildPressed(true);
  }, []);

  /**
   * 削除ボタンのハンドラー
   */
  const handleDeletePress = React.useCallback(
    (groupId: string) => {
      handleChildButtonClick();
      setSelectedGroupId(groupId);
      setIsModalOpen(true);
    },
    [handleChildButtonClick],
  );

  /**
   * コピーボタンのハンドラー
   */
  const handleCopyPress = React.useCallback(
    (group: GroupResponseSchemaType) => {
      handleChildButtonClick();
      setCopySourceGroup(group);
      const baseName = group.groupName || "新しいグループ";
      setCopyFormValues({
        targetGroupName: `${baseName}（コピー）`,
        targetGroupDescription: group.groupDescription || "",
        targetTag: group.tag || "",
      });
      setIsCopyModalOpen(true);
    },
    [handleChildButtonClick],
  );

  const refreshSharedGroupLists = React.useCallback(async () => {
    await globalMutate("user-group-list");
  }, []);

  const markProcessing = (groupId: string | null) => {
    if (!groupId) return;
    setProcessingGroupIds((prev) =>
      prev.includes(groupId) ? prev : [...prev, groupId],
    );
  };

  const clearProcessing = (groupId: string | null) => {
    if (!groupId) return;
    setProcessingGroupIds((prev) => prev.filter((id) => id !== groupId));
  };

  /**
   * 削除確定時
   */
  const handleConfirmDelete = async () => {
    if (!selectedGroupId) return;
    try {
      markProcessing(selectedGroupId);
      await GroupDeleteRequest(selectedGroupId);
      // 再取得
      await Promise.all([mutateUserGroups(), refreshSharedGroupLists()]);
      showSuccessToast("グループを削除しました");
    } catch (err) {
      handleErrorWithUI(err, "グループ削除");
    } finally {
      clearProcessing(selectedGroupId);
      setIsModalOpen(false);
      setSelectedGroupId(null);
    }
  };

  /**
   * モーダルを閉じる
   */
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGroupId(null);
  };

  const closeCopyModal = () => {
    setIsCopyModalOpen(false);
    setCopySourceGroup(null);
    setCopyFormValues({
      targetGroupName: "",
      targetGroupDescription: "",
      targetTag: "",
    });
  };

  /**
   * 設定保存時
   */
  const handleSaveConfig = async (config: GroupConfigData) => {
    if (!configGroupId) return;
    try {
      markProcessing(configGroupId);
      // 1. グループ基本情報の更新
      await GroupUpdateRequest(configGroupId, {
        groupName: config.groupName,
        groupDescription: config.groupDescription,
        tag: config.tag,
      });

      // 2. グループ設定の更新
      await GroupConfigUpdateRequest(configGroupId, {
        allowGeneralInfoAnswers: config.allowGeneralInfoAnswers,
        botSelectionMethod: config.botSelectionMethod,
        chatFlowType: config.chatFlowType,
        monthlyMaxChatCount: config.monthlyMaxChatCount,
        monthlyMaxImageCount: config.monthlyMaxImageCount,
        maxPageCount: config.maxPageCount,
        maxChatEntryCount: config.maxChatEntryCount,
        maxBotCount: config.maxBotCount,
        maxUserCount: config.maxUserCount,
      });

      // データを再取得
      await Promise.all([
        mutateUserGroups(), // ユーザーグループ一覧を再取得
        mutateConfig(), // 設定を再取得
        refreshSharedGroupLists(), // グループページ側のSWRも更新
      ]);

      // モーダルを閉じる
      closeConfigModal();
      showSuccessToast("グループ設定を更新しました");
    } catch (err) {
      handleErrorWithUI(err, "グループ設定更新");
      throw err;
    } finally {
      clearProcessing(configGroupId);
    }
  };

  const handleCopySubmit = async () => {
    if (!copySourceGroup) return;
    const sourceGroupId = copySourceGroup.groupId;
    const trimmedName = copyFormValues.targetGroupName.trim();
    if (!trimmedName) return;

    const payload = {
      targetGroupName: trimmedName,
      targetGroupDescription:
        copyFormValues.targetGroupDescription.trim() || null,
      targetTag: copyFormValues.targetTag.trim() || null,
    };

    markProcessing(sourceGroupId);
    try {
      const response = await copy_group_v2_group_copy__group_id__post(
        sourceGroupId,
        payload,
      );
      await Promise.all([mutateUserGroups(), refreshSharedGroupLists()]);
      closeCopyModal();
      showSuccessToast(response?.message ?? "グループをコピーしました");
    } catch (err) {
      handleErrorWithUI(err, "グループコピー");
    } finally {
      clearProcessing(sourceGroupId);
    }
  };

  /**
   * 設定モーダルを閉じる
   */
  const closeConfigModal = () => {
    setIsConfigModalOpen(false);
    setConfigGroupId(null);
    setInitialGroupData({
      groupName: "",
      groupDescription: "",
      tag: "",
    });
  };

  // 表示用のグループリストを作成
  // 新しいエンドポイントは既にユーザーに紐づくグループ一覧を返す（TENANT_ADMINの場合は全グループ）
  // グループロール情報は含まれていないため、TENANT_ADMINの場合はGROUP_OWNERとして扱う
  const displayGroupList = React.useMemo(() => {
    if (!userGroupList.length) return [];

    // TENANT_ADMINの場合は全グループをGROUP_OWNERとして表示
    if (
      tenantRole === "TENANT_ADMIN" ||
      tenantRole === "TENANT_SETTING_ADMIN"
    ) {
      return userGroupList.map((group: GroupResponseSchemaType) => ({
        ...group,
        groupRole: "GROUP_OWNER",
      }));
    }

    // 通常のユーザーの場合、グループロール情報を取得する必要がある
    // ただし、効率化のため、ここでは空文字列として扱う
    // 必要に応じて個別に取得する
    return userGroupList.map((group: GroupResponseSchemaType) => ({
      ...group,
      groupRole: "",
    }));
  }, [userGroupList, tenantRole]);

  // 検索フィルタリングされたグループリスト
  const filteredGroupList = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return displayGroupList;
    }

    const query = searchQuery.toLowerCase().trim();
    return displayGroupList.filter(
      (group: GroupResponseSchemaType & { groupRole?: string }) => {
        const groupName = group.groupName?.toLowerCase() || "";
        const groupDescription = group.groupDescription?.toLowerCase() || "";
        const tag = group.tag?.toLowerCase() || "";

        return (
          groupName.includes(query) ||
          groupDescription.includes(query) ||
          tag.includes(query)
        );
      },
    );
  }, [displayGroupList, searchQuery]);

  /**
   * 設定ボタンのハンドラー
   * displayGroupListの定義後に配置（依存関係のため）
   */
  const handleConfigPress = React.useCallback(
    (groupId: string) => {
      handleChildButtonClick();
      setConfigGroupId(groupId);

      // 現在のグループ情報を取得して一時保存に設定
      const currentGroup = displayGroupList.find(
        (g: GroupResponseSchemaType) => g.groupId === groupId,
      );
      if (currentGroup) {
        setInitialGroupData({
          groupName: currentGroup.groupName || "",
          groupDescription: currentGroup.groupDescription || "",
          tag: currentGroup.tag || "",
        });
      }
      setIsConfigModalOpen(true);
    },
    [handleChildButtonClick, displayGroupList],
  );

  const copySourceGroupId = copySourceGroup?.groupId;
  const isCopyProcessing =
    copySourceGroupId !== undefined &&
    processingGroupIds.includes(copySourceGroupId);
  const isCopyFormValid = Boolean(copyFormValues.targetGroupName.trim());

  // SWRエラーハンドリング
  useEffect(() => {
    if (isUserGroupError) {
      handleErrorWithUI(isUserGroupError, "ユーザーグループ一覧取得");
    }
  }, [isUserGroupError]);

  // ローディング中は共通の LoadingScreen を表示
  if (isUserGroupLoading) {
    return <LoadingScreen message="グループ情報を読み込み中..." />;
  }

  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto bg-default-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-1.5">
                グループ一覧
              </h1>
              <p className="text-sm text-default-500">
                グループを管理し、チャットを開始できます
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* テナントADMINのみテナント管理ボタンを表示 */}
              {(tenantRole === "TENANT_ADMIN" ||
                tenantRole === "TENANT_SETTING_ADMIN") && (
                <Button
                  color="default"
                  variant="bordered"
                  onPress={() => router.push("/main/group/tenant-admin")}
                  className="w-full sm:w-auto"
                >
                  テナント管理
                </Button>
              )}
              <Button
                color="primary"
                onPress={() => router.push("/main/group/new")}
                className="w-full sm:w-auto"
              >
                新規作成
              </Button>
            </div>
          </div>

          {/* 検索セクション */}
          <div className="mb-6">
            <Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="グループ名、説明、タグで検索..."
              variant="bordered"
              startContent={
                <MagnifyingGlassIcon className="w-5 h-5 text-default-400" />
              }
              classNames={{
                base: "w-full",
                inputWrapper: "bg-white",
              }}
              aria-label="グループ検索"
            />
            {/* 検索結果の件数表示 */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-default-500">
                {searchQuery ? (
                  <>
                    <span className="font-medium text-foreground">
                      {filteredGroupList.length}
                    </span>
                    件が見つかりました
                  </>
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {displayGroupList.length}
                    </span>
                    件のグループ
                  </>
                )}
              </span>
              {searchQuery && (
                <Button
                  variant="light"
                  size="sm"
                  onPress={() => setSearchQuery("")}
                  className="text-xs"
                >
                  クリア
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* グループカード一覧 */}
        {filteredGroupList.length === 0 && !searchQuery ? (
          <EmptyState
            message="グループがありません"
            description="新しいグループを作成して、チャットを始めましょう。"
            icon={FolderIcon}
            actionLabel="グループを作成"
            onAction={() => router.push("/main/group/new")}
          />
        ) : filteredGroupList.length === 0 && searchQuery ? (
          <EmptyState
            message="検索結果が見つかりませんでした"
            description="検索キーワードを変更するか、検索をクリアしてお試しください。"
            icon={MagnifyingGlassIcon}
            actionLabel="検索をクリア"
            onAction={() => setSearchQuery("")}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch">
            {filteredGroupList.map(
              (group: GroupResponseSchemaType & { groupRole?: string }) => {
                const isProcessing = processingGroupIds.includes(group.groupId);
                const roleColor =
                  group.groupRole === "GROUP_OWNER"
                    ? "secondary"
                    : group.groupRole === "GROUP_ADMIN"
                      ? "warning"
                      : group.groupRole === "GROUP_MANAGER"
                        ? "primary"
                        : "default";

                return (
                  <Card
                    key={group.groupId}
                    as="div"
                    isPressable
                    onPress={() => handleCardPress(group.groupId)}
                    className={`group relative bg-white border border-default-200 rounded-lg transition-all duration-200 hover:shadow-md hover:border-default-300 h-full flex flex-col ${isProcessing ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                    shadow="sm"
                    role="button"
                    aria-label={`${group.groupName}を開く`}
                    tabIndex={0}
                  >
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 rounded-lg">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-default-600">
                            処理中...
                          </span>
                        </div>
                      </div>
                    )}

                    <CardBody className="p-5 flex flex-col h-full gap-4">
                      {/* ヘッダー部分 - 固定高さ */}
                      <div className="flex items-start justify-between gap-3 flex-shrink-0">
                        <h3 className="text-base font-semibold text-foreground line-clamp-2 flex-1 leading-snug min-h-[2.5rem]">
                          {group.groupName}
                        </h3>
                        <Chip
                          size="sm"
                          color={roleColor}
                          variant="flat"
                          className="shrink-0 text-xs"
                        >
                          {group.groupRole === "GROUP_OWNER"
                            ? "オーナー"
                            : group.groupRole === "GROUP_ADMIN"
                              ? "管理者"
                              : group.groupRole === "GROUP_MANAGER"
                                ? "マネージャー"
                                : "メンバー"}
                        </Chip>
                      </div>

                      {/* 説明文 - 固定高さで常に表示 */}
                      <div className="flex-shrink-0 min-h-[3rem] flex items-start">
                        {group.groupDescription ? (
                          <p className="text-sm text-default-600 line-clamp-2 leading-relaxed w-full">
                            {group.groupDescription}
                          </p>
                        ) : (
                          <p className="text-sm text-transparent line-clamp-2 leading-relaxed w-full">
                            説明がありません
                          </p>
                        )}
                      </div>

                      {/* フッター部分 - 下部に固定 */}
                      <div className="mt-auto pt-3 border-t border-default-100 flex-shrink-0">
                        <div className="flex items-center justify-between gap-2">
                          {/* タグ */}
                          <div className="flex-1 min-w-0 flex flex-wrap gap-1 items-center">
                            {group.tag ? (
                              <Chip
                                color="default"
                                variant="flat"
                                size="sm"
                                className="truncate max-w-full text-xs"
                              >
                                {group.tag}
                              </Chip>
                            ) : (
                              <span className="text-xs text-default-400">
                                タグなし
                              </span>
                            )}
                          </div>

                          {/* アクションボタン */}
                          <div className="flex gap-1 shrink-0">
                            {canEditGroupConfig(group.groupId) && (
                              <Tooltip
                                content="設定"
                                placement="top"
                                delay={300}
                              >
                                <Button
                                  isIconOnly
                                  variant="light"
                                  color="default"
                                  size="sm"
                                  onPress={() =>
                                    handleConfigPress(group.groupId)
                                  }
                                  aria-label="グループ設定を開く"
                                  className="min-w-8 h-8"
                                >
                                  <CogIcon className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}

                            {canEditGroupConfig(group.groupId) && (
                              <Tooltip
                                content="コピー"
                                placement="top"
                                delay={300}
                              >
                                <Button
                                  isIconOnly
                                  variant="light"
                                  color="primary"
                                  size="sm"
                                  onPress={() => handleCopyPress(group)}
                                  aria-label="グループをコピー"
                                  className="min-w-8 h-8"
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}

                            {canDeleteGroup(group.groupId) && (
                              <Tooltip
                                content="削除"
                                placement="top"
                                delay={300}
                              >
                                <Button
                                  isIconOnly
                                  variant="light"
                                  color="danger"
                                  size="sm"
                                  onPress={() =>
                                    handleDeletePress(group.groupId)
                                  }
                                  aria-label="グループを削除"
                                  className="min-w-8 h-8"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              },
            )}
          </div>
        )}

        {/* 削除確認モーダル */}
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">グループの削除</h2>
              <p className="text-sm text-default-500 font-normal">
                この操作は取り消せません
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-2">
                <p className="text-base text-foreground">
                  本当にこのグループを削除しますか？
                </p>
                <p className="text-sm text-default-500">
                  グループに紐づくすべてのデータ（ボット、チャット履歴、ファイルなど）が削除されます。
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="pt-4 border-t">
              <Button variant="flat" onPress={closeModal}>
                キャンセル
              </Button>
              <Button
                color="danger"
                onPress={handleConfirmDelete}
                isLoading={
                  selectedGroupId
                    ? processingGroupIds.includes(selectedGroupId)
                    : false
                }
              >
                削除する
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* 設定モーダル */}
        <GroupConfigModal
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
          onSave={handleSaveConfig}
          groupConfig={groupConfig}
          initialGroupData={initialGroupData}
        />

        {/* コピーモーダル */}
        <Modal isOpen={isCopyModalOpen} onClose={closeCopyModal}>
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold">グループをコピー</h2>
              <p className="text-sm text-default-500 font-normal">
                既存のグループ設定をコピーして新しいグループを作成します
              </p>
            </ModalHeader>
            <ModalBody className="space-y-4">
              {copySourceGroup && (
                <div className="bg-default-50 rounded-lg p-3 border border-default-200">
                  <p className="text-xs text-default-500 mb-1">コピー元</p>
                  <p className="text-sm font-medium text-foreground">
                    {copySourceGroup.groupName}
                  </p>
                </div>
              )}
              <Input
                label="グループ名"
                labelPlacement="outside"
                variant="bordered"
                placeholder="例）チーム名（コピー）"
                value={copyFormValues.targetGroupName}
                onValueChange={(value) =>
                  setCopyFormValues((prev) => ({
                    ...prev,
                    targetGroupName: value,
                  }))
                }
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  input:
                    "focus:outline-none focus-visible:outline-none text-sm",
                  inputWrapper:
                    "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                }}
              />
              <Input
                label="説明（任意）"
                labelPlacement="outside"
                variant="bordered"
                placeholder="コピー後のグループの説明"
                value={copyFormValues.targetGroupDescription}
                onValueChange={(value) =>
                  setCopyFormValues((prev) => ({
                    ...prev,
                    targetGroupDescription: value,
                  }))
                }
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  input:
                    "focus:outline-none focus-visible:outline-none text-sm",
                  inputWrapper:
                    "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                }}
              />
              <Input
                label="タグ（任意）"
                labelPlacement="outside"
                variant="bordered"
                placeholder="検索しやすいタグ"
                value={copyFormValues.targetTag}
                onValueChange={(value) =>
                  setCopyFormValues((prev) => ({
                    ...prev,
                    targetTag: value,
                  }))
                }
                classNames={{
                  label: "text-sm font-medium text-gray-900",
                  input:
                    "focus:outline-none focus-visible:outline-none text-sm",
                  inputWrapper:
                    "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                }}
              />
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                <p className="text-xs text-primary-700">
                  <span className="font-semibold">コピーされる内容:</span>
                  <br />
                  ボット基本情報・チャンクテーブル・サジェスト・フォーム
                </p>
              </div>
            </ModalBody>
            <ModalFooter className="pt-4 border-t">
              <Button variant="flat" onPress={closeCopyModal}>
                キャンセル
              </Button>
              <Button
                color="primary"
                onPress={handleCopySubmit}
                isDisabled={!isCopyFormValid || isCopyProcessing}
                isLoading={isCopyProcessing}
              >
                コピーを作成
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
