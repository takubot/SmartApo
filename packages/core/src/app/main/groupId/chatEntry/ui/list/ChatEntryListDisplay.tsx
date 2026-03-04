"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Checkbox,
  Chip,
  Tooltip,
  Badge,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Switch,
} from "@heroui/react";
import {
  Edit,
  Code2,
  ExternalLink,
  Trash2,
  Link2,
  Globe,
  Calendar,
  Users,
  Settings,
  Eye,
  EyeOff,
} from "lucide-react";
import { ChatEntryDetailResponseType } from "@repo/api-contracts/based_template/zschema";
import { resolveChatEntryKind } from "../../types";

interface ChatEntryListDisplayProps {
  urlList: ChatEntryDetailResponseType[];
  selectedUrls: ChatEntryDetailResponseType[];
  isDeleting: boolean;
  isBulkDeleting: boolean;
  isLoading?: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (url: ChatEntryDetailResponseType, checked: boolean) => void;
  onEdit: (urlData: ChatEntryDetailResponseType) => void;
  onDeleteConfirm: (urlData: ChatEntryDetailResponseType) => void;
  onBulkDelete: () => void;
  onScript: (url: ChatEntryDetailResponseType) => void;
  onFullChatUrl: (url: ChatEntryDetailResponseType) => void;
  onToggleVisibility: (chatEntryId: number, isVisible: boolean) => void;
}

