"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import type {
  ExternalSuggestResponseSchemaType,
  ExternalSuggestItemResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";

/**
 * サジェスト管理に関する状態管理を担当するhook
 * バックエンドの suggest/external ルーターからデータを取得
 */
export const useSuggestManagement = (
  entryUuid: string,
  suggestId?: number | null,
) => {
  const [selectedSuggest, setSelectedSuggest] =
    useState<ExternalSuggestItemResponseSchemaType | null>(null);
  // 選択直後に前階層を即時非表示にするためのフラグ
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  // 選択履歴（階層ナビゲーション用）
  const [selectionHistory, setSelectionHistory] = useState<
    ExternalSuggestItemResponseSchemaType[]
  >([]);

  // suggestId/entryUuidが切り替わったら選択状態をリセット
  useEffect(() => {
    setSelectedSuggest(null);
    setSelectionHistory([]);
  }, [suggestId, entryUuid]);

  // SWR: サジェスト詳細取得
  const {
    data: suggestResponse,
    error: suggestError,
    isLoading: isLoadingSuggest,
  } = useSWR(
    typeof window !== "undefined" && entryUuid && suggestId
      ? ["suggest", entryUuid, suggestId]
      : null,
    async () => {
      const qs = new URLSearchParams({
        suggestId: String(suggestId),
      });
      const response = await fetch(
        `/api/${entryUuid}/suggest?${qs.toString()}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "omit", // 認証情報を送信しない
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch suggest: ${response.status}`);
      }

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to fetch suggest");
      }

      return data.data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
      dedupingInterval: 10000,
    },
  );

  // サジェスト情報の正規化（型安全）
  const suggestData = useMemo((): ExternalSuggestResponseSchemaType | null => {
    if (!suggestResponse) return null;
    return suggestResponse as ExternalSuggestResponseSchemaType;
  }, [suggestResponse]);

  // サジェストアイテムの階層構造を構築
  const hierarchicalItems =
    useMemo((): ExternalSuggestItemResponseSchemaType[] => {
      if (!suggestData?.items) return [];

      const items = suggestData.items;
      const itemMap = new Map<
        number,
        ExternalSuggestItemResponseSchemaType & {
          children: ExternalSuggestItemResponseSchemaType[];
        }
      >();
      const rootItems: (ExternalSuggestItemResponseSchemaType & {
        children: ExternalSuggestItemResponseSchemaType[];
      })[] = [];

      // まず全てのアイテムをマップに格納
      items.forEach((item: ExternalSuggestItemResponseSchemaType) => {
        itemMap.set(item.itemId, { ...item, children: [] });
      });

      // 階層構造を構築
      items.forEach((item: ExternalSuggestItemResponseSchemaType) => {
        const itemWithChildren = itemMap.get(item.itemId);
        if (!itemWithChildren) return;

        if (item.parentItemId === null || item.parentItemId === undefined) {
          // ルートアイテム
          rootItems.push(itemWithChildren);
        } else {
          // 子アイテム
          const parent = itemMap.get(item.parentItemId);
          if (parent) {
            parent.children.push(itemWithChildren);
          }
        }
      });

      return rootItems.sort((a, b) => a.orderIndex - b.orderIndex);
    }, [suggestData]);

  // 現在表示すべき階層のアイテム
  const currentItems = useMemo((): ExternalSuggestItemResponseSchemaType[] => {
    if (isSelecting) return []; // 選択直後は一時的に非表示
    if (!suggestData?.items) return [];
    if (!selectedSuggest) {
      return hierarchicalItems;
    }
    return suggestData.items
      .filter((item) => item.parentItemId === selectedSuggest.itemId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [suggestData, selectedSuggest, hierarchicalItems, isSelecting]);

  // サジェストを選択
  const selectSuggest = useCallback(
    async (suggest: ExternalSuggestItemResponseSchemaType | null) => {
      // 直ちに前階層を非表示
      setIsSelecting(true);
      // 次のレンダリングで必要な選択状態を先に反映
      setSelectedSuggest(suggest);

      // 選択履歴を更新（nullの場合は履歴をクリア）
      if (suggest) {
        setSelectionHistory((prev) => [...prev, suggest]);
      } else {
        setSelectionHistory([]);
      }

      // 非同期でログ送信（失敗してもUIは止めない）
      if (suggest) {
        try {
          void fetch(`/api/${entryUuid}/suggest`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entryUuid: entryUuid,
              suggestId: suggest.suggestId,
              suggestItemId: suggest.itemId,
              entryType: "EXTERNAL_USER_WEB",
              userAgent: navigator.userAgent,
            }),
          });
        } catch (error) {
          console.error("Failed to log suggest selection:", error);
        }
      }

      // アニメーション完了後に表示再開
      // より長い遅延でスムーズな遷移を実現
      setTimeout(() => {
        setIsSelecting(false);
      }, 200);
    },
    [entryUuid],
  );

  // 一つ前の階層に戻る
  const goBack = useCallback(() => {
    if (selectionHistory.length === 0) {
      // 履歴がない場合はルートに戻る
      setIsSelecting(true);
      setSelectedSuggest(null);
      setSelectionHistory([]);
      setTimeout(() => {
        setIsSelecting(false);
      }, 200);
      return;
    }

    // 直ちに前階層を非表示
    setIsSelecting(true);

    // 最後の選択を削除
    const newHistory = selectionHistory.slice(0, -1);
    setSelectionHistory(newHistory);

    // 一つ前の階層を設定（履歴が空ならnull）
    const previousSuggest =
      newHistory.length > 0 ? newHistory[newHistory.length - 1]! : null;
    setSelectedSuggest(previousSuggest);

    // アニメーション完了後に表示再開
    setTimeout(() => {
      setIsSelecting(false);
    }, 200);
  }, [selectionHistory]);

  // 特定のアイテムIDでアイテムを検索
  const findItemById = useCallback(
    (itemId: number): ExternalSuggestItemResponseSchemaType | null => {
      if (!suggestData?.items) return null;
      return (
        suggestData.items.find(
          (item: ExternalSuggestItemResponseSchemaType) =>
            item.itemId === itemId,
        ) || null
      );
    },
    [suggestData],
  );

  // 親アイテムの子アイテムを取得
  const getChildItems = useCallback(
    (parentItemId: number): ExternalSuggestItemResponseSchemaType[] => {
      if (!suggestData?.items) return [];
      return suggestData.items.filter(
        (item: ExternalSuggestItemResponseSchemaType) =>
          item.parentItemId === parentItemId,
      );
    },
    [suggestData],
  );

  return {
    // 状態
    suggestData,
    hierarchicalItems,
    currentItems,
    selectedSuggest,
    selectionHistory,
    isLoadingSuggest,
    suggestError: suggestError ? "サジェストの取得に失敗しました" : null,

    // アクション
    selectSuggest,
    goBack,
    findItemById,
    getChildItems,
  };
};
