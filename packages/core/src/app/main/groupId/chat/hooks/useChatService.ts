"use client";

import {
  list_bot_v2_bot_list__group_id__post,
  create_chat_space_v2_chat_space_create__group_id__post,
  list_chat_spaces_v2_chat_space_list__group_id__get,
  update_chat_space_v2_chat_space_update__chat_space_id__put,
  delete_chat_space_v2_chat_space_delete__chat_space_id__delete,
  get_chat_space_history_v2_chat_history_chat_space_history__group_id__post,
  get_file_v2_file_get__file_id__get,
  evaluate_chat_v2_chat_history_evaluate__group_id__post,
  update_chat_log_feedback_v2_chat_log_feedback_post,
  list_ai_models_v2_chat_ai_platform_models_get,
  create_chat_ai_platform_image_v2_chat_ai_platform_create_image__group_id__post,
} from "@repo/api-contracts/based_template/service";
import {
  ChatSpaceSchemaType,
  CreateChatSpaceSchemaType,
  ChatInternalDefaultSchemaType,
  CreateChatAIPlatformSchemaType,
  UpdateChatSpaceSchemaType,
  GetChatSpaceHistoryRequestType,
  GetChatSpaceHistoryResponseType,
  EvaluateChatRequestType,
  EvaluateChatResponseType,
  ChatLogFeedbackRequestType,
  ChatLogFeedbackResponseType,
  BotResponseSchemaType,
  BotListResponseSchemaType,
  GetFileSignedUrlResponse,
  AIModelSchemaType,
  type CreateImageResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI, handleResponseError } from "@common/errorHandler";
/**
 * -----------------------
 * 型定義
 * -----------------------
 */

// BotData型はBotResponseSchemaTypeを使用
export type BotData = BotResponseSchemaType;
export type AIModelData = AIModelSchemaType;

// バックエンド側のCreateChatAIPlatformSchemaをそのまま利用する
export type CreateChatAIPlatformRequestType = CreateChatAIPlatformSchemaType;

/**
 * SSEイベントの型定義
 */
export type SSEEvent =
  | { type: "bot_selected"; data: { botId: number } }
  | { type: "status"; data: { text: string } }
  | { type: "content"; data: { text: string } }
  | { type: "citations"; data: { citations: string[] } }
  | {
      type: "chat_complete";
      data: {
        chat_id: number;
        file_info: Array<{
          file_id: number;
          file_name?: string;
          chunk_summary_description?: string;
          relevant_pages: number[];
          display_file_link?: boolean;
        }>;
        links?: Array<{
          referenceLinkId: number;
          linkName: string;
          linkUrl: string;
          description?: string;
        }>;
      };
    };

/**
 * 共通のSSEリクエストハンドラ
 */
async function handleSSERequest(
  url: string,
  data: any,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void,
) {
  try {
    // FirebaseのIDトークンを取得
    const { auth } = await import("../../../../../lib/firebase");
    const user = auth.currentUser;
    let idToken = "";

    if (user) {
      try {
        idToken = await user.getIdToken();
      } catch (error) {
        console.error("Failed to get ID token:", error);
        idToken = localStorage.getItem("access_token") || "";
      }
    } else {
      idToken = localStorage.getItem("access_token") || "";
    }

    const sseResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(data),
    });

    if (!sseResponse.ok) {
      await handleResponseError(sseResponse);
    }

    if (!sseResponse.body) {
      const error = new Error("SSE通信エラー: レスポンスボディがありません");
      (error as any).response = {
        status: 500,
        data: { message: "Response body is null" },
      };
      throw error;
    }

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          const lines = eventStr.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7);
            } else if (line.startsWith("data: ")) {
              eventData = line.substring(6);
            }
          }

          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);

              switch (eventType) {
                case "bot_selected":
                  onEvent({ type: "bot_selected", data });
                  break;
                case "status":
                  onEvent({ type: "status", data });
                  break;
                case "content":
                  onEvent({ type: "content", data });
                  break;
                case "citations":
                  onEvent({ type: "citations", data });
                  break;
                case "chat_complete":
                  onEvent({ type: "chat_complete", data });
                  break;
                case "error": // AI Platformエラー用
                  if (onError)
                    onError(new Error(data.detail || "Error occurred"));
                  break;
                default:
                  console.warn("Unknown event type:", eventType);
              }
            } catch (e) {
              console.error("Failed to parse event data:", e, eventData);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    const errorObj =
      error instanceof Error
        ? error
        : new Error(String(error) || "チャットストリームエラー");

    if (onError) {
      onError(errorObj);
    } else {
      throw errorObj;
    }
  }
}

