import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useSWR from "swr";
import {
  getBotListFromBackend,
  getChatSpacesFromBackend,
  createChatSpace,
  deleteChatSpace,
  updateChatSpace,
  getChatSpaceHistoryFromBackend,
  evaluateChat,
  postChatFeedback,
  getAIModelsFromBackend,
} from "./useChatService";
import { AIModel, Message } from "../types";
import type {
  CreateChatAIPlatformSchemaType,
  ChatSpaceSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import {
  chatCreateStreamRequest,
  chatCreateAIPlatformStreamRequest,
  chatCreateAIPlatformImageRequest,
} from "./useChatService";
import { handleErrorWithUI } from "@common/errorHandler";

export const useTemplate = (groupId: string) => {
  // -------------------- session --------------------
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    const initializeSessionId = () => {
      if (typeof window === "undefined") return "";
      const uid = localStorage.getItem("userId");
      if (uid) return uid;
      const newId = crypto.randomUUID();
      localStorage.setItem("userId", newId);
      return newId;
    };
    setSessionId(initializeSessionId());
  }, []);

  // -------------------- chat state (ui) --------------------
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMobile, setIsMobile] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let prevIsMobile: boolean | undefined = undefined;
    const applyViewportState = () => {
      const isDesktop = window.innerWidth >= 640;
      const nextIsMobile = !isDesktop;
      if (prevIsMobile === undefined) {
        // 初期化: デスクトップなら開く、モバイルなら閉じる
        setIsMobile(nextIsMobile);
        setIsSidebarOpen(!nextIsMobile);
      } else if (prevIsMobile !== nextIsMobile) {
        // 遷移検出: モバイルに入った時のみ自動で閉じる
        setIsMobile(nextIsMobile);
        if (nextIsMobile) setIsSidebarOpen(false);
      }
      prevIsMobile = nextIsMobile;
    };
    const handleResize = () => {
      applyViewportState();
    };
    applyViewportState();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleUserScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const scrolling = scrollTop + clientHeight < scrollHeight - 10;
      setIsUserScrolling(scrolling);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!isUserScrolling && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isUserScrolling]);

  const scrollToTop = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const setError = useCallback((message: string) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMessage(message);
    setShowError(true);
    errorTimerRef.current = setTimeout(() => setShowError(false), 5000);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const clearError = useCallback(() => {
    setShowError(false);
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const openSidebar = useCallback(() => setIsSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(
    () => setIsSidebarOpen((prev) => !prev),
    [],
  );
  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile && isSidebarOpen) setIsSidebarOpen(false);
  }, [isMobile, isSidebarOpen]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // -------------------- chat spaces --------------------
  const [activeChatSpaceId, setActiveChatSpaceId] = useState<string | null>(
    null,
  );
  const [isCreatingNewChatSpace, setIsCreatingNewChatSpace] = useState(false);
  const [isCreatingInitialChatSpace, setIsCreatingInitialChatSpace] =
    useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [activeMenuChatSpaceId, setActiveMenuChatSpaceId] = useState<
    string | null
  >(null);
  const [isDeletingChatSpace, setIsDeletingChatSpace] = useState(false);
  const [deletingChatSpaceId, setDeletingChatSpaceId] = useState<string | null>(
    null,
  );

  // fetch chat spaces
  const chatSpacesFetcher = async (): Promise<ChatSpaceSchemaType[]> => {
    if (!groupId) return [];
    try {
      return await getChatSpacesFromBackend(groupId);
    } catch (e) {
      handleErrorWithUI(e, "チャットスペース一覧取得");
      // エラー時は空配列を返す（エラー表示はSWRのerrorで処理）
      return [];
    }
  };
  const {
    data: rawChatSpaces,
    isLoading: isChatSpacesLoading,
    error: chatSpacesError,
    mutate: mutateChatSpaces,
  } = useSWR(groupId ? `chat-spaces-${groupId}` : null, chatSpacesFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 5000,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  });

  const chatSpaces = useMemo(() => {
    if (!Array.isArray(rawChatSpaces)) return [];
    return rawChatSpaces
      .map((s: ChatSpaceSchemaType) => ({
        chatSpaceId: String(s.chatSpaceId),
        title: s.chatSpaceName || null,
        createdAt: s.createdAt,
        lastMessage: s.lastMessage || null,
        userId: (s as any).userId ?? null,
        externalUserId: s.externalUserId ?? null,
      }))
      .filter(
        (space, index: number, self) =>
          index === self.findIndex((c) => c.chatSpaceId === space.chatSpaceId),
      );
  }, [rawChatSpaces]);

  const initializeChatSpace = useCallback(async () => {
    if (
      !groupId ||
      isChatSpacesLoading ||
      isCreatingInitialChatSpace ||
      isInitialized
    )
      return;
    const spaces = chatSpaces;
    if (spaces.length === 0) {
      setIsCreatingInitialChatSpace(true);
      try {
        const result = await createChatSpace(groupId);
        const newChatSpaceId = String(result?.chatSpaceId || result?.id || "");
        if (newChatSpaceId) {
          setActiveChatSpaceId(newChatSpaceId);
          await mutateChatSpaces();
        }
      } catch (error) {
        handleErrorWithUI(error, "初期チャットスペース作成", setError);
      } finally {
        setIsCreatingInitialChatSpace(false);
      }
    } else if (!activeChatSpaceId && spaces[0]) {
      setActiveChatSpaceId(spaces[0].chatSpaceId);
    }
    setIsInitialized(true);
  }, [
    groupId,
    chatSpaces,
    isChatSpacesLoading,
    activeChatSpaceId,
    isInitialized,
    mutateChatSpaces,
    isCreatingInitialChatSpace,
  ]);

  const createNewChatSpace = useCallback(async () => {
    if (isCreatingNewChatSpace) return;
    setIsCreatingNewChatSpace(true);
    try {
      const result = await createChatSpace(groupId);
      const newChatSpaceId = String(result?.chatSpaceId || result?.id || "");
      if (newChatSpaceId) {
        setActiveChatSpaceId(newChatSpaceId);
        await mutateChatSpaces();
      }
    } catch (error) {
      handleErrorWithUI(error, "新規チャットスペース作成", setError);
    } finally {
      setIsCreatingNewChatSpace(false);
    }
  }, [groupId, isCreatingNewChatSpace, mutateChatSpaces, setError]);

  const removeChatSpace = useCallback(
    async (chatSpaceId: string) => {
      if (!chatSpaceId || isDeletingChatSpace) return;
      try {
        setIsDeletingChatSpace(true);
        setDeletingChatSpaceId(chatSpaceId);
        setActiveMenuChatSpaceId(null);
        const remaining = chatSpaces.filter(
          (c: any) => c.chatSpaceId !== chatSpaceId,
        );
        if (remaining.length > 0) {
          setActiveChatSpaceId(remaining[0]?.chatSpaceId || "");
        } else {
          await createNewChatSpace();
        }
        await deleteChatSpace(chatSpaceId);
        await mutateChatSpaces();
      } catch (error) {
        handleErrorWithUI(error, "チャットスペース削除", setError);
      } finally {
        setIsDeletingChatSpace(false);
        setDeletingChatSpaceId(null);
      }
    },
    [
      chatSpaces,
      isDeletingChatSpace,
      createNewChatSpace,
      mutateChatSpaces,
      setError,
    ],
  );

  const updateTitle = useCallback(async () => {
    if (!activeChatSpaceId || !editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    const current = chatSpaces.find(
      (s: any) => s.chatSpaceId === activeChatSpaceId,
    );
    if (current?.title === editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }
    setIsUpdatingTitle(true);
    try {
      await updateChatSpace(Number(activeChatSpaceId), {
        chatSpaceName: editTitle.trim(),
      });
      await mutateChatSpaces();
      setIsEditingTitle(false);
    } catch (error) {
      const apiError = handleErrorWithUI(error, "タイトル更新", setError);
      const originalTitle = current?.title || "";
      setEditTitle(originalTitle);
    } finally {
      setIsUpdatingTitle(false);
    }
  }, [activeChatSpaceId, editTitle, chatSpaces, mutateChatSpaces, setError]);

  useEffect(() => {
    if (!isInitialized && !isCreatingInitialChatSpace && !isChatSpacesLoading) {
      initializeChatSpace();
    }
  }, [
    isInitialized,
    isCreatingInitialChatSpace,
    isChatSpacesLoading,
    initializeChatSpace,
  ]);

  useEffect(() => {
    setIsEditingTitle(false);
    if (activeChatSpaceId) {
      const currentConversation = chatSpaces.find(
        (conv: any) => conv.chatSpaceId === activeChatSpaceId,
      );
      if (currentConversation) setEditTitle(currentConversation.title || "");
    }
  }, [activeChatSpaceId, chatSpaces]);

  // -------------------- model --------------------
  const [selectedModel, setSelectedModel] = useState<string>("");
  const aiModelsFetcher = async () => {
    try {
      return await getAIModelsFromBackend();
    } catch (e) {
      handleErrorWithUI(e, "AIモデル一覧取得");
      return [];
    }
  };
  const { data: rawAIModels, isLoading: isAIModelsLoading } = useSWR(
    "ai-models",
    aiModelsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 60_000,
    },
  );
  const aiModels: AIModel[] = useMemo(() => {
    if (!Array.isArray(rawAIModels)) return [];
    return rawAIModels
      .map((m: any) => ({
        // backendのAIModelSchemaTypeをそのまま踏襲
        displayName: m.displayName,
        apiModelName: m.apiModelName,
        chatType: m.chatType,
        canUploadFile: m.canUploadFile ?? false,
        maxUploadBytes:
          typeof m.maxUploadBytes === "number" ? m.maxUploadBytes : null,
        supportedExtensions: Array.isArray(m.supportedExtensions)
          ? m.supportedExtensions
          : [],
        // フロント用のエイリアス
        id: m.apiModelName,
        name: m.displayName,
      }))
      .filter((m) => m.apiModelName && m.displayName);
  }, [rawAIModels]);
  const availableModels: AIModel[] = useMemo(() => {
    // RAGモデル（id === "rag"）を追加
    const ragModel: AIModel = {
      // AIModelSchemaType 部分
      displayName: "独自モデル",
      apiModelName: "rag",
      chatType: "INTERNAL",
      canUploadFile: false,
      maxUploadBytes: null,
      // フロント用エイリアス
      id: "rag",
      name: "独自モデル",
    };
    // RAGモデルが既に含まれているか確認
    const hasRagModel = aiModels.some((m) => m.id === "rag");
    if (hasRagModel) {
      return aiModels;
    }
    // RAGモデルを先頭に追加
    return [ragModel, ...aiModels];
  }, [aiModels]);
  useEffect(() => {
    if (aiModels.length === 0) return;
  }, [aiModels]);
  const modelIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    const getIcon = (chatType: string | undefined) => {
      switch (chatType) {
        case "BOT_OPENAI":
          return "/botIcon/openai.png";
        case "BOT_ANTHROPIC":
          return "/botIcon/claude.png";
        case "BOT_GEMINI":
          return "/botIcon/gemini.png";
        case "BOT_NANOBANANA":
          return "/botIcon/nano-banana.png";
        case "BOT_PERPLEXITY":
          return "/botIcon/perplexity.png";
        case "INTERNAL":
          return "/botIcon/default.ico";
        default:
          return "/botIcon/default.ico";
      }
    };
    availableModels.forEach((m) => {
      map[m.id] = getIcon(m.chatType);
    });
    return map;
  }, [availableModels]);
  useEffect(() => {
    if (availableModels.length === 0) return;
    const ids = availableModels.map((m) => m.id);
    if (!selectedModel || !ids.includes(selectedModel)) {
      // デフォルトでRAGモデル（id === "rag"）を選択
      const ragModelId = ids.find((id) => id === "rag");
      setSelectedModel(ragModelId ?? ids[0] ?? "");
    }
  }, [availableModels, selectedModel]);

  // -------------------- bot --------------------
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [isBotSelectModalOpen, setIsBotSelectModalOpen] = useState(false);
  const botListFetcher = async () => {
    if (!groupId) return [] as any[];
    try {
      return await getBotListFromBackend(groupId);
    } catch (e) {
      handleErrorWithUI(e, "Bot一覧取得");
      // エラー時は空配列を返す（エラー表示はSWRのerrorで処理）
      return [] as any[];
    }
  };
  const {
    data: rawBotList,
    isLoading: isBotListLoading,
    error: botListError,
    mutate: mutateBotList,
  } = useSWR(groupId ? `bot-list-${groupId}` : null, botListFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 0,
    dedupingInterval: 10000,
  });
  const iconMap = useMemo(() => {
    if (!rawBotList || !Array.isArray(rawBotList))
      return {} as Record<number, string>;
    const map: Record<number, string> = {};
    rawBotList.forEach((bot: any) => {
      if (bot.botId && bot.botIconImgGcsPath) {
        map[bot.botId] = bot.botIconImgGcsPath;
      }
    });
    return map;
  }, [rawBotList]);
  const botList = useMemo(() => {
    if (!rawBotList || !Array.isArray(rawBotList)) return [] as any[];
    return rawBotList
      .map((bot: any) => ({
        botId: bot.botId,
        botName: bot.botName || `Bot ${bot.botId}`,
      }))
      .filter(
        (bot: { botId: number; botName: string }) => bot.botId && bot.botName,
      );
  }, [rawBotList]);
  const openBotSelectModal = useCallback(
    () => setIsBotSelectModalOpen(true),
    [],
  );
  const closeBotSelectModal = useCallback(
    () => setIsBotSelectModalOpen(false),
    [],
  );
  const selectBot = useCallback(
    (botId: number | null) => {
      setSelectedBotId(botId);
      closeBotSelectModal();
    },
    [closeBotSelectModal],
  );
  const resetBotSelection = useCallback(() => setSelectedBotId(null), []);
  const refreshBotData = useCallback(async () => {
    await mutateBotList();
  }, [mutateBotList]);

  // -------------------- history --------------------
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [processedChatIds, setProcessedChatIds] = useState<Set<number>>(
    new Set(),
  );
  const historyFetcher = async () => {
    if (!groupId || !activeChatSpaceId) return null;
    try {
      return await getChatSpaceHistoryFromBackend(groupId, {
        chatSpaceId: activeChatSpaceId,
        page: 1,
        pageSize: 200,
      });
    } catch (e) {
      handleErrorWithUI(e, "チャット履歴取得");
      // エラー時はnullを返す（エラー表示はSWRのerrorで処理）
      return null;
    }
  };
  const {
    data: historyResponse,
    isLoading: isLoadingHistory,
    error: historyError,
    mutate: mutateHistory,
  } = useSWR(
    activeChatSpaceId ? `chat-history-${groupId}-${activeChatSpaceId}` : null,
    historyFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0,
      dedupingInterval: 10000,
    },
  );
  const historyMessages = useMemo(() => {
    if (!historyResponse?.messages || historyResponse.messages.length === 0) {
      return [
        {
          id: 0,
          text: "こんにちは。ご質問をどうぞ！",
          isOwnMessage: false,
          sessionId,
          timestamp: new Date().toLocaleString(),
          botId: 1,
        } as any,
      ];
    }
    const sorted = historyResponse.messages.sort(
      (a: any, b: any) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
    );
    return sorted.map((it: any) => {
      const base: any = {
        id: it.role === "user" ? it.chatLogId * 2 : it.chatLogId * 2 + 1,
        text: (it.content || "").trim(),
        isOwnMessage: it.role === "user",
        sessionId,
        timestamp: it.createdAt
          ? new Date(it.createdAt).toLocaleString()
          : undefined,
        botId: it.botId || undefined,
        chatHistoryId: it.chatHistoryId || undefined,
        chatSpaceId: it.chatSpaceId || undefined,
        evaluation: it.evaluation || null,
      };
      if (it.role === "assistant") {
        // assistantメッセージのみにchatTypeとmodelを設定
        base.model = it.model || undefined;
        base.chatType = it.chatType?.trim() || undefined;

        // 生成画像の署名付きURLがあれば設定 (camelCaseに変換されているはず)
        // ChatSpaceMessageItem schema: generated_image_signed_url -> generatedImageSignedUrl
        if ((it as any).generatedImageSignedUrl) {
          base.generatedImageSignedUrl = (it as any).generatedImageSignedUrl;
        }

        // バックエンドから返されるfileReferenceLinkJsonからfilesとlinksを取得
        const fileReferenceLinkJson =
          it.fileReferenceLinkJson || it.file_reference_link_json;
        if (
          fileReferenceLinkJson &&
          typeof fileReferenceLinkJson === "object"
        ) {
          const files = fileReferenceLinkJson.files || [];
          const links = fileReferenceLinkJson.links || [];

          if (Array.isArray(files) && files.length > 0) {
            base.fileInfo = files.map((fi: any) => ({
              fileId: fi.fileId,
              fileName: fi.fileName || `ファイル(ID: ${fi.fileId})`,
              shortDescription: "参考ファイル",
              relevantPages: Array.isArray(fi.relevantPages)
                ? fi.relevantPages
                : [],
              displayFileLink: fi.displayFileLink !== false,
            }));
          }
          if (Array.isArray(links) && links.length > 0) {
            base.referenceLinkInfo = links.map((link: any) => ({
              referenceLinkId: link.referenceLinkId,
              linkName: link.linkName || "",
              linkUrl: link.linkUrl || "",
              description: link.description,
            }));
          }
        }
      }
      return base;
    });
  }, [historyResponse, sessionId]);
  const messages = useMemo(() => {
    const historyIds = new Set(historyMessages.map((m: any) => m.id));
    const localOnly = localMessages.filter((m) => !historyIds.has(m.id));
    return [...historyMessages, ...localOnly].sort((a, b) => a.id - b.id);
  }, [historyMessages, localMessages]);
  const addMessage = useCallback((message: Message) => {
    setLocalMessages((prev) =>
      prev.some((m) => m.id === message.id) ? prev : [...prev, message],
    );
  }, []);
  const updateMessage = useCallback(
    (messageId: number, updates: Partial<Message>) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg,
        ),
      );
    },
    [],
  );
  const clearMessages = useCallback(() => setLocalMessages([]), []);
  const sendEvaluation = useCallback(
    async (chatHistoryId: number, evaluation: "GOOD" | "BAD") => {
      try {
        await evaluateChat(groupId, { chatHistoryId, evaluation });
        mutateHistory();
      } catch (e) {
        handleErrorWithUI(e, "チャット評価");
      }
    },
    [groupId, mutateHistory],
  );
  const sendFeedback = useCallback(
    async (chatHistoryId: number, feedback: string) => {
      try {
        await postChatFeedback(groupId, { chatHistoryId, feedback });
        mutateHistory();
      } catch (e) {
        handleErrorWithUI(e, "フィードバック送信");
      }
    },
    [groupId, mutateHistory],
  );
  const markChatAsProcessed = useCallback((chatId: number) => {
    setProcessedChatIds((prev) => new Set(prev).add(chatId));
  }, []);
  const isChatProcessed = useCallback(
    (chatId: number) => processedChatIds.has(chatId),
    [processedChatIds],
  );
  useEffect(() => {
    if (activeChatSpaceId) {
      setLocalMessages([]);
      setProcessedChatIds(new Set());
    }
  }, [activeChatSpaceId]);

  // -------------------- file helpers --------------------
  const [loadingFileId, setLoadingFileId] = useState<number | null>(null);
  const openFile = useCallback(
    async (fileId: number) => {
      try {
        setLoadingFileId(fileId);
        const { getFileInfoRequest, openTextFile } = await import(
          "./useChatService"
        );
        const { signedUrl, fileName } = await getFileInfoRequest(fileId);

        // ファイル拡張子を取得
        const fileExtension = fileName
          ? fileName.split(".").pop()?.toLowerCase()
          : undefined;

        // txtファイルの場合はエンコーディングを明示的に処理して新規タブで開く
        if (fileExtension === "txt") {
          await openTextFile(signedUrl, fileName);
        } else {
          // その他のファイルは新規タブで開く
          const link = document.createElement("a");
          link.href = signedUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (e) {
        handleErrorWithUI(e, "ファイル表示", setError);
      } finally {
        setLoadingFileId(null);
      }
    },
    [setError],
  );
  const refreshReferencesFromBackend = useCallback(
    async (
      chatSpaceId: string,
      updateMessageFn: (messageId: number, updates: Partial<Message>) => void,
      messagesSnapshot: Message[],
    ) => {
      try {
        const history = await getChatSpaceHistoryFromBackend(groupId, {
          chatSpaceId,
          page: 1,
          pageSize: 200,
        });
        const items = history?.messages || [];
        if (!Array.isArray(items) || items.length === 0) return;
        const lastAssistant = items
          .filter((m: any) => m.role === "assistant")
          .sort(
            (a: any, b: any) =>
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime(),
          )
          .pop();
        if (!lastAssistant) return;
        const la: any = lastAssistant;
        // fileReferenceLinkJsonからfilesとlinksを取得
        const fileReferenceLinkJson =
          la.fileReferenceLinkJson || la.file_reference_link_json;
        if (!fileReferenceLinkJson || typeof fileReferenceLinkJson !== "object")
          return;
        const files = fileReferenceLinkJson.files || [];
        const links = fileReferenceLinkJson.links || [];
        const hasFileInfo = Array.isArray(files) && files.length > 0;
        const hasLinks = Array.isArray(links) && links.length > 0;
        if (!hasFileInfo && !hasLinks) return;
        const lastMsgIndex = messagesSnapshot.length - 1;
        if (
          lastMsgIndex >= 0 &&
          !messagesSnapshot[lastMsgIndex]?.isOwnMessage
        ) {
          const lastMsg = messagesSnapshot[lastMsgIndex];
          if (!lastMsg) return;
          const updates: Partial<Message> = {};
          if (hasFileInfo) {
            updates.fileInfo = files.map((fi: any) => ({
              fileId: fi.fileId,
              fileName: fi.fileName || `ファイル(ID: ${fi.fileId})`,
              shortDescription: "参考ファイル",
              relevantPages: Array.isArray(fi.relevantPages)
                ? fi.relevantPages
                : [],
              displayFileLink: fi.displayFileLink !== false,
            }));
          }
          if (hasLinks) {
            updates.referenceLinkInfo = links.map((link: any) => ({
              referenceLinkId: link.referenceLinkId,
              linkName: link.linkName || "",
              linkUrl: link.linkUrl || "",
              description: link.description,
            }));
          }
          updateMessageFn(lastMsg.id, updates);
        }
      } catch (e) {
        handleErrorWithUI(e, "参照情報更新");
        // エラーはログのみ（ユーザーには表示しない）
      }
    },
    [groupId],
  );

  // -------------------- upload files for AI Platform --------------------
  const [attachedFiles, setAttachedFiles] = useState<
    NonNullable<CreateChatAIPlatformSchemaType["files"]>
  >([]);

  const selectedModelConfig = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [availableModels, selectedModel],
  );

  const canUploadFileForSelectedModel =
    selectedModelConfig?.canUploadFile ?? false;
  const maxUploadBytesForSelectedModel =
    selectedModelConfig?.maxUploadBytes ?? null;
  const supportedExtensionsForSelectedModel =
    selectedModelConfig?.supportedExtensions ?? [];

  // -------------------- actions (send message via SSE) --------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isReferenceLinkDisplay, setIsReferenceLinkDisplay] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const assistantTextBufferRef = useRef<string>("");
  const assistantStatusRef = useRef<string>("");
  const flushTimerRef = useRef<number | null>(null);
  const assistantCreatedRef = useRef<boolean>(false);
  const currentBotIdRef = useRef<number | undefined>(undefined);
  const clearFlushTimer = () => {
    if (flushTimerRef.current !== null) {
      window.clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  };
  const getModelChatType = useCallback(
    (modelId: string): string | undefined => {
      const model = availableModels.find((m) => m.id === modelId);
      return model?.chatType;
    },
    [availableModels],
  );

  const startFlushTimer = (assistantMsgId: number, sessionIdLocal: string) => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = window.setInterval(() => {
      const buffered = assistantTextBufferRef.current;
      const currentStatus = assistantStatusRef.current;
      if (!buffered && !currentStatus) return;
      if (!assistantCreatedRef.current) {
        addMessage({
          id: assistantMsgId,
          text: buffered,
          status: currentStatus,
          isOwnMessage: false,
          sessionId: sessionIdLocal,
          timestamp: new Date().toLocaleString(),
          botId: currentBotIdRef.current,
          evaluation: null, // 評価ボタン表示のため初期化
          chatHistoryId: undefined, // chat_completeイベントで設定される
          model: selectedModel, // ストリーミング中もモデル名を表示
          chatType: getModelChatType(selectedModel), // ストリーミング中もchatTypeを保持
        });
        assistantCreatedRef.current = true;
        return;
      }
      updateMessage(assistantMsgId, {
        text: buffered,
        status: currentStatus,
      });
    }, 80);
  };
  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || isSubmitting || !activeChatSpaceId) return;
    if (!selectedModel) {
      handleErrorWithUI("モデルが選択されていません", "チャット送信", setError);
      return;
    }
    const userMessage = inputText.trim();
    setInputText("");
    setIsSubmitting(true);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const userMsg: Message = {
      id: Date.now(),
      text: userMessage,
      isOwnMessage: true,
      sessionId,
      timestamp: new Date().toLocaleString(),
    };
    addMessage(userMsg);
    const assistantMsgId = Date.now() + 1;
    assistantTextBufferRef.current = "";
    assistantStatusRef.current = "";
    assistantCreatedRef.current = false;
    currentBotIdRef.current = undefined;

    // Create initial thinking message
    addMessage({
      id: assistantMsgId,
      text: "",
      status: assistantStatusRef.current,
      isOwnMessage: false,
      sessionId,
      chatSpaceId: parseInt(activeChatSpaceId),
      timestamp: new Date().toLocaleString(),
      botId: selectedBotId ?? undefined,
      model: selectedModel,
      chatType: getModelChatType(selectedModel),
    });
    assistantCreatedRef.current = true;

    try {
      const handleEvent = (event: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        switch (event.type) {
          case "bot_selected":
            // バックエンドからはbot_idとして送信される
            const botId =
              typeof (event as any).data?.bot_id === "number"
                ? (event as any).data.bot_id
                : null;
            currentBotIdRef.current = botId ?? undefined;
            // 既にメッセージが作成されている場合は更新
            if (assistantCreatedRef.current && assistantMsgId) {
              updateMessage(assistantMsgId, { botId: botId ?? undefined });
            }
            break;
          case "status":
            assistantStatusRef.current = (event as any).data.text;
            startFlushTimer(assistantMsgId, sessionId);
            break;
          case "content":
            assistantTextBufferRef.current += (event as any).data.text;
            // 回答が始まったらステータスをクリア
            assistantStatusRef.current = "";
            startFlushTimer(assistantMsgId, sessionId);
            break;
          case "citations":
            // citationsはfile_reference_link_jsonから取得するため、ここでは処理しない
            // （後方互換性のためイベントは残すが、処理は行わない）
            break;
          case "chat_complete":
            // fileReferenceLinkJsonはBaseSchemaによりcamelCaseに変換されるため、fileReferenceLinkJsonとして取得
            const fileReferenceLinkJson =
              (event as any).data.fileReferenceLinkJson ||
              (event as any).data.file_reference_link_json;
            const fileInfo: any[] = fileReferenceLinkJson?.files || [];
            const linkInfo: any[] = fileReferenceLinkJson?.links || [];

            const chatId =
              (event as any).data.chatId || (event as any).data.chat_id; // 新規回答時のchatId
            const chatLogId =
              (event as any).data.chatId || (event as any).data.chat_id; // 外部チャットの場合はchat_log_id
            if (assistantTextBufferRef.current) {
              // fileInfoとlinkInfoを正しい形式に変換
              const processedFileInfo = fileInfo
                ? fileInfo.map((fi: any) => ({
                    fileId: fi.fileId || fi.file_id,
                    fileName: fi.fileName || fi.file_name,
                    shortDescription:
                      fi.shortDescription ||
                      fi.chunk_summary_description ||
                      "参考ファイル",
                    relevantPages: Array.isArray(fi.relevantPages)
                      ? fi.relevantPages
                      : Array.isArray(fi.relevant_pages)
                        ? fi.relevant_pages
                        : [],
                    displayFileLink:
                      fi.displayFileLink !== false &&
                      fi.display_file_link !== false,
                  }))
                : undefined;

              const processedReferenceLinkInfo = linkInfo
                ? linkInfo.map((link: any) => ({
                    referenceLinkId:
                      link.referenceLinkId || link.reference_link_id,
                    linkName: link.linkName || link.link_name || "",
                    linkUrl: link.linkUrl || link.link_url || "",
                    description: link.description,
                  }))
                : undefined;

              if (!assistantCreatedRef.current) {
                addMessage({
                  id: assistantMsgId,
                  text: assistantTextBufferRef.current,
                  isOwnMessage: false,
                  sessionId,
                  timestamp: new Date().toLocaleString(),
                  botId: currentBotIdRef.current,
                  evaluation: null, // 評価ボタン表示のため初期化
                  chatHistoryId: chatId, // 新規回答時はchatIdを使用
                  chatLogId: chatLogId,
                  model: selectedModel, // 完了時もモデル名を設定
                  chatType: getModelChatType(selectedModel), // 完了時もchatTypeを設定
                  fileInfo: processedFileInfo,
                  referenceLinkInfo: processedReferenceLinkInfo,
                });
                assistantCreatedRef.current = true;
              } else {
                updateMessage(assistantMsgId, {
                  text: assistantTextBufferRef.current,
                  evaluation: null, // 評価ボタン表示のため初期化
                  chatHistoryId: chatId, // 新規回答時はchatIdを使用
                  chatLogId: chatLogId,
                  model: selectedModel, // 完了時もモデル名を設定
                  chatType: getModelChatType(selectedModel), // 完了時もchatTypeを設定
                  fileInfo: processedFileInfo,
                  referenceLinkInfo: processedReferenceLinkInfo,
                });
              }
            }
            clearFlushTimer();
            if (
              (fileInfo && fileInfo.length > 0) ||
              (linkInfo && linkInfo.length > 0)
            ) {
              const lastMsgIndex = messagesRef.current.length - 1;
              if (
                lastMsgIndex >= 0 &&
                !messagesRef.current[lastMsgIndex]?.isOwnMessage
              ) {
                const lastMsg = messagesRef.current[lastMsgIndex];
                if (!lastMsg) return;
                const updates: Partial<Message> = {};
                if (fileInfo && fileInfo.length > 0) {
                  updates.fileInfo = fileInfo.map((fi: any) => ({
                    fileId: fi.file_id ?? fi.fileId,
                    fileName: fi.file_name ?? fi.fileName,
                    shortDescription:
                      fi.chunk_summary_description ??
                      fi.chunkSummaryDescription ??
                      "参考ファイル",
                    relevantPages: fi.relevant_pages ?? fi.relevantPages ?? [],
                    displayFileLink:
                      (fi.display_file_link ?? fi.displayFileLink) !== false,
                  }));
                }
                if (linkInfo && linkInfo.length > 0) {
                  updates.referenceLinkInfo = linkInfo.map((link: any) => ({
                    referenceLinkId:
                      link.reference_link_id ?? link.referenceLinkId,
                    linkName: link.link_name ?? link.linkName,
                    linkUrl: link.link_url ?? link.linkUrl,
                    description: link.description,
                  }));
                }
                updateMessage(lastMsg.id, updates);
              }
            }
            if (activeChatSpaceId) {
              setTimeout(() => {
                refreshReferencesFromBackend(
                  activeChatSpaceId,
                  updateMessage,
                  messagesRef.current,
                );
              }, 200);
            }
            break;
        }
      };

      const handleError = (error: any) => {
        if (abortControllerRef.current?.signal.aborted) return;
        handleErrorWithUI(error, "チャット送信", setError);
        addMessage({
          id: Date.now(),
          text: "申し訳ございません。エラーが発生しました。",
          isOwnMessage: false,
          sessionId,
        });
      };

      // --------------------
      // ここから分岐: Nano Banana (画像生成) かどうか
      // --------------------
      const selectedModelConfig = availableModels.find(
        (m) => m.id === selectedModel,
      );
      const isImageGenerationModel =
        selectedModelConfig?.chatType === "BOT_NANOBANANA";

      if (isImageGenerationModel) {
        // 画像生成モデルの場合はJSONレスポンスのエンドポイントを使用
        const response = await chatCreateAIPlatformImageRequest(groupId, {
          message: userMessage,
          model: selectedModel,
          chatSpaceId: parseInt(activeChatSpaceId),
          chatHistory: [], // 画像生成では履歴を使用しない
          files: canUploadFileForSelectedModel ? attachedFiles : [],
        });

        // 成功したらassistantメッセージを追加
        // バックエンドからは { chatHistoryId, chatLogId, gcsUrl, signedUrl } が返ってくる
        if (response.signedUrl) {
          addMessage({
            id: assistantMsgId,
            text: "画像を生成しました。", // テキスト部分は固定または空でも良い
            isOwnMessage: false,
            sessionId,
            timestamp: new Date().toLocaleString(),
            botId: undefined,
            evaluation: null,
            chatHistoryId: response.chatHistoryId,
            chatLogId: response.chatLogId || undefined,
            model: selectedModel,
            chatType: "BOT_NANOBANANA",
            generatedImageSignedUrl: response.signedUrl,
          });
        } else {
          // URLがない場合のエラーハンドリング
          throw new Error(
            "画像の生成に失敗しました。URLが取得できませんでした。",
          );
        }
      } else if (selectedModel === "rag") {
        // RAGモデル（独自モデル）の場合は /api/chat/[groupId] にリクエスト
        await chatCreateStreamRequest(
          groupId,
          {
            message: userMessage,
            chatSpaceId: activeChatSpaceId,
            forcedBotId: selectedBotId ?? null,
            isReferenceLinkDisplay: isReferenceLinkDisplay ?? null,
            chatHistory: [],
          },
          handleEvent,
          handleError,
        );
      } else {
        // それ以外のAI Platformモデルは /api/chat_ai_platform/[groupId] にリクエスト
        await chatCreateAIPlatformStreamRequest(
          groupId,
          {
            message: userMessage,
            model: selectedModel,
            chatSpaceId: parseInt(activeChatSpaceId),
            chatHistory: [],
            files: canUploadFileForSelectedModel ? attachedFiles : [],
          },
          handleEvent,
          handleError,
        );
      }
    } catch (e) {
      if (abortControllerRef.current?.signal.aborted) return;
      handleErrorWithUI(e, "チャット送信", setError);
      addMessage({
        id: Date.now(),
        text: "申し訳ございません。エラーが発生しました。",
        isOwnMessage: false,
        sessionId,
      });
    } finally {
      setIsSubmitting(false);
      clearFlushTimer();
      abortControllerRef.current = null;
    }
  }, [
    inputText,
    isSubmitting,
    activeChatSpaceId,
    groupId,
    sessionId,
    selectedBotId,
    selectedModel,
    isReferenceLinkDisplay,
    refreshReferencesFromBackend,
    addMessage,
    updateMessage,
    getModelChatType,
    canUploadFileForSelectedModel,
    attachedFiles,
  ]);
  const cancelSubmit = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSubmitting(false);
  }, []);
  const resetInput = useCallback(() => setInputText(""), []);
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    // session
    sessionId,

    // ui state
    isSidebarOpen,
    isUserScrolling,
    showError,
    errorMessage,
    isMobile,
    chatContainerRef,
    bottomRef,
    menuRef,
    setIsSidebarOpen,
    setIsUserScrolling,
    setError,
    clearError,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    closeSidebarOnMobile,
    handleUserScroll,
    scrollToBottom,
    scrollToTop,

    // spaces
    activeChatSpaceId,
    isCreatingNewChatSpace,
    isCreatingInitialChatSpace,
    isEditingTitle,
    editTitle,
    isUpdatingTitle,
    activeMenuChatSpaceId,
    isDeletingChatSpace,
    deletingChatSpaceId,
    chatSpaces,
    isChatSpacesLoading,
    chatSpacesError,
    setActiveChatSpaceId,
    setIsEditingTitle,
    setEditTitle,
    setActiveMenuChatSpaceId,
    createNewChatSpace,
    removeChatSpace,
    updateTitle,
    mutateChatSpaces,

    // model
    selectedModel,
    setSelectedModel,
    availableModels,
    isAIModelsLoading,
    modelIconMap,

    // bot
    selectedBotId,
    isBotSelectModalOpen,
    openBotSelectModal,
    closeBotSelectModal,
    selectBot,
    resetBotSelection,
    iconMap,
    botList,
    rawBotList: Array.isArray(rawBotList) ? rawBotList : [],
    isBotListLoading,
    isLoadingBots: isBotListLoading,
    botListError,
    refreshBotData,
    mutateBotList,

    // history
    messages,
    isLoadingHistory,
    historyError,
    addMessage,
    updateMessage,
    clearMessages,
    sendEvaluation,
    sendFeedback,
    markChatAsProcessed,
    isChatProcessed,
    mutateHistory,

    // file helpers
    loadingFileId,
    openFile,

    // upload files (AI Platform)
    attachedFiles,
    setAttachedFiles,
    canUploadFileForSelectedModel,
    maxUploadBytesForSelectedModel,
    supportedExtensionsForSelectedModel,

    // actions
    isSubmitting,
    inputText,
    isReferenceLinkDisplay,
    setInputText,
    setIsReferenceLinkDisplay,
    handleSubmit,
    cancelSubmit,
    resetInput,
    cleanup,
  } as const;
};
