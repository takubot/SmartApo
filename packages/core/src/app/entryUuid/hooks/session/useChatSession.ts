"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatEntryConfig } from "../../types";
import { useBotManagement } from "../features/useBot";
import { useChatMessages } from "../messages/useChatMessages";
import { useSuggestManagement } from "../features/useSuggest";
import { isActiveHandoffState } from "../handoff/handoffState";

/**
 * チャットセッション全体の状態管理を統合するhook
 * 他のhooksを組み合わせて、チャット機能全体の状態を管理
 */
export const useChatSession = (
  entryUuid: string,
  chatEntry?: ChatEntryConfig,
  options?: { isWidgetOpen?: boolean },
) => {
  const isSuggestMode =
    chatEntry?.selectionType === "SUGGEST" && !!chatEntry?.suggestId;

  // 各機能のhooks
  const botManagement = useBotManagement(entryUuid);
  const chatMessages = useChatMessages(entryUuid, chatEntry?.selectionType);
  const suggestManagement = useSuggestManagement(
    entryUuid,
    chatEntry?.suggestId,
  );

  // チャットセッション全体の状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [showReferenceInfo, setShowReferenceInfo] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  // カスタムフォーム管理
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  useEffect(() => {
    if (!chatEntry?.preChatCustomForm || !chatMessages.externalUserId) {
      return;
    }

    const stableStorageKey = `custom_form_submitted_${chatEntry.preChatCustomForm.customFormId}_${chatMessages.externalUserId}`;
    const submitted = sessionStorage.getItem(stableStorageKey) === "true";

    setIsFormSubmitted(submitted);

    // 開始直後フォームが設定されている場合、未送信なら自動で開く
    if (!submitted) {
      setIsFormModalOpen(true);
    }
  }, [chatEntry?.preChatCustomForm?.customFormId, chatMessages.externalUserId]);

  const handleFormSuccess = useCallback(() => {
    setIsFormSubmitted(true);
    setIsFormModalOpen(false);
  }, []);

  // 初期挨拶の二重表示を防ぐためのフラグ
  const hasShownInitialGreetingRef = useRef(false);

  // 初期化と初期挨拶を一括で処理
  useEffect(() => {
    if (chatEntry?.showReferenceInfo !== undefined) {
      setShowReferenceInfo(chatEntry.showReferenceInfo);
    }

    // ボット情報の読み込みエラーをチェック
    if (botManagement.botError) {
      setInitializationError(
        `ボット情報の読み込みに失敗しました: ${botManagement.botError}`,
      );
      return;
    }

    // チャットメッセージの読み込みエラーをチェック
    if (chatMessages.errorMessage) {
      setInitializationError(
        `チャット履歴の読み込みに失敗しました: ${chatMessages.errorMessage}`,
      );
      return;
    }

    const hasSelectableResponder = botManagement.botList.length > 0;
    if (hasSelectableResponder && !isInitialized) {
      setIsInitialized(true);
      setInitializationError(null);
    }

    if (
      options?.isWidgetOpen &&
      !hasShownInitialGreetingRef.current &&
      chatEntry?.initialGreeting &&
      chatMessages.messages.length === 0 && // メッセージが完全に空の場合のみ
      !chatMessages.isLoadingHistory && // 履歴読み込み中も待つ
      hasSelectableResponder &&
      !botManagement.isLoadingBots
    ) {
      const selectedBotId = botManagement.selectedBot?.botId ?? -1;
      chatMessages.addBotMessage(
        chatEntry.initialGreeting,
        selectedBotId,
        undefined,
        { isStreaming: chatEntry.isGreetingStreamingEnabled ?? false },
      );
      hasShownInitialGreetingRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chatEntry?.showReferenceInfo,
    chatEntry?.initialGreeting,
    botManagement.botList.length,
    botManagement.selectedBot,
    botManagement.botError,
    botManagement.isLoadingBots,
    chatMessages.messages.length,
    chatMessages.errorMessage,
    isInitialized,
    chatEntry?.isGreetingStreamingEnabled,
    options?.isWidgetOpen,
  ]);

  // チャット送信処理
  const sendMessage = useCallback(
    async (content: string, suggestionItemId?: number | null) => {
      if (!content.trim()) {
        return;
      }

      // 回答生成中は送信を無効化
      if (chatMessages.isLoading) {
        return;
      }

      // エラーをクリア
      chatMessages.clearError();
      setInitializationError(null);

      // 現在のmessagesに新しいユーザーメッセージを含めたchatHistoryを構築
      const newUserMessage = {
        id: `user_${Date.now()}`,
        content,
        isOwnMessage: true,
        timestamp: new Date().toISOString(),
        botId: null,
        fileReferenceLinkJson: { files: [], links: [] },
      };

      // 現在のmessages + 新しいユーザーメッセージでchatHistoryを構築
      const updatedMessages = [...chatMessages.messages, newUserMessage];
      const isHandoffActive = isActiveHandoffState(
        chatMessages.responseMode,
        chatMessages.friendChatStatus,
      );

      // ユーザーメッセージをUIに追加
      chatMessages.addUserMessage(content);

      // 実際のSSEストリームで応答を受信（更新されたmessagesを使用）
      chatMessages.startExternalChatWithHistory(
        content,
        isHandoffActive ? null : (botManagement.selectedBot?.botId ?? null),
        updatedMessages,
        suggestionItemId ?? null,
      );
    },
    [chatMessages, botManagement.selectedBot],
  );

  // チャットセッションをリセット
  const resetSession = useCallback(() => {
    chatMessages.clearMessages();
    chatMessages.clearError();
    setInitializationError(null);
    setIsInitialized(false);
    hasShownInitialGreetingRef.current = false;
  }, [chatMessages]);

  // エラーをクリア
  const clearError = useCallback(() => {
    setInitializationError(null);
    chatMessages.clearError();
  }, [chatMessages]);

  return {
    // ボット管理
    ...botManagement,
    botList: botManagement.botList,
    selectedBot: botManagement.selectedBot,
    iconMap: botManagement.iconMap,
    selectBot: botManagement.selectBot,

    // チャットメッセージ
    ...chatMessages,

    // サジェスト管理
    ...suggestManagement,

    // チャットセッション全体
    isInitialized,
    showReferenceInfo,
    isSuggestMode,
    initializationError,
    isFormModalOpen,
    isFormSubmitted,

    // アクション
    sendMessage,
    resetSession,
    clearError,
    setIsFormModalOpen,
    handleFormSuccess,
    requestHumanSupport: chatMessages.requestHumanSupport,
    cancelHumanSupport: chatMessages.cancelHumanSupport,
    selectBookingSlot: chatMessages.selectBookingSlot,
    operatorName: chatMessages.operatorName,
  };
};
