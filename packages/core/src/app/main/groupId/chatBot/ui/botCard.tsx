"use client";

import {
  DocumentIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Card, CardBody, CardFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Tooltip } from "@heroui/react";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import React from "react";
import { PERMISSION_LEVEL_LABELS, type PermissionLevel } from "../types";

interface BotCardProps {
  bot: BotResponseSchemaType;
  onEdit?: () => void;
  onDelete?: () => void;
  iconUrl?: string;
}

export const BotCard: React.FC<BotCardProps> = ({
  bot,
  onEdit,
  onDelete,
  iconUrl,
}) => {
  // アイコンが無い場合はデフォルト
  const finalIconUrl = iconUrl || "/botIcon/default.ico";

  // 権限レベルに応じた色とアイコンを設定
  const getPermissionChipColor = (level: string) => {
    switch (level) {
      case "GROUP_OWNER":
        return "danger";
      case "GROUP_MEMBER":
        return "success";
      default:
        return "default";
    }
  };

  // 権限レベルの表示名を取得
  const getPermissionLabel = (level: string) => {
    return PERMISSION_LEVEL_LABELS[level as PermissionLevel] || level;
  };

  return (
    <Card className="relative shadow-md">
      <CardBody className="p-3 sm:p-4">
        <div className="flex items-start gap-3 mb-3">
          <img
            src={finalIconUrl}
            alt="Bot Icon"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-default-200 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base sm:text-lg mb-1 truncate">
              {bot.botName}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Chip
                color={getPermissionChipColor(
                  bot.botPermissionLevel || "GROUP_MEMBER",
                )}
                variant="flat"
                size="sm"
                startContent={<ShieldCheckIcon className="w-3 h-3" />}
                className="text-xs"
              >
                {getPermissionLabel(bot.botPermissionLevel || "GROUP_MEMBER")}
              </Chip>
              {(bot as any)?.isWebSearchBot && (
                <Chip
                  color="warning"
                  variant="flat"
                  size="sm"
                  className="text-xs"
                >
                  Web検索
                </Chip>
              )}
            </div>
          </div>
        </div>
        <Divider className="my-2" />
        <div className="space-y-2">
          <p className="text-sm line-clamp-2 sm:line-clamp-3">
            {bot.botDescription}
          </p>
          <p className="text-xs sm:text-sm text-default-400 line-clamp-2 sm:line-clamp-3">
            {(bot as any).botSystemText || ""}
          </p>
          <div className="text-xs sm:text-sm text-default-500 flex items-center gap-1">
            <DocumentIcon className="w-3 h-3" />
            関連ファイル数: {bot.fileLen || 0}
          </div>
        </div>
      </CardBody>
      <CardFooter className="flex justify-end gap-1 sm:gap-2 p-2 sm:p-3">
        <Tooltip
          content={bot.canEdit && onEdit ? "編集" : "編集権限がありません"}
        >
          <Button
            color="primary"
            variant="light"
            isIconOnly
            onPress={onEdit}
            isDisabled={!bot.canEdit || !onEdit}
            size="sm"
          >
            <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Tooltip>
        <Tooltip
          content={bot.canDelete && onDelete ? "削除" : "削除権限がありません"}
          color={bot.canDelete && onDelete ? "danger" : "default"}
        >
          <Button
            color="danger"
            variant="light"
            isIconOnly
            onPress={onDelete}
            isDisabled={!bot.canDelete || !onDelete}
            size="sm"
          >
            <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </Tooltip>
      </CardFooter>
    </Card>
  );
};
