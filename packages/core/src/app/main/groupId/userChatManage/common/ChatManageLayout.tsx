"use client";

import React, { ReactNode, useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  LayoutGrid,
  UserCircle2,
  Bot,
  Headset,
  PanelLeft,
  X,
} from "lucide-react";
import { Input, Button, Chip, cn } from "@heroui/react";
import { getHandoffUiPresentation } from "./handoffMode";

interface ChatManageLayoutProps {
  title: string;
  subtitle: string;
  headerIcon: ReactNode;

  // Sidebar props
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  isListLoading: boolean;
  userList: ReactNode;
  noUsersFoundMessage?: string;

  // Header Actions
  onRefresh: () => void;
  responseMode?: string | null;
  friendChatStatus?: string | null;
  isSwitchingResponseMode?: boolean;
  onToggleResponseMode?: () => void | Promise<void>;

  // Main Content props
  selectedUser: any;
  userDetailHeader: ReactNode;
  tabs: ReactNode;
  content: ReactNode;
  footer?: ReactNode;
  emptyStateIcon?: ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export const ChatManageLayout = ({
  title,
  subtitle,
  headerIcon,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  isListLoading,
  userList,
  noUsersFoundMessage = "ユーザーが見つかりません",
  onRefresh,
  responseMode,
  friendChatStatus,
  isSwitchingResponseMode = false,
  onToggleResponseMode,
  selectedUser,
  userDetailHeader,
  tabs,
  content,
  footer,
  emptyStateIcon = <LayoutGrid size={48} className="text-default-200" />,
  emptyStateTitle = "ユーザーを選択してください",
  emptyStateDescription = "左のリストから管理・分析したいユーザーを選択してください",
}: ChatManageLayoutProps) => {
  const modeUi = getHandoffUiPresentation(responseMode, friendChatStatus);
  const isHumanMode = modeUi.isHumanMode;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (selectedUser) {
      setIsMobileSidebarOpen(false);
    }
  }, [selectedUser]);

  return (
    <div className="user-chat-manage-tone h-full w-full flex flex-col bg-[#F8F9FB] overflow-hidden text-default-900">
      {/* プレミアム・固定ヘッダー */}
      <div className="flex-shrink-0 sticky top-0 bg-white border-b border-divider/50 shadow-sm z-20">
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="flat"
              radius="full"
              isIconOnly
              className="md:hidden bg-default-50"
              onPress={() => setIsMobileSidebarOpen((prev) => !prev)}
            >
              {isMobileSidebarOpen ? <X size={16} /> : <PanelLeft size={16} />}
            </Button>
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              {headerIcon}
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">
                {title}
              </h1>
              <p className="text-[10px] text-default-600 font-bold mt-1.5 uppercase tracking-widest">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block rounded-xl border border-primary/15 bg-primary/5 px-3 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-default-500">
                応答モード
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Chip
                  size="sm"
                  radius="sm"
                  variant="flat"
                  color={modeUi.tone}
                  className="h-4 text-[8px] font-black px-1.5"
                >
                  {modeUi.shortLabel}
                </Chip>
                <p className="text-[11px] font-bold text-primary leading-none">
                  {modeUi.modeLabel}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant={isHumanMode ? "flat" : "solid"}
              color={isHumanMode ? "warning" : "primary"}
              radius="full"
              className="font-bold px-3"
              onPress={onToggleResponseMode}
              isLoading={isSwitchingResponseMode}
              disabled={!selectedUser || !onToggleResponseMode}
              startContent={
                isHumanMode ? <Bot size={14} /> : <Headset size={14} />
              }
            >
              <span className="hidden sm:inline">
                {isHumanMode ? "AI自動対応に戻す" : "有人対応に切り替える"}
              </span>
              <span className="sm:hidden">
                {isHumanMode ? "AIへ戻す" : "有人対応"}
              </span>
            </Button>

            <Button
              size="sm"
              variant="flat"
              radius="full"
              isIconOnly
              onPress={onRefresh}
              disabled={isListLoading}
              className="bg-default-50 hover:bg-default-100"
            >
              <RefreshCw
                size={16}
                className={cn(
                  "text-default-500",
                  isListLoading && "animate-spin",
                )}
              />
            </Button>
          </div>
        </div>

        {selectedUser && (
          <div className="px-3 sm:px-6 py-1 border-t border-divider/30">
            <div className="overflow-x-auto scrollbar-hide">{tabs}</div>
          </div>
        )}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="ユーザー一覧を閉じる"
            className="md:hidden absolute inset-0 z-20 bg-black/35"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* 左サイドバー: ユーザーリスト */}
        <div
          className={cn(
            "absolute md:static inset-y-0 left-0 z-30 md:z-10 w-[min(85vw,20rem)] md:w-72 border-r border-divider/50 bg-white flex flex-col min-h-0 transition-transform duration-200",
            isMobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0",
          )}
        >
          <div className="flex-shrink-0 p-3 border-b border-divider/30">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onValueChange={onSearchChange}
              startContent={<Search size={14} className="text-default-400" />}
              size="sm"
              variant="flat"
              radius="lg"
              classNames={{
                inputWrapper:
                  "bg-default-50 hover:bg-default-100 transition-colors h-8",
                input: "text-xs font-bold placeholder:text-default-300",
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1 scrollbar-hide">
            {isListLoading ? (
              <div className="flex flex-col gap-2 p-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={`user-list-skeleton-${i}`}
                    className="h-16 bg-default-50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : !userList ? (
              <div className="text-center py-20">
                <UserCircle2
                  size={40}
                  className="mx-auto text-default-100 mb-3"
                />
                <p className="text-xs font-black text-default-500 uppercase tracking-widest">
                  {noUsersFoundMessage}
                </p>
              </div>
            ) : (
              userList
            )}
          </div>
        </div>

        {/* メインコンテンツ: 詳細表示 */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden bg-[#F8F9FB]">
          {selectedUser ? (
            <>
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {userDetailHeader && (
                  <div className="flex-shrink-0 bg-white border-b border-divider/40 px-3 sm:px-5 py-2.5">
                    {userDetailHeader}
                  </div>
                )}
                <div className="flex-1 overflow-hidden">{content}</div>
                {footer && (
                  <div className="flex-shrink-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)]">
                    <div className="max-w-4xl mx-auto w-full px-3 sm:px-4 py-2.5 sm:py-3">
                      {footer}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center animate-in fade-in zoom-in duration-700">
                <div className="w-24 h-24 bg-[#F8F9FB] rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  {emptyStateIcon}
                </div>
                <h3 className="text-xl font-black text-default-800 tracking-tight mb-2">
                  {emptyStateTitle}
                </h3>
                <p className="text-xs text-default-400 font-bold uppercase tracking-widest max-w-[240px] mx-auto leading-relaxed">
                  {emptyStateDescription}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .user-chat-manage-tone .font-black {
          font-weight: 700 !important;
        }
        .user-chat-manage-tone .tracking-widest {
          letter-spacing: 0.12em !important;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default ChatManageLayout;