/**
 * -----------------------
 * チャット作成 (SSEストリーミング) - 既存RAG
 * -----------------------
 */
export async function chatCreateStreamRequest(
  groupId: string,
  data: ChatInternalDefaultSchemaType,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const sseUrl = `/api/chat/${groupId}`;
  await handleSSERequest(sseUrl, data, onEvent, onError);
}

/**
 * -----------------------
 * チャット作成 (SSEストリーミング) - AI Platform
 * -----------------------
 */
export async function chatCreateAIPlatformStreamRequest(
  groupId: string,
  data: CreateChatAIPlatformRequestType,
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const sseUrl = `/api/chat_ai_platform/${groupId}`;
  await handleSSERequest(sseUrl, data, onEvent, onError);
}

/**
 * -----------------------
 * チャット作成 (画像生成 - JSONレスポンス) - Nano Banana
 * -----------------------
 */
export async function chatCreateAIPlatformImageRequest(
  groupId: string,
  data: CreateChatAIPlatformRequestType,
): Promise<CreateImageResponseSchemaType> {
  try {
    const response =
      await create_chat_ai_platform_image_v2_chat_ai_platform_create_image__group_id__post(
        groupId,
        data,
      );
    return response as CreateImageResponseSchemaType;
  } catch (error) {
    handleErrorWithUI(error, "画像生成");
    throw error;
  }
}

/**
 * -----------------------
 * チャットスペース一覧取得
 * -----------------------
 */
export async function getChatSpacesFromBackend(
  groupId: string,
): Promise<ChatSpaceSchemaType[]> {
  try {
    if (!groupId) {
      console.error("getChatSpacesFromBackend: groupId is required");
      return [];
    }

    const response =
      await list_chat_spaces_v2_chat_space_list__group_id__get(groupId);

    const chatSpaces = Array.isArray(response) ? response : [];
    return chatSpaces;
  } catch (error: any) {
    handleErrorWithUI(error, "チャットスペース一覧取得");
    // エラー時は空配列を返す（エラー表示は呼び出し元で処理）
    return [];
  }
}

/**
 * -----------------------
 * チャットスペース作成
 * -----------------------
 */
export async function createChatSpace(
  groupId: string,
  data?: CreateChatSpaceSchemaType,
) {
  try {
    const response =
      await create_chat_space_v2_chat_space_create__group_id__post(
        groupId,
        data || {},
      );

    return response;
  } catch (error) {
    handleErrorWithUI(error, "チャットスペース作成");
    throw error;
  }
}

/**
 * -----------------------
 * チャットスペース更新
 * -----------------------
 */
export async function updateChatSpace(
  chatSpaceId: number | string,
  data: UpdateChatSpaceSchemaType,
) {
  try {
    const response =
      await update_chat_space_v2_chat_space_update__chat_space_id__put(
        String(chatSpaceId),
        data,
      );

    return response;
  } catch (error) {
    handleErrorWithUI(error, "チャットスペース更新");
    throw error;
  }
}

/**
 * -----------------------
 * チャットスペース削除
 * -----------------------
 */
export async function deleteChatSpace(chatSpaceId: number | string) {
  try {
    const response =
      await delete_chat_space_v2_chat_space_delete__chat_space_id__delete(
        String(chatSpaceId),
      );

    return response;
  } catch (error) {
    handleErrorWithUI(error, "チャットスペース削除");
    throw error;
  }
}

/**
 * -----------------------
 * チャットスペース履歴取得
 * -----------------------
 */
export async function getChatSpaceHistoryFromBackend(
  groupId: string,
  request: GetChatSpaceHistoryRequestType,
): Promise<GetChatSpaceHistoryResponseType | null> {
  try {
    const response =
      await get_chat_space_history_v2_chat_history_chat_space_history__group_id__post(
        groupId,
        request,
      );
    return response || null;
  } catch (error) {
    handleErrorWithUI(error, "チャット履歴取得");
    // エラー時はnullを返す（エラー表示は呼び出し元で処理）
    return null;
  }
}

/**
 * -----------------------
 * Bot一覧取得
 * -----------------------
 */
