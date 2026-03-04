"use client";

import { Pagination } from "@heroui/pagination";
import { Button, Card, Input, Spinner, Checkbox } from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Tooltip } from "@heroui/tooltip";
import React from "react";

import { Chip } from "@heroui/react";

import { Select, SelectItem } from "@heroui/select";

import {
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  DocumentPlusIcon,
  DocumentTextIcon,
  EyeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FileText } from "lucide-react";

// バックエンドで定義されている型を使用し、必要に応じて拡張
export type ReferenceLinkResponse = {
  referenceLinkId: number; // null/undefinedを除外して必須にする
  groupId: string;
  linkName: string; // null/undefinedを除外して必須にする
  description?: string | null;
  linkUrl?: string | null;
  createdAt: string; // null/undefinedを除外して必須にする
  updatedAt: string; // null/undefinedを除外して必須にする
  fileCount?: number;
};

interface ReferenceLinkListProps {
  referenceLinks: ReferenceLinkResponse[];
  isLoading: boolean;
  error: string | null;
  groupId: string | null;

  // 検索関連
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeSearchTerm: string;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;
  isSearching: boolean;

  // 並び替え関連
  sortOption:
    | "newest"
    | "oldest"
    | "nameAsc"
    | "nameDesc"
    | "fileCountAsc"
    | "fileCountDesc";
  setSortOption: (
    option:
      | "newest"
      | "oldest"
      | "nameAsc"
      | "nameDesc"
      | "fileCountAsc"
      | "fileCountDesc",
  ) => void;
  showSort: boolean;
  setShowSort: (show: boolean) => void;

  // ページネーション関連
  page: number;
  setPage: (page: number) => void;
  referenceLinksPerPage: number;

  // 複数選択関連
  isSelectionMode: boolean;
  setIsSelectionMode: (mode: boolean) => void;
  selectedReferenceLinkIds: number[];
  setSelectedReferenceLinkIds: (ids: number[]) => void;

  // モーダル制御
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isCreating: boolean;

