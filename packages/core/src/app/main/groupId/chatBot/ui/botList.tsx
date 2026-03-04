"use client";

import React from "react";
import { Spinner } from "@heroui/react";
import { Bot } from "lucide-react";
import { BotCard } from "./botCard";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

interface BotListProps {
  botList: BotResponseSchemaType[];
  isGroupMember: boolean;
  isLoading: boolean;
  onEdit: (bot: BotResponseSchemaType) => void | Promise<void>;
  onDelete: (bot: BotResponseSchemaType) => void | Promise<void>;
}

export const BotList: React.FC<BotListProps> = ({
  botList,
  isGroupMember,
  isLoading,
  onEdit,
  onDelete,
}) => {
  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <Spinner size="lg" color="primary" />
          </div>
          <p className="text-gray-600 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  // ボット一覧が存在しない場合の表示
  if (!botList || botList.length === 0) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
            ボットが存在しません
          </div>
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            新しいボットを作成してください
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {botList.map((bot: BotResponseSchemaType) => {
          // ボットのアイコンはbotIconImgGcsPath（署名付きURL）から取得、なければデフォルトアイコンを使用
          const iconUrl = bot.botIconImgGcsPath || "/botIcon/default.ico";

          return (
            <BotCard
              key={bot.botId}
              bot={bot}
              onEdit={
                isGroupMember
                  ? undefined
                  : onEdit
                    ? () => onEdit(bot)
                    : undefined
              }
              onDelete={
                isGroupMember
                  ? undefined
                  : onDelete
                    ? () => onDelete(bot)
                    : undefined
              }
              iconUrl={iconUrl}
            />
          );
        })}
      </div>
    </div>
  );
};
