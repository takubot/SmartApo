"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button } from "@heroui/react";
import { FileText, ArrowLeft } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { useGroupContext } from "../../layout-client";

// 統合カスタムフック
import { useTemplate } from "../hooks/useTemplate";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

// コンポーネント
import BulkCategoryModal from "../components/chunk/BulkCategoryModal";
import ChunkDataView from "../components/chunk/ChunkListView";
import ChunkSidePanel from "../components/chunk/ChunkSidePanel";
import FileListView from "../components/file/FileListView";
import PerfectFileUploadModal from "../components/file/uploadModal/PerfectFileUploadModal";

// 型定義
interface ConfirmModalConfig {
  title: string;
  message: string;
  onConfirm: () => void;
}

const ChunkDataTemplate: React.FC = () => {
  const groupId = useGroupContext();

  // 独自のモーダル状態管理（ModalsContainerを使わずにシンプルに）
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] =
    useState<ConfirmModalConfig | null>(null);

  // useFilePageDataから必要な機能を取得
  const {
    // データ
    fileData,
    chunkData,
    // UI状態
    uiState,
    // ページネーション
    pagination,
    // 計算値
    debouncedSearchTerm,
    isSearching,
    hasActiveFilters,
    totalFilePages,
    totalChunkPages,
    // イベントハンドラ
    handleFilePageChange,
    handleChunkPageChange,
    handleSearchTermChange,
    handleClearSearch,
    handleIncludeChunkSearchChange,
    handleFileSelect,
    handleFileUploaded,
    handleDeleteSelectedFiles,
    handleCreateChunk,
    handleDeleteSelectedChunks,
    handleRedefineCategories,
    handleBulkUpdateFileCategories,
    handleBulkAddFileCategories,
    handleBulkRemoveFileCategories,
    totalChunkItems,
  } = useTemplate(groupId);

  // 確認モーダルを開く
  const openConfirmModal = useCallback((config: ConfirmModalConfig) => {
    setConfirmModalConfig(config);
    setIsConfirmModalOpen(true);
  }, []);

  // 確認モーダルを閉じる
  const closeConfirmModal = useCallback(() => {
    setIsConfirmModalOpen(false);
    setConfirmModalConfig(null);
  }, []);

  // ファイル削除の確認処理
  const handleDeleteSelectedFilesWithConfirm = useCallback(async () => {
    if (uiState.state.selectedFileIds.length === 0) {
      handleErrorWithUI(
        { message: "削除するファイルが選択されていません" } as any,
        "ファイル削除",
      );
      return;
    }

    openConfirmModal({
      title: "ファイルの削除",
      message: `選択した${uiState.state.selectedFileIds.length}個のファイルを削除すると、関連するチャンクもすべて削除されます。本当に削除しますか？`,
      onConfirm: async () => {
        closeConfirmModal();
        await handleDeleteSelectedFiles();
      },
    });
  }, [
    uiState.state.selectedFileIds,
    openConfirmModal,
    closeConfirmModal,
    handleDeleteSelectedFiles,
  ]);

  // チャンク削除の確認処理
  const handleDeleteSelectedChunksWithConfirm = useCallback(async () => {
    if (uiState.state.selectedChunkIds.length === 0) {
      handleErrorWithUI(
        { message: "削除するチャンクが選択されていません" } as any,
        "チャンク削除",
      );
      return;
    }

    openConfirmModal({
      title: "チャンクの削除",
      message: `選択した${uiState.state.selectedChunkIds.length}個のチャンクを削除します。この操作は取り消せません。`,
      onConfirm: async () => {
        closeConfirmModal();
        await handleDeleteSelectedChunks();
      },
    });
  }, [
    uiState.state.selectedChunkIds,
    openConfirmModal,
    closeConfirmModal,
    handleDeleteSelectedChunks,
  ]);

  // ローディング状態のメモ化
  const loadingStates = useMemo(
    () => ({
      isFileLoading: Boolean(fileData.isFileLoading),
      isCategoryLoading: Boolean(fileData.isCategoryLoading),
      isChunkLoading: Boolean(chunkData.isChunkLoading),
      isTableLoading: Boolean(chunkData.isChunkLoading), // チャンク読み込みと同じ
      isDataTypeLoading: Boolean(chunkData.isChunkTypeLoading),
    }),
    [
      fileData.isFileLoading,
      fileData.isCategoryLoading,
      chunkData.isChunkLoading,
      chunkData.isChunkTypeLoading,
    ],
  );

  // エラー処理付きファイルアップロード
  const handleFileUploadedSafe = useCallback(async () => {
    try {
      await handleFileUploaded();
      showSuccessToast("ファイルデータを更新しました");
    } catch (error) {
      handleErrorWithUI(error, "ファイルデータ更新");
    }
  }, [handleFileUploaded]);

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {uiState.state.selectedFile && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={uiState.clearSelectedFile}
                  className="mr-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground truncate">
                {uiState.state.selectedFile
                  ? uiState.state.selectedFile.fileName
                  : "ファイル管理"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツセクション */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 min-h-0 flex flex-col">
        {/* メインコンテンツエリア */}
        <div className="space-y-6">
          {!uiState.state.selectedFile ? (
            <>
              {/* ファイル未選択時：ファイル一覧 */}
              <FileListView
                // データ
                fileList={fileData.fileList || []}
                categoryList={fileData.categoryList || []}
                totalPages={totalFilePages}
                // UI状態
                currentPage={pagination.file.currentPage}
                viewMode={uiState.state.viewMode}
                searchTerm={uiState.state.searchTerm}
                debouncedSearchTerm={debouncedSearchTerm}
                includeChunkSearch={uiState.state.includeChunkSearch}
                selectedCategoryIds={uiState.state.selectedCategoryIds}
                sortOption={uiState.state.sortOption}
                showAdvancedFilters={uiState.state.showAdvancedFilters}
                selectedFileIds={uiState.state.selectedFileIds}
                isFileSelectionMode={uiState.state.isFileSelectionMode}
                isSearching={isSearching}
                hasActiveFilters={hasActiveFilters}
                // ローディング状態
                isFileLoading={loadingStates.isFileLoading}
                // イベントハンドラ
                onPageChange={handleFilePageChange}
                onSearchChange={handleSearchTermChange}
                onClearSearch={handleClearSearch}
                onFileSelect={handleFileSelect}
                onViewModeChange={uiState.setViewMode}
                onSortChange={uiState.setSortOption}
                onIncludeChunkSearchChange={handleIncludeChunkSearchChange}
                onCategoryFilterChange={uiState.setCategoryFilter}
                onRemoveCategory={uiState.removeCategory}
                onClearAllFilters={uiState.clearAllFilters}
                onToggleAdvancedFilters={uiState.toggleAdvancedFilters}
                onToggleFileSelection={uiState.toggleFileSelection}
                onToggleSelectionMode={uiState.toggleFileSelectionMode}
                onOpenUploadModal={uiState.openFileUploadModal}
                onDeleteSelected={handleDeleteSelectedFilesWithConfirm}
                onSelectAll={() =>
                  uiState.selectAllFiles(fileData.fileList || [])
                }
              />
            </>
          ) : null}

          {/* ファイル選択時：チャンクデータ一覧 */}
          {uiState.state.selectedFile && (
            <ChunkDataView
              // データ
              chunkData={(() => {
                // テキストチャンクがあればそれを、なければ全チャンク
                const textList = chunkData.textChunkList || [];
                return textList.length > 0
                  ? textList
                  : chunkData.chunkList || [];
              })()}
              tableData={chunkData.jsonChunkList || []}
              tableHeaders={(() => {
                const rows = chunkData.jsonChunkList || [];
                const headerSet = new Set<string>();
                for (let i = 0; i < Math.min(rows.length, 50); i++) {
                  const content = (rows[i] as any)?.chunkContent;
                  if (!content) continue;
                  try {
                    const obj =
                      typeof content === "string"
                        ? JSON.parse(content.replace(/\bNaN\b/g, "null"))
                        : content;
                    if (obj && typeof obj === "object") {
                      for (const k of Object.keys(
                        obj as Record<string, unknown>,
                      )) {
                        if (k && typeof k === "string") headerSet.add(k);
                      }
                    }
                  } catch {
                    // ignore per-row parse error
                  }
                }
                return Array.from(headerSet);
              })()}
              total={totalChunkItems}
              totalPages={totalChunkPages}
              chunkType={chunkData.chunkType}
              // UI状態
              currentPage={pagination.chunk.currentPage}
              viewMode={uiState.state.viewMode}
              searchTerm={uiState.state.searchTerm}
              debouncedSearchTerm={debouncedSearchTerm}
              chunkSortOption={uiState.state.chunkSortOption}
              tableSortOption={uiState.state.tableSortOption}
              isChunkSelectionMode={uiState.state.isChunkSelectionMode}
              selectedChunkIds={uiState.state.selectedChunkIds}
              isSearching={isSearching}
              // ローディング状態
              isChunkLoading={loadingStates.isChunkLoading}
              isTableLoading={loadingStates.isTableLoading}
              isDataTypeLoading={loadingStates.isDataTypeLoading}
              // イベントハンドラ
              onPageChange={handleChunkPageChange}
              onSearchChange={handleSearchTermChange}
              onClearSearch={handleClearSearch}
              onViewModeChange={uiState.setViewMode}
              onChunkSortChange={uiState.setChunkSortOption}
              onTableSortChange={uiState.setTableSortOption}
              onToggleSelectionMode={uiState.toggleChunkSelectionMode}
              onToggleChunkSelection={uiState.toggleChunkSelection}
              onDeleteSelected={handleDeleteSelectedChunksWithConfirm}
              onChunkClick={uiState.openSidePanel}
              onOpenNewChunkPanel={() => uiState.openSidePanel()}
              onRedefineCategories={handleRedefineCategories}
              onOpenBulkCategoryModal={uiState.openBulkCategoryModal}
            />
          )}
        </div>
      </div>

      {/* ファイルアップロードモーダル - 直接使用でシンプル */}
      <PerfectFileUploadModal
        isOpen={uiState.state.isFileUploadModalOpen}
        onClose={uiState.closeFileUploadModal}
        onUploaded={handleFileUploadedSafe}
        groupId={groupId}
      />

      {/* 確認モーダル - シンプルな実装 */}
      <Modal
        isOpen={isConfirmModalOpen && !!confirmModalConfig}
        onOpenChange={(open) => !open && closeConfirmModal()}
        placement="center"
        backdrop="blur"
        classNames={{
          backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
          base: "border-[#292f46] bg-white",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
                  <span className="text-red-600">
                    {confirmModalConfig?.title || "確認"}
                  </span>
                </div>
              </ModalHeader>
              <ModalBody>
                <p className="text-gray-700">
                  {confirmModalConfig?.message || ""}
                </p>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  className="mr-2"
                >
                  キャンセル
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    confirmModalConfig?.onConfirm();
                    onClose();
                  }}
                >
                  実行
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 一括カテゴリモーダル */}
      {uiState.state.isBulkCategoryModalOpen && (
        <BulkCategoryModal
          isOpen={uiState.state.isBulkCategoryModalOpen}
          onClose={uiState.closeBulkCategoryModal}
          selectedFile={uiState.state.selectedFile}
          categoryList={fileData.categoryList || []}
          isCategoryLoading={loadingStates.isCategoryLoading}
          onSuccess={() => {
            chunkData.mutateChunks();
            showSuccessToast("カテゴリを更新しました");
          }}
          onBulkUpdateFileCategories={handleBulkUpdateFileCategories}
          onBulkAddFileCategories={handleBulkAddFileCategories}
          onBulkRemoveFileCategories={handleBulkRemoveFileCategories}
        />
      )}

      {/* チャンクサイドパネル */}
      {uiState.state.isSidePanelOpen && (
        <ChunkSidePanel
          key={uiState.state.selectedChunk?.chunkId ?? "new"}
          isOpen={uiState.state.isSidePanelOpen}
          onClose={uiState.closeSidePanel}
          chunk={uiState.state.selectedChunk}
          categoryList={fileData.categoryList || []}
          isCategoryLoading={loadingStates.isCategoryLoading}
          onCreateChunk={async (data) => {
            try {
              await handleCreateChunk(data);
              showSuccessToast("チャンクを作成しました");
            } catch (error) {
              handleErrorWithUI(error, "チャンク作成");
            }
          }}
          onUpdateChunk={async (data) => {
            try {
              await chunkData.updateChunk(data);
              showSuccessToast("チャンクを更新しました");
            } catch (error) {
              handleErrorWithUI(error, "チャンク更新");
            }
          }}
          onUpdateChunkCategories={async (
            chunkId: number,
            categoryIds: number[],
          ) => {
            try {
              await chunkData.updateChunkCategories(chunkId, { categoryIds });
              showSuccessToast("チャンクカテゴリを更新しました");
            } catch (error) {
              handleErrorWithUI(error, "チャンクカテゴリ更新");
            }
          }}
          onCreateCategory={async () => {
            // TODO: カテゴリ作成機能の実装
            handleErrorWithUI(
              { message: "カテゴリ作成機能は実装予定です" } as any,
              "カテゴリ作成",
            );
            throw new Error("カテゴリ作成機能は実装予定です");
          }}
          searchTerm={uiState.state.searchTerm}
        />
      )}
    </div>
  );
};

export default ChunkDataTemplate;