  // イベントハンドラー
  onSearch: () => void;
  onClearSearch: () => void;
  onSearchTermChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSelection: (referenceLinkId: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeleteSelected: () => void;
  onOpenEditModal: (link: ReferenceLinkResponse) => void;
  onOpenFileAssociationModal: (link: ReferenceLinkResponse) => void;
  onOpenDetailsModal: (link: ReferenceLinkResponse) => void;
  onConfirmDelete: (link: ReferenceLinkResponse) => void;
  onRetry: () => void;
  onAssociationChange: () => void;
  onBulkFileAssociation: () => void;
}

export const ReferenceLinkList: React.FC<ReferenceLinkListProps> = ({
  referenceLinks,
  isLoading,
  error,
  groupId,
  searchTerm,
  activeSearchTerm,
  showSearch,
  setShowSearch,
  isSearching,
  sortOption,
  setSortOption,
  showSort,
  setShowSort,
  page,
  setPage,
  referenceLinksPerPage,
  isSelectionMode,
  setIsSelectionMode,
  selectedReferenceLinkIds,
  setSelectedReferenceLinkIds,
  setIsCreateModalOpen,
  isCreating,
  onSearch,
  onClearSearch,
  onSearchTermChange,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onDeleteSelected,
  onOpenEditModal,
  onOpenFileAssociationModal,
  onOpenDetailsModal,
  onConfirmDelete,
  onRetry,
  onBulkFileAssociation,
}) => {
  // フィルタリングと並び替え
  const filteredLinks = referenceLinks.filter((link) => {
    if (!activeSearchTerm) return true;
    return (
      link.linkName?.toLowerCase().includes(activeSearchTerm.toLowerCase()) ||
      link.description
        ?.toLowerCase()
        .includes(activeSearchTerm.toLowerCase()) ||
      link.linkUrl?.toLowerCase().includes(activeSearchTerm.toLowerCase())
    );
  });

  const sortedLinks = [...filteredLinks].sort((a, b) => {
    switch (sortOption) {
      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case "oldest":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "nameAsc":
        return a.linkName.localeCompare(b.linkName);
      case "nameDesc":
        return b.linkName.localeCompare(a.linkName);
      case "fileCountAsc":
        return (a.fileCount || 0) - (b.fileCount || 0);
      case "fileCountDesc":
        return (b.fileCount || 0) - (a.fileCount || 0);
      default:
        return 0;
    }
  });

  // ページネーション計算
  const totalPages = Math.ceil(sortedLinks.length / referenceLinksPerPage);
  const paginatedLinks = sortedLinks.slice(
    (page - 1) * referenceLinksPerPage,
    page * referenceLinksPerPage,
  );

  if (!groupId) {
    return (
      <div className="w-full h-full p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="text-center py-8 text-red-600">
          グループIDが見つかりません
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Card className="p-6 bg-red-50 border border-red-200">
            <div className="text-center">
              <div className="text-red-600 text-xl font-semibold mb-4">
                エラーが発生しました
              </div>
              <div className="text-red-700 mb-4">{error}</div>

              <div className="mt-6 space-y-3">
                <Button color="primary" onPress={onRetry}>
                  再試行
                </Button>
                <div className="text-sm text-gray-500">
                  問題が解決しない場合は、バックエンドサーバーが起動しているか確認してください。
                </div>
              </div>
            </div>
          </Card>
        </div>
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
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                参照リンク管理
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* 検索 */}
              <div className="flex items-center gap-2">
                <Tooltip content="検索">
                  <Button
                    isIconOnly
                    variant={showSearch ? "solid" : "light"}
                    color="primary"
                    onPress={() => setShowSearch(!showSearch)}
                    size="sm"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>
                {showSearch && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="リンク名、説明、URLで検索..."
                      value={searchTerm}
                      variant="bordered"
                      onChange={onSearchTermChange}
                      className="w-48"
                      size="sm"
                      isClearable
                      onClear={onClearSearch}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          onSearch();
                        }
                      }}
                    />
                    <Button
                      color="primary"
                      onPress={onSearch}
                      isDisabled={!searchTerm.trim()}
                      size="sm"
                    >
                      検索
                    </Button>
                  </div>
                )}
              </div>

              {/* 並び替え */}
              <div className="flex items-center gap-2">
                <Tooltip content="並び替え">
                  <Button
                    isIconOnly
                    variant="light"
                    color="primary"
                    onPress={() => setShowSort(!showSort)}
                    size="sm"
                  >
                    <AdjustmentsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>
                {showSort && (
                  <Select
                    selectionMode="single"
                    selectedKeys={new Set([sortOption])}
                    onSelectionChange={(keys) => {
                      const value = Array.from(keys)[0];
                      setSortOption(value as typeof sortOption);
                      setPage(1);
                    }}
                    color="primary"
                    placeholder="並び替え"
                    variant="bordered"
                    size="sm"
                    className="w-40"
                  >
                    <SelectItem key="newest">新しい順</SelectItem>
                    <SelectItem key="oldest">古い順</SelectItem>
                    <SelectItem key="nameAsc">名前順（昇順）</SelectItem>
                    <SelectItem key="nameDesc">名前順（降順）</SelectItem>
                    <SelectItem key="fileCountAsc">
                      関連ファイル数（少ない順）
                    </SelectItem>
                    <SelectItem key="fileCountDesc">
                      関連ファイル数（多い順）
                    </SelectItem>
                  </Select>
                )}
              </div>

              {/* 複数選択モード */}
              <Tooltip
                content={isSelectionMode ? "選択モード解除" : "複数選択モード"}
              >
                <Button
                  isIconOnly
                  variant={isSelectionMode ? "solid" : "flat"}
                  color="primary"
                  onPress={() => {
                    if (!isSelectionMode) {
                      setSelectedReferenceLinkIds([]);
                    }
                    setIsSelectionMode(!isSelectionMode);
                  }}
                  size="sm"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </Button>
              </Tooltip>

              {/* 複数削除 */}
              {isSelectionMode && selectedReferenceLinkIds.length > 0 && (
                <Tooltip content="選択した参照リンクを削除">
                  <Button
                    isIconOnly
                    variant="solid"
                    color="danger"
                    onPress={onDeleteSelected}
                    size="sm"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>
              )}

              {/* 新規作成 */}
              <Tooltip content="新しい参照リンクを作成">
                <Button
                  isIconOnly
                  color="primary"
                  variant="solid"
                  size="sm"
                  onPress={() => setIsCreateModalOpen(true)}
                  isDisabled={isCreating}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-6">
        {/* 複数選択モード時のコントロール */}
        {isSelectionMode && (
          <Card className="mb-4 p-4 bg-blue-50 border border-blue-200">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-blue-800 font-medium">
                  {selectedReferenceLinkIds.length} 件選択中
                </span>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={onSelectAll}
                  >
                    すべて選択
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="default"
                    onPress={onDeselectAll}
                  >
                    選択解除
                  </Button>
                </div>
              </div>
              {selectedReferenceLinkIds.length > 0 && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    color="danger"
                    onPress={onDeleteSelected}
                    startContent={<TrashIcon className="h-4 w-4" />}
                  >
                    選択した項目を削除
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* メイン表示領域 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner size="lg" color="primary" label="読み込み中..." />
          </div>
        ) : sortedLinks.length > 0 ? (
          <>
            <Card className="overflow-hidden">
              <Table
                aria-label="参照リンク一覧"
                classNames={{
                  wrapper: "min-h-[400px]",
                }}
              >
                <TableHeader>
                  {[
                    ...(isSelectionMode
                      ? [<TableColumn key="selection">選択</TableColumn>]
                      : []),
                    <TableColumn key="id">ID</TableColumn>,
                    <TableColumn key="name">リンク名</TableColumn>,
                    <TableColumn key="url">URL</TableColumn>,
                    <TableColumn key="fileCount">関連ファイル数</TableColumn>,
                    <TableColumn key="createdAt">作成日</TableColumn>,
                    <TableColumn key="actions">操作</TableColumn>,
                  ]}
                </TableHeader>
                <TableBody emptyContent="参照リンクがありません">
                  {paginatedLinks.map((link) => (
                    <TableRow key={link.referenceLinkId}>
                      {[
                        ...(isSelectionMode
                          ? [
                              <TableCell key="selection">
                                <Checkbox
                                  isSelected={selectedReferenceLinkIds.includes(
                                    link.referenceLinkId,
                                  )}
                                  onValueChange={() =>
                                    onToggleSelection(link.referenceLinkId)
                                  }
                                  color="primary"
                                  aria-label="select link"
                                  size="sm"
                                />
                              </TableCell>,
                            ]
                          : []),
                        <TableCell key="id">{link.referenceLinkId}</TableCell>,
                        <TableCell key="name">
                          <div>
                            <div className="font-medium">
                              {link.linkName || "名前なし"}
                            </div>
                            {link.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">
                                {link.description}
                              </div>
                            )}
                          </div>
                        </TableCell>,
                        <TableCell key="url">
                          <div className="flex items-center space-x-1">
                            <LinkIcon className="h-4 w-4 text-blue-600" />
                            <span className="text-blue-600 hover:underline cursor-pointer max-w-xs truncate">
                              {link.linkUrl}
                            </span>
                          </div>
                        </TableCell>,
                        <TableCell key="fileCount">
                          <Chip size="sm" color="primary" variant="flat">
                            {link.fileCount || 0}
                          </Chip>
                        </TableCell>,
                        <TableCell key="createdAt">
                          {new Date(link.createdAt).toLocaleDateString("ja-JP")}
                        </TableCell>,
                        <TableCell key="actions">
                          <div className="flex space-x-1">
                            <Tooltip content="詳細表示">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="primary"
                                onPress={() => onOpenDetailsModal(link)}
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="編集">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="primary"
                                onPress={() => onOpenEditModal(link)}
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="ファイル関連付け">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="secondary"
                                onPress={() => onOpenFileAssociationModal(link)}
                              >
                                <DocumentPlusIcon className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="削除">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="danger"
                                onPress={() => onConfirmDelete(link)}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        </TableCell>,
                      ]}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination
                  total={totalPages}
                  page={page}
                  onChange={setPage}
                  showControls
                  color="primary"
                />
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-gray-100 p-6">
                <DocumentTextIcon className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                参照リンクがありません
              </h3>
              <p className="text-gray-500 max-w-md">
                {isSearching && activeSearchTerm
                  ? `「${activeSearchTerm}」に一致する参照リンクが見つかりませんでした。`
                  : "まだ参照リンクが登録されていません。新規作成ボタンから最初の参照リンクを追加してください。"}
              </p>
              {!isSearching && (
                <Button
                  color="primary"
                  onPress={() => setIsCreateModalOpen(true)}
                  startContent={<PlusIcon className="h-5 w-5" />}
                >
                  最初の参照リンクを作成
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
