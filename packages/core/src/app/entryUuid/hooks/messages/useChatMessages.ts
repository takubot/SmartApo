"use client";

import {
  ChatCompleteDataSchema,
  GetExternalChatHistoryResponseSchema,
  ChatExternalChatMessageSchema as ChatMessageSchema,
  ChatExternalChatSchema as CreateExternalChatSchema,
  type ChatExternalChatSchemaType as CreateExternalChatSchemaType,
  type GetExternalChatHistoryResponseSchemaType,
  type ChatExternalChatMessageSchemaType as ChatMessageSchemaType,
} from "@repo/api-contracts/based_template/zschema";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FileReferenceLinkJsonSchema,
  type FileReferenceLinkJson,
} from "../../types";
import { useHandoffFirestoreRealtime } from "@common/useHandoffFirestoreRealtime";
import { isActiveHandoffState } from "../handoff/handoffState";
import { resolveEntryChatRoute } from "../routing/chatRoute";
import { mergeMessagesWithHistory } from "./messageSync";
import { parseSseChunk } from "./sseEventParser";

// フロントエンド用のMessage型定義
import { type Message } from "../../types";

/**
 * チャットメッセージの状態管理を担当するhook
 * バックエンドの chat_history/external ルーターからデータを取得
 */
export const useChatMessages = (
  entryUuid: string,
  selectionType?: "BOT" | "SUGGEST",
) => {
  const getOrCreateExternalUserId = () => {
    if (typeof window === "undefined") return "";
    const userStorageKey = "external_user_id";
    let userId = localStorage.getItem(userStorageKey);
    if (!userId) {
      userId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `u_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(userStorageKey, userId);
    }
    return userId;
  };
  const [externalAuthToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const token = new URLSearchParams(window.location.search).get(
      "externalAuthToken",
    );
    return token?.trim() || "";
  });
  // メッセージの初期値をlocalStorageから読み込む
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const cacheKey = `chat_messages_cache_${entryUuid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          return parsed;
        } catch (e) {
          console.error("Failed to parse cached messages", e);
        }
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ステータス管理
  const [responseMode, setResponseMode] = useState<"AI" | "FRIEND">("AI");
  const [friendChatStatus, setFriendChatStatus] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [chatSpaceId, setChatSpaceId] = useState<number | null>(null);
  const [isHumanSupportRequested, setIsHumanSupportRequested] = useState(false);
  const [isCancellingHumanSupport, setIsCancellingHumanSupport] =
    useState(false);
  const isHumanSupportRequestedRef = useRef(false);
  const isHandoffActive = isActiveHandoffState(responseMode, friendChatStatus);

  // ... (ref 類は維持)
  const streamingBotIdRef = useRef<number | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const hasReceivedFirstContentRef = useRef<boolean>(false);
  const lastChatIdRef = useRef<number | null>(null);
  const contentBufferRef = useRef<string>("");
  const isLoadingRef = useRef(false);
  const isLoadingHistoryRef = useRef(false);
  const availableToolsRef = useRef<string[]>([]);
  const renderModeRef = useRef<"text" | "text_with_widget" | "human" | null>(
    null,
  );
  const suppressRealtimeHistorySyncUntilRef = useRef(0);
  const widgetPlanRef = useRef<string[]>([]);
  const customFormPayloadRef = useRef<Record<string, unknown> | null>(null);
  const pendingRealtimeHistorySyncRef = useRef(false);

  // ユーザーIDとセッションIDの管理（永続化対応）
  const [externalUserId] = useState<string>(() => getOrCreateExternalUserId());
  const sessionIdRef = useRef<string>("");
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const userId = getOrCreateExternalUserId();

    const sessionStorageKey = `chat_session_id_${entryUuid}`;
    let sId = localStorage.getItem(sessionStorageKey);
    if (!sId) {
      sId = userId;
      localStorage.setItem(sessionStorageKey, sId);
    }
    sessionIdRef.current = sId;
    return sId;
  });

  useEffect(() => {
    if (sessionIdRef.current) return;
    if (typeof window === "undefined") return;
    const userId = getOrCreateExternalUserId();
    const sessionStorageKey = `chat_session_id_${entryUuid}`;
    const sId = localStorage.getItem(sessionStorageKey) || userId;
    if (sId) {
      sessionIdRef.current = sId;
      setSessionId(sId);
    }
  }, [entryUuid]);

  // メッセージが更新されたらlocalStorageに保存
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cacheKey = `chat_messages_cache_${entryUuid}`;
      localStorage.setItem(cacheKey, JSON.stringify(messages));
    }
  }, [messages, entryUuid]);

  useEffect(() => {
    if (responseMode === "FRIEND") {
      setIsHumanSupportRequested(true);
      isHumanSupportRequestedRef.current = true;
      return;
    }
    setIsHumanSupportRequested(false);
    isHumanSupportRequestedRef.current = false;
  }, [responseMode]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isLoadingHistoryRef.current = isLoadingHistory;
  }, [isLoadingHistory]);

  // 履歴取得メソッド (追加)
  const fetchHistory = useCallback(
    async (isSilent = false) => {
      if (!entryUuid || !sessionId) return;

      // すでにロード中の場合は、サイレントでない場合のみスキップ検討（基本は重複実行を避ける）
      if (isLoadingHistory && !isSilent) return;

      if (!isSilent) setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/${entryUuid}/chat_history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId, externalAuthToken }),
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch history: ${res.status}`);
        }

        const data = await res.json();
        if (typeof data?.chatSpaceId === "number") {
          setChatSpaceId(data.chatSpaceId);
        }
        const validated = GetExternalChatHistoryResponseSchema.safeParse(data);

        if (!validated.success) {
          console.error("履歴データのバリデーションエラー:", validated.error);
          return;
        }

        const historyData = validated.data;

        if (historyData && Array.isArray(historyData.messages)) {
          // ステータス更新
          if (historyData.responseMode)
            setResponseMode(historyData.responseMode as "AI" | "FRIEND");
          if (historyData.friendChatStatus !== undefined)
            setFriendChatStatus(historyData.friendChatStatus);
          if (historyData.operatorName !== undefined)
            setOperatorName(historyData.operatorName);

          const historyMessages: Message[] = historyData.messages.map(
            (m: ChatMessageSchemaType) => ({
              ...m,
              fileReferenceLinkJson: (m as Message).fileReferenceLinkJson, // 署名付きURL等の変換が必要な場合はバックエンド側で対応済み
            }),
          );

          // 履歴差分を同期する（重複しやすい自分メッセージは内容+時刻近傍で吸収）
          setMessages((prev) => {
            return mergeMessagesWithHistory({
              previousMessages: prev,
              historyMessages,
              isStreaming: isLoadingRef.current,
            });
          });
        }
      } catch (e) {
        console.error("Error fetching chat history:", e);
      } finally {
        if (!isSilent) setIsLoadingHistory(false);
      }
    },
    // isLoading を依存関係から外すことで、ストリーミング開始/終了のたびに
    // fetchHistory が再生成されるのを防ぎ、結果として useEffect(fetchHistory) が
    // 無駄に走る（=ローディング画面が出る）のを阻止する
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entryUuid, sessionId],
  );

  // 初期化時に履歴を取得
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useHandoffFirestoreRealtime({
    chatSpaceId,
    onChanged: () => {
      if (isLoadingRef.current || isLoadingHistoryRef.current) {
        pendingRealtimeHistorySyncRef.current = true;
        return;
      }
      if (Date.now() < suppressRealtimeHistorySyncUntilRef.current) return;
      fetchHistory(true);
    },
  });

  useEffect(() => {
    if (isLoading || isLoadingHistory) return;
    if (!pendingRealtimeHistorySyncRef.current) return;
    pendingRealtimeHistorySyncRef.current = false;
    if (Date.now() < suppressRealtimeHistorySyncUntilRef.current) return;
    void fetchHistory(true);
  }, [isLoading, isLoadingHistory, fetchHistory]);

  // メッセージを追加
  const addMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // ユーザーメッセージを追加
  const addUserMessage = useCallback(
    (content: string) => {
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        content,
        isOwnMessage: true,
        timestamp: new Date().toISOString(),
        botId: null,
      };
      addMessage(userMessage);
    },
    [addMessage],
  );

  // ボットメッセージを追加
  const addBotMessage = useCallback(
    (
      content: string,
      botId: number,
      fileReferenceLinkJson?: FileReferenceLinkJson | null,
      options?: { isStreaming?: boolean },
    ) => {
      const botMessage: Message = {
        id: `bot_${Date.now()}`,
        content,
        isOwnMessage: false,
        timestamp: new Date().toISOString(),
        botId,
        fileReferenceLinkJson: fileReferenceLinkJson ?? null,
        isStreaming: options?.isStreaming ?? false,
      };
      addMessage(botMessage);
    },
    [addMessage],
  );

  // 初期挨拶（=会話開始前の先頭メッセージ）だけを安全に差し替える
  const updateInitialGreetingMessage = useCallback((content: string) => {
    const next = (content ?? "").toString();
    setMessages((prev) => {
      if (prev.length !== 1) return prev;
      const first = prev[0];
      if (!first || first.isOwnMessage) return prev;
      if (typeof first.content !== "string") return prev;
      if (first.content === next) return prev;
      return [{ ...first, content: next }];
    });
  }, []);

  // 外部チャットのSSEストリーム開始（chatHistoryを指定）
  const startExternalChatWithHistory = useCallback(
    async (
      userText: string,
      selectedBotId: number | null,
      chatHistoryMessages: Message[],
      suggestionItemId?: number | null,
      requestHuman?: boolean,
    ) => {
      if (!entryUuid || !userText.trim()) return;

      // 既にローディング中の場合は重複送信を防ぐ
      if (isLoading) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      streamingBotIdRef.current = null;
      streamingMessageIdRef.current = null;
      hasReceivedFirstContentRef.current = false;
      contentBufferRef.current = "";
      availableToolsRef.current = [];
      renderModeRef.current = null;
      widgetPlanRef.current = [];
      customFormPayloadRef.current = null;

      try {
        const route = resolveEntryChatRoute({
          entryUuid,
          selectionType,
          isHandoffActive,
          channel: "web",
          conversationScope: "external",
          suggestRouteTarget: "CHAT",
        });
        const sseUrl = route.ssePath;

        // Zodスキーマを使用してリクエストボディを検証・作成
        const requestBody = {
          message: userText,
          botId: isHandoffActive ? null : selectedBotId,
          chatSpaceId: chatSpaceId ?? null,
          sessionId: sessionId,
          externalAuthToken: externalAuthToken || null,
          suggestionItemId: suggestionItemId ?? null,
          chatHistory: chatHistoryMessages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            isOwnMessage: msg.isOwnMessage,
            timestamp: msg.timestamp,
            botId: msg.botId,
          })),
        } as CreateExternalChatSchemaType;

        const validationResult =
          CreateExternalChatSchema.safeParse(requestBody);
        if (!validationResult.success) {
          console.error(
            "リクエストボディの検証エラー:",
            validationResult.error,
          );
          setErrorMessage("リクエストデータが無効です");
          setIsLoading(false);
          return;
        }

        const validatedBody = validationResult.data;

        const response = await fetch(sseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(validatedBody),
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE通信エラー status:${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const upsertStreamingBotMessage = (chunk: string) => {
          const botId = streamingBotIdRef.current;
          const existingId = streamingMessageIdRef.current;

          if (!existingId) {
            const newId = `bot_stream_${Date.now()}`;
            streamingMessageIdRef.current = newId;
            const initialMessage: Message = {
              id: newId,
              content: chunk,
              isOwnMessage: false,
              timestamp: new Date().toISOString(),
              botId: botId ?? -1, // ボットIDがnullの場合は-1を使用
              fileReferenceLinkJson: null,
              availableTools: availableToolsRef.current,
              renderMode: renderModeRef.current ?? undefined,
              widgetPlan: widgetPlanRef.current,
              customFormPayload: customFormPayloadRef.current,
            };
            setMessages((prev) => [...prev, initialMessage]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === existingId
                  ? {
                      ...m,
                      content: (m.content || "") + chunk,
                      botId: botId ?? m.botId,
                    }
                  : m,
              ),
            );
          }
        };

        const flushContentBuffer = () => {
          if (contentBufferRef.current) {
            upsertStreamingBotMessage(contentBufferRef.current);
            contentBufferRef.current = "";
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const decodedChunk = decoder.decode(value, { stream: true });
            const { restBuffer, parsedEvents } = parseSseChunk(
              buffer,
              decodedChunk,
            );
            buffer = restBuffer;

            for (const { eventType, eventData } of parsedEvents) {
              try {
                const data = JSON.parse(eventData);
                switch (eventType) {
                  case "bot_selected": {
                    // バックエンドからはbot_idとして送信される
                    const bid =
                      typeof data?.bot_id === "number"
                        ? data.bot_id
                        : typeof data?.botId === "number"
                          ? data.botId
                          : null;
                    streamingBotIdRef.current = bid;

                    // 既存のメッセージがある場合は更新
                    if (streamingMessageIdRef.current) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageIdRef.current
                            ? { ...m, botId: bid ?? m.botId }
                            : m,
                        ),
                      );
                    }

                    // バッファされたコンテンツをフラッシュ
                    flushContentBuffer();
                    break;
                  }
                  case "answer_type": {
                    const answerType =
                      typeof data?.type === "string" ? data.type : null;
                    if (
                      answerType === "text" ||
                      answerType === "text_with_widget" ||
                      answerType === "human"
                    ) {
                      renderModeRef.current = answerType;
                    }
                    break;
                  }
                  case "agent_tools": {
                    availableToolsRef.current = Array.isArray(data?.tools)
                      ? data.tools.filter(
                          (tool: unknown): tool is string =>
                            typeof tool === "string",
                        )
                      : [];
                    if (streamingMessageIdRef.current) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageIdRef.current
                            ? {
                                ...m,
                                availableTools: availableToolsRef.current,
                              }
                            : m,
                        ),
                      );
                    }
                    break;
                  }
                  case "agent_render_plan": {
                    const mode =
                      data?.mode === "text" ||
                      data?.mode === "text_with_widget" ||
                      data?.mode === "human"
                        ? data.mode
                        : null;
                    const widgets = Array.isArray(data?.widgets)
                      ? data.widgets.filter(
                          (widget: unknown): widget is string =>
                            typeof widget === "string",
                        )
                      : [];
                    if (mode) {
                      renderModeRef.current = mode;
                    }
                    widgetPlanRef.current = widgets;
                    if (streamingMessageIdRef.current) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageIdRef.current
                            ? {
                                ...m,
                                renderMode:
                                  renderModeRef.current ?? m.renderMode,
                                widgetPlan: widgetPlanRef.current,
                              }
                            : m,
                        ),
                      );
                    }
                    break;
                  }
                  case "custom_form": {
                    customFormPayloadRef.current =
                      data && typeof data === "object" ? data : null;
                    break;
                  }
                  case "content": {
                    const text =
                      typeof data?.text === "string" ? data.text : "";
                    if (text) {
                      if (!hasReceivedFirstContentRef.current) {
                        hasReceivedFirstContentRef.current = true;
                        // ストリーミング中はisLoadingをtrueのまま維持
                      }

                      // ボットIDが設定されていない場合でも、コンテンツを即座に表示
                      if (contentBufferRef.current) {
                        upsertStreamingBotMessage(
                          contentBufferRef.current + text,
                        );
                        contentBufferRef.current = "";
                      } else {
                        upsertStreamingBotMessage(text);
                      }
                    }
                    break;
                  }
                  case "human_handoff_proposed": {
                    // 画面上部の有人対応ステータスのみで表現するため、
                    // メッセージ単位の提案UI更新は行わない
                    break;
                  }
                  case "human_handoff": {
                    // 有人対応イベント:
                    // - 明示的に接続ボタンを押した後: 接続待ち(FRIEND/WAITING)へ
                    // - それ以外(エージェント提案): 提案ボタンのみ表示
                    const isManualSupportRequest =
                      isHumanSupportRequestedRef.current;
                    if (isManualSupportRequest) {
                      setResponseMode("FRIEND");
                      setFriendChatStatus(
                        data?.friend_chat_status || "WAITING",
                      );
                      setOperatorName(null);
                    }
                    break;
                  }
                  case "error": {
                    const detail = data?.detail || "エラーが発生しました";
                    setErrorMessage(detail);
                    break;
                  }
                  case "chat_complete": {
                    const parsedChatComplete = ChatCompleteDataSchema.safeParse(
                      {
                        chatId: data?.chatId,
                        fileReferenceLinkJson:
                          data?.fileReferenceLinkJson ?? null,
                        sessionId: data?.sessionId ?? sessionIdRef.current,
                      },
                    );

                    if (!parsedChatComplete.success) {
                      console.warn(
                        "chat_complete validation failed:",
                        parsedChatComplete.error,
                      );
                      break;
                    }

                    const { chatId: chatLogId, fileReferenceLinkJson } =
                      parsedChatComplete.data;

                    if (chatLogId) {
                      lastChatIdRef.current = chatLogId;
                    }

                    // fileReferenceLinkJsonの処理を簡潔化
                    const normalizedFileReferenceLinkJson: FileReferenceLinkJson | null =
                      (() => {
                        if (
                          !fileReferenceLinkJson ||
                          typeof fileReferenceLinkJson !== "object"
                        ) {
                          return { files: [], links: [] };
                        }

                        const validation =
                          FileReferenceLinkJsonSchema.safeParse(
                            fileReferenceLinkJson,
                          );
                        if (validation.success) {
                          return validation.data;
                        }

                        // バリデーション失敗時も、可能な限りデータを保持
                        const rawFiles = Array.isArray(
                          fileReferenceLinkJson.files,
                        )
                          ? fileReferenceLinkJson.files
                          : [];
                        const rawLinks = Array.isArray(
                          fileReferenceLinkJson.links,
                        )
                          ? fileReferenceLinkJson.links
                          : [];

                        if (process.env.NODE_ENV === "development") {
                          console.warn(
                            "fileReferenceLinkJson validation failed, using partial data:",
                            {
                              error: validation.error,
                              rawFiles: rawFiles.length,
                              rawLinks: rawLinks.length,
                            },
                          );
                        }

                        // 部分的にでもデータがあれば返す
                        if (rawFiles.length > 0 || rawLinks.length > 0) {
                          return {
                            files: rawFiles.filter(
                              (f) =>
                                f &&
                                typeof f === "object" &&
                                typeof f.fileId === "number",
                            ),
                            links: rawLinks.filter(
                              (f) =>
                                f &&
                                typeof f === "object" &&
                                typeof f.referenceLinkId === "number",
                            ),
                          };
                        }

                        return { files: [], links: [] };
                      })();

                    if (streamingMessageIdRef.current) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageIdRef.current
                            ? {
                                ...m,
                                chatLogId,
                                evaluation: null,
                                fileReferenceLinkJson:
                                  normalizedFileReferenceLinkJson,
                                availableTools: availableToolsRef.current,
                                renderMode:
                                  renderModeRef.current ?? m.renderMode,
                                widgetPlan: widgetPlanRef.current,
                                customFormPayload:
                                  customFormPayloadRef.current ??
                                  m.customFormPayload,
                              }
                            : m,
                        ),
                      );
                    } else {
                      // メッセージがまだ作成されていない場合（例: 内容が空で完了した場合）
                      const hasFlags = !!customFormPayloadRef.current;

                      if (hasFlags) {
                        const newId = `bot_stream_${Date.now()}`;
                        streamingMessageIdRef.current = newId;
                        const finalMessage: Message = {
                          id: newId,
                          content: "",
                          isOwnMessage: false,
                          timestamp: new Date().toISOString(),
                          botId: streamingBotIdRef.current ?? -1,
                          fileReferenceLinkJson:
                            normalizedFileReferenceLinkJson,
                          chatLogId,
                          evaluation: null,
                          availableTools: availableToolsRef.current,
                          renderMode: renderModeRef.current ?? undefined,
                          widgetPlan: widgetPlanRef.current,
                          customFormPayload: customFormPayloadRef.current,
                        };
                        setMessages((prev) => [...prev, finalMessage]);
                      }
                    }
                    break;
                  }
                  default:
                    // 未知イベントは無視
                    break;
                }
              } catch (e) {
                console.error("Failed to parse event data:", e, eventData);
              }
            }
          }
        } finally {
          reader.releaseLock();
          setIsLoading(false);
        }
      } catch (error) {
        console.error("External chat stream error:", error);
        if (error instanceof Error) {
          setErrorMessage(error.message || "通信エラーが発生しました");
        } else {
          setErrorMessage("通信エラーが発生しました");
        }
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entryUuid, selectionType, externalAuthToken, isHandoffActive, chatSpaceId],
  );

  // メッセージをクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // セッションをリセット（新しい会話を開始）
  const resetSession = useCallback(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    setMessages([]);
  }, []);

  // エラーメッセージをクリア
  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // ローディング状態を設定
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // 評価送信関数
  const sendEvaluation = useCallback(
    async (chatLogId: number, evaluation: "GOOD" | "BAD") => {
      try {
        const response = await fetch(`/api/${entryUuid}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatLogId, evaluation }),
        });

        if (!response.ok) throw new Error("評価の送信に失敗しました");

        // メッセージの評価状態を更新
        setMessages((prev) =>
          prev.map((m) =>
            m.chatLogId === chatLogId ? { ...m, evaluation } : m,
          ),
        );
      } catch (error) {
        console.error("Failed to send evaluation", error);
        throw error;
      }
    },
    [entryUuid],
  );

  // フィードバック送信関数
  const sendFeedback = useCallback(
    async (chatLogId: number, feedback: string) => {
      try {
        const response = await fetch(`/api/${entryUuid}/feedback`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatLogId, feedback }),
        });

        if (!response.ok) throw new Error("フィードバックの送信に失敗しました");
      } catch (error) {
        console.error("Failed to send feedback", error);
        throw error;
      }
    },
    [entryUuid],
  );

  // 有人対応をリクエスト（UIには定型文を表示しない）
  const requestHumanSupport = useCallback(async () => {
    if (isHumanSupportRequested || responseMode === "FRIEND") return;

    try {
      const response = await fetch(`/api/${entryUuid}/chat/handoff_connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || sessionId,
          chatSpaceId: chatSpaceId ?? undefined,
          externalAuthToken: externalAuthToken || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(errorText || "有人対応の開始に失敗しました");
      }

      const payload = await response.json().catch(() => null);
      const nextChatSpaceId =
        typeof payload?.data?.chatSpaceId === "number"
          ? payload.data.chatSpaceId
          : typeof payload?.chatSpaceId === "number"
            ? payload.chatSpaceId
            : null;
      if (nextChatSpaceId !== null) {
        setChatSpaceId(nextChatSpaceId);
      }

      setIsHumanSupportRequested(true);
      isHumanSupportRequestedRef.current = true;
      setResponseMode("FRIEND");
      setFriendChatStatus("WAITING");
      setOperatorName(null);
      suppressRealtimeHistorySyncUntilRef.current = Date.now() + 1500;
      window.setTimeout(() => {
        void fetchHistory(true);
      }, 1600);
    } catch (error) {
      console.error("Failed to request human support", error);
      const message =
        error instanceof Error
          ? error.message || "有人対応の開始に失敗しました"
          : "有人対応の開始に失敗しました";
      setErrorMessage(message);
    }
  }, [
    chatSpaceId,
    entryUuid,
    externalAuthToken,
    fetchHistory,
    isHumanSupportRequested,
    responseMode,
    sessionId,
  ]);

  const cancelHumanSupport = useCallback(async () => {
    if (!sessionId) return;
    setIsCancellingHumanSupport(true);
    try {
      const response = await fetch(`/api/${entryUuid}/chat/handoff_cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || sessionId,
          chatSpaceId: chatSpaceId ?? undefined,
          externalAuthToken: externalAuthToken || undefined,
        }),
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorJson = await response.json().catch(() => null);
          const message =
            typeof errorJson?.message === "string"
              ? errorJson.message
              : typeof errorJson?.data === "string"
                ? errorJson.data
                : "";
          throw new Error(message || "有人対応の解除に失敗しました");
        }
        const errorText = await response.text().catch(() => "");
        const safeMessage = errorText.trim().startsWith("<!DOCTYPE html>")
          ? "有人対応の解除に失敗しました（APIルートが見つかりません）"
          : errorText;
        throw new Error(safeMessage || "有人対応の解除に失敗しました");
      }
      setResponseMode("AI");
      setFriendChatStatus("CLOSED");
      setOperatorName(null);
      setIsHumanSupportRequested(false);
      isHumanSupportRequestedRef.current = false;
    } catch (error) {
      console.error("Failed to cancel human support", error);
      const message =
        error instanceof Error
          ? error.message || "有人対応の解除に失敗しました"
          : "有人対応の解除に失敗しました";
      setErrorMessage(message);
      throw error;
    } finally {
      setIsCancellingHumanSupport(false);
    }
  }, [chatSpaceId, entryUuid, externalAuthToken, sessionId]);

  // 予約スロットを選択
  const selectBookingSlot = useCallback(
    (slot: unknown) => {
      const slotData = slot as { startAt: string | Date };
      const slotText = `${new Date(slotData.startAt).toLocaleString()}の予約を受け付けました`;
      addUserMessage(slotText);
    },
    [addUserMessage],
  );

  return {
    // 状態
    messages,
    isLoading,
    isLoadingHistory,
    errorMessage,
    externalUserId,
    sessionId,
    responseMode,
    friendChatStatus,
    operatorName,
    chatSpaceId,
    isHumanSupportRequested,
    isCancellingHumanSupport,

    // アクション
    addMessage,
    addUserMessage,
    addBotMessage,
    updateInitialGreetingMessage,
    clearMessages,
    clearError,
    setLoading,
    startExternalChatWithHistory,
    resetSession,
    sendEvaluation,
    sendFeedback,
    fetchHistory,
    requestHumanSupport,
    cancelHumanSupport,
    selectBookingSlot,
  };
};
