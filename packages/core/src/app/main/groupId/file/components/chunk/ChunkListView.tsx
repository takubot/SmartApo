"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Input } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import { Pagination } from "@heroui/react";
import { Chip } from "@heroui/react";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  TrashIcon,
  PlusIcon,
  TagIcon,
  Squares2X2Icon,
  ListBulletIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// 既存のコンポーネントをインポート
import ChunkCard from "./chunkCard";
import TableView from "./TableView";
import ChunkListRow from "./ChunkRow";

// 型定義
import type { ChunkDataItemType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type ChunkDataItem = ChunkDataItemType & {
  categoryNames: string[];
};

type ViewMode = "card" | "list";
type ChunkSortOption = "chunk_id_asc" | "chunk_id_desc";

interface ChunkDataViewProps {
  // データ
  chunkData: ChunkDataItem[];
  tableData: ChunkDataItem[];
  tableHeaders: string[];
  total: number;
  totalPages: number;
  chunkType: string;

  // UI状態
  currentPage: number;
  viewMode: ViewMode;
  searchTerm: string;
  debouncedSearchTerm: string;
  chunkSortOption: ChunkSortOption;
  tableSortOption: string;
  isChunkSelectionMode: boolean;
  selectedChunkIds: number[];
  isSearching: boolean;

  // ローディング状態
  isChunkLoading: boolean;
  isTableLoading: boolean;
  isDataTypeLoading: boolean;

  // イベントハンドラ
  onPageChange: (page: number) => void;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onChunkSortChange: (sort: ChunkSortOption) => void;
  onTableSortChange: (sort: string) => void;
  onToggleSelectionMode: () => void;
  onToggleChunkSelection: (chunkId: number) => void;
  onDeleteSelected: () => void;
  onChunkClick: (chunk: ChunkDataItem) => void;
  onOpenNewChunkPanel: () => void;
  onRedefineCategories: () => void;
  onOpenBulkCategoryModal: () => void;
}

const ChunkDataView: React.FC<ChunkDataViewProps> = ({
  // データ
  chunkData,
  tableData,
  tableHeaders,
  total,
  totalPages,
  chunkType,

  // UI状態
  currentPage,
  viewMode,
  searchTerm,
  debouncedSearchTerm,
  chunkSortOption,
  tableSortOption,
  isChunkSelectionMode,
  selectedChunkIds,
  isSearching,

  // ローディング状態
  isChunkLoading,
  isTableLoading,
  isDataTypeLoading,

  // イベントハンドラ
  onPageChange,
  onSearchChange,
  onClearSearch,
  onViewModeChange,
  onChunkSortChange,
  onTableSortChange,
  onToggleSelectionMode,
  onToggleChunkSelection,
  onDeleteSelected,
  onChunkClick,
  onOpenNewChunkPanel,
  onRedefineCategories,
  onOpenBulkCategoryModal,
}) => {
  const handleChunkCardClick = (chunk: ChunkDataItem) => {
    if (isChunkSelectionMode) {
      onToggleChunkSelection(chunk.chunkId);
    } else {
      onChunkClick(chunk);
    }
  };

  return (
    <>
      {/* 検索と操作セクション */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* 検索バー */}
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              placeholder="データ検索..."
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
              endContent={isSearching && <Spinner size="sm" />}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* 並び替え */}
            <Select
              selectionMode="single"
              selectedKeys={
                new Set([
                  chunkType === "JSON" ? tableSortOption : chunkSortOption,
                ])
              }
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as string;
                if (selectedKey) {
                  if (chunkType === "JSON") {
                    onTableSortChange(selectedKey);
                  } else {
                    onChunkSortChange(selectedKey as ChunkSortOption);
                  }
                }
              }}
              placeholder="並び替え"
              className="w-32 sm:w-40"
              size="md"
            >
              {chunkType === "JSON" ? (
                <>
                  <SelectItem key="row_number_asc">行番号 (昇順)</SelectItem>
                  <SelectItem key="row_number_desc">行番号 (降順)</SelectItem>
                  <SelectItem key="sheet_name_asc">シート名 (昇順)</SelectItem>
                  <SelectItem key="sheet_name_desc">シート名 (降順)</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem key="chunk_id_asc">昇順</SelectItem>
                  <SelectItem key="chunk_id_desc">降順</SelectItem>
                </>
              )}
            </Select>

            <div className="w-[1px] h-6 bg-gray-300 mx-1 hidden sm:block" />

            {/* 操作ボタン群 */}
            <div className="flex items-center gap-2">
              {/* カテゴリー再定義 */}
              <Tooltip content="カテゴリー再定義">
                <Button
                  isIconOnly
                  color="secondary"
                  variant="flat"
                  size="md"
                  onPress={onRedefineCategories}
                  className="min-w-[40px]"
                >
                  <TagIcon className="h-5 w-5" />
                </Button>
              </Tooltip>

              {/* 一括カテゴリ付与 */}
              <Tooltip content="一括カテゴリ操作">
                <Button
                  isIconOnly
                  color="warning"
                  variant="flat"
                  size="md"
                  onPress={onOpenBulkCategoryModal}
                  className="min-w-[40px]"
                >
                  <SparklesIcon className="h-5 w-5" />
                </Button>
              </Tooltip>

              {/* 複数選択モード */}
              <Tooltip
                content={
                  isChunkSelectionMode ? "選択モード解除" : "複数選択モード"
                }
              >
                <Button
                  isIconOnly
                  variant={isChunkSelectionMode ? "solid" : "flat"}
                  color="primary"
                  size="md"
                  onPress={onToggleSelectionMode}
                  className="min-w-[40px]"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </Button>
              </Tooltip>

              {/* 複数削除 */}
              {isChunkSelectionMode && selectedChunkIds.length > 0 && (
                <Tooltip content="選択データを削除">
                  <Button
                    isIconOnly
                    variant="solid"
                    color="danger"
                    size="md"
                    onPress={onDeleteSelected}
                    className="min-w-[40px]"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </Tooltip>
              )}

              {/* 表示モード切り替え */}
              {chunkType !== "JSON" && (
                <Tooltip
                  content={viewMode === "card" ? "リスト表示" : "カード表示"}
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
              )}

              {/* 新規作成 */}
              <Tooltip content="データを追加">
                <Button
                  isIconOnly
                  color="primary"
                  variant="solid"
                  size="md"
                  onPress={onOpenNewChunkPanel}
                  className="min-w-[40px] shadow-sm"
                >
                  <PlusIcon className="h-5 w-5" />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* アクティブ検索表示 */}
        {debouncedSearchTerm && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="text-sm font-medium text-green-800 flex-shrink-0">
                {chunkType === "JSON" ? "テーブル検索中:" : "チャンク検索中:"}
              </span>
              <Chip
                size="sm"
                color="success"
                variant="flat"
                onClose={onClearSearch}
                startContent={<MagnifyingGlassIcon className="h-3 w-3" />}
                className="max-w-[200px]"
              >
                <span className="truncate">{debouncedSearchTerm}</span>
              </Chip>
            </div>
            <Button
              size="sm"
              variant="light"
              color="success"
              onPress={onClearSearch}
              startContent={<XMarkIcon className="h-4 w-4" />}
              className="flex-shrink-0 w-full sm:w-auto"
            >
              検索クリア
            </Button>
          </div>
        )}
      </div>

      {/* データ一覧 */}
      <div className="overflow-hidden">
        {isDataTypeLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner size="lg" color="primary" label="データタイプ確認中..." />
          </div>
        ) : chunkType === "JSON" || (tableData && tableData.length > 0) ? (
          /* テーブル表示（CSV/Excel） */
          <TableView
            data={tableData}
            headers={tableHeaders}
            total={total}
            isLoading={isTableLoading}
            onPageChange={onPageChange}
            currentPage={currentPage + 1}
            pageSize={50} // デフォルトページサイズ
            onRowClick={onChunkClick}
          />
        ) : isChunkLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner size="lg" color="primary" label="読み込み中..." />
          </div>
        ) : chunkData && chunkData.length > 0 ? (
          <>
            {viewMode === "card" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {chunkData.map((chunk) => (
                  <ChunkCard
                    key={chunk.chunkId}
                    chunk={chunk}
                    onCardClick={() => handleChunkCardClick(chunk)}
                    isSelectionMode={isChunkSelectionMode}
                    isSelected={selectedChunkIds.includes(chunk.chunkId)}
                    searchTerm={searchTerm}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden bg-white border border-gray-200 divide-y divide-gray-200">
                {chunkData.map((chunk) => (
                  <ChunkListRow
                    key={chunk.chunkId}
                    chunk={chunk}
                    onClick={() => handleChunkCardClick(chunk)}
                    isSelectionMode={isChunkSelectionMode}
                    isSelected={selectedChunkIds.includes(chunk.chunkId)}
                    searchTerm={searchTerm}
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
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">
              {chunkType === "EMPTY"
                ? "データがありません"
                : "チャンクが見つかりません"}
            </div>
            <div className="text-gray-400 text-sm">
              {chunkType === "EMPTY"
                ? "ファイルを処理中か、データが存在しません"
                : "検索条件を変更してください"}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChunkDataView;