export async function getBotListFromBackend(
  groupId: string,
): Promise<BotData[]> {
  try {
    const response: BotListResponseSchemaType =
      await list_bot_v2_bot_list__group_id__post(groupId, {
        includeIcon: true,
      });
    const botList = response?.botList;
    return Array.isArray(botList) ? botList : [];
  } catch (error) {
    handleErrorWithUI(error, "Bot一覧取得");
    // エラー時は空配列を返す（エラー表示は呼び出し元で処理）
    return [];
  }
}

/**
 * -----------------------
 * ファイルダウンロード
 * -----------------------
 */
export async function downloadFileRequest(fileId: number): Promise<string> {
  try {
    const json = (await get_file_v2_file_get__file_id__get(
      String(fileId),
    )) as unknown;

    const parsed = GetFileSignedUrlResponse.safeParse(json);
    if (!parsed.success) {
      const fallback = (json as any)?.signedUrl || (json as any)?.signed_url;
      if (!fallback) {
        const error = new Error("Invalid signed URL response");
        handleErrorWithUI(error, "ファイル取得");
        throw error;
      }
      return fallback as string;
    }

    return parsed.data.signedUrl;
  } catch (error) {
    handleErrorWithUI(error, "ファイル取得");
    throw error;
  }
}

/**
 * -----------------------
 * ファイル情報取得（URLとファイル名）
 * -----------------------
 */
export async function getFileInfoRequest(
  fileId: number,
): Promise<{ signedUrl: string; fileName: string }> {
  try {
    const json = (await get_file_v2_file_get__file_id__get(
      String(fileId),
    )) as unknown;

    const parsed = GetFileSignedUrlResponse.safeParse(json);
    if (!parsed.success) {
      const fallback = (json as any)?.signedUrl || (json as any)?.signed_url;
      const fallbackFileName =
        (json as any)?.fileName || (json as any)?.file_name || "file";
      if (!fallback) {
        const error = new Error("Invalid signed URL response");
        handleErrorWithUI(error, "ファイル取得");
        throw error;
      }
      return { signedUrl: fallback as string, fileName: fallbackFileName };
    }

    return {
      signedUrl: parsed.data.signedUrl,
      fileName: parsed.data.fileName || "file",
    };
  } catch (error) {
    handleErrorWithUI(error, "ファイル取得");
    throw error;
  }
}

/**
 * -----------------------
 * txtファイル用の新規タブで開く処理（エンコーディング対応）
 * -----------------------
 */
export async function openTextFile(
  url: string,
  fileName: string,
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ファイルの取得に失敗しました: ${response.statusText}`);
    }

    // レスポンスをテキストとして取得（UTF-8として解釈）
    const text = await response.text();

    // UTF-8 BOM付きでBlobを作成（文字化けを防ぐ）
    const bom = "\uFEFF";
    const blob = new Blob([bom + text], { type: "text/plain;charset=utf-8" });

    // Blob URLを作成して新規タブで開く
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // メモリリークを防ぐためにURLを解放
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
  } catch (error) {
    console.error("テキストファイル表示エラー:", error);
    throw error;
  }
}

/**
 * -----------------------
 * 評価（GOOD/BAD）送信
 * -----------------------
 */
export async function evaluateChat(
  groupId: string,
  body: EvaluateChatRequestType,
): Promise<EvaluateChatResponseType> {
  try {
    const response =
      await evaluate_chat_v2_chat_history_evaluate__group_id__post(
        groupId,
        body,
      );
    return response as EvaluateChatResponseType;
  } catch (error) {
    handleErrorWithUI(error, "チャット評価");
    throw error;
  }
}

/**
 * -----------------------
 * フィードバック送信
 * -----------------------
 */
export async function postChatFeedback(
  groupId: string,
  body: ChatLogFeedbackRequestType,
): Promise<ChatLogFeedbackResponseType> {
  try {
    const response =
      await update_chat_log_feedback_v2_chat_log_feedback_post(body);
    return response as ChatLogFeedbackResponseType;
  } catch (error) {
    handleErrorWithUI(error, "フィードバック送信");
    throw error;
  }
}

/**
 * -----------------------
 * AIモデル一覧取得
 * -----------------------
 */
export async function getAIModelsFromBackend(): Promise<AIModelData[]> {
  try {
    const response = await list_ai_models_v2_chat_ai_platform_models_get();
    return Array.isArray(response) ? response : [];
  } catch (error) {
    handleErrorWithUI(error, "AIモデル一覧取得");
    return [];
  }
}
