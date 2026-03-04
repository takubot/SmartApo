"use client";
import { Select, SelectItem } from "@heroui/select";
import type { Selection } from "@heroui/react";
import { Spinner, Card, CardBody, Button } from "@heroui/react";
import {
  BarChart3,
  Calendar,
  Filter,
  RefreshCcw,
  AlertCircle,
  Globe,
  Smartphone,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { handleErrorWithUI } from "@common/errorHandler";
//
import StatsCards from "./component/StatsCards";
import OverviewSection from "./component/OverviewSection";
import KeywordCloud from "./component/KeywordCloud";
import SuggestFlowVisualization from "./component/SuggestFlowVisualization";
import { useGroupContext } from "../layout-client";
import { resolveChatEntryKind } from "../chatEntry/types";

import {
  post_dashboard_data_v2_dashboard_overview__group_id__post,
  get_chat_entry_list_v2_chat_entry_list__group_id__get,
} from "@repo/api-contracts/based_template/service";

import type {
  ChatEntryDetailResponseType,
  ChatEntryListResponseType,
  DashboardDataResponseType,
  DashboardOverviewRequestType,
  SuggestFlowOverviewType,
} from "@repo/api-contracts/based_template/zschema";

type DashboardDataWithSuggestFlow = DashboardDataResponseType & {
  suggestFlowOverview?: SuggestFlowOverviewType | null;
};

function EmptyState({
  message,
  description,
  icon: Icon = AlertCircle,
}: {
  message: string;
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <Card className="w-full border-2 border-dashed border-default-200 bg-gradient-to-br from-gray-50 to-gray-100/50">
      <CardBody className="p-8 sm:p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-default-100 flex items-center justify-center">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-default-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-default-700">
              {message}
            </h3>
            {description && (
              <p className="text-sm sm:text-base text-default-500 max-w-md mx-auto">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function useDashboardData(
  groupId: string | null,
  yearMonth: string,
  entryId?: number | null,
) {
  const lightweight = false;
  const { data, error, isLoading, mutate } =
    useSWR<DashboardDataWithSuggestFlow>(
      groupId
        ? `dashboard-data-${groupId}-${yearMonth}-${entryId ?? "all"}-${lightweight}`
        : null,
      async () => {
        if (!groupId) throw new Error("Group ID is required");
        const requestPayload: DashboardOverviewRequestType = {
          yearMonth,
          entryId: entryId ?? null,
          lightweight,
        };
        return await post_dashboard_data_v2_dashboard_overview__group_id__post(
          groupId,
          requestPayload,
        );
      },
      {
        refreshInterval: 60000,
        revalidateOnFocus: false,
        dedupingInterval: 60000,
      },
    );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

// エントリリスト取得用フック（常に全エントリを取得）
function useChatEntryList(groupId: string | null) {
  const { data, error, isLoading } = useSWR<ChatEntryListResponseType>(
    groupId ? `chat-entry-list-${groupId}` : null,
    async () => {
      if (!groupId) throw new Error("Group ID is required");
      return await get_chat_entry_list_v2_chat_entry_list__group_id__get(
        groupId,
      );
    },
    {
      refreshInterval: 300000, // 5分ごと（エントリは頻繁に変わらない）
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    },
  );

  const chatEntries: ChatEntryDetailResponseType[] = data?.chatEntries ?? [];

  return {
    data: chatEntries,
    error,
    isLoading,
  };
}

export default function DashboardPage() {
  const groupId = useGroupContext();
  const [selectedYearMonth, setSelectedYearMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [selectedChatEntryId, setSelectedChatEntryId] = useState<number | null>(
    null,
  );
  // 表示範囲セレクタは廃止。未選択=全体、選択時=エントリ。

  const { data, error, isLoading, mutate } = useDashboardData(
    groupId,
    selectedYearMonth,
    selectedChatEntryId,
  );

  // エントリリストを常に全件取得（ダッシュボードデータとは独立）
  const {
    data: entryListData,
    isLoading: entryListLoading,
    error: entryListError,
  } = useChatEntryList(groupId);

  // リフレッシュハンドラー
  const handleRefresh = React.useCallback(() => {
    mutate();
  }, [mutate]);

  // エントリアイテムのメモ化（Hooksのルールに従って条件分岐の前に配置）
  const entryItems = React.useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      kind: "ALL" | "WEB" | "LINE" | "UNKNOWN";
    }> = [{ key: "all", label: "全体表示", kind: "ALL" }];

    if (entryListData && entryListData.length > 0) {
      items.push(
        ...entryListData.map((entry) => ({
          key: String(entry.chatEntryId),
          label: entry.entryName || `エントリ ${entry.chatEntryId}`,
          kind: resolveChatEntryKind(entry),
        })),
      );
    }

    return items;
  }, [entryListData]);

  const selectedEntryKeys = React.useMemo<Selection>(() => {
    const key =
      selectedChatEntryId === null ? "all" : String(selectedChatEntryId);
    return new Set([key]);
  }, [selectedChatEntryId]);

  const handleEntrySelectionChange = React.useCallback((keys: Selection) => {
    if (keys === "all") {
      setSelectedChatEntryId(null);
      return;
    }

    const [key] = Array.from(keys);
    if (!key || key === "all") {
      setSelectedChatEntryId(null);
      return;
    }

    const parsedId = Number(key);
    setSelectedChatEntryId(Number.isNaN(parsedId) ? null : parsedId);
  }, []);

  // SWRエラーハンドリング
  useEffect(() => {
    if (error) {
      handleErrorWithUI(error, "ダッシュボードデータ取得");
    }
  }, [error]);

  useEffect(() => {
    if (entryListError) {
      handleErrorWithUI(entryListError, "チャットエントリ一覧取得");
    }
  }, [entryListError]);

  const stats = data?.stats;

  // エラー状態の表示（早期リターンはHooksの後）
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 border-danger-200 bg-danger-50/50">
          <CardBody className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-danger-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-danger-700">
                  データの取得に失敗しました
                </h3>
                <p className="text-sm text-danger-600">
                  ダッシュボードデータの読み込み中にエラーが発生しました。
                </p>
              </div>
              <Button
                color="danger"
                variant="flat"
                onPress={handleRefresh}
                startContent={<RefreshCcw className="w-4 h-4" />}
                className="mt-4"
              >
                再試行
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                ダッシュボード
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* 期間選択 */}
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="h-8 rounded-md border border-default-200 bg-white px-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                disabled={isLoading}
              />
              {/* エントリ選択 */}
              <div className="relative">
                <Select
                  placeholder={
                    entryListLoading ? "読み込み中..." : "エントリを選択"
                  }
                  selectedKeys={selectedEntryKeys}
                  onSelectionChange={handleEntrySelectionChange}
                  className="w-[160px]"
                  size="sm"
                  variant="bordered"
                  isDisabled={entryListLoading || isLoading}
                >
                  {entryItems.map((item) => (
                    <SelectItem key={item.key} textValue={item.label}>
                      <div className="flex items-center gap-2">
                        {item.kind === "LINE" ? (
                          <Smartphone className="h-3.5 w-3.5 text-success-600" />
                        ) : item.kind === "WEB" ? (
                          <Globe className="h-3.5 w-3.5 text-primary-600" />
                        ) : (
                          <Filter className="h-3.5 w-3.5 text-default-500" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
                {entryListLoading && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Spinner size="sm" color="primary" />
                  </div>
                )}
              </div>
              <Button
                color="default"
                variant="flat"
                size="sm"
                onPress={handleRefresh}
                startContent={<RefreshCcw className="w-4 h-4" />}
                isLoading={isLoading}
              >
                更新
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ - スクロールなしで全体表示 */}
      <div className="flex-1 overflow-hidden px-2 py-2 min-h-0 max-h-full">
        {/* 3カラム以上のグリッドレイアウト - 全幅使用 */}
        <div
          className="h-full grid grid-cols-12 gap-2 min-h-0"
          style={{
            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
            gridAutoRows: "minmax(0, 1fr)",
          }}
        >
          {/* 統計サマリー - 上部1行目 */}
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={`skel-stats-${i}`}
                  className="col-span-4 row-span-1 border border-default-200 flex flex-col min-h-0"
                >
                  <CardBody className="p-2 flex flex-col justify-center flex-1 min-h-0">
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 bg-default-200 rounded animate-pulse mx-auto" />
                      <div className="h-5 w-20 bg-default-200 rounded animate-pulse mx-auto" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </>
          ) : !stats ? (
            <div className="col-span-12 row-span-5">
              <EmptyState
                message="データがありません"
                description="選択した期間にデータが見つかりませんでした。別の期間を選択してください。"
              />
            </div>
          ) : (
            <>
              {/* 統計カード - 3枚を12カラムに配置（1行目） */}
              <StatsCards
                stats={stats}
                data={data}
                chatEntryId={selectedChatEntryId}
              />

              {/* チャートセクション - 2行目-3行目 */}
              {isLoading ? (
                <>
                  <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                    <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                    </CardBody>
                  </Card>
                  <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                    <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                    </CardBody>
                  </Card>
                  <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                    <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                      <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                    </CardBody>
                  </Card>
                </>
              ) : !data ? (
                <div className="col-span-12 row-span-4">
                  <EmptyState
                    message="データがありません"
                    description="選択した期間にデータが見つかりませんでした。別の期間を選択してください。"
                  />
                </div>
              ) : (
                <>
                  {/* OverviewSection - チャートと評価を表示 */}
                  <OverviewSection
                    data={data}
                    chatEntryId={selectedChatEntryId}
                  />

                  {/* キーワード分析セクション - 4行目-5行目、左側6カラム */}
                  <div className="col-span-6 row-span-2 min-h-0 flex flex-col">
                    <KeywordCloud keywordOverview={data.keywordOverview} />
                  </div>

                  {/* サジェストフロー分析セクション（エントリ選択時のみ表示） - 4行目-5行目、右側6カラム */}
                  {selectedChatEntryId && data.suggestFlowOverview ? (
                    <div className="col-span-6 row-span-2 min-h-0 flex flex-col">
                      <SuggestFlowVisualization
                        data={data.suggestFlowOverview}
                      />
                    </div>
                  ) : (
                    <Card className="col-span-6 row-span-2 border border-default-200 flex flex-col min-h-0">
                      <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="flex-1 flex items-center justify-center text-default-400 min-h-0">
                          <div className="text-center">
                            <AlertCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
                            <p className="text-[10px]">
                              エントリを選択するとサジェストフローが表示されます
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
