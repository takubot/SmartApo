"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type ApiSuccessResponse<T> = {
  status: "success";
  data: T;
  message?: string;
};

/**
 * ボット管理に関する状態管理を担当するhook
 * バックエンドの bot/external ルーターからデータを取得
 */
export const useBotManagement = (entryUuid: string) => {
  const [selectedBot, setSelectedBot] = useState<BotResponseSchemaType | null>(
    null,
  );

  const fetchExternalList = useCallback(
    async (path: string, resourceLabel: string) => {
      const response = await fetch(path, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        credentials: "omit",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        if (response.status === 401) {
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
          throw new Error(`認証エラー: ${errorMessage}`);
        }
        throw new Error(
          `Failed to fetch ${resourceLabel}: ${response.status} ${errorText}`,
        );
      }

      const contentType = response.headers.get("content-type");
      const responseText = await response.text();
      if (
        responseText.trim().startsWith("<!DOCTYPE") ||
        !contentType?.includes("application/json")
      ) {
        throw new Error(
          `API returned HTML instead of JSON. Status: ${response.status}`,
        );
      }

      let data: unknown;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(
          `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

      if (
        !data ||
        typeof data !== "object" ||
        (data as { status?: unknown }).status !== "success"
      ) {
        const message =
          (data as { message?: unknown })?.message ??
          `Failed to fetch ${resourceLabel}`;
        throw new Error(
          typeof message === "string" ? message : "API response is invalid",
        );
      }
      return (data as ApiSuccessResponse<unknown>).data;
    },
    [],
  );

  // SWR: ボットリスト取得
  const {
    data: botListResponse,
    error: botListError,
    isLoading: isLoadingBotList,
  } = useSWR(
    typeof window !== "undefined" && entryUuid ? ["botList", entryUuid] : null,
    async () => fetchExternalList(`/api/${entryUuid}/bot`, "bot list"),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 10000,
    },
  );

  // アイコンマップの作成（bot_listから署名付きURLを取得）
  const iconMap = useMemo(() => {
    if (!botListResponse) {
      return {};
    }

    // botListResponseが配列かオブジェクトかを確認
    const bots = Array.isArray(botListResponse)
      ? botListResponse
      : botListResponse.botList || [];

    const map: Record<number, string> = {};
    bots.forEach((bot: BotResponseSchemaType) => {
      if (bot.botId && bot.botIconImgGcsPath) {
        map[bot.botId] = bot.botIconImgGcsPath;
      }
    });

    return map;
  }, [botListResponse]);

  // ボットリストの作成（署名付きURLを使用）
  const botList = useMemo(() => {
    // botListResponseが配列かオブジェクトかを確認
    const bots = Array.isArray(botListResponse)
      ? botListResponse
      : botListResponse?.botList || [];

    if (!bots || bots.length === 0) {
      return [];
    }

    const result = (bots as BotResponseSchemaType[])
      .map((b: BotResponseSchemaType) => ({
        botId: b.botId,
        botName: b.botName || `Bot ${b.botId}`,
        botDescription: b.botDescription || "",
        botIconImgGcsPath: b.botIconImgGcsPath || "/botIcon/default.ico",
        fileLen: b.fileLen || 0,
        botPermissionLevel: b.botPermissionLevel || "GROUP_MEMBER",
        canEdit: false,
        canDelete: false,
        isWebSearchBot: b.isWebSearchBot || false,
        botSearchUrl: b.botSearchUrl || null,
        botSearchInfoPrompt: b.botSearchInfoPrompt || null,
      }))
      .filter((bot: BotResponseSchemaType) => bot.botId);

    return result;
  }, [botListResponse]);

  // ボットを選択
  const selectBot = useCallback((bot: BotResponseSchemaType | null) => {
    setSelectedBot(bot);
  }, []);

  return {
    // 状態
    botList,
    iconMap,
    selectedBot,
    isLoadingBots: isLoadingBotList,
    botError: botListError ? "ボットリストの取得に失敗しました" : null,

    // アクション
    selectBot,
  };
};
