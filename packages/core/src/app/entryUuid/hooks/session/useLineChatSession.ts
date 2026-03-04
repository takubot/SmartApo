"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import liff from "@line/liff";
import {
  type ChatEntryDetailResponseType,
  type CustomFormResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";

// LINE用に必要なプロパティだけを許容する薄い型
export type LineChatEntry = Partial<ChatEntryDetailResponseType> & {
  entryUuid?: string;
  headerText?: string | null;
  headerColor?: string | null;
  headerTextColor?: string | null;
  initialGreeting?: string | null;
  isMultiLanguage?: boolean;
  initialGreetingTranslations?: Record<string, string> | null;
  isGreetingStreamingEnabled?: boolean;
  showReferenceInfo?: boolean;
  lineConfig?: {
    liffId?: string | null;
    endpointUrl?: string | null;
    endpoint_url?: string | null;
  } | null;
  preChatCustomForm?: CustomFormResponseSchemaType | null;
  onDemandCustomFormList?: CustomFormResponseSchemaType[];
};
import { useBotManagement } from "../features/useBot";
import { useLineChatMessages } from "../messages/useLineChatMessages";
import { useSuggestManagement } from "../features/useSuggest";
import { useHandoffFirestoreRealtime } from "@common/useHandoffFirestoreRealtime";
import { isActiveHandoffState } from "../handoff/handoffState";

/**
 * LINEチャットセッション全体の状態管理を統合するhook
 */
export const useLineChatSession = (
  entryUuid: string,
  chatEntry?: LineChatEntry,
) => {
  const isSuggestMode =
    chatEntry?.selectionType === "SUGGEST" && !!chatEntry?.suggestId;

  // 各機能のhooks
  const botManagement = useBotManagement(entryUuid);
  const chatMessages = useLineChatMessages(entryUuid, chatEntry?.selectionType);
  const suggestManagement = useSuggestManagement(
    entryUuid,
    chatEntry?.suggestId ?? undefined, // null -> undefined
  );

  // チャットセッション全体の状態
  const [isInitialized, setIsInitialized] = useState(false);
  const [showReferenceInfo, setShowReferenceInfo] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null,
  );

  // LIFF ID Token
  const [idToken, setIdToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{
    userId?: string;
    displayName?: string;
    pictureUrl?: string;
  } | null>(null);

  // カスタムフォーム管理
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);

  const reloginWithMessage = useCallback((message: string) => {
    setInitializationError(message);
    setIdToken(null);
    try {
      if (liff.isLoggedIn()) {
        try {
          liff.logout();
        } catch (logoutError) {
          console.warn("Logout failed, continuing with login:", logoutError);
        }
      }
      liff.login();
    } catch (loginError) {
      console.error("Failed to re-login:", loginError);
      setInitializationError(
        "セッションが期限切れです。ページを再読み込みしてログインし直してください。",
      );
    }
  }, []);

  useEffect(() => {
    if (!chatEntry?.preChatCustomForm || !userProfile?.userId) {
      return;
    }

    const stableStorageKey = `custom_form_submitted_${chatEntry.preChatCustomForm.customFormId}_${userProfile.userId}`;
    const submitted = sessionStorage.getItem(stableStorageKey) === "true";

    setIsFormSubmitted(submitted);

    if (!submitted) {
      setIsFormModalOpen(true);
    }
  }, [chatEntry?.preChatCustomForm?.customFormId, userProfile?.userId]);

  const handleFormSuccess = useCallback(() => {
    setIsFormSubmitted(true);
    setIsFormModalOpen(false);
  }, []);

  // 初期挨拶の二重表示を防ぐためのフラグ
  const hasShownInitialGreetingRef = useRef(false);
  const isChatLoadingRef = useRef(false);
  const isChatHistoryLoadingRef = useRef(false);
  const suppressRealtimeHistorySyncUntilRef = useRef(0);
  const pendingRealtimeHistorySyncRef = useRef(false);

  // JWTトークンの有効期限をチェックする関数
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      // JWTは3つの部分（header.payload.signature）に分かれている
      const parts = token.split(".");
      if (parts.length !== 3 || !parts[1]) {
        return true; // 無効なトークン形式
      }

      // payloadをデコード（Base64URLデコード）
      const payloadStr = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(payloadStr));

      // expクレーム（有効期限）をチェック
      if (!payload.exp || typeof payload.exp !== "number") {
        return true; // expクレームがない場合は期限切れとみなす
      }

      // 現在時刻と比較（5分のマージンを設ける）
      const now = Math.floor(Date.now() / 1000);
      const expirationTime = payload.exp;
      const margin = 5 * 60; // 5分

      return expirationTime < now + margin;
    } catch (e) {
      console.error("Failed to check token expiration:", e);
      return true; // エラーが発生した場合は期限切れとみなす
    }
  }, []);

  // 1. LIFF Initialization
  useEffect(() => {
    const liffId = chatEntry?.lineConfig?.liffId;
    if (liffId) {
      liff
        .init({ liffId })
        .then(() => {
          if (!liff.isLoggedIn()) {
            liff.login();
          } else {
            // ログイン済みの場合はトークンを取得して有効性をチェック
            try {
              const token = liff.getIDToken();
              if (!token) {
                liff.login();
                return;
              }

              // トークンの有効期限をチェック
              if (isTokenExpired(token)) {
                reloginWithMessage(
                  "セッションが期限切れです。再ログインします...",
                );
                return;
              }

              // トークンが有効な場合は設定
              setIdToken(token);

              // プロフィール取得（名前のため）
              liff
                .getProfile()
                .then((profile) => {
                  setUserProfile({
                    userId: profile.userId,
                    displayName: profile.displayName,
                    pictureUrl: profile.pictureUrl,
                  });
                })
                .catch((err) => {
                  console.warn("Failed to get profile:", err);
                });
            } catch (e) {
              console.error("Failed to get ID Token on init:", e);
              liff.login();
            }
          }
        })
        .catch((e) => {
          console.error("LIFF Init Error", e);
          setInitializationError(`LIFF Initialization Failed: ${e}`);
        });
    } else {
      // LIFF IDが設定されていない場合
      // エラーメッセージを設定して、ユーザーにLIFF設定を促す
      setInitializationError(
        "LIFF IDが設定されていません。LIFFにこのエンドポイントを登録してください。",
      );
    }
  }, [chatEntry?.lineConfig?.liffId, isTokenExpired, reloginWithMessage]);

  // 2. Chat Session Initialization
  useEffect(() => {
    if (chatEntry?.showReferenceInfo !== undefined) {
      setShowReferenceInfo(chatEntry.showReferenceInfo);
    }

    // ボット情報の読み込みエラーをチェック（401エラーの場合は再ログインを促す）
    if (botManagement.botError) {
      const errorMessage = botManagement.botError.toLowerCase();
      if (
        errorMessage.includes("401") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("認証")
      ) {
        reloginWithMessage("セッションが期限切れです。再ログインします...");
        return;
      }
      // その他のエラーは通常通り表示
      setInitializationError(
        `ボット情報の読み込みに失敗しました: ${botManagement.botError}`,
      );
      return;
    }

    const liffId = chatEntry?.lineConfig?.liffId;
    // LIFF IDがない場合は初期化を進めない（エラーメッセージが表示されている）
    if (!liffId) {
      return;
    }

    // LIFF IDがある場合はidTokenが必要
    const hasSelectableResponder = botManagement.botList.length > 0;
    const shouldInitialize =
      hasSelectableResponder && !isInitialized && idToken;

    if (shouldInitialize) {
      setIsInitialized(true);
      setInitializationError(null);

      // 履歴取得開始
      if (idToken) {
        chatMessages.fetchHistory(idToken).catch((err) => {
          console.error("Failed to fetch initial history:", err);
        });
      }
    }

    // Initial Greeting
    // Only show if we have bot list and token is ready (though greeting is local,
    // sending message requires token, but receiving greeting doesn't necessarily...
    // however, consistency is better)
    if (
      !hasShownInitialGreetingRef.current &&
      chatEntry?.initialGreeting &&
      chatMessages.messages.length === 0 &&
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
  }, [
    chatEntry?.showReferenceInfo,
    chatEntry?.initialGreeting,
    botManagement.botList.length,
    botManagement.selectedBot,
    botManagement.botError,
    botManagement.isLoadingBots,
    chatMessages.messages.length,
    isInitialized,
    chatEntry?.isGreetingStreamingEnabled,
    idToken,
    reloginWithMessage,
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

      // メッセージ送信前に最新のIDトークンを取得（期限切れを防ぐため）
      let currentToken = idToken;
      try {
        if (!liff.isLoggedIn()) {
          // ログインしていない場合は再ログイン
          liff.login();
          return;
        }

        // 最新のトークンを取得
        currentToken = liff.getIDToken();
        if (!currentToken) {
          // トークンが取得できない場合は再ログイン
          liff.login();
          return;
        }

        // トークンを更新
        setIdToken(currentToken);
      } catch (e) {
        console.error("Failed to get ID Token:", e);
        setInitializationError(
          "IDトークンの取得に失敗しました。ページを再読み込みしてください。",
        );
        return;
      }

      const newUserMessage = {
        id: `user_${Date.now()}`,
        content,
        isOwnMessage: true,
        timestamp: new Date().toISOString(),
        botId: null,
        fileFormJson: { files: [], forms: [] },
      };

      // 現在のmessages + 新しいユーザーメッセージでchatHistoryを構築
      const updatedMessages = [...chatMessages.messages, newUserMessage];
      const isHandoffActive = isActiveHandoffState(
        chatMessages.responseMode,
        chatMessages.friendChatStatus,
      );

      // ユーザーメッセージをUIに追加
      chatMessages.addUserMessage(content);

      // LINEチャットストリーム開始
      try {
        const requestBody = {
          idToken: currentToken,
          message: content,
          sessionId: chatMessages.sessionId, // chatMessagesから取得
          botId: isHandoffActive
            ? null
            : (botManagement.selectedBot?.botId ?? null),
          suggestionItemId: suggestionItemId ?? null,
          chatHistory: updatedMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            isOwnMessage: msg.isOwnMessage,
            timestamp: msg.timestamp,
            botId: msg.botId,
          })),
          displayName: userProfile?.displayName,
          pictureUrl: userProfile?.pictureUrl,
        };

        await chatMessages.startLineChatWithHistory(
          currentToken,
          requestBody,
          isHandoffActive ? null : (botManagement.selectedBot?.botId ?? null),
          suggestionItemId ?? null,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const lowerErrorMessage = errorMessage.toLowerCase();
        const isAuthError =
          errorMessage.includes("認証エラー") ||
          lowerErrorMessage.includes("expired") ||
          lowerErrorMessage.includes("token expired") ||
          errorMessage.includes("401") ||
          errorMessage.includes("unauthorized") ||
          errorMessage.includes("ID Token expired");

        if (isAuthError) {
          reloginWithMessage("セッションが期限切れです。再ログインします...");
        } else {
          console.error("Chat error:", error);
        }
      }
    },
    [
      chatMessages,
      botManagement.selectedBot,
      idToken,
      userProfile,
      reloginWithMessage,
    ],
  );

  const resetSession = useCallback(() => {
    chatMessages.clearMessages();
    chatMessages.clearError();
    setInitializationError(null);
    setIsInitialized(false);
    hasShownInitialGreetingRef.current = false;
  }, [chatMessages]);

  const clearError = useCallback(() => {
    setInitializationError(null);
    chatMessages.clearError();
  }, [chatMessages]);

  const requestHumanSupport = useCallback(async () => {
    await chatMessages.requestHumanSupport();
    suppressRealtimeHistorySyncUntilRef.current = Date.now() + 1500;
  }, [chatMessages]);

  const cancelHumanSupport = useCallback(() => {
    chatMessages.cancelHumanSupport();
  }, [chatMessages]);

  useEffect(() => {
    isChatLoadingRef.current = chatMessages.isLoading;
  }, [chatMessages.isLoading]);

  useEffect(() => {
    isChatHistoryLoadingRef.current = chatMessages.isLoadingHistory;
  }, [chatMessages.isLoadingHistory]);

  useHandoffFirestoreRealtime({
    chatSpaceId: chatMessages.chatSpaceId,
    onChanged: () => {
      if (!idToken) return;
      if (isChatLoadingRef.current || isChatHistoryLoadingRef.current) {
        pendingRealtimeHistorySyncRef.current = true;
        return;
      }
      if (Date.now() < suppressRealtimeHistorySyncUntilRef.current) return;
      chatMessages.fetchHistory(idToken);
    },
  });

  useEffect(() => {
    if (!idToken) return;
    if (isChatLoadingRef.current || isChatHistoryLoadingRef.current) return;
    if (!pendingRealtimeHistorySyncRef.current) return;
    pendingRealtimeHistorySyncRef.current = false;
    if (Date.now() < suppressRealtimeHistorySyncUntilRef.current) return;
    chatMessages.fetchHistory(idToken);
  }, [chatMessages.fetchHistory, chatMessages.isLoading, chatMessages.isLoadingHistory, idToken]);

  return {
    ...botManagement,
    botList: botManagement.botList,
    selectedBot: botManagement.selectedBot,
    iconMap: botManagement.iconMap,
    selectBot: botManagement.selectBot,
    ...chatMessages,
    ...suggestManagement,
    isInitialized,
    showReferenceInfo,
    isSuggestMode,
    initializationError,
    idToken, // Expose token if needed
    isFormModalOpen,
    isFormSubmitted,
    userProfile,
    sendMessage,
    resetSession,
    clearError,
    requestHumanSupport,
    cancelHumanSupport,
    setIsFormModalOpen,
    handleFormSuccess,
    responseMode: chatMessages.responseMode,
    friendChatStatus: chatMessages.friendChatStatus,
    operatorName: chatMessages.operatorName,
  };
};
