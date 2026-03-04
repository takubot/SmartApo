"use client";

import { Spinner } from "@heroui/react";
import React, { useCallback, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useChatSession } from "../../hooks/session/useChatSession";
import type { ChatEntryConfig } from "../../types";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import type { BookingMenuSlotSchemaType } from "@repo/api-contracts/based_template/zschema";
import BotSelectModal from "../components/modals/BotSelectModal";
import CustomFormModal from "../components/modals/CustomFormModal";
import TypingIndicator from "../components/chat/TypingIndicator";
import Suggest from "../components/suggest/Suggest";
import { HumanHandoffStatus } from "../components/handoff/HumanHandoff";
import HumanHandoffConfirmModal from "../components/handoff/HumanHandoffConfirmModal";
import { getBotIconSrc } from "../components/shared/botIconUtils";
import BookingSlots from "../components/BookingSlots";
import ChatHeader from "./ChatHeader";
import ChatInput from "../components/chat/ChatInput";
import { ChatMessageMemo } from "../components/chat/ChatMessage";
import { isActiveHandoffState } from "../../hooks/handoff/handoffState";
import { useHumanHandoffAvailability } from "../../hooks/handoff/useHumanHandoffAvailability";

interface FullChatContainerProps {
  chatEntry?: ChatEntryConfig;
}

export default function FullChatContainer({
  chatEntry,
}: FullChatContainerProps) {
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
  } = useChatSession(entryUuid, chatEntryForSession, { isWidgetOpen: true });

  // 自動スクロール用
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  React.useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom, isLoading]);

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

  // 直前に選択されたサジェストのIDを保持
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

  // エントリや suggestId が変わったらサジェスト表示をリセット
  React.useEffect(() => {
    setIsSuggestDismissed(false);
    setIsUserTyping(false);
    setLastBotResponseTime(null);
  }, [entryUuid, chatEntry?.suggestId]);

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

  // 履歴が既にある場合は、裏での取得中に画面全体をローディングにしない（UX向上）
  const isBlockingLoading =
    (isLoadingBots ||
      (isSuggestMode && isLoadingSuggest) ||
      isLoadingHistory) &&
    messages.length === 0;

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
        {/* メッセージ表示（initialGreetingを含む） */}
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
          <div ref={messagesEndRef} />
        </div>

        {/* サジェスト表示（フラグで非表示制御） */}
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
                // 選択内容をユーザー発話として残す
                if (item.displayLabel) addUserMessage(item.displayLabel);
                // 各サジェストは固定回答を必ず持つため即時にボット側へ表示
                addBotMessage(item.onClickFixedAnswer, bid);
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

        {/* 空状態表示 */}
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
