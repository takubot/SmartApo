"use client";

import React from "react";
import { useTemplate } from "../hooks/useTemplate";
import { BotManagementLayout } from "../ui/BotManagementLayout";
import { BotDeleteModal } from "../ui/botDeleteModal";
import { BotList } from "../ui/botList";
import { BotModal } from "../ui/botModal";
import { BotTemplateCreateModal } from "../ui/botTemplateCreateModal";

const BotManagementTemplate: React.FC = () => {
  const t = useTemplate();

  // エラー表示
  if (!t.isGroupIdValid) {
    return (
      <div className="p-3 sm:p-6 text-red-500 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-bold mb-2">エラー</h2>
          <p className="text-sm sm:text-base">
            グループIDが不正です。URLを確認してください。
          </p>
        </div>
      </div>
    );
  }

  // ボット一覧のエラー表示
  if (t.botListError) {
    return (
      <div className="p-3 sm:p-6 text-red-500 text-center">
        <div className="max-w-md mx-auto">
          <h2 className="text-lg font-bold mb-2">エラー</h2>
          <p className="text-sm sm:text-base">
            ボット一覧の取得に失敗しました。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダー部分 */}
      <BotManagementLayout
        isGroupMember={t.isGroupMember}
        onOpenCreateModal={t.openCreateModal}
        onOpenCreateFromTemplateModal={t.openTemplateCreateModal}
        hasTemplates={t.hasTemplates}
      />

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* ボット一覧表示 */}
        <BotList
          botList={t.botList}
          isGroupMember={t.isGroupMember}
          isLoading={t.isBotListLoading}
          onEdit={t.openEditModal}
          onDelete={t.openDeleteModal}
        />
      </div>

      {/* モーダル管理 */}
      {!t.isGroupMember && (
        <>
          {/* テンプレから作成モーダル */}
          <BotTemplateCreateModal
            isOpen={t.isTemplateCreateModalOpen}
            onClose={t.closeTemplateCreateModal}
            onCreate={t.handleCreateFromTemplate}
            refreshBotList={t.refreshBotList}
            templates={t.templates}
            isTemplatesLoading={t.isTemplatesLoading}
            templatesError={t.templatesError}
          />

          {/* 作成モーダル */}
          <BotModal
            isOpen={t.isCreateModalOpen}
            onClose={t.closeCreateModal}
            userPermissionLevel={t.userPermissionLevel}
            refreshBotList={t.refreshBotList}
          />

          {/* 編集モーダル */}
          <BotModal
            key={t.editTargetBot?.botId ?? "new"}
            isOpen={t.isEditModalOpen}
            bot={t.editTargetBot}
            onClose={t.closeEditModal}
            userPermissionLevel={t.userPermissionLevel}
            refreshBotList={t.refreshBotList}
          />

          {/* 削除モーダル */}
          <BotDeleteModal
            isOpen={t.isDeleteModalOpen}
            targetBot={t.botToDelete}
            onClose={t.closeDeleteModal}
          />
        </>
      )}
    </div>
  );
};

export default BotManagementTemplate;
