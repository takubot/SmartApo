"use client";

import { ChatCompleteDataSchema } from "@repo/api-contracts/based_template/zschema";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  FileReferenceLinkJsonSchema,
  type FileReferenceLinkJson,
  type Message,
} from "../../types";
import { isActiveHandoffState } from "../handoff/handoffState";
import { resolveEntryChatRoute } from "../routing/chatRoute";
import { mergeMessagesWithHistory } from "./messageSync";
import { parseSseChunk } from "./sseEventParser";

const createLineSessionId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `line_session_${crypto.randomUUID()}`;
  }
  return `line_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * LINEチャットメッセージの状態管理を担当するhook
 * バックエンドの /internal/liff/chat ルーターからデータを取得 (Proxy経由)
 */
export const useLineChatMessages = (
  entryUuid: string,
  selectionType?: "BOT" | "SUGGEST",
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [responseMode, setResponseMode] = useState<"AI" | "FRIEND">("AI");
  const [friendChatStatus, setFriendChatStatus] = useState<string | null>(null);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [chatSpaceId, setChatSpaceId] = useState<number | null>(null);
  const [isHumanSupportRequested, setIsHumanSupportRequested] = useState(false);
  const [isCancellingHumanSupport, setIsCancellingHumanSupport] =
    useState(false);
  const isHumanSupportRequestedRef = useRef(false);
  const isHandoffActive = isActiveHandoffState(responseMode, friendChatStatus);

  const streamingBotIdRef = useRef<number | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);
  const hasReceivedFirstContentRef = useRef<boolean>(false);
  const lastChatIdRef = useRef<number | null>(null);
  const contentBufferRef = useRef<string>("");
  const isLoadingRef = useRef(false);
  const availableToolsRef = useRef<string[]>([]);
  const renderModeRef = useRef<"text" | "text_with_widget" | "human" | null>(
    null,
  );
  const widgetPlanRef = useRef<string[]>([]);
  const customFormPayloadRef = useRef<Record<string, unknown> | null>(null);

  // セッションIDの管理（entryUuid単位で永続化）
  const sessionIdRef = useRef<string>("");
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const storageKey = `line_session_id_${entryUuid}`;
    const storedSessionId = localStorage.getItem(storageKey);
    if (storedSessionId) {
      sessionIdRef.current = storedSessionId;
      return storedSessionId;
    }
    const newSessionId = createLineSessionId();
    localStorage.setItem(storageKey, newSessionId);
    sessionIdRef.current = newSessionId;
    return newSessionId;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `line_session_id_${entryUuid}`;
    const storedSessionId = localStorage.getItem(storageKey);
    if (storedSessionId) {
      if (storedSessionId !== sessionIdRef.current) {
        sessionIdRef.current = storedSessionId;
        setSessionId(storedSessionId);
      }
      return;
    }
    const newSessionId = createLineSessionId();
    localStorage.setItem(storageKey, newSessionId);
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
  }, [entryUuid]);

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

  // LINEチャットのSSEストリーム開始
  const startLineChatWithHistory = useCallback(
    async (
      idToken: string,
      requestBody: any, // 構築済みBodyを受け取る
      selectedBotId: number | null,
      suggestionItemId?: number | null,
    ) => {
      // userText は requestBody.message から取得
      const userText = requestBody.message;
      if (!entryUuid || !userText?.trim()) return;

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
          channel: "line",
          conversationScope: "external",
          suggestRouteTarget: "CHAT",
        });
        const sseUrl = route.ssePath;

        const finalRequestBody = requestBody;

        const response = await fetch(sseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(finalRequestBody),
        });

        if (!response.ok) {
          // 401エラーの場合、トークン期限切れの可能性がある
          if (response.status === 401) {
            const errorText = await response.text().catch(() => "");
            let errorMessage = "認証エラーが発生しました。";
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.detail) {
                errorMessage = errorJson.detail;
              }
            } catch {
              if (errorText) {
                errorMessage = errorText;
              }
            }
            // エラーメッセージを明確に（再ログイン処理で検出しやすくする）
            const fullErrorMessage = `認証エラー: ${errorMessage}`;
            console.error("Authentication error:", fullErrorMessage);
            throw new Error(fullErrorMessage);
          }
          const errorText = await response.text().catch(() => "");
          throw new Error(
            `SSE通信エラー status:${response.status} ${errorText}`,
          );
        }

        if (!response.body) {
          throw new Error("レスポンスボディが取得できませんでした");
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
              botId: botId ?? -1,
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
                    const bid =
                      typeof data?.bot_id === "number"
                        ? data.bot_id
                        : typeof data?.botId === "number"
                          ? data.botId
                          : null;
                    streamingBotIdRef.current = bid;

                    if (streamingMessageIdRef.current) {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === streamingMessageIdRef.current
                            ? { ...m, botId: bid ?? m.botId }
                            : m,
                        ),
                      );
                    }
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
                      }
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
                        // Fallback logic similar to original hook
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
                        if (rawFiles.length > 0 || rawLinks.length > 0) {
                          return {
                            files: rawFiles.filter(
                              (f: any) =>
                                f &&
                                typeof f === "object" &&
                                typeof f.fileId === "number",
                            ),
                            links: rawLinks.filter(
                              (f: any) =>
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
          // 認証エラーの場合は再throwして、上位のハンドラーで処理させる
          if (
            error.message.includes("認証エラー") ||
            error.message.toLowerCase().includes("expired") ||
            error.message.includes("401")
          ) {
            setIsLoading(false);
            throw error; // 再throwして上位で処理させる
          }
        } else {
          setErrorMessage("通信エラーが発生しました");
        }
        setIsLoading(false);
        // 認証エラー以外のエラーはここで処理完了
      }
    },
    [entryUuid, sessionId, selectionType, isHandoffActive, chatSpaceId], // sessionIdも依存配列に追加
  );

  // 履歴取得メソッド
  const fetchHistory = useCallback(
    async (idToken: string) => {
      if (!entryUuid) return;

      // 既にメッセージがある場合は（二重取得防止のため）何もしないか、あるいは追記するか検討
      // ここでは初期化時のみを想定して、メッセージが空の場合のみ実行する制御を入れてもよい
      // if (messages.length > 0) return;

      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/${entryUuid}/line_chat_log`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch history: ${res.status}`);
        }

        const data = await res.json();
        // data: { messages: ChatHistoryMessageSchema[], responseMode?: string, friendChatStatus?: string, operatorName?: string }
        if (data && Array.isArray(data.messages)) {
          if (typeof data.chatSpaceId === "number") {
            setChatSpaceId(data.chatSpaceId);
          }
          // ステータス更新
          if (data.responseMode)
            setResponseMode(data.responseMode as "AI" | "FRIEND");
          if (data.friendChatStatus !== undefined)
            setFriendChatStatus(data.friendChatStatus);
          if (data.operatorName !== undefined)
            setOperatorName(data.operatorName);

          // 型変換してセット
          const historyMessages: Message[] = data.messages.map((m: any) => ({
            ...m,
            fileReferenceLinkJson: m.fileReferenceLinkJson, // サーバー側で署名付きURL変換済みならそのまま使える
          }));

          setMessages((prev) =>
            mergeMessagesWithHistory({
              previousMessages: prev,
              historyMessages,
              isStreaming: isLoadingRef.current,
            }),
          );
        }
      } catch (e) {
        console.error("Error fetching chat history:", e);
        // 履歴取得失敗は致命的エラーにしない（新規チャットとして続行可能）
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [entryUuid],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const resetSession = useCallback(() => {
    const newSessionId = createLineSessionId();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);
    if (typeof window !== "undefined") {
      localStorage.setItem(`line_session_id_${entryUuid}`, newSessionId);
    }
    setMessages([]);
  }, [entryUuid]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  // 評価・フィードバックは既存APIを使用 (LIFFでも同じAPIでOK)
  // ただし、もしLIFFユーザー固有の認証が必要なら修正要。
  // ここでは /api/[entryUuid]/evaluate をそのまま使う (session_idなどはcookie/body依存だが、評価はchatLogIdがあれば良い)

  const sendEvaluation = useCallback(
    async (chatLogId: number, evaluation: "GOOD" | "BAD") => {
      try {
        const response = await fetch(`/api/${entryUuid}/evaluate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatLogId, evaluation }),
        });
        if (!response.ok) throw new Error("評価の送信に失敗しました");
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

  const requestHumanSupport = useCallback(async () => {
    if (isHumanSupportRequested || responseMode === "FRIEND") return;

    try {
      const response = await fetch(`/api/${entryUuid}/chat/handoff_connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current || sessionId,
          chatSpaceId: chatSpaceId ?? undefined,
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
  }, [chatSpaceId, entryUuid, sessionId]);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    errorMessage,
    sessionId,
    responseMode,
    friendChatStatus,
    operatorName,
    chatSpaceId,
    isHumanSupportRequested,
    isCancellingHumanSupport,
    addMessage,
    addUserMessage,
    addBotMessage,
    updateInitialGreetingMessage,
    clearMessages,
    clearError,
    setLoading,
    startLineChatWithHistory,
    resetSession,
    sendEvaluation,
    sendFeedback,
    fetchHistory,
    requestHumanSupport,
    cancelHumanSupport,
  };
};
