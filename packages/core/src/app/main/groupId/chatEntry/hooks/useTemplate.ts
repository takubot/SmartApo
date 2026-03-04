"use client";

import {
  delete_chat_entry_v2_chat_entry__chat_entry_id__delete,
  get_chat_entry_detail_v2_chat_entry__chat_entry_id__get,
  get_chat_entry_list_v2_chat_entry_list__group_id__get,
  toggle_chat_entry_visibility_v2_chat_entry__chat_entry_id__visibility_patch,
} from "@repo/api-contracts/based_template/service";
import {
  ChatEntryAccessPolicySchemaType,
  ChatEntryDetailResponseType,
  ChatEntryThemeSchemaType,
  ChatEntryWebSchemaType,
} from "@repo/api-contracts/based_template/zschema";

import { useCallback, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  handleErrorWithUI,
  showLoadingToast,
  showSuccessToast,
} from "@common/errorHandler";
import { resolveChatEntryKind } from "../types";
import { useRouter } from "next/navigation";

export function useTemplate(groupId: string) {
  const router = useRouter();
  const resolveEntryKind = useCallback(
    (entry?: ChatEntryDetailResponseType | null) => resolveChatEntryKind(entry),
    [],
  );

  // ------------------ selection state ------------------
  const [selectedUrls, setSelectedUrls] = useState<
    ChatEntryDetailResponseType[]
  >([]);

  // ------------------ config management ------------------
  const cacheKey = groupId ? ["chat-entries", groupId] : null;
  const {
    data: allConfigs,
    error: configError,
    isLoading: configIsLoading,
  } = useSWR<ChatEntryDetailResponseType[]>(
    cacheKey,
    async ([_, gId]) => {
      const result =
        await get_chat_entry_list_v2_chat_entry_list__group_id__get(
          gId as string,
        );
      if (result && result.chatEntries && Array.isArray(result.chatEntries)) {
        return result.chatEntries as ChatEntryDetailResponseType[];
      }
      throw new Error("設定一覧の取得に失敗しました");
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000, // 5分キャッシュ
      errorRetryCount: 3,
      keepPreviousData: true,
    },
  );

  const fetchAllIntegratedConfigs = useCallback(
    async (forceRefresh: boolean = false) => {
      if (!groupId) return null;
      try {
        if (!forceRefresh && allConfigs) {
          return allConfigs;
        }
        const freshData = await globalMutate(cacheKey, async () => {
          const result =
            await get_chat_entry_list_v2_chat_entry_list__group_id__get(
              groupId,
            );
          if (
            result &&
            result.chatEntries &&
            Array.isArray(result.chatEntries)
          ) {
            return result.chatEntries as ChatEntryDetailResponseType[];
          }
          throw new Error("設定一覧の取得に失敗しました");
        });
        return (
          (freshData as ChatEntryDetailResponseType[]) || allConfigs || null
        );
      } catch (e) {
        console.error("設定データの取得に失敗しました:", e);
        return allConfigs || null;
      }
    },
    [groupId, allConfigs, cacheKey],
  );

  const refreshConfigs = useCallback(async () => {
    if (!cacheKey) return null;
    return await globalMutate(cacheKey);
  }, [cacheKey]);

  const getWebConfig = useCallback(
    (
      entryUuid: string,
      configs: ChatEntryDetailResponseType[],
    ): ChatEntryWebSchemaType | null => {
      const config = configs.find(
        (c) => String(c.chatEntryId) === String(entryUuid),
      );
      return config?.webConfig || null;
    },
    [],
  );

  // ------------------ data integration ------------------
  const urlList: ChatEntryDetailResponseType[] = Array.isArray(allConfigs)
    ? (allConfigs as ChatEntryDetailResponseType[])
    : [];

  const statistics = useMemo(() => {
    const webCount = urlList.filter((u) => !!u.webConfig).length;
    const lineCount = urlList.filter((u) => !!u.lineConfig).length;
    const totalCount = urlList.length;
    return { webCount, lineCount, totalCount };
  }, [urlList]);

  // ------------------ modals ------------------
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [fullChatUrlModalOpen, setFullChatUrlModalOpen] = useState(false);
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  const [isScriptModalLoading, setIsScriptModalLoading] = useState(false);
  const [isFullChatUrlModalLoading, setIsFullChatUrlModalLoading] =
    useState(false);

  const [scriptContent, setScriptContent] = useState("");
  const [fullChatUrlContent, setFullChatUrlContent] = useState("");
  const [isLineConfigForScript, setIsLineConfigForScript] = useState(false);
  const [isLineConfigForFullUrl, setIsLineConfigForFullUrl] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<ChatEntryDetailResponseType | null>(null);

  const openScriptModal = useCallback(
    async (url: ChatEntryDetailResponseType) => {
      setScriptModalOpen(true);
      setIsScriptModalLoading(true);
      const anyUrl: any = url as any;
      const lineConfig: any = anyUrl.lineConfig ?? anyUrl.line_config ?? null;
      const kind = resolveEntryKind(url);
      const isLine = kind === "LINE";
      const isWeb = kind === "WEB";
      setIsLineConfigForScript(isLine);

      if (isWeb) {
        try {
          const entryUuid = String(url.chatEntryId);
          let webConfig = allConfigs
            ? getWebConfig(entryUuid, allConfigs)
            : null;
          if (!webConfig?.embedScript) {
            const maybeConfigs = await fetchAllIntegratedConfigs(false);
            webConfig = maybeConfigs
              ? getWebConfig(entryUuid, maybeConfigs)
              : webConfig;
          }
          if (!webConfig?.embedScript) {
            const freshConfigs = await fetchAllIntegratedConfigs(true);
            webConfig = freshConfigs
              ? getWebConfig(entryUuid, freshConfigs)
              : webConfig;
          }

          if (webConfig?.embedScript && webConfig.embedScript.trim()) {
            setScriptContent(webConfig.embedScript);
          } else {
            setScriptContent(
              "埋め込みコードが設定されていません\n\nフロントエンドドメインURLが正しく設定されていない可能性があります。",
            );
          }
        } catch (error) {
          console.error("埋め込みコード取得エラー:", error);
          setScriptContent("埋め込みコードの取得に失敗しました");
        }
      } else if (isLine) {
        try {
          const endpointUrl =
            lineConfig?.endpointUrl || lineConfig?.endpoint_url || "";
          if (typeof endpointUrl === "string" && endpointUrl.trim()) {
            setScriptContent(endpointUrl);
          } else {
            setScriptContent("エンドポイントURLが設定されていません");
          }
        } catch (error) {
          console.error("エンドポイントURL取得エラー:", error);
          setScriptContent("エンドポイントURLの取得に失敗しました");
        }
      } else {
        setScriptContent("URL設定が見つかりません");
      }
      setIsScriptModalLoading(false);
    },
    [allConfigs, getWebConfig, fetchAllIntegratedConfigs, resolveEntryKind],
  );

  const openFullChatUrlModal = useCallback(
    async (url: ChatEntryDetailResponseType) => {
      setFullChatUrlModalOpen(true);
      setIsFullChatUrlModalLoading(true);
      const anyUrl: any = url as any;
      const lineConfig: any = anyUrl.lineConfig ?? anyUrl.line_config ?? null;
      const kind = resolveEntryKind(url);
      const isLine = kind === "LINE";
      const isWeb = kind === "WEB";
      setIsLineConfigForFullUrl(isLine);

      if (isWeb) {
        try {
          const entryUuid = String(url.chatEntryId);
          let webConfig = allConfigs
            ? getWebConfig(entryUuid, allConfigs)
            : null;
          if (!webConfig?.fullEntryUrl) {
            const maybeConfigs = await fetchAllIntegratedConfigs(false);
            webConfig = maybeConfigs
              ? getWebConfig(entryUuid, maybeConfigs)
              : webConfig;
          }
          if (!webConfig?.fullEntryUrl) {
            const freshConfigs = await fetchAllIntegratedConfigs(true);
            webConfig = freshConfigs
              ? getWebConfig(entryUuid, freshConfigs)
              : webConfig;
          }

          if (webConfig?.fullEntryUrl && webConfig.fullEntryUrl.trim()) {
            setFullChatUrlContent(webConfig.fullEntryUrl);
          } else {
            setFullChatUrlContent(
              "フルチャットURLが設定されていません\n\nフロントエンドドメインURLが正しく設定されていない可能性があります。",
            );
          }
        } catch (error) {
          console.error("フルチャットURL取得エラー:", error);
          setFullChatUrlContent("フルチャットURLの取得に失敗しました");
        }
      } else if (isLine) {
        try {
          const webhookUrl =
            lineConfig?.webhookUrl || lineConfig?.webhook_url || "";
          if (typeof webhookUrl === "string" && webhookUrl.trim()) {
            setFullChatUrlContent(webhookUrl);
          } else {
            setFullChatUrlContent("Webhook URLが設定されていません");
          }
        } catch (error) {
          console.error("Webhook URL取得エラー:", error);
          setFullChatUrlContent("Webhook URLの取得に失敗しました");
        }
      } else {
        setFullChatUrlContent("WEBタイプまたはLINEタイプのURLのみ表示できます");
      }
      setIsFullChatUrlModalLoading(false);
    },
    [allConfigs, getWebConfig, fetchAllIntegratedConfigs, resolveEntryKind],
  );

  const openDeleteConfirmModal = useCallback(
    (url: ChatEntryDetailResponseType) => {
      setDeleteTarget(url);
      setDeleteConfirmModalOpen(true);
    },
    [],
  );

  const openBulkDeleteModal = useCallback(() => {
    setBulkDeleteModalOpen(true);
  }, []);

  const closeScriptModal = useCallback(() => {
    setScriptModalOpen(false);
    setScriptContent("");
    setIsScriptModalLoading(false);
    setIsLineConfigForScript(false);
  }, []);

  const closeFullChatUrlModal = useCallback(() => {
    setFullChatUrlModalOpen(false);
    setFullChatUrlContent("");
    setIsFullChatUrlModalLoading(false);
    setIsLineConfigForFullUrl(false);
  }, []);

  const closeDeleteConfirmModal = useCallback(() => {
    setDeleteConfirmModalOpen(false);
    setDeleteTarget(null);
  }, []);

  const closeBulkDeleteModal = useCallback(() => {
    setBulkDeleteModalOpen(false);
  }, []);

  // ------------------ actions (delete) ------------------
  const [loading, setLoading] = useState({
    isDeleting: false,
    isBulkDeleting: false,
  });

  const handleDelete = async (urlId: number) => {
    setLoading((prev) => ({ ...prev, isDeleting: true }));
    try {
      await delete_chat_entry_v2_chat_entry__chat_entry_id__delete(
        String(urlId),
      );
      showSuccessToast("URLを削除しました");
      await refreshConfigs();
    } catch (error: any) {
      handleErrorWithUI(error, "URL削除");
    } finally {
      setLoading((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  const handleBulkDelete = async (
    chatEntries: ChatEntryDetailResponseType[],
  ) => {
    setLoading((prev) => ({ ...prev, isBulkDeleting: true }));
    showLoadingToast("一括削除");
    try {
      const deletePromises = chatEntries.map((entry) =>
        delete_chat_entry_v2_chat_entry__chat_entry_id__delete(
          String(entry.chatEntryId),
        ),
      );
      await Promise.all(deletePromises);
      showSuccessToast(`${chatEntries.length}件のURLを削除しました`);
      await refreshConfigs();
    } catch (error: any) {
      handleErrorWithUI(error, "一括削除");
    } finally {
      setLoading((prev) => ({ ...prev, isBulkDeleting: false }));
    }
  };

  const handleToggleVisibility = async (
    chatEntryId: number,
    isVisible: boolean,
  ) => {
    try {
      await toggle_chat_entry_visibility_v2_chat_entry__chat_entry_id__visibility_patch(
        String(chatEntryId),
        { isVisible },
      );
      const status = isVisible ? "表示" : "非表示";
      showSuccessToast(`チャットエントリを${status}に設定しました`);
      await refreshConfigs();
    } catch (error: any) {
      handleErrorWithUI(error, "表示/非表示切り替え");
    }
  };

  // ------------------ selection handlers ------------------
  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedUrls([...urlList]);
    else setSelectedUrls([]);
  };
  const handleSelectItem = (
    url: ChatEntryDetailResponseType,
    checked: boolean,
  ) => {
    if (checked) setSelectedUrls((prev) => [...prev, url]);
    else
      setSelectedUrls((prev) =>
        prev.filter((item) => item.chatEntryId !== url.chatEntryId),
      );
  };

  // ------------------ high-level UI handlers ------------------
  const handleCreateClick = () => {
    router.push(`/main/${groupId}/chatEntry/create`);
  };
  const handleEditClick = (url: ChatEntryDetailResponseType) => {
    router.push(`/main/${groupId}/chatEntry/${url.chatEntryId}/edit`);
  };
  const handleDeleteClick = (url: ChatEntryDetailResponseType) =>
    openDeleteConfirmModal(url);
  const handleBulkDeleteClick = () => {
    if (selectedUrls.length > 0) openBulkDeleteModal();
  };
  const handleBulkDeleteConfirm = async () => {
    await handleBulkDelete(selectedUrls);
    setSelectedUrls([]);
    closeBulkDeleteModal();
  };
  const handleScriptClick = (url: ChatEntryDetailResponseType) =>
    openScriptModal(url);
  const handleFullChatUrlClick = (url: ChatEntryDetailResponseType) =>
    openFullChatUrlModal(url);

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await handleDelete(deleteTarget.chatEntryId);
      closeDeleteConfirmModal();
    }
  };

  return {
    // データ
    urlList,
    selectedUrls,
    isDataLoading: configIsLoading,
    ...statistics,

    // 状態
    scriptModalOpen,
    fullChatUrlModalOpen,
    deleteConfirmModalOpen,
    bulkDeleteModalOpen,
    isScriptModalLoading,
    isFullChatUrlModalLoading,
    loading,

    // ターゲット
    deleteTarget,
    scriptContent,
    fullChatUrlContent,
    isLineConfigForScript,
    isLineConfigForFullUrl,

    // アクション
    handleSelectAll,
    handleSelectItem,
    handleCreateClick,
    handleEditClick,
    handleDeleteClick,
    handleBulkDeleteClick,
    handleBulkDeleteConfirm,
    handleScriptClick,
    handleFullChatUrlClick,
    handleDeleteConfirm,
    handleToggleVisibility,

    // モーダル制御
    closeScriptModal,
    closeFullChatUrlModal,
    closeDeleteConfirmModal,
    closeBulkDeleteModal,
  } as const;
}
