import { addToast } from "@heroui/react";
import {
  create_bot_v2_bot_create__group_id__post,
  create_bot_from_template_v2_bot_create_from_template__group_id__post,
  endpoint_update_bot_v2_bot_update__group_id___bot_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  BotCreateRequestSchemaType,
  BotResponseSchemaType,
  BotUpdateRequestSchemaType,
  CreateBotFromTemplateRequestSchemaType,
} from "@repo/api-contracts/based_template/zschema";

// ファイルアップロード対応の型定義
type BotCreateRequestWithBase64 = Omit<
  BotCreateRequestSchemaType,
  "botIconFile"
> & {
  botIconFile?: string | null;
  fileIdList?: number[] | null;
  templateIdList?: number[] | null;
};

type BotUpdateRequestWithBase64 = Omit<
  BotUpdateRequestSchemaType,
  "botIconFile"
> & {
  botIconFile?: string | null;
  fileIdList?: number[] | null;
  templateIdList?: number[] | null;
};
import { useCallback, useMemo, useState } from "react";
import { useGroupContext, useGroupDataContext } from "../../layout-client";
import {
  handleErrorWithUI,
  showLoadingToast,
  showSuccessToast,
} from "@common/errorHandler";

export type PermissionLevel = "GROUP_OWNER" | "GROUP_MEMBER";

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  GROUP_OWNER: "オーナーのみ",
  GROUP_MEMBER: "誰でも",
};

export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  GROUP_OWNER: 2,
  GROUP_MEMBER: 1,
};

export function hasPermissionLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel,
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
}

