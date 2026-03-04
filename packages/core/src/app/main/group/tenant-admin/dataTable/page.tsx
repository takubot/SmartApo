"use client";

import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";
import { useDisclosure } from "@heroui/modal";
import { Pagination } from "@heroui/pagination";
import { Select, SelectItem } from "@heroui/select";
import type { Selection } from "@heroui/table";
import {
  Search,
  Filter,
  Download,
  Eye,
  MessageSquare,
  Bot,
  Calendar,
  BarChart3,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Building,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import useSWR from "swr";
import { get_all_groups_chat_logs_v2_chat_log_list_tenant_dashboard_post } from "@repo/api-contracts/based_template/service";
import type {
  ChatLogFilterSchemaType,
  ChatLogItemType,
} from "@repo/api-contracts/based_template/zschema";
import { LoadingScreen } from "@common/LoadingScreen";
import DataModalMolecule from "./ui/dataModalMolecule";
import HoverPopupMolecule from "./ui/hoverPopupMolecule";
import {
  getFileReferences,
  getFormReferences,
  type FileReference,
  type FormReference,
} from "./utils/referenceUtils";
import { handleErrorWithUI } from "@common/errorHandler";

export type ChatLogItem = ChatLogItemType;

export type ChatLogFilter = {
  chatQuestion?: string;
  chatAnswer?: string;
  startDate?: string;
  endDate?: string;
  evaluation?: string;
  page?: number;
  pageSize?: number;
};

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

export type PaginatedChatLogResponse = {
  dataList: ChatLogItem[];
  pagination: PaginationInfo;
};

type ExtendedChatLogItem = ChatLogItemType & {
  categoryNames?: string[] | null;
  usedCategoryIds?: number[] | null;
  userName?: string | null;
  groupName?: string | null;
  sessionId?: string | null;
  usedChunkIds?: number[] | null;
};

interface SearchFormData {
  chatQuestion: string;
  chatAnswer: string;
  startDate: string;
  endDate: string;
  evaluation: string;
}

function useTenantChatLogList(filter: ChatLogFilter | null) {
  const shouldFetch = filter && (filter.page || filter.pageSize);
  const key = shouldFetch ? (["/list/tenant_chat_log", filter] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<
    PaginatedChatLogResponse,
    unknown,
    [string, ChatLogFilter] | null
  >(
    key as [string, ChatLogFilter] | null,
    async ([, f]: [string, ChatLogFilter]) => {
      const requestBody: ChatLogFilterSchemaType = {
        chatQuestion: f.chatQuestion?.trim() || null,
        chatAnswer: f.chatAnswer?.trim() || null,
        startDate: f.startDate?.trim() || null,
        endDate: f.endDate?.trim() || null,
        evaluation: f.evaluation?.trim() ? f.evaluation : null,
        page: f.page || 1,
        pageSize: f.pageSize || 20,
      };
      const response =
        await get_all_groups_chat_logs_v2_chat_log_list_tenant_dashboard_post(
          requestBody,
        );
      const totalItems =
        response?.pagination?.totalItems || response?.dataList?.length || 0;
      const pSize = response?.pagination?.pageSize || f.pageSize || 20;
      const currentPage = response?.pagination?.currentPage || f.page || 1;
      const totalPages =
        response?.pagination?.totalPages || Math.ceil(totalItems / pSize);
      return {
        dataList: response?.dataList || [],
        pagination: { currentPage, totalPages, totalItems, pageSize: pSize },
      };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
    },
  );
  return {
    chatLogList: data?.dataList ?? [],
    pagination: data?.pagination ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

async function listAllChatLogForExportRequest(
  filter: ChatLogFilter,
): Promise<ChatLogItemType[]> {
  const requestBody: ChatLogFilterSchemaType = {
    chatQuestion: filter.chatQuestion?.trim() || null,
    chatAnswer: filter.chatAnswer?.trim() || null,
    startDate: filter.startDate?.trim() || null,
    endDate: filter.endDate?.trim() || null,
    evaluation:
      filter.evaluation && filter.evaluation.trim() !== ""
        ? filter.evaluation
        : null,
    page: 1,
    pageSize: 10000,
  };
  const response =
    await get_all_groups_chat_logs_v2_chat_log_list_tenant_dashboard_post(
      requestBody,
    );
  return response?.dataList || [];
}

export default function TenantDataTablePage() {
  const [filterParams, setFilterParams] = useState<ChatLogFilter | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedChatLog, setSelectedChatLog] =
    useState<ChatLogItemType | null>(null);
  const [pageSize] = useState(20);
  const [isExporting, setIsExporting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    if (!filterParams) {
      const initialFilter: ChatLogFilter = {
        page: 1,
        pageSize: 20,
      };
      setFilterParams(initialFilter);
    }
  }, [filterParams]);

  const { control, handleSubmit, reset } = useForm<SearchFormData>({
    defaultValues: {
      chatQuestion: "",
      chatAnswer: "",
      startDate: "",
      endDate: "",
      evaluation: "",
    },
  });

  const { chatLogList, pagination, isLoading, isError } =
    useTenantChatLogList(filterParams);

  // SWRエラーハンドリング
  useEffect(() => {
    if (isError) {
      handleErrorWithUI(isError, "チャットログ取得");
    }
  }, [isError]);

  const onSearch = (data: SearchFormData) => {
    setHasSearched(true);
    const newFilter: ChatLogFilter = {
      chatQuestion: data.chatQuestion?.trim() || undefined,
      chatAnswer: data.chatAnswer?.trim() || undefined,
      startDate: data.startDate?.trim() || undefined,
      endDate: data.endDate?.trim() || undefined,
      evaluation:
        data.evaluation && data.evaluation.trim() !== ""
          ? data.evaluation
          : undefined,
      page: 1,
      pageSize: pageSize,
    };
    setFilterParams(newFilter);
  };

  const onPageChange = (page: number) => {
    if (filterParams) {
      const newFilter = { ...filterParams, page, pageSize };
      setFilterParams(newFilter);
    }
  };

  const onReset = () => {
    reset({
      chatQuestion: "",
      chatAnswer: "",
      startDate: "",
      endDate: "",
      evaluation: "",
    });
    setFilterParams({
      page: 1,
      pageSize: 20,
      evaluation: undefined,
    });
    setHasSearched(false);
  };

  const exportToCsv = async () => {
    if (!filterParams) return;
    setIsExporting(true);
    try {
      const allData = await listAllChatLogForExportRequest(filterParams);
      if (allData.length === 0) {
        handleErrorWithUI(
          new Error("エクスポートするデータがありません。"),
          "CSVエクスポート",
        );
        return;
      }
      const headers = [
        "チャットID",
        "グループ名",
        "グループID",
        "会話時間",
        "ボット名",
        "ユーザー名",
        "質問",
        "回答",
        "精度",
        "入力トークン",
        "出力トークン",
        "チャット履歴ID",
      ];
      const csvRows = allData.map((log: ChatLogItemType) => {
        const ext = log as ExtendedChatLogItem;
        const chatId = log.chatLogId ?? "";
        const groupId = log.groupId ?? "";
        const groupName = ext.groupName || groupId || "未設定";
        const createdAt = log.createdAt
          ? new Date(log.createdAt).toLocaleString("ja-JP")
          : "";
        const botName = (log as { botName?: string }).botName ?? "";
        const userDisplay = ext.userName || ext.userId || "未設定";
        const question = (log as { chatQuestion?: string }).chatQuestion ?? "";
        const answer = (log as { chatAnswer?: string }).chatAnswer ?? "";
        const accuracy = (log as { accuracy?: number | null }).accuracy ?? "";
        const inputToken =
          (log as { inputToken?: number | null }).inputToken ?? "";
        const outputToken =
          (log as { outputToken?: number | null }).outputToken ?? "";
        const chatHistoryId =
          (log as { chatHistoryId?: number | null }).chatHistoryId ?? "";
        return [
          String(chatId),
          String(groupName).replace(/"/g, '""'),
          String(groupId),
          createdAt,
          String(botName).replace(/"/g, '""'),
          String(userDisplay).replace(/"/g, '""'),
          String(question).replace(/"/g, '""').replace(/\r?\n/g, "\\n"),
          String(answer).replace(/"/g, '""').replace(/\r?\n/g, "\\n"),
          String(accuracy),
          String(inputToken),
          String(outputToken),
          String(chatHistoryId).replace(/"/g, '""'),
        ]
          .map((field) => `"${field}"`)
          .join(",");
      });
      const csvContent = [
        headers.map((header) => `"${header}"`).join(","),
        ...csvRows,
      ].join("\r\n");
      const BOM = "\uFEFF";
      const csvWithBOM = BOM + csvContent;
      const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[T:]/g, "_");
      const totalItems =
        (pagination as PaginationInfo | null)?.totalItems || allData.length;
      const fileName = `tenant_chat_logs_${totalItems}件_${timestamp}.csv`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleErrorWithUI(error, "CSVエクスポート");
    } finally {
      setIsExporting(false);
    }
  };

  const showChatLogDetail = (chatLog: ChatLogItemType) => {
    setSelectedChatLog(chatLog);
    onOpen();
  };

  const renderReferenceDetails = (
    files: FileReference[],
    forms: FormReference[],
  ) => {
    if (files.length === 0 && forms.length === 0) {
      return <span className="text-xs text-gray-500">参考情報なし</span>;
    }

    return (
      <div className="text-xs text-gray-800 space-y-2 min-w-[200px]">
        {files.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-1">ファイル</p>
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={`file-${file.fileId}`}>
                  <span className="font-medium text-gray-900">
                    {file.fileName || `ファイル(ID: ${file.fileId})`}
                  </span>
                  {file.relevantPages && file.relevantPages.length > 0 && (
                    <span className="text-gray-500 ml-1">
                      (Pages: {file.relevantPages.join(", ")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {forms.length > 0 && (
          <div>
            <p className="font-semibold text-gray-900 mb-1">フォーム</p>
            <ul className="space-y-1">
              {forms.map((form) => (
                <li key={`form-${form.formId}`}>
                  <span className="font-medium text-gray-900">
                    {form.formName || `フォーム(ID: ${form.formId})`}
                  </span>
                  {form.description && (
                    <span className="text-gray-500 ml-1">
                      {form.description}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                グループ横断データ検索
              </h1>
            </div>

            {(chatLogList.length > 0 ||
              (pagination && pagination.totalItems > 0)) && (
              <div className="flex items-center gap-2">
                <Button
                  color="default"
                  variant="flat"
                  size="sm"
                  startContent={<Download className="w-4 h-4" />}
                  onPress={exportToCsv}
                  isLoading={isExporting}
                  isDisabled={isExporting}
                >
                  {isExporting ? "エクスポート中..." : "CSVエクスポート"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {/* 検索フォーム */}
        <Card className="border border-default-200 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-3">
            <h3 className="text-sm font-bold flex items-center">
              <Filter className="w-4 h-4 mr-2 text-gray-600" />
              検索条件
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <form onSubmit={handleSubmit(onSearch)} className="space-y-6">
              {/* テキスト検索 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="chatQuestion"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="質問内容"
                      placeholder="例: エラーが発生"
                      variant="bordered"
                      startContent={
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                      }
                    />
                  )}
                />
                <Controller
                  name="chatAnswer"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="回答内容"
                      placeholder="例: 再起動してください"
                      variant="bordered"
                      startContent={<Bot className="w-4 h-4 text-gray-400" />}
                    />
                  )}
                />
              </div>

              {/* 日付範囲 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="開始日"
                      variant="bordered"
                      startContent={
                        <Calendar className="w-4 h-4 text-gray-400" />
                      }
                    />
                  )}
                />
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="date"
                      label="終了日"
                      variant="bordered"
                      startContent={
                        <Calendar className="w-4 h-4 text-gray-400" />
                      }
                    />
                  )}
                />
                <Controller
                  name="evaluation"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="評価"
                      placeholder="すべての評価"
                      variant="bordered"
                      selectionMode="single"
                      selectedKeys={new Set(field.value ? [field.value] : [])}
                      onSelectionChange={(keys: Selection) => {
                        if (keys === "all") {
                          field.onChange("");
                        } else {
                          const arr = Array.from(keys as Set<string>);
                          field.onChange(arr[0] ?? "");
                        }
                      }}
                      startContent={
                        <ThumbsUp className="w-4 h-4 text-gray-400" />
                      }
                      className="max-w-full"
                    >
                      <SelectItem
                        key="GOOD"
                        startContent={
                          <ThumbsUp className="w-4 h-4 text-green-500" />
                        }
                      >
                        良い
                      </SelectItem>
                      <SelectItem
                        key="BAD"
                        startContent={
                          <ThumbsDown className="w-4 h-4 text-red-500" />
                        }
                      >
                        悪い
                      </SelectItem>
                    </Select>
                  )}
                />
              </div>

              {/* 検索ボタン */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  type="submit"
                  color="primary"
                  startContent={<Search className="w-4 h-4" />}
                  isLoading={isLoading}
                  className="flex-1 sm:flex-none sm:min-w-32"
                  size="sm"
                >
                  {isLoading ? "検索中..." : "検索実行"}
                </Button>
                <Button
                  type="button"
                  variant="flat"
                  startContent={<RefreshCw className="w-4 h-4" />}
                  onPress={onReset}
                  isDisabled={isLoading}
                  className="flex-1 sm:flex-none sm:min-w-24"
                  size="sm"
                >
                  リセット
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* 検索結果 */}
        <Card className="border border-default-200 shadow-sm bg-white/80 backdrop-blur-sm hover:shadow-md transition-shadow duration-300">
          <CardHeader className="pb-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between w-full gap-4">
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm font-bold flex items-center flex-wrap gap-2">
                  <div className="flex items-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 mr-2 text-primary" />
                    <span>{hasSearched ? "検索結果" : "チャットログ一覧"}</span>
                  </div>
                  {pagination && pagination.totalItems > 0 && (
                    <Chip
                      color="default"
                      variant="flat"
                      size="sm"
                      className="text-xs"
                    >
                      全 {pagination.totalItems} 件
                    </Chip>
                  )}
                  {chatLogList.length > 0 &&
                    pagination &&
                    pagination.totalPages > 1 && (
                      <Chip
                        color="secondary"
                        variant="flat"
                        size="sm"
                        className="text-xs"
                      >
                        {pagination.currentPage} / {pagination.totalPages}{" "}
                        ページ
                      </Chip>
                    )}
                </h3>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center gap-2 lg:flex-shrink-0">
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {pagination.currentPage} / {pagination.totalPages} ページ
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardBody className="pt-0">
            {isLoading ? (
              <LoadingScreen message="検索中..." fullScreen={false} />
            ) : isError ? (
              <div className="text-center py-20 text-red-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">データの取得に失敗しました</p>
                <Button
                  color="default"
                  variant="flat"
                  className="mt-4"
                  onPress={() => window.location.reload()}
                >
                  ページを再読み込み
                </Button>
              </div>
            ) : chatLogList.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  {hasSearched
                    ? "検索条件に一致するデータがありません"
                    : "データがありません"}
                </p>
                <p className="text-xs">
                  {hasSearched
                    ? "検索条件を変更して再度お試しください"
                    : "チャットログデータが存在しません"}
                </p>
              </div>
            ) : (
              <>
                {/* デスクトップ用テーブル表示 */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full divide-y divide-gray-200 table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                          グループ名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[160px]">
                          会話時間
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[140px]">
                          ボット名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                          質問
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                          回答
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                          参考情報
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                          評価
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chatLogList.map(
                        (log: ExtendedChatLogItem, index: number) => {
                          return (
                            <tr
                              key={log.chatLogId}
                              className={`${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              } transition-colors duration-150`}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                                <div className="flex items-center gap-2">
                                  <Building className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs font-medium">
                                    {(log as ExtendedChatLogItem).groupName ||
                                      log.groupId ||
                                      "未設定"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                                <HoverPopupMolecule
                                  content={new Date(log.createdAt || "")}
                                >
                                  {new Date(log.createdAt || "").toLocaleString(
                                    "ja-JP",
                                  )}
                                </HoverPopupMolecule>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                                {log.botName || "未設定"}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-900 min-w-[200px] max-w-md">
                                <div className="line-clamp-2 break-words">
                                  {log.chatQuestion || "質問なし"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-900 min-w-[200px] max-w-lg">
                                <div className="line-clamp-3 break-words">
                                  {log.chatAnswer || "回答なし"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900">
                                {(() => {
                                  const fileRefs = getFileReferences(log);
                                  const formRefs = getFormReferences(log);
                                  if (
                                    fileRefs.length === 0 &&
                                    formRefs.length === 0
                                  ) {
                                    return (
                                      <span className="text-gray-400">
                                        なし
                                      </span>
                                    );
                                  }
                                  return (
                                    <HoverPopupMolecule
                                      content={renderReferenceDetails(
                                        fileRefs,
                                        formRefs,
                                      )}
                                    >
                                      <div className="flex flex-col text-left text-xs text-blue-600">
                                        <span>ファイル {fileRefs.length}</span>
                                        <span>フォーム {formRefs.length}</span>
                                      </div>
                                    </HoverPopupMolecule>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const evaluation = (
                                    log as {
                                      evaluation?: string | null;
                                    }
                                  ).evaluation;
                                  if (!evaluation) {
                                    return (
                                      <div className="flex items-center gap-2 text-gray-400">
                                        <span className="text-xs">未評価</span>
                                      </div>
                                    );
                                  }
                                  const isGood = evaluation === "GOOD";
                                  return (
                                    <div
                                      className={`flex items-center gap-2 ${isGood ? "text-green-600" : "text-red-600"}`}
                                    >
                                      {isGood ? (
                                        <ThumbsUp className="w-4 h-4" />
                                      ) : (
                                        <ThumbsDown className="w-4 h-4" />
                                      )}
                                      <span className="text-xs">
                                        {isGood ? "良い" : "悪い"}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-medium">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="default"
                                  startContent={<Eye className="w-3 h-3" />}
                                  onPress={() => showChatLogDetail(log)}
                                >
                                  詳細
                                </Button>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>

                {/* モバイル用カード表示 */}
                <div className="md:hidden space-y-4">
                  {chatLogList.map((log: ExtendedChatLogItem) => {
                    const fileRefs = getFileReferences(log);
                    const formRefs = getFormReferences(log);
                    return (
                      <Card
                        key={log.chatLogId}
                        className="shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 cursor-pointer"
                        onClick={() => showChatLogDetail(log)}
                      >
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            {/* ヘッダー部分 */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Bot className="w-5 h-5 text-gray-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {log.botName || "未設定"}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Building className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500 font-medium">
                                      {(log as ExtendedChatLogItem).groupName ||
                                        log.groupId ||
                                        "未設定"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <HoverPopupMolecule
                                content={new Date(log.createdAt || "")}
                              >
                                <div className="flex flex-col items-end text-xs text-gray-500 ml-2 flex-shrink-0">
                                  <span className="font-medium">
                                    {new Date(
                                      log.createdAt || "",
                                    ).toLocaleDateString("ja-JP", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                  <span>
                                    {new Date(
                                      log.createdAt || "",
                                    ).toLocaleTimeString("ja-JP", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </HoverPopupMolecule>
                            </div>

                            {/* 質問部分 */}
                            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                              <div className="flex items-start">
                                <MessageSquare className="w-4 h-4 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-gray-800 mb-1">
                                    質問
                                  </p>
                                  <p className="text-xs text-gray-800 line-clamp-2">
                                    {log.chatQuestion || "質問なし"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 回答部分 */}
                            <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-gray-400">
                              <div className="flex items-start">
                                <Bot className="w-4 h-4 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-semibold text-gray-800 mb-1">
                                    回答
                                  </p>
                                  <p className="text-xs text-gray-800 line-clamp-3">
                                    {log.chatAnswer || "回答なし"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {(fileRefs.length > 0 || formRefs.length > 0) && (
                              <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-200">
                                <p className="text-xs font-semibold text-blue-800 mb-1">
                                  参考情報
                                </p>
                                {renderReferenceDetails(fileRefs, formRefs)}
                              </div>
                            )}

                            {/* 評価とアクション */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <div className="flex flex-wrap gap-1 flex-1 min-w-0 mr-3">
                                {(() => {
                                  const evaluation = (
                                    log as {
                                      evaluation?: string | null;
                                    }
                                  ).evaluation;
                                  return (
                                    <Chip
                                      color={
                                        !evaluation
                                          ? "default"
                                          : evaluation === "GOOD"
                                            ? "success"
                                            : "danger"
                                      }
                                      variant="flat"
                                      size="sm"
                                      className="text-xs"
                                    >
                                      {!evaluation
                                        ? "未評価"
                                        : evaluation === "GOOD"
                                          ? "良い"
                                          : "悪い"}
                                    </Chip>
                                  );
                                })()}
                              </div>
                              <div onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="default"
                                  startContent={<Eye className="w-4 h-4" />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    showChatLogDetail(log);
                                  }}
                                  className="flex-shrink-0 min-w-16"
                                >
                                  詳細
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    );
                  })}
                </div>

                {/* ページネーション */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                    <div className="flex items-center gap-2 order-2 sm:order-1">
                      <span className="text-xs text-gray-600 text-center sm:text-left">
                        {pagination.totalItems > 0
                          ? `${(pagination.currentPage - 1) * pagination.pageSize + 1} - ${Math.min(
                              pagination.currentPage * pagination.pageSize,
                              pagination.totalItems,
                            )} 件 / 全 ${pagination.totalItems} 件`
                          : "0 件"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 order-1 sm:order-2">
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        ページ {pagination.currentPage} /{" "}
                        {pagination.totalPages}
                      </span>
                      <Pagination
                        total={pagination.totalPages}
                        page={pagination.currentPage}
                        onChange={onPageChange}
                        showControls
                        showShadow
                        color="default"
                        size="sm"
                        isDisabled={isLoading}
                        className="flex-shrink-0"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* チャットログ詳細モーダル */}
        {selectedChatLog && (
          <DataModalMolecule
            isOpen={isOpen}
            chatLog={selectedChatLog}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
