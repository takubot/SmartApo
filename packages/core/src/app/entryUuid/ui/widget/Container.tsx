"use client";

import { Spinner } from "@heroui/react";
import React, { useCallback, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useChatSession } from "../../hooks/session/useChatSession";
import type { ChatEntryConfig } from "../../types";
import type {
  BotResponseSchemaType,
  BookingMenuSlotSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import BotSelectModal from "../components/modals/BotSelectModal";
import CustomFormModal from "../components/modals/CustomFormModal";
import TypingIndicator from "../components/chat/TypingIndicator";
import Suggest from "../components/suggest/Suggest";
import { getBotIconSrc } from "../components/shared/botIconUtils";
import ChatInput from "../components/chat/ChatInput";
import ChatHeader from "./ChatHeader";
import { ChatMessageMemo } from "../components/chat/ChatMessage";
import { HumanHandoffStatus } from "../components/handoff/HumanHandoff";
import HumanHandoffConfirmModal from "../components/handoff/HumanHandoffConfirmModal";
import { isActiveHandoffState } from "../../hooks/handoff/handoffState";
import { useHumanHandoffAvailability } from "../../hooks/handoff/useHumanHandoffAvailability";
import BookingSlots from "../components/BookingSlots";

interface WidgetContainerProps {
  chatEntry?: ChatEntryConfig;
  onClose?: () => void;
  isWidgetOpen?: boolean;
}

export default function WidgetContainer({
  chatEntry,
  onClose,
  isWidgetOpen,
}: WidgetContainerProps) {
  const entryUuid = chatEntry?.entryUuid || "";

  const effectiveHeaderText = chatEntry?.headerText ?? undefined;
  const effectiveHeaderColor = chatEntry?.headerColor ?? undefined;
  const effectiveHeaderTextColor = chatEntry?.headerTextColor ?? undefined;

  const greetingTranslations = chatEntry?.initialGreetingTranslations ?? null;
  const languageCodes = React.useMemo(() => {
    if (!chatEntry?.isMultiLanguage || !greetingTranslations) return [];
    return Object.keys(greetingTranslations).filter((code) => {
      const v = greetingTranslations[code];
      return typeof v === "string" && v.trim().length > 0;
    });
  }, [chatEntry?.isMultiLanguage, greetingTranslations]);

  const hasUserSelectedLanguageRef = React.useRef(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ja");
  const onSelectLanguage = useCallback((code: string) => {
    hasUserSelectedLanguageRef.current = true;
    setSelectedLanguage(code);
  }, []);

  const localizedInitialGreeting = React.useMemo(() => {
    const base = chatEntry?.initialGreeting ?? null;
    if (!chatEntry?.isMultiLanguage || !greetingTranslations) return base;
    return (
      greetingTranslations[selectedLanguage] ||
      greetingTranslations["ja"] ||
      greetingTranslations["en"] ||
      base
    );
  }, [
    chatEntry?.initialGreeting,
    chatEntry?.isMultiLanguage,
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
    initializationError,
    clearError,
    sendEvaluation,
    sendFeedback,
    suggestData,
    currentItems,
    isLoadingSuggest,
    suggestError,
    selectSuggest,
    selectionHistory,
    goBack,
    isFormModalOpen,
    isFormSubmitted,
    setIsFormModalOpen,
    handleFormSuccess,
    externalUserId,
    sessionId,
    isLoadingHistory,
    requestHumanSupport,
    cancelHumanSupport,
    selectBookingSlot,
    responseMode,
    friendChatStatus,
    operatorName,
    isHumanSupportRequested,
    isCancellingHumanSupport,
    isSuggestMode,
  } = useChatSession(entryUuid, chatEntryForSession, {
    isWidgetOpen: isWidgetOpen ?? true,
  });

  React.useEffect(() => {
    if (!chatEntry?.isMultiLanguage) return;
    if (languageCodes.length <= 1) return;
    if (!localizedInitialGreeting) return;
    updateInitialGreetingMessage(localizedInitialGreeting);
  }, [
    chatEntry?.isMultiLanguage,
    languageCodes.length,
    localizedInitialGreeting,
    updateInitialGreetingMessage,
  ]);

  const [isBotSelectOpen, setIsBotSelectOpen] = useState(false);
  const [isHandoffConfirmOpen, setIsHandoffConfirmOpen] = useState(false);
  const [isRequestingHumanSupport, setIsRequestingHumanSupport] =
    useState(false);
  const openBotSelect = useCallback(() => setIsBotSelectOpen(true), []);
  const closeBotSelect = useCallback(() => setIsBotSelectOpen(false), []);
  const isHandoffActive = isActiveHandoffState(responseMode, friendChatStatus);
  const isWithinHandoffAvailability = useHumanHandoffAvailability(
    chatEntry?.humanHandoffAvailabilitySlots,
  );
  const showHumanHandoffAction =
    !!chatEntry?.isHumanHandoffEnabled &&
    (isHandoffActive || isWithinHandoffAvailability);
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

  // サジェスト表示制御
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
  const [lastBotResponseTime, setLastBotResponseTime] = useState<number | null>(
    null,
  );
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

  // 回答が開始されたかどうかを判定
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

  // エントリや suggestId が変わったらサジェスト表示をリセット
  React.useEffect(() => {
    setIsSuggestDismissed(false);
    setIsUserTyping(false);
    setLastBotResponseTime(null);
  }, [entryUuid, chatEntry?.suggestId]);

  // 初期化エラーがある場合
  if (initializationError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            初期化エラー
          </h2>
          <p className="text-gray-600 mb-4">{initializationError}</p>
          <button
            onClick={clearError}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (botError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-red-500 text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ボットエラー
          </h2>
          <p className="text-gray-600 mb-4">{botError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const isBlockingLoading =
    (isLoadingBots ||
      (isSuggestMode && isLoadingSuggest) ||
      isLoadingHistory) &&
    messages.length === 0;

  if (isBlockingLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">
            {isLoadingBots
              ? "ボット情報を読み込み中..."
              : isLoadingHistory
                ? "チャット履歴を読み込み中..."
                : "サジェストを読み込み中..."}
          </p>
        </div>
      </div>
    );
  }

  const preChatForm = chatEntry?.preChatCustomForm ?? null;
  const onDemandForm = chatEntry?.onDemandCustomFormList?.[0] ?? null;
  const activeForm =
    !isFormSubmitted && preChatForm ? preChatForm : onDemandForm;
  const hasOnDemandForm = !!onDemandForm;
  const isPreChatFormPending = !!preChatForm && !isFormSubmitted;

  return (
    <div
      className="flex flex-col w-full h-full relative chat-widget-scope bg-white"
      style={{
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* ウィジェット専用ヘッダー */}
      <div className="flex-shrink-0" style={{ minHeight: "56px" }}>
        <ChatHeader
          headerText={effectiveHeaderText}
          headerColor={effectiveHeaderColor}
          headerTextColor={effectiveHeaderTextColor}
          selectedBot={selectedBot}
          onClose={onClose}
          onBotSelect={openBotSelect}
          showBotSelect={false}
          languageCodes={chatEntry?.isMultiLanguage ? languageCodes : undefined}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={
            chatEntry?.isMultiLanguage ? onSelectLanguage : undefined
          }
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
          showBotInfo={!(isSuggestMode && !isSuggestDismissed)}
        />
      </div>

      {/* 有人対応ステータス表示 */}
      {responseMode === "FRIEND" && (
        <div className="px-2 py-1 animate-in slide-in-from-top-2 duration-300">
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

      {/* メッセージリスト */}
      <div
        className="flex-1 overflow-y-auto px-2 sm:px-4 pt-2"
        style={{
          boxSizing: "border-box",
          backgroundColor: "transparent",
        }}
      >
        {/* メッセージ（initialGreetingを含む）を先に表示 */}
        {messages.map((message) => (
          <ChatMessageMemo
            key={message.id}
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
        ))}

        {/* サジェストはメッセージの下に表示（FullChatと同等） */}
        {(() => {
          const shouldShowSuggest =
            isSuggestMode && !isSuggestDismissed && !isUserTyping;

          return shouldShowSuggest ? (
            <div className="mb-4">
              <Suggest
                currentItems={currentItems}
                selectSuggest={selectSuggest}
                isLoadingSuggest={isLoadingSuggest}
                suggestError={suggestError}
                suggestData={suggestData}
                selectedLanguage={selectedLanguage}
                onSelect={(item) => {
                  if (!item) return;
                  if (item.displayLabel) {
                    addUserMessage(item.displayLabel);
                  }
                  const fixed = item.onClickFixedAnswer || "";
                  if (fixed) {
                    const bid = selectedBot?.botId ?? -1;
                    addBotMessage(fixed, bid);
                  }
                  // 現在選択中の suggestItemId を保持
                  currentSuggestionItemIdRef.current = item.itemId;
                  // 一番子（葉）選択後はサジェストを非表示
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
                <div className="flex justify-end mt-2 px-2">
                  <button
                    onClick={goBack}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] sm:text-xs font-medium rounded-md transition-all duration-200 hover:opacity-90 active:scale-95 shadow-sm"
                    style={{
                      backgroundColor: effectiveHeaderColor || "#3b82f6",
                      color: effectiveHeaderTextColor || "#ffffff",
                    }}
                  >
                    <ChevronLeft size={11} />
                    <span>戻る</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null;
        })()}

        {/* 空状態 */}
        {messages.length === 0 &&
        !isSuggestMode &&
        !chatEntry?.initialGreeting ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p>チャットを開始してください</p>
            </div>
          </div>
        ) : null}

        {/* ローディング（タイピングインジケータ） */}
        {isLoading && !hasStartedAnswering && !isHandoffActive && (
          <TypingIndicator />
        )}
      </div>

      {/* 入力エリア */}
      <div
        className="px-4 py-2 backdrop-blur-xl flex-shrink-0"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.85)",
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          boxShadow:
            "0 -10px 15px -3px rgba(0, 0, 0, 0.03), 0 -4px 6px -4px rgba(0, 0, 0, 0.03)",
          boxSizing: "border-box",
          zIndex: 10,
          minHeight: "56px",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          paddingLeft: "calc(env(safe-area-inset-left, 0px) + 1rem)",
          paddingRight: "calc(env(safe-area-inset-right, 0px) + 1rem)",
        }}
      >
        <ChatInput
          onSendMessage={handleSendMessage}
          onInputChange={handleInputChange}
          isLoading={isLoading}
          disabled={isLoading}
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
          isWidgetOpen={isWidgetOpen}
        />
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
          onSelectSlot={selectBookingSlot}
        />
      ) : null}

      {activeForm && (
        <CustomFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          customForm={activeForm}
          externalUserId={externalUserId}
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