function isValidUuid(value: string | undefined): boolean {
  if (!value) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function useBotManagement(refreshBotList?: () => Promise<void>) {
  const groupId = useGroupContext();
  const isGroupIdValid = isValidUuid(groupId);

  const { user, groupRole, isAuthChecked } = useGroupDataContext();
  const authChecked = isAuthChecked;

  const userPermissionLevel = useMemo<PermissionLevel>(() => {
    return groupRole === "GROUP_OWNER" ? "GROUP_OWNER" : "GROUP_MEMBER";
  }, [groupRole]);

  const isGroupMember = userPermissionLevel === "GROUP_MEMBER";

  // モーダル状態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetBot, setEditTargetBot] =
    useState<BotResponseSchemaType | null>(null);
  const [isEditModalLoading, setIsEditModalLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<BotResponseSchemaType | null>(
    null,
  );

  // テンプレから作成モーダル
  const [isTemplateCreateModalOpen, setIsTemplateCreateModalOpen] =
    useState(false);

  // ボット作成・編集状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIconFile, setSelectedIconFile] = useState<File | null>(null);
  const [iconPreviewUrl, setIconPreviewUrl] = useState("/botIcon/default.ico");

  // 操作結果の状態管理
  const [operationResult, setOperationResult] = useState<{
    type: "success" | "error" | null;
    message: string;
    details?: string;
  } | null>(null);

  // 権限チェック
  const guardEditPermission = useCallback(
    (opts?: { requireAdmin?: boolean }) => {
      if (!isGroupIdValid) {
        handleErrorWithUI(
          {
            message: "グループIDが不正です。ページを再読み込みしてください。",
          },
          "ボット編集権限チェック",
        );
        return false;
      }
      if (opts?.requireAdmin && isGroupMember) {
        handleErrorWithUI(
          {
            message: "オーナーのみがこの操作を実行できます。",
          },
          "ボット編集権限チェック",
        );
        return false;
      }
      return true;
    },
    [isGroupIdValid, isGroupMember],
  );

  // ユーザーが選択可能な権限レベルを取得
  const getAvailablePermissionLevels = useCallback((): PermissionLevel[] => {
    const allLevels: PermissionLevel[] = ["GROUP_MEMBER", "GROUP_OWNER"];
    return allLevels.filter((level) =>
      hasPermissionLevel(userPermissionLevel, level),
    );
  }, [userPermissionLevel]);

  // アイコン関連の操作
  const handleIconModalComplete = useCallback((file: File) => {
    setSelectedIconFile(file);
    setIconPreviewUrl(URL.createObjectURL(file));

    // アイコンが正常に設定されたことを通知
    showSuccessToast("アイコンを設定しました");
  }, []);

  const resetIconState = useCallback(() => {
    setSelectedIconFile(null);
    setIconPreviewUrl("/botIcon/default.ico");
  }, []);

  const setIconPreviewFromBot = useCallback(
    (bot: BotResponseSchemaType | null, iconUrl?: string) => {
      if (iconUrl) {
        // 引数で渡された署名付きURLを使用
        setIconPreviewUrl(iconUrl);
      } else if (bot?.botIconImgGcsPath) {
        // バックエンドから返される署名付きURLを使用
        setIconPreviewUrl(bot.botIconImgGcsPath);
      } else {
        setIconPreviewUrl("/botIcon/default.ico");
      }
      setSelectedIconFile(null);
    },
    [],
  );

  // 操作結果のクリア
  const clearOperationResult = useCallback(() => {
    setOperationResult(null);
  }, []);

  // ファイルをdataURLに変換する関数
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ボット作成・更新処理
  const handleBotSubmit = useCallback(
    async (
      formData: BotCreateRequestSchemaType | BotUpdateRequestSchemaType,
      isCreateMode: boolean,
      bot?: BotResponseSchemaType | null,
    ) => {
      if (!isGroupIdValid) {
        setOperationResult({
          type: "error",
          message: "グループIDが不正です。",
          details: "ページを再読み込みしてください。",
        });
        return false;
      }

      const actionText = isCreateMode ? "作成" : "更新";
      setIsSubmitting(true);

      // 操作開始の通知
      showLoadingToast(`ボットを${actionText}しています`);

      try {
        if (isCreateMode) {
          // 作成モード
          let botIconFileBase64: string | null = null;
          if (selectedIconFile && selectedIconFile instanceof File) {
            botIconFileBase64 = await fileToBase64(selectedIconFile);
          }

          const createData: BotCreateRequestWithBase64 = {
            botName: formData.botName,
            botDescription: formData.botDescription ?? null,
            botPurpose: formData.botPurpose ?? null,
            botAnswerRules: formData.botAnswerRules ?? null,
            botPremiseData: formData.botPremiseData ?? null,
            botIconImgGcsPath: null,
            botIconFile: botIconFileBase64,
            botPermissionLevel: formData.botPermissionLevel ?? "GROUP_MEMBER",
            isWebSearchBot: (formData as any).isWebSearchBot ?? false,
            botSearchUrl: (formData as any).botSearchUrl ?? null,
            botSearchInfoPrompt: (formData as any).botSearchInfoPrompt ?? null,
            fileIdList: (formData as any).fileIdList ?? null,
            templateIdList: (formData as any).templateIdList ?? null,
          };

          await create_bot_v2_bot_create__group_id__post(
            groupId!,
            createData as any,
          );
        } else {
          // 編集モード
          let botIconFileBase64: string | null = null;
          if (selectedIconFile && selectedIconFile instanceof File) {
            botIconFileBase64 = await fileToBase64(selectedIconFile);
          }

          const updateData: BotUpdateRequestWithBase64 = {
            botName: formData.botName,
            botDescription: formData.botDescription ?? null,
            botPurpose: formData.botPurpose ?? null,
            botAnswerRules: formData.botAnswerRules ?? null,
            botPremiseData: formData.botPremiseData ?? null,
            botIconImgGcsPath: bot?.botIconImgGcsPath ?? null,
            botIconFile: botIconFileBase64,
            botPermissionLevel: formData.botPermissionLevel ?? null,
            isWebSearchBot: (formData as any).isWebSearchBot ?? undefined,
            botSearchUrl: (formData as any).botSearchUrl ?? null,
            botSearchInfoPrompt: (formData as any).botSearchInfoPrompt ?? null,
            fileIdList: (formData as any).fileIdList ?? null,
            templateIdList: (formData as any).templateIdList ?? null,
          };

          await endpoint_update_bot_v2_bot_update__group_id___bot_id__post(
            groupId!,
            bot!.botId.toString(),
            updateData as any,
          );
        }

        // 成功時の操作結果を設定
        setOperationResult({
          type: "success",
          message: `ボットを${actionText}しました`,
          details: isCreateMode
            ? "新しいボットが正常に作成されました。"
            : "ボット情報が正常に更新されました。",
        });

        // 成功のトースト通知
        showSuccessToast(`ボットを${actionText}しました`);

        // ボット一覧を再取得（非同期で実行）
        if (refreshBotList) {
          console.log("🔄 Bot updated, calling refreshBotList...");
          refreshBotList().catch((error) => {
            handleErrorWithUI(error, "ボット一覧更新");
          });
        }

        return true;
      } catch (error) {
        const apiError = handleErrorWithUI(error, `ボット${actionText}`);

        // エラー時の操作結果を設定
        setOperationResult({
          type: "error",
          message: `ボットの${actionText}に失敗しました。`,
          details: apiError.message,
        });

        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [isGroupIdValid, groupId, selectedIconFile, refreshBotList],
  );

  // テンプレからボット作成（bot_premise_data を構造化入力で生成）
  const handleCreateFromTemplate = useCallback(
    async (payload: CreateBotFromTemplateRequestSchemaType) => {
      if (!isGroupIdValid) {
        handleErrorWithUI(
          { message: "グループIDが不正です。ページを再読み込みしてください。" },
          "テンプレボット作成",
        );
        return false;
      }
      if (!guardEditPermission({ requireAdmin: true })) return false;

      showLoadingToast("テンプレからボットを作成しています");
      try {
        await create_bot_from_template_v2_bot_create_from_template__group_id__post(
          groupId!,
          payload,
        );

        showSuccessToast("テンプレからボットを作成しました");
        if (refreshBotList) {
          refreshBotList().catch((error) =>
            handleErrorWithUI(error, "ボット一覧更新"),
          );
        }
        return true;
      } catch (error) {
        handleErrorWithUI(error, "テンプレボット作成");
        return false;
      }
    },
    [groupId, guardEditPermission, isGroupIdValid, refreshBotList],
  );

  // モーダル操作
  const openCreateModal = useCallback(() => {
    if (!guardEditPermission({ requireAdmin: true })) return;
    setIsCreateModalOpen(true);
    resetIconState();
    clearOperationResult();
  }, [guardEditPermission, resetIconState, clearOperationResult]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetIconState();
    clearOperationResult();
  }, [resetIconState, clearOperationResult]);

  const openEditModal = useCallback(
    async (bot: BotResponseSchemaType) => {
      if (!guardEditPermission({ requireAdmin: true })) return;
      setEditTargetBot(bot);
      setIsEditModalOpen(true);
      setIsEditModalLoading(true);
      setIconPreviewFromBot(bot);
      clearOperationResult();

      // モーダル表示時はリロードしない（UX改善）。必要な情報は引数botから描画。
      setIsEditModalLoading(false);
    },
    [guardEditPermission, setIconPreviewFromBot, clearOperationResult],
  );

  const closeEditModal = useCallback(() => {
    setEditTargetBot(null);
    setIsEditModalOpen(false);
    setIsEditModalLoading(false);
    resetIconState();
    clearOperationResult();
  }, [resetIconState, clearOperationResult]);

  const openDeleteModal = useCallback(
    (bot: BotResponseSchemaType) => {
      if (!guardEditPermission({ requireAdmin: true })) return;
      setBotToDelete(bot);
      setIsDeleteModalOpen(true);
    },
    [guardEditPermission],
  );

  const closeDeleteModal = useCallback(() => {
    setBotToDelete(null);
    setIsDeleteModalOpen(false);
  }, []);

  const openTemplateCreateModal = useCallback(() => {
    if (!guardEditPermission({ requireAdmin: true })) return;
    setIsTemplateCreateModalOpen(true);
  }, [guardEditPermission]);

  const closeTemplateCreateModal = useCallback(() => {
    setIsTemplateCreateModalOpen(false);
  }, []);

  return {
    // 状態
    groupId,
    isGroupIdValid,
    user,
    authChecked,
    userPermissionLevel,
    isGroupMember,
    isSubmitting,
    selectedIconFile,
    iconPreviewUrl,
    operationResult,

    // モーダル状態
    isCreateModalOpen,
    isEditModalOpen,
    editTargetBot,
    isEditModalLoading,
    isDeleteModalOpen,
    botToDelete,
    isTemplateCreateModalOpen,

    // 操作
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    handleBotSubmit,
    handleCreateFromTemplate,
    openTemplateCreateModal,
    closeTemplateCreateModal,
    handleIconModalComplete,
    resetIconState,
    setIconPreviewFromBot,
    getAvailablePermissionLevels,
    clearOperationResult,
  };
}
