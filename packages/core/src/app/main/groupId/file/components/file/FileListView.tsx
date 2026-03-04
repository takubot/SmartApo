"use client";

import React from "react";
import { Button, ButtonGroup } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Select, SelectItem } from "@heroui/select";
import { Input } from "@heroui/react";

import { Tooltip } from "@heroui/tooltip";
import { Pagination } from "@heroui/pagination";
import { Chip } from "@heroui/react";
import {
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  TrashIcon,
  TagIcon,
  Squares2X2Icon,
  ListBulletIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FileText } from "lucide-react";

// 既存のコンポーネントをインポート
import FileCard from "./fileCard";
import FileListRow from "./FileRow";

// 型定義
import type { FileListItemType } from "@repo/api-contracts/based_template/zschema";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type FileListItem = FileListItemType & {
  categoryNames: string[];
  displayChunkCount?: number;
};

type ViewMode = "card" | "list";
type SortOption = "newest" | "oldest" | "nameAsc" | "nameDesc" | "extensionAsc";

interface FileListViewProps {
  // データ
  fileList: FileListItem[];
  categoryList: CategoryResponseSchemaType[];
  totalPages: number;

  // UI状態
  currentPage: number;
  viewMode: ViewMode;
  searchTerm: string;
  debouncedSearchTerm: string;
  includeChunkSearch: boolean;
  selectedCategoryIds: number[];
  sortOption: SortOption;
  showAdvancedFilters: boolean;
  selectedFileIds: number[];
  isFileSelectionMode: boolean;
  isSearching: boolean;
  hasActiveFilters: boolean;

  // ローディング状態
  isFileLoading: boolean;

  // イベントハンドラ
  onPageChange: (page: number) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onFileSelect: (file: FileListItem) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSortChange: (sort: SortOption) => void;
  onIncludeChunkSearchChange: (include: boolean) => void;
  onCategoryFilterChange: (categoryIds: number[]) => void;
  onRemoveCategory: (categoryId: number) => void;
  onClearAllFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onToggleFileSelection: (fileId: number) => void;
  onToggleSelectionMode: () => void;
  onOpenUploadModal: () => void;
  onDeleteSelected: () => void;
  onSelectAll?: () => void;
}

