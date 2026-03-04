"use client";

import React, { useCallback, useEffect } from "react";

// Unified Hook
import { useTemplate } from "../hooks/useTemplate";

// UI Components
import { LoadingScreen } from "../../../../../common/LoadingScreen";
import BotSelectModalMolecule from "../ui/BotSelectModalMolecule";
import ChatHeader from "../ui/ChatHeader";
import ChatInputOrganism from "../ui/ChatInputOrganism";
import ChatMessageListOrganism from "../ui/ChatMessageListOrganism";
import ChatSidebarOrganism from "../ui/ChatSidebarOrganism";

const ChatTemplateComponent: React.FC<{
  groupId: string;
  chatTitle?: string;
}> = ({ groupId, chatTitle }) => {
  // Unified hook
  const t = useTemplate(groupId);

  // メッセージ更新時のスクロール制御
  useEffect(() => {
    const timer = setTimeout(() => {
      t.scrollToBottom();
    }, 10);
    return () => clearTimeout(timer);
  }, [t.messages.length, t]);

  // エラー処理
  useEffect(() => {
    if (!t.chatSpacesError) return;
    const message =
      (typeof t.chatSpacesError === "object" &&
      t.chatSpacesError &&
      "message" in t.chatSpacesError
        ? (t.chatSpacesError as { message?: string }).message
        : undefined) ||
      "会話の取得中にエラーが発生しました。しばらく時間をおいてから再試行してください。";
    t.setError(message);
  }, [t.chatSpacesError, t]);

  // メインエリアクリック時のモバイル用サイドバークローズ
  const handleMainClick = useCallback(() => {
    if (t.isMobile && t.isSidebarOpen) {
      t.closeSidebar();
    }
  }, [t]);

  // 入力エリアのクリック伝播停止
  const stopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  // 追加のエラー処理は上記の useEffect で対応

  // 初期化中のローディング表示
  if (t.isCreatingInitialChatSpace) {
    return <LoadingScreen message="会話スペースを初期化しています..." />;
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* メインコンテンツ */}
      <div className="flex flex-1 min-h-0">
        {/* モバイル用オーバーレイ */}
        {t.isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-10 sm:hidden"
            onClick={t.closeSidebar}
            aria-label="サイドバーを閉じる"
          />
        )}

        {/* 会話リストサイドバー */}
        <ChatSidebarOrganism
          isOpen={t.isSidebarOpen}
          onClose={t.closeSidebar}
          onOpen={t.openSidebar}
          isCreatingNewChatSpace={t.isCreatingNewChatSpace}
          isSubmitting={t.isSubmitting}
          onCreateNewChatSpace={t.createNewChatSpace}
          chatSpaces={t.chatSpaces}
          activeChatSpaceId={t.activeChatSpaceId}
          isChatSpacesLoading={t.isChatSpacesLoading}
          isEditingTitle={t.isEditingTitle}
          editTitle={t.editTitle}
          deletingChatSpaceId={t.deletingChatSpaceId}
          activeMenuChatSpaceId={t.activeMenuChatSpaceId}
          isUpdatingTitle={t.isUpdatingTitle}
          isDeletingChatSpace={t.isDeletingChatSpace}
          onSetActiveChatSpaceId={t.setActiveChatSpaceId}
          onSetEditTitle={t.setEditTitle}
          onSetIsEditingTitle={t.setIsEditingTitle}
          onUpdateTitle={t.updateTitle}
          onSetActiveMenuChatSpaceId={t.setActiveMenuChatSpaceId}
          onRemoveChatSpace={t.removeChatSpace}
          menuRef={t.menuRef}
        />

        {/* チャットエリア */}
        <div
          className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden"
          onClick={handleMainClick}
        >
          {/* チャットヘッダー */}
          <ChatHeader
            isSidebarOpen={t.isSidebarOpen}
            onToggleSidebar={t.toggleSidebar}
            title={chatTitle}
            selectedModel={t.selectedModel}
            onSelectModel={t.setSelectedModel}
            availableModels={t.availableModels}
            isLoadingModels={t.isAIModelsLoading}
          />

          {/* チャットメッセージ一覧 */}
          <div
            ref={t.chatContainerRef}
            className="flex-1 p-2 sm:p-4 overflow-y-auto"
            onScroll={t.handleUserScroll}
          >
            {t.isLoadingHistory ? (
              <LoadingScreen message="会話履歴を読み込んでいます..." />
            ) : (
              <ChatMessageListOrganism
                messages={t.messages}
                iconMap={t.iconMap}
                modelIconMap={t.modelIconMap}
                isLoading={t.isSubmitting}
                onEvaluate={t.sendEvaluation}
                onFeedback={t.sendFeedback}
                loadingFileId={t.loadingFileId}
                onOpenFile={t.openFile}
              />
            )}
            <div ref={t.bottomRef} />
          </div>

          {/* 入力エリア */}
          <div
            className="border-t border-gray-300 p-1 sm:p-1.5 bg-white pb-[env(safe-area-inset-bottom)]"
            onClick={stopPropagation}
          >
            <ChatInputOrganism
              inputText={t.inputText}
              setInputText={t.setInputText}
              handleSubmit={t.handleSubmit}
              isSubmitting={t.isSubmitting}
              isLoading={t.isLoadingHistory}
              botList={t.botList}
              selectedBotId={t.selectedBotId}
              setIsBotSelectModalOpen={t.openBotSelectModal}
              isReferenceLinkDisplay={t.isReferenceLinkDisplay}
              setIsReferenceLinkDisplay={t.setIsReferenceLinkDisplay}
              // RAGモード以外ではボット選択や参照リンク表示オプションを無効化・非表示にする
              isRagMode={t.selectedModel === "rag"}
              attachedFiles={t.attachedFiles}
              onFilesChange={t.setAttachedFiles}
              canUploadFile={t.canUploadFileForSelectedModel}
              maxUploadBytes={t.maxUploadBytesForSelectedModel}
              supportedExtensions={t.supportedExtensionsForSelectedModel}
            />
          </div>
        </div>

        {/* Bot選択モーダル */}
        {t.isBotSelectModalOpen && (
          <BotSelectModalMolecule
            isOpen={t.isBotSelectModalOpen}
            onClose={t.closeBotSelectModal}
            botList={t.botList}
            iconMap={t.iconMap}
            selectedBotId={t.selectedBotId}
            setSelectedBotId={(botId) =>
              t.selectBot(
                typeof botId === "function" ? botId(t.selectedBotId) : botId,
              )
            }
          />
        )}
      </div>
    </div>
  );
};

const ChatTemplate = React.memo(ChatTemplateComponent);

export default ChatTemplate;