const ChatEntryListDisplay: React.FC<ChatEntryListDisplayProps> = ({
  urlList,
  selectedUrls,
  isDeleting,
  isBulkDeleting,
  isLoading = false,
  onSelectAll,
  onSelectItem,
  onEdit,
  onDeleteConfirm,
  onBulkDelete,
  onScript,
  onFullChatUrl,
  onToggleVisibility,
}) => {
  // 処理中のIDを管理
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  // 楽観的更新用の状態管理（成功したAPI呼び出しの結果を保持）
  const [optimisticStates, setOptimisticStates] = useState<
    Map<number, boolean>
  >(new Map());

  // urlListが更新されたときに楽観的更新をクリア
  useEffect(() => {
    setOptimisticStates((prev) => {
      const newMap = new Map(prev);
      // urlListに存在するIDの楽観的更新のみをクリア
      urlList.forEach((url) => {
        if (newMap.has(url.chatEntryId)) {
          // 楽観的更新の値とurlListの値が一致する場合のみクリア
          if (newMap.get(url.chatEntryId) === url.isVisible) {
            newMap.delete(url.chatEntryId);
          }
        }
      });
      return newMap;
    });
  }, [urlList]);

  // 表示状態を取得するヘルパー関数
  const getDisplayState = (url: ChatEntryDetailResponseType): boolean => {
    const hasOptimistic = optimisticStates.has(url.chatEntryId);
    const optimisticValue = hasOptimistic
      ? optimisticStates.get(url.chatEntryId)!
      : null;
    const actualValue = url.isVisible;

    // デバッグ用ログ（開発時のみ）
    if (process.env.NODE_ENV === "development" && hasOptimistic) {
      console.log(
        `[${url.chatEntryId}] Optimistic: ${optimisticValue}, Actual: ${actualValue}`,
      );
    }

    return hasOptimistic ? optimisticValue! : actualValue;
  };

  // 切り替え処理
  const handleVisibilityToggle = async (
    chatEntryId: number,
    newIsVisible: boolean,
  ) => {
    // 既に処理中の場合は無視
    if (togglingIds.has(chatEntryId)) {
      return;
    }

    // 現在のURLを確認
    const currentUrl = urlList.find((url) => url.chatEntryId === chatEntryId);
    if (!currentUrl) return;

    // 楽観的更新：即座にUIを更新
    setOptimisticStates((prev) => new Map(prev).set(chatEntryId, newIsVisible));

    // 処理中状態を追加
    setTogglingIds((prev) => new Set(prev).add(chatEntryId));

    try {
      // API呼び出し
      await onToggleVisibility(chatEntryId, newIsVisible);
      // 成功時：楽観的更新を維持（urlListの更新を待つ）
      // 楽観的更新はurlListが更新されるまで保持される
    } catch (error) {
      // 失敗時：元の状態に戻す
      setOptimisticStates((prev) => {
        const newMap = new Map(prev);
        newMap.delete(chatEntryId);
        return newMap;
      });
      console.error("表示状態の切り替えに失敗しました:", error);
    } finally {
      // 処理中状態をクリア
      setTogglingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(chatEntryId);
        return newSet;
      });
    }
  };
  const getUrlType = (url: ChatEntryDetailResponseType) => {
    const kind = resolveChatEntryKind(url);
    return kind === "UNKNOWN" ? "GENERAL" : kind;
  };

  const getUrlTypeColor = (type: string) => {
    switch (type) {
      case "WEB":
        return "primary";
      case "LINE":
        return "secondary";
      default:
        return "default";
    }
  };

  const getUrlTypeIcon = (type: string) => {
    switch (type) {
      case "WEB":
        return <Globe className="h-3 w-3" />;
      case "LINE":
        return <Link2 className="h-3 w-3" />;
      default:
        return <Settings className="h-3 w-3" />;
    }
  };

  // ローディング状態の表示
  if (isLoading) {
    return (
      <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
        <CardBody className="text-center py-20">
          <div className="flex flex-col items-center gap-6 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-700">
                読み込み中...
              </h3>
              <p className="text-gray-500 max-w-md">
                チャットエントリ一覧を取得しています
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>データを取得中</span>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // 空状態の表示
  if (urlList.length === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
        <CardBody className="text-center py-20">
          <div className="flex flex-col items-center gap-6 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
              <Globe className="h-10 w-10 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-700">
                URLが作成されていません
              </h3>
              <p className="text-gray-500 max-w-md">
                新規作成ボタンからURLを作成して、チャット機能を開始しましょう
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>WEBチャット</span>
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>LINEチャット</span>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー統計情報 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardBody className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {urlList.length}
                </div>
                <div className="text-sm text-gray-600">総URL数</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {urlList.filter((url) => getUrlType(url) === "WEB").length}
                </div>
                <div className="text-sm text-gray-600">WEB</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {urlList.filter((url) => getUrlType(url) === "LINE").length}
                </div>
                <div className="text-sm text-gray-600">LINE</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">最終更新</div>
              <div className="text-sm font-medium text-gray-700">
                {new Date().toLocaleDateString("ja-JP")}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 一括操作バー */}
      {selectedUrls.length > 0 && (
        <Card className="bg-red-50 border-red-200 shadow-lg">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-800">
                    {selectedUrls.length}件のURLが選択されています
                  </h4>
                  <p className="text-sm text-red-600">
                    選択したURLを一括削除できます。この操作は取り消せません。
                  </p>
                </div>
              </div>
              <Button
                color="danger"
                size="md"
                onPress={onBulkDelete}
                isDisabled={isBulkDeleting}
                startContent={<Trash2 className="h-4 w-4" />}
                className="font-medium shadow-md"
              >
                {isBulkDeleting ? "削除中..." : "一括削除"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 全選択バー */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardBody className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                isSelected={
                  selectedUrls.length === urlList.length && urlList.length > 0
                }
                isIndeterminate={
                  selectedUrls.length > 0 &&
                  selectedUrls.length < urlList.length
                }
                onValueChange={(checked) => onSelectAll(checked)}
                size="md"
              >
                <span className="text-sm font-semibold text-gray-700">
                  全選択
                </span>
              </Checkbox>
              <div className="flex items-center gap-2">
                <Badge content={selectedUrls.length} color="primary" size="sm">
                  <span className="text-sm text-gray-500">選択中</span>
                </Badge>
                <span className="text-sm text-gray-400">/</span>
                <span className="text-sm text-gray-500">
                  全 {urlList.length} 件
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="h-4 w-4" />
              <span>管理対象</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* URL一覧テーブル */}
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardBody className="p-0">
          <Table aria-label="Chat Entry管理テーブル" className="w-full">
            <TableHeader>
              <TableColumn>選択</TableColumn>
              <TableColumn>URL名</TableColumn>
              <TableColumn>タイプ</TableColumn>
              <TableColumn>作成日</TableColumn>
              <TableColumn>アクション</TableColumn>
              <TableColumn>表示状態</TableColumn>
            </TableHeader>
            <TableBody>
              {urlList.map((url) => {
                const isSelected = selectedUrls.some(
                  (selected) => selected.chatEntryId === url.chatEntryId,
                );
                const urlType = getUrlType(url);

                return (
                  <TableRow
                    key={url.chatEntryId}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                    onDoubleClick={() => onEdit(url)}
                  >
                    <TableCell>
                      <Checkbox
                        isSelected={isSelected}
                        onValueChange={(checked) => onSelectItem(url, checked)}
                        size="md"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          {url.entryName || "未設定"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={
                          getUrlTypeColor(urlType) as
                            | "primary"
                            | "secondary"
                            | "default"
                        }
                        variant="flat"
                        startContent={getUrlTypeIcon(urlType)}
                        className="font-medium"
                      >
                        {urlType}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-900">
                          {url.createdAt
                            ? new Date(url.createdAt).toLocaleDateString(
                                "ja-JP",
                              )
                            : "不明"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip content="編集" placement="top">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => onEdit(url)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip
                          content={
                            urlType === "LINE"
                              ? "LINEミニアプリURL"
                              : "埋め込みコード"
                          }
                          placement="top"
                        >
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => onScript(url)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
                          >
                            <Code2 className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip
                          content={
                            urlType === "LINE"
                              ? "LINE Webhook URL"
                              : "フルスクリーンURL"
                          }
                          placement="top"
                        >
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => onFullChatUrl(url)}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Tooltip>

                        <Tooltip content="削除" placement="top">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => onDeleteConfirm(url)}
                            isDisabled={isDeleting}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <Switch
                          isSelected={getDisplayState(url)}
                          onValueChange={(isVisible) =>
                            handleVisibilityToggle(url.chatEntryId, isVisible)
                          }
                          color="success"
                          size="sm"
                          isDisabled={togglingIds.has(url.chatEntryId)}
                          thumbIcon={({ isSelected, className }) =>
                            isSelected ? (
                              <Eye className={`${className} text-green-600`} />
                            ) : (
                              <EyeOff
                                className={`${className} text-gray-400`}
                              />
                            )
                          }
                        />
                        {togglingIds.has(url.chatEntryId) && (
                          <div className="ml-2 w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
};

export default ChatEntryListDisplay;
