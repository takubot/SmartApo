"use client";

import { Link as LinkIcon } from "lucide-react";
import React from "react";
import { useTemplate } from "../hooks/useTemplate";
import { CodeDisplayModal } from "../ui/list/CodeDisplayModal";
import { DeleteConfirmModal } from "../ui/list/DeleteConfirmModal";
import ChatEntryListDisplay from "../ui/list/ChatEntryListDisplay";

interface EndpointTemplateProps {
  groupId: string;
}

const EndpointTemplate: React.FC<EndpointTemplateProps> = ({ groupId }) => {
  const {
    // データ
    urlList,
    selectedUrls,
    isDataLoading,
    webCount,
    lineCount,

    // 状態
    scriptModalOpen,
    fullChatUrlModalOpen,
    deleteConfirmModalOpen,
    bulkDeleteModalOpen,
    isScriptModalLoading,
    isFullChatUrlModalLoading,
    loading,

    // ターゲット
    deleteTarget,
    scriptContent,
    fullChatUrlContent,
    isLineConfigForScript,
    isLineConfigForFullUrl,

    // アクション
    handleSelectAll,
    handleSelectItem,
    handleCreateClick,
    handleEditClick,
    handleDeleteClick,
    handleBulkDeleteClick,
    handleBulkDeleteConfirm,
    handleScriptClick,
    handleFullChatUrlClick,
    handleDeleteConfirm,
    handleToggleVisibility,

    // モーダル制御
    closeScriptModal,
    closeFullChatUrlModal,
    closeDeleteConfirmModal,
    closeBulkDeleteModal,
  } = useTemplate(groupId);

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <LinkIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                外部チャット管理
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-xs text-default-500">
                <div>総数: {urlList.length}件</div>
                <div>
                  WEB: {webCount}件 / LINE: {lineCount}件
                </div>
              </div>
              <button
                onClick={handleCreateClick}
                className="h-8 px-3 rounded-md bg-primary text-white text-xs font-semibold transition-colors hover:bg-primary-600 flex items-center gap-1.5"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新規URL作成
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツセクション */}
      <div className="flex-1 overflow-auto p-6">
        <ChatEntryListDisplay
          urlList={urlList}
          selectedUrls={selectedUrls}
          isDeleting={loading.isDeleting}
          isBulkDeleting={loading.isBulkDeleting}
          isLoading={isDataLoading}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectItem}
          onEdit={handleEditClick}
          onDeleteConfirm={handleDeleteClick}
          onBulkDelete={handleBulkDeleteClick}
          onScript={handleScriptClick}
          onFullChatUrl={handleFullChatUrlClick}
          onToggleVisibility={handleToggleVisibility}
        />
      </div>

      {/* モーダル */}
      <CodeDisplayModal
        isOpen={scriptModalOpen}
        onClose={closeScriptModal}
        content={scriptContent}
        type={isLineConfigForScript ? "endpoint_url" : "script"}
        isLoading={isScriptModalLoading}
      />

      <CodeDisplayModal
        isOpen={fullChatUrlModalOpen}
        onClose={closeFullChatUrlModal}
        content={fullChatUrlContent}
        type={isLineConfigForFullUrl ? "line_webhook" : "url"}
        isLoading={isFullChatUrlModalLoading}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirmModalOpen || bulkDeleteModalOpen}
        onClose={() => {
          if (deleteConfirmModalOpen) closeDeleteConfirmModal();
          if (bulkDeleteModalOpen) closeBulkDeleteModal();
        }}
        onConfirm={
          deleteConfirmModalOpen ? handleDeleteConfirm : handleBulkDeleteConfirm
        }
        selectedChatEntries={
          deleteConfirmModalOpen && deleteTarget ? [deleteTarget] : []
        }
        isLoading={loading.isDeleting || loading.isBulkDeleting}
      />
    </div>
  );
};

export default EndpointTemplate;
