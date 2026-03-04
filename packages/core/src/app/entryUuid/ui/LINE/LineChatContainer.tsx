"use client";

import { Avatar, Card, CardBody, Spinner } from "@heroui/react";
import React, { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronLeft } from "lucide-react";
import {
  markdownStyles,
  markdownComponents,
  reactMarkdownPlugins,
} from "../../../../common/reactMarkdown";
import {
  useLineChatSession,
  type LineChatEntry,
} from "../../hooks/session/useLineChatSession";
import type { Message } from "../../types";
import type {
  BotResponseSchemaType,
  BookingMenuSlotSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import BotSelectModal from "../components/modals/BotSelectModal";
import CustomFormModal from "../components/modals/CustomFormModal";
import TypingIndicator from "../components/chat/TypingIndicator";
import Suggest from "../components/suggest/Suggest";
import ChatEvaluation from "../components/feedback/ChatEvaluation";
import BookingSlots from "../components/feedback/BookingSlots";
import { HumanHandoffStatus } from "../components/handoff/HumanHandoff";
import HumanHandoffConfirmModal from "../components/handoff/HumanHandoffConfirmModal";
import { getBotIconSrc } from "../components/shared/botIconUtils";
import ChatReferenceListMolecule from "../components/chat/ChatReferenceListMolecule";
import ChatHeader from "./ChatHeader";
import ChatInput from "../components/chat/ChatInput";
import { isActiveHandoffState } from "../../hooks/handoff/handoffState";
import { useHumanHandoffAvailability } from "../../hooks/handoff/useHumanHandoffAvailability";

// LineChatContainerProps は ChatEntryConfig を受け取るように変更
// useLineChatSession が ChatEntryDetailResponseType | undefined を期待している場合があるが、
// ChatEntryConfig はそれを拡張または互換性があるはず。
// ChatEntryConfig (src/app/entryUuid/types/index.ts) の定義を確認する必要があるが、
// 一旦 FullChatContainer と同様に実装する。
interface LineChatContainerProps {
  chatEntry?: LineChatEntry;
}

const ChatMessage = React.memo(
  ({
    message,
    showReferenceInfo,
    selectedBot,
    botList,
    iconMap,
    headerColor,
    headerTextColor,
    onEvaluate,
    onFeedback,
  }: {
    message: Message;
    showReferenceInfo: boolean;
    selectedBot?: BotResponseSchemaType | null;
    botList: BotResponseSchemaType[];
    iconMap: Record<number, string>;
    headerColor?: string;
    headerTextColor?: string;
    onEvaluate?: (chatLogId: number, evaluation: "GOOD" | "BAD") => void;
    onFeedback?: (chatLogId: number, feedback: string) => void;
  }) => {
    const isOwn = message.isOwnMessage;
    const timestampText = message.timestamp
      ? new Date(message.timestamp).toLocaleString()
      : undefined;
    const hasContent =
      typeof message.content === "string" && message.content.trim().length > 0;

    const getContrastTextColor = (hex?: string): string => {
      const raw = (hex || "#000000").replace("#", "");
      const normalized =
        raw.length === 3
          ? raw
              .split("")
              .map((c) => c + c)
              .join("")
          : raw;
      const bigint = parseInt(normalized, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      const toLinear = (c: number) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      const sr = toLinear(r / 255);
      const sg = toLinear(g / 255);
      const sb = toLinear(b / 255);
      const luminance = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
      return luminance > 0.5 ? "#111827" : "#ffffff";
    };

    const ownTextColor = headerTextColor || getContrastTextColor(headerColor);
    const isDarkMode = ownTextColor === "#ffffff";

    const messageBot = React.useMemo(() => {
      if (message.botId && botList.length > 0) {
        return botList.find((bot) => bot.botId === message.botId);
      }
      return null;
    }, [message.botId, botList]);

    const displayBot = React.useMemo(() => {
      if (messageBot) {
        return messageBot;
      }
      if (message.botId && botList.length > 0) {
        const foundBot = botList.find((bot) => bot.botId === message.botId);
        if (foundBot) {
          return foundBot;
        }
      }
      return selectedBot || (botList.length > 0 ? botList[0] : null);
    }, [messageBot, message.botId, selectedBot, botList]);

    const hasReferenceData = React.useMemo(() => {
      if (
        !message.fileReferenceLinkJson ||
        typeof message.fileReferenceLinkJson !== "object"
      ) {
        return false;
      }
      const fileCount = Array.isArray(message.fileReferenceLinkJson.files)
        ? message.fileReferenceLinkJson.files.length
        : 0;
      const linkCount = Array.isArray(message.fileReferenceLinkJson.links)
        ? message.fileReferenceLinkJson.links.length
        : 0;
      return fileCount + linkCount > 0;
    }, [message.fileReferenceLinkJson]);

    return (
      <div
        className={`flex gap-2 sm:gap-3 px-2 sm:px-4 py-3 sm:py-4 ${
          isOwn ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {!isOwn && displayBot && (
          <Avatar
            src={getBotIconSrc(displayBot, iconMap, botList)}
            alt="ボット"
            className="flex-shrink-0 mt-1"
            size="sm"
            fallback={
              <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                <span className="text-xs text-gray-500">🤖</span>
              </div>
            }
          />
        )}
        <div
          className={`${
            isOwn
              ? "ml-auto max-w-[85%] sm:max-w-[85%]"
              : "max-w-[85%] sm:max-w-[85%]"
          }`}
        >
          {hasContent && (
            <Card
              className={`inline-block shadow-sm ${
                isOwn
                  ? "rounded-2xl rounded-br-sm border-0"
                  : "rounded-2xl rounded-bl-sm border border-gray-100 bg-white"
              }`}
              style={{
                backgroundColor: isOwn ? headerColor || "#3b82f6" : undefined,
                boxShadow: isOwn
                  ? "0 2px 8px rgba(59, 130, 246, 0.15)"
                  : "0 1px 4px rgba(0, 0, 0, 0.08)",
              }}
            >
              <CardBody className="px-3 py-2 sm:px-4 sm:py-3">
                <style>{markdownStyles}</style>
                <div
                  className={`markdown-content ${isDarkMode && isOwn ? "dark-mode" : ""}`}
                  style={{
                    color: isOwn ? ownTextColor : "#1f2937",
                    fontSize: "0.9375rem",
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={reactMarkdownPlugins}
                    components={markdownComponents}
                  >
                    {(message.content || "").replace(/\n+$/, "")}
                  </ReactMarkdown>
                </div>
              </CardBody>
            </Card>
          )}

          {hasContent && (
            <div
              className={`flex items-center gap-2 mt-1 ${
                isOwn ? "justify-end" : "justify-start"
              }`}
            >
              {timestampText && (
                <p className="text-xs sm:text-sm text-gray-500">
                  {timestampText}
                </p>
              )}

              {!isOwn && message.chatLogId && (
                <ChatEvaluation
                  evaluation={message.evaluation ?? null}
                  onEvaluate={(val) => onEvaluate?.(message.chatLogId!, val)}
                />
              )}
            </div>
          )}

          {showReferenceInfo && hasReferenceData && (
            <div className="mt-2 animate-in slide-in-from-bottom-2 duration-300">
              <ChatReferenceListMolecule
                fileReferenceLinkJson={message.fileReferenceLinkJson}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";

const ChatMessageMemo = React.memo(ChatMessage, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.botId === nextProps.message.botId &&
    prevProps.message.chatLogId === nextProps.message.chatLogId &&
    prevProps.message.evaluation === nextProps.message.evaluation &&
    (prevProps.message.fileReferenceLinkJson?.files?.length || 0) ===
      (nextProps.message.fileReferenceLinkJson?.files?.length || 0) &&
    (prevProps.message.fileReferenceLinkJson?.links?.length || 0) ===
      (nextProps.message.fileReferenceLinkJson?.links?.length || 0) &&
    prevProps.showReferenceInfo === nextProps.showReferenceInfo &&
    prevProps.selectedBot?.botId === nextProps.selectedBot?.botId &&
    prevProps.botList.length === nextProps.botList.length &&
    prevProps.headerColor === nextProps.headerColor &&
    prevProps.headerTextColor === nextProps.headerTextColor
  );
});

export default function LineChatContainer({
  chatEntry,
}: LineChatContainerProps) {
  const entryUuid = chatEntry?.entryUuid || "";
  const effectiveHeaderText = chatEntry?.headerText ?? "チャット";
  const effectiveHeaderColor = chatEntry?.headerColor ?? undefined;
  const effectiveHeaderTextColor = chatEntry?.headerTextColor ?? undefined;

  const greetingTranslations = chatEntry?.initialGreetingTranslations ?? null;
  const isMultiLanguage = chatEntry?.isMultiLanguage ?? false;
  const languageCodes = React.useMemo(() => {
    if (!isMultiLanguage || !greetingTranslations) return [];
    return Object.keys(greetingTranslations).filter((code) => {
      const v = greetingTranslations[code];
      return typeof v === "string" && v.trim().length > 0;
    });
  }, [isMultiLanguage, greetingTranslations]);

  const hasUserSelectedLanguageRef = React.useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ja");
  const onSelectLanguage = useCallback((code: string) => {
    hasUserSelectedLanguageRef.current = true;
    setSelectedLanguage(code);
  }, []);

  const localizedInitialGreeting = React.useMemo(() => {
    const base = chatEntry?.initialGreeting ?? null;
    if (!isMultiLanguage || !greetingTranslations) return base;
    return (
      greetingTranslations[selectedLanguage] ||
      greetingTranslations["ja"] ||
      greetingTranslations["en"] ||
      base
    );
  }, [
    chatEntry?.initialGreeting,
    isMultiLanguage,
    greetingTranslations,
    selectedLanguage,
  ]);

  const chatEntryForSession = React.useMemo(() => {
    if (!chatEntry) return chatEntry;
    return {
      ...chatEntry,
      initialGreeting: localizedInitialGreeting,
    };
  }, [chatEntry, localizedInitialGreeting]);

  const {
    messages,
    isLoading,
    isLoadingHistory,
    botList,
    selectedBot,
    iconMap,
    isLoadingBots,
    botError,
    showReferenceInfo,
    sendMessage,
    addUserMessage,
    addBotMessage,
    updateInitialGreetingMessage,
    selectBot,
    sendEvaluation,
    sendFeedback,
    requestHumanSupport,
    cancelHumanSupport,
    suggestData,
    currentItems,
    isLoadingSuggest,
    suggestError,
    selectSuggest,
    selectionHistory,
    goBack,
    idToken, // LIFF Token
    isInitialized, // LIFF & Session Initialized
    initializationError,
    isFormModalOpen,
    isFormSubmitted,
    userProfile,
    sessionId,
    setIsFormModalOpen,
    handleFormSuccess,
    responseMode,
    friendChatStatus,
    operatorName,
    isHumanSupportRequested,
    isCancellingHumanSupport,
    isSuggestMode,
  } = useLineChatSession(entryUuid, chatEntryForSession);

  React.useEffect(() => {
    if (!isMultiLanguage) return;
    if (languageCodes.length <= 1) return;
    if (!localizedInitialGreeting) return;
    updateInitialGreetingMessage(localizedInitialGreeting);
  }, [
    isMultiLanguage,
    languageCodes.length,
    localizedInitialGreeting,
    updateInitialGreetingMessage,
  ]);

  const [isBotSelectOpen, setIsBotSelectOpen] = useState(false);
  const [isHandoffConfirmOpen, setIsHandoffConfirmOpen] = useState(false);
  const [isRequestingHumanSupport, setIsRequestingHumanSupport] =
    useState(false);
  const [isSuggestDismissed, setIsSuggestDismissed] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [quickBookingSlots, setQuickBookingSlots] = useState<
    BookingMenuSlotSchemaType[]
  >([]);
  const [quickBookingMenuId, setQuickBookingMenuId] = useState<number | null>(
    null,
  );
  const [quickBookingTitle, setQuickBookingTitle] = useState<
    string | undefined
  >(undefined);
  const [isQuickBookingLoading, setIsQuickBookingLoading] = useState(false);
  const [quickBookingError, setQuickBookingError] = useState<string | null>(
    null,
  );
  const isHandoffActive = isActiveHandoffState(responseMode, friendChatStatus);
  const isWithinHandoffAvailability = useHumanHandoffAvailability(
    chatEntry?.humanHandoffAvailabilitySlots,
  );
  const showHumanHandoffAction =
    !!chatEntry?.isHumanHandoffEnabled &&
    (isHandoffActive || isWithinHandoffAvailability);
  const [lastBotResponseTime, setLastBotResponseTime] = useState<number | null>(
    null,
  );

  const openBotSelect = useCallback(() => {
    setIsBotSelectOpen(true);
  }, []);
  const closeBotSelect = useCallback(() => {
    setIsBotSelectOpen(false);
  }, []);
  const handleBotSelect = useCallback(
    (bot: BotResponseSchemaType | null) => {
      selectBot(bot);
      closeBotSelect();
    },
    [selectBot, closeBotSelect],
  );
  const openHandoffConfirm = useCallback(() => {
    if (
      isRequestingHumanSupport ||
      isHandoffActive ||
      isHumanSupportRequested
    ) {
      return;
    }
    setIsHandoffConfirmOpen(true);
  }, [isRequestingHumanSupport, isHandoffActive, isHumanSupportRequested]);
  const closeHandoffConfirm = useCallback(() => {
    if (isRequestingHumanSupport) return;
    setIsHandoffConfirmOpen(false);
  }, [isRequestingHumanSupport]);
  const confirmHumanSupport = useCallback(async () => {
    setIsRequestingHumanSupport(true);
    try {
      await Promise.resolve(requestHumanSupport());
      setIsHandoffConfirmOpen(false);
    } finally {
      setIsRequestingHumanSupport(false);
    }
  }, [requestHumanSupport]);

  const currentSuggestionItemIdRef = React.useRef<number | null>(null);

  const handleSendMessage = useCallback(
    (content: string) => {
      setIsSuggestDismissed(true);
      setIsUserTyping(false);
      sendMessage(content, currentSuggestionItemIdRef.current ?? null);
      // メッセージ送信後、応答完了を待つ
      setLastBotResponseTime(null);
    },
    [sendMessage],
  );

  const handleInputChange = useCallback((value: string) => {
    setIsUserTyping(value.trim().length > 0);
    // 入力中はサジェストを非表示にする
    if (value.trim().length > 0) {
      setIsSuggestDismissed(true);
    }
  }, []);

  const handleRequestBooking = useCallback(async () => {
    if (!entryUuid) return;
    setIsQuickBookingLoading(true);
    setQuickBookingError(null);
    try {
      const res = await fetch(`/api/${entryUuid}/booking`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json();
      const payload = json?.data ?? null;
      const slots: BookingMenuSlotSchemaType[] = Array.isArray(payload?.slots)
        ? payload.slots
        : [];
      const selectedMenuId =
        typeof payload?.selectedMenuId === "number"
          ? payload.selectedMenuId
          : null;
      const menuList = Array.isArray(payload?.menuList) ? payload.menuList : [];
      const selectedMenu = menuList.find(
        (menu: { menuId?: unknown; title?: unknown }) =>
          typeof menu?.menuId === "number" && menu.menuId === selectedMenuId,
      );

      setQuickBookingSlots(slots);
      setQuickBookingMenuId(selectedMenuId);
      setQuickBookingTitle(
        typeof selectedMenu?.title === "string"
          ? selectedMenu.title
          : undefined,
      );
      if (slots.length === 0) {
        setQuickBookingError("現在、予約可能な枠がありません。");
      }
    } catch (error) {
      console.error("Failed to fetch booking availability:", error);
      setQuickBookingError(
        "予約情報の取得に失敗しました。時間をおいてお試しください。",
      );
      setQuickBookingSlots([]);
      setQuickBookingMenuId(null);
    } finally {
      setIsQuickBookingLoading(false);
    }
  }, [entryUuid]);

  const handleBookingSlotSelect = useCallback(
    (slotData: BookingMenuSlotSchemaType) => {
      const slotText = `${new Date(slotData.startAt).toLocaleString()} の予約を受け付けました`;
      addUserMessage(slotText);
    },
    [addUserMessage],
  );

  // ボットの応答完了を検知（isLoadingがfalseになったとき）
  React.useEffect(() => {
    if (!isLoading && lastBotResponseTime === null && messages.length > 0) {
      // 応答が完了したら、少し待ってからサジェストを再表示
      const timer = setTimeout(() => {
        setIsSuggestDismissed(false);
        setLastBotResponseTime(Date.now());
      }, 500); // 500ms待ってからサジェストを表示
      return () => clearTimeout(timer);
    }
  }, [isLoading, lastBotResponseTime, messages.length]);

  React.useEffect(() => {
    setIsSuggestDismissed(false);
    setIsUserTyping(false);
    setLastBotResponseTime(null);
  }, [entryUuid, chatEntry?.suggestId]);

  const hasStartedAnswering = React.useMemo(() => {
    if (messages.length === 0) return false;
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return false;
    return (
      !lastMessage.isOwnMessage &&
      typeof lastMessage.content === "string" &&
      lastMessage.content.trim().length > 0
    );
  }, [messages]);
  const preChatForm = chatEntry?.preChatCustomForm ?? null;
  const onDemandForm = chatEntry?.onDemandCustomFormList?.[0] ?? null;
  const activeForm =
    !isFormSubmitted && preChatForm ? preChatForm : onDemandForm;
  const hasOnDemandForm = !!onDemandForm;
  const isPreChatFormPending = !!preChatForm && !isFormSubmitted;

  // 初期化エラー
  if (initializationError) {
    const isLiffIdMissing =
      initializationError.includes("LIFF IDが設定されていません");
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const endpointUrl =
      chatEntry?.lineConfig?.endpointUrl ||
      (chatEntry?.lineConfig as { endpoint_url?: string } | null | undefined)
        ?.endpoint_url ||
      currentUrl;

    if (isLiffIdMissing) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-800">
              LIFF設定が必要です
            </h3>
            <p className="text-gray-600 mb-6 text-lg">{initializationError}</p>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                このエンドポイントURLをLIFFに登録してください：
              </p>
              <div className="bg-white border border-gray-300 rounded-md p-4">
                <code className="text-sm text-gray-800 break-all font-mono">
                  {endpointUrl || currentUrl}
                </code>
              </div>
              <button
                onClick={() => {
                  if (endpointUrl || currentUrl) {
                    navigator.clipboard.writeText(endpointUrl || currentUrl);
                  }
                }}
                className="mt-4 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                URLをコピー
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-blue-800 mb-2">
                設定手順：
              </p>
              <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                <li>LINE Developersコンソールにログイン</li>
                <li>該当するチャネルを選択</li>
                <li>「LIFF」タブを開く</li>
                <li>「追加」ボタンをクリック</li>
                <li>上記のエンドポイントURLを「エンドポイントURL」に設定</li>
                <li>設定を保存後、このページを再読み込み</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="font-bold mb-2 text-red-600">初期化エラー</h3>
          <p className="text-red-500 font-medium mb-4">{initializationError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ボットエラー
  if (botError) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-red-600 mb-4 font-medium">{botError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const hasLiffId = !!chatEntry?.lineConfig?.liffId;
  const isBlockingLoading =
    !isInitialized || isLoadingBots || (isSuggestMode && isLoadingSuggest);

  if (isBlockingLoading) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <Spinner size="lg" color="primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium animate-pulse">
            {!isInitialized
              ? hasLiffId
                ? "LIFFを初期化中..."
                : "初期化中..."
              : isLoadingBots
                ? "ボット情報を読み込み中..."
                : "サジェストを読み込み中..."}
          </p>
        </div>
      </div>
    );
  }

  // チャットログ取得中は画面中央に表示
  if (isLoadingHistory && messages.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="text-center">
          <div className="relative">
            <Spinner size="lg" color="primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium animate-pulse">
            チャットログ取得中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col w-full h-full relative bg-gradient-to-b from-gray-50/50 to-white"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        boxSizing: "border-box",
      }}
    >
      <ChatHeader
        headerText={effectiveHeaderText}
        headerColor={effectiveHeaderColor}
        headerTextColor={effectiveHeaderTextColor}
        selectedBot={selectedBot}
        onBotSelect={openBotSelect}
        showBotSelect={false}
        languageCodes={isMultiLanguage ? languageCodes : undefined}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={isMultiLanguage ? onSelectLanguage : undefined}
        showCustomForm={hasOnDemandForm}
        onCustomFormOpen={() => setIsFormModalOpen(true)}
        isCustomFormRequired={isPreChatFormPending}
        isBookingEnabled={!!chatEntry?.isBookingEnabled}
        bookingButtonLabel={chatEntry?.bookingButtonLabel || "予約はこちら"}
        onRequestBooking={handleRequestBooking}
        showHumanHandoffAction={showHumanHandoffAction}
        onRequestHumanHandoff={openHandoffConfirm}
        isHandoffActive={isHandoffActive || !!isHumanSupportRequested}
        isHandoffLoading={!!isCancellingHumanSupport}
      />

      {/* 有人対応ステータス表示 */}
      {responseMode === "FRIEND" && (
        <div className="px-4 py-2 animate-in slide-in-from-top-2 duration-300">
          <HumanHandoffStatus
            variant="banner"
            operatorName={
              friendChatStatus === "WAITING" ? null : operatorName || "担当者"
            }
            waitingText="有人対応を待っています。少々お待ちください。"
            connectedText="オペレーターに繋がりました。メッセージをお送りください。"
            onCancel={
              friendChatStatus === "WAITING" ? cancelHumanSupport : undefined
            }
            isCancelling={isCancellingHumanSupport}
            cancelButtonText="ボットに戻る"
          />
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent"
        style={{
          minHeight: 0,
          paddingBottom: "calc(88px + env(safe-area-inset-bottom))",
          backgroundImage:
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.02) 0%, transparent 50%)",
        }}
      >
        <div className="py-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${Math.min(index * 50, 200)}ms` }}
            >
              <ChatMessageMemo
                message={message}
                showReferenceInfo={showReferenceInfo}
                selectedBot={selectedBot}
                botList={botList}
                iconMap={iconMap}
                headerColor={effectiveHeaderColor}
                headerTextColor={effectiveHeaderTextColor}
                onEvaluate={sendEvaluation}
                onFeedback={sendFeedback}
              />
            </div>
          ))}
        </div>

        {isSuggestMode && !isSuggestDismissed && !isUserTyping ? (
          <div className="p-4">
            <Suggest
              currentItems={currentItems}
              selectSuggest={selectSuggest}
              isLoadingSuggest={isLoadingSuggest}
              suggestError={suggestError}
              suggestData={suggestData}
              selectedLanguage={selectedLanguage}
              onSelect={(item) => {
                if (!item) return;
                const bid = selectedBot?.botId ?? -1;
                if (item.displayLabel) addUserMessage(item.displayLabel);
                addBotMessage(item.onClickFixedAnswer, bid);
                currentSuggestionItemIdRef.current = item.itemId;
                if (!item.hasChildren) {
                  setIsSuggestDismissed(true);
                  // 応答完了後に再表示するため、タイマーをリセット
                  setLastBotResponseTime(null);
                }
              }}
              headerColor={effectiveHeaderColor}
              headerTextColor={effectiveHeaderTextColor}
            />
            {/* サジェストの戻るボタン（サジェストの直下に小さく表示） */}
            {selectionHistory && selectionHistory.length > 0 ? (
              <div className="flex justify-end mt-2 px-4">
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all duration-200 hover:opacity-90 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: effectiveHeaderColor || "#3b82f6",
                    color: effectiveHeaderTextColor || "#ffffff",
                  }}
                >
                  <ChevronLeft size={12} />
                  <span>戻る</span>
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {messages.length === 0 &&
        !isSuggestMode &&
        !chatEntry?.initialGreeting ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-sm">
              <div className="mb-4">
                <svg
                  className="w-20 h-20 mx-auto text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium mb-2">
                チャットを開始
              </p>
              <p className="text-gray-400 text-sm">
                メッセージを入力して会話を始めましょう
              </p>
            </div>
          </div>
        ) : null}

        {isLoading && !hasStartedAnswering && !isHandoffActive && (
          <TypingIndicator />
        )}
      </div>

      <div
        className="px-3 sm:px-4 py-2 flex-shrink-0 absolute bottom-0 left-0 right-0 backdrop-blur-xl"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow:
            "0 -10px 15px -3px rgba(0, 0, 0, 0.03), 0 -4px 6px -4px rgba(0, 0, 0, 0.03)",
          zIndex: 10,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
          paddingLeft: "calc(env(safe-area-inset-left) + 0.75rem)",
          paddingRight: "calc(env(safe-area-inset-right) + 0.75rem)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            onInputChange={handleInputChange}
            isLoading={isLoading}
            disabled={isLoading || !idToken}
            placeholder={!idToken ? "LIFF初期化中..." : undefined}
            headerColor={effectiveHeaderColor}
            headerTextColor={effectiveHeaderTextColor}
            showBotSelect={
              botList.length > 1 &&
              !isLoadingBots &&
              !(isSuggestMode && !isSuggestDismissed)
            }
            selectedBot={selectedBot}
            botIconSrc={
              selectedBot ? getBotIconSrc(selectedBot, iconMap, botList) : null
            }
            onBotSelect={openBotSelect}
            selectedLanguage={selectedLanguage}
          />
        </div>
      </div>

      <BotSelectModal
        isOpen={isBotSelectOpen}
        onClose={closeBotSelect}
        botList={botList}
        iconMap={iconMap}
        selectedBot={selectedBot}
        onSelectBot={handleBotSelect}
        headerColor={effectiveHeaderColor}
        headerTextColor={effectiveHeaderTextColor}
      />

      {quickBookingError ? (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 shadow">
          {quickBookingError}
        </div>
      ) : null}
      {isQuickBookingLoading ? (
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 shadow">
          予約枠を読み込み中...
        </div>
      ) : null}
      {!isQuickBookingLoading &&
      quickBookingMenuId &&
      quickBookingSlots.length > 0 ? (
        <BookingSlots
          menuId={quickBookingMenuId}
          title={quickBookingTitle || chatEntry?.bookingButtonLabel || "予約"}
          slots={quickBookingSlots}
          onSelectSlot={handleBookingSlotSelect}
        />
      ) : null}

      {activeForm && userProfile?.userId && (
        <CustomFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          customForm={activeForm}
          externalUserId={userProfile.userId}
          isRequired={isPreChatFormPending}
          onSuccess={handleFormSuccess}
          formName={activeForm.formName}
        />
      )}
      <HumanHandoffConfirmModal
        isOpen={isHandoffConfirmOpen}
        onClose={closeHandoffConfirm}
        onConfirm={confirmHumanSupport}
        isLoading={isRequestingHumanSupport}
      />
    </div>
  );
}
