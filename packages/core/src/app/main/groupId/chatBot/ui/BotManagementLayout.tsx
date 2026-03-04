"use client";

import React from "react";
import { Button } from "@heroui/react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Bot } from "lucide-react";
import { Sparkles } from "lucide-react";

interface BotManagementLayoutProps {
  isGroupMember: boolean;
  onOpenCreateModal: () => void;
  onOpenCreateFromTemplateModal: () => void;
  hasTemplates: boolean;
}

export const BotManagementLayout: React.FC<BotManagementLayoutProps> = ({
  isGroupMember,
  onOpenCreateModal,
  onOpenCreateFromTemplateModal,
  hasTemplates,
}) => {
  return (
    <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-foreground">
              チャットボット
              {isGroupMember && (
                <span className="ml-2 text-xs text-default-500">
                  （閲覧のみ）
                </span>
              )}
            </h1>
          </div>
          {!isGroupMember && (
            <div className="flex items-center gap-2">
              {hasTemplates && (
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Sparkles className="w-4 h-4" />}
                  onPress={onOpenCreateFromTemplateModal}
                  size="sm"
                >
                  テンプレから作成
                </Button>
              )}
              <Button
                color="primary"
                startContent={<PlusIcon className="w-4 h-4" />}
                onPress={onOpenCreateModal}
                size="sm"
              >
                新規作成
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