const FileListView: React.FC<FileListViewProps> = ({
  // データ
  fileList,
  categoryList,
  totalPages,

  // UI状態
  currentPage,
  viewMode,
  searchTerm,
  debouncedSearchTerm,
  includeChunkSearch,
  selectedCategoryIds,
  sortOption,
  showAdvancedFilters,
  selectedFileIds,
  isFileSelectionMode,
  isSearching,
  hasActiveFilters,

  // ローディング状態
  isFileLoading,

  // イベントハンドラ
  onPageChange,
  onSearchChange,
  onClearSearch,
  onFileSelect,
  onViewModeChange,
  onSortChange,
  onIncludeChunkSearchChange,
  onCategoryFilterChange,
  onRemoveCategory,
  onClearAllFilters,
  onToggleAdvancedFilters,
  onToggleFileSelection,
  onToggleSelectionMode,
  onOpenUploadModal,
  onDeleteSelected,
  onSelectAll,
}) => {
  return (
    <>
      {/* 検索と操作セクション */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* 検索バー */}
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="ファイル名で検索..."
              value={searchTerm}
              onChange={onSearchChange}
              className="w-full"
              variant="bordered"
              radius="lg"
              classNames={{
                inputWrapper:
                  "bg-white/95 dark:bg-default-100 rounded-xl border border-gray-300 hover:border-gray-400 data-[focus=true]:border-primary-400 shadow-sm",
                input:
                  "text-gray-900 placeholder:text-gray-400 focus:outline-none",
              }}
              size="md"
              isClearable
              onClear={onClearSearch}
              startContent={
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              }
              endContent={isSearching ? <Spinner size="sm" /> : null}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* フィルタ */}
            <Button
              variant={showAdvancedFilters ? "solid" : "flat"}
              color="secondary"
              onPress={onToggleAdvancedFilters}
              size="md"
              startContent={<AdjustmentsHorizontalIcon className="h-4 w-4" />}
              className="min-h-[40px]"
            >
              フィルタ
              {selectedCategoryIds.length > 0 && (
                <Chip
                  size="sm"
                  color="warning"
                  variant="solid"
                  className="ml-1"
                >
                  {selectedCategoryIds.length}
                </Chip>
              )}
            </Button>

            <div className="w-[1px] h-6 bg-gray-300 mx-1 hidden sm:block" />

            {/* 操作ボタン群 */}
            <div className="flex items-center gap-2">
              {/* アップロード */}
              <Tooltip content="アップロード">
                <Button
                  isIconOnly
                  color="primary"
                  variant="solid"
                  onPress={onOpenUploadModal}
                  size="md"
                  className="min-w-[40px] shadow-sm"
                >
                  <CloudArrowUpIcon className="h-5 w-5" />
                </Button>
              </Tooltip>

              {/* 表示モード切り替え */}
              <Tooltip
                content={
                  viewMode === "card"
                    ? "リスト表示に切り替え"
                    : "カード表示に切り替え"
                }
              >
                <Button
                  isIconOnly
                  variant="flat"
                  color="primary"
                  size="md"
                  onPress={() =>
                    onViewModeChange(viewMode === "card" ? "list" : "card")
                  }
                  className="min-w-[40px]"
                >
                  {viewMode === "card" ? (
                    <ListBulletIcon className="h-5 w-5" />
                  ) : (
                    <Squares2X2Icon className="h-5 w-5" />
                  )}
                </Button>
              </Tooltip>

              {/* 複数選択モード */}
              <Tooltip
                content={
                  isFileSelectionMode ? "選択モード解除" : "複数選択モード"
                }
              >
                <Button
                  isIconOnly
                  variant={isFileSelectionMode ? "solid" : "flat"}
                  color="primary"
                  size="md"
                  onPress={onToggleSelectionMode}
                  className="min-w-[40px]"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </Button>
              </Tooltip>

              {/* 全選択ボタン */}
              {isFileSelectionMode && onSelectAll && fileList.length > 0 && (
                <Tooltip content="すべて選択">
                  <Button
                    onPress={onSelectAll}
                    color="primary"
                    variant="flat"
                    size="sm"
                    startContent={<CheckCircleIcon className="h-4 w-4" />}
                    className="min-h-[40px] px-3"
                  >
                    <span className="hidden sm:inline">すべて選択</span>
                  </Button>
                </Tooltip>
              )}

              {/* 複数削除 */}
              {isFileSelectionMode && selectedFileIds.length > 0 && (
                <Button
                  onPress={onDeleteSelected}
                  color="danger"
                  size="sm"
                  startContent={<TrashIcon className="h-4 w-4" />}
                  className="min-h-[40px] px-3"
                >
                  削除
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 検索実行時に検索範囲の選択肢を表示 */}
        {searchTerm && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-600">
              <p className="font-semibold">検索範囲の選択</p>
              <p>
                {includeChunkSearch ? "ファイル名と内容" : "ファイル名のみ"}{" "}
                が選択されています
              </p>
            </div>
            <ButtonGroup>
              <Button
                size="sm"
                variant={!includeChunkSearch ? "solid" : "flat"}
                color="primary"
                onPress={() => onIncludeChunkSearchChange(false)}
                startContent={<FileText className="h-4 w-4" />}
              >
                ファイル名のみ
              </Button>
              <Button
                size="sm"
                variant={includeChunkSearch ? "solid" : "flat"}
                color="primary"
                onPress={() => onIncludeChunkSearchChange(true)}
                startContent={<MagnifyingGlassIcon className="h-4 w-4" />}
              >
                ファイル名と内容
              </Button>
            </ButtonGroup>
          </div>
        )}

        {/* 高度なフィルタ */}
        {showAdvancedFilters && (
          <div className="p-4 bg-white rounded-lg border border-gray-200 space-y-4 mt-8 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 並び替え */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">並び替え</h4>
                <Select
                  selectionMode="single"
                  selectedKeys={new Set([sortOption])}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as SortOption;
                    onSortChange(key);
                  }}
                  placeholder="並び替え方法を選択"
                  className="w-full"
                >
                  <SelectItem key="newest">新しい順</SelectItem>
                  <SelectItem key="oldest">古い順</SelectItem>
                  <SelectItem key="nameAsc">ファイル名 (A-Z)</SelectItem>
                  <SelectItem key="nameDesc">ファイル名 (Z-A)</SelectItem>
                  <SelectItem key="extensionAsc">拡張子順</SelectItem>
                </Select>
              </div>

              {/* カテゴリフィルタ */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <TagIcon className="h-4 w-4" />
                  <span>カテゴリフィルタ</span>
                </h4>
                <Select
                  selectionMode="multiple"
                  selectedKeys={new Set(selectedCategoryIds.map(String))}
                  onSelectionChange={(keys) => {
                    const ids = Array.from(keys).map(Number);
                    onCategoryFilterChange(ids);
                  }}
                  placeholder="カテゴリを選択"
                  className="w-full"
                >
                  {categoryList.map((category) => (
                    <SelectItem key={category.categoryId}>
                      {category.categoryName}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* アクティブフィルタの表示 */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-blue-800 flex-shrink-0">
                アクティブフィルタ:
              </span>
              {debouncedSearchTerm && (
                <Chip
                  size="sm"
                  color="primary"
                  variant="flat"
                  onClose={onClearSearch}
                  startContent={<MagnifyingGlassIcon className="h-3 w-3" />}
                  className="max-w-[200px]"
                >
                  <span className="truncate">{debouncedSearchTerm}</span>
                </Chip>
              )}
              {selectedCategoryIds.map((id) => {
                const category = categoryList.find((c) => c.categoryId === id);
                return category ? (
                  <Chip
                    key={id}
                    size="sm"
                    color="secondary"
                    variant="flat"
                    onClose={() => onRemoveCategory(id)}
                    startContent={<TagIcon className="h-3 w-3" />}
                    className="max-w-[150px]"
                  >
                    <span className="truncate">{category.categoryName}</span>
                  </Chip>
                ) : null;
              })}
            </div>
            <Button
              size="sm"
              variant="light"
              color="primary"
              onPress={onClearAllFilters}
              startContent={<XMarkIcon className="h-4 w-4" />}
              className="flex-shrink-0"
            >
              すべてクリア
            </Button>
          </div>
        )}
      </div>

      {/* ファイル一覧表示 */}
      {isFileLoading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner size="lg" color="primary" label="読み込み中..." />
        </div>
      ) : fileList && fileList.length > 0 ? (
        <>
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
              {fileList.map((file) => (
                <FileCard
                  key={file.fileId}
                  file={file}
                  onClick={() => {
                    if (isFileSelectionMode) {
                      onToggleFileSelection(file.fileId);
                    } else {
                      onFileSelect(file);
                    }
                  }}
                  isSelected={selectedFileIds.includes(file.fileId)}
                  isSelectable={isFileSelectionMode}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg overflow-hidden bg-white border border-gray-200 divide-y divide-gray-200">
              {fileList.map((file) => (
                <FileListRow
                  key={file.fileId}
                  file={file}
                  onClick={() => {
                    if (isFileSelectionMode) {
                      onToggleFileSelection(file.fileId);
                    } else {
                      onFileSelect(file);
                    }
                  }}
                  isSelected={selectedFileIds.includes(file.fileId)}
                  isSelectable={isFileSelectionMode}
                />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                total={totalPages}
                page={currentPage + 1}
                onChange={onPageChange}
                showControls
                color="primary"
              />
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center mt-4">ファイルがありません。</p>
      )}
    </>
  );
};

export default FileListView;
