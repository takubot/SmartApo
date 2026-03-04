import React from "react";
import { ChevronLeft, ChevronRight, PlusCircle, Bot } from "lucide-react";
import ChatSpaceListMolecule from "./ChatSpaceListMolecule";
import type { ChatSpace } from "../types";

type ChatSidebarOrganismProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  isCreatingNewChatSpace: boolean;
  isSubmitting: boolean;
  onCreateNewChatSpace: () => void;
  chatSpaces: ChatSpace[];
  activeChatSpaceId: string | null;
  isChatSpacesLoading: boolean;
  isEditingTitle: boolean;
  editTitle: string;
  deletingChatSpaceId: string | null;
  activeMenuChatSpaceId: string | null;
  isUpdatingTitle: boolean;
  isDeletingChatSpace: boolean;
  onSetActiveChatSpaceId: (chatSpaceId: string) => void;
  onSetEditTitle: (title: string) => void;
  onSetIsEditingTitle: (isEditing: boolean) => void;
  onUpdateTitle: () => void;
  onSetActiveMenuChatSpaceId: (chatSpaceId: string | null) => void;
  onRemoveChatSpace: (chatSpaceId: string) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
};

const ChatSidebarOrganism: React.FC<ChatSidebarOrganismProps> = ({
  isOpen,
  onClose,
  onOpen,
  isCreatingNewChatSpace,
  isSubmitting,
  onCreateNewChatSpace,
  chatSpaces,
  activeChatSpaceId,
  isChatSpacesLoading,
  isEditingTitle,
  editTitle,
  deletingChatSpaceId,
  activeMenuChatSpaceId,
  isUpdatingTitle,
  isDeletingChatSpace,
  onSetActiveChatSpaceId,
  onSetEditTitle,
  onSetIsEditingTitle,
  onUpdateTitle,
  onSetActiveMenuChatSpaceId,
  onRemoveChatSpace,
  menuRef,
}) => {
  return (
    <div
      className={`transition-all duration-300 flex-shrink-0 flex flex-col bg-gray-100 border-r border-gray-300 h-full z-20 ${
        isOpen
          ? "w-full sm:w-40 md:w-48 lg:w-56 min-w-0 sm:min-w-40 opacity-100 visible fixed sm:relative"
          : "w-0 min-w-0 opacity-0 invisible overflow-hidden"
      }`}
    >
      {/* Header */}
      <div className="p-3 sm:p-3 flex flex-col border-b border-gray-300 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="text-sm font-medium text-gray-700">会話</div>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreateNewChatSpace}
              className="p-2 rounded bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="新しい会話を作成"
              title="新しい会話"
              disabled={isCreatingNewChatSpace || isSubmitting}
            >
              {isCreatingNewChatSpace ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : isSubmitting ? (
                <Bot className="animate-pulse h-4 w-4 text-white" />
              ) : (
                <PlusCircle size={16} className="text-white" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded hover:bg-gray-200 touch-friendly flex-shrink-0"
              aria-label="サイドバーを閉じる"
              title="閉じる"
            >
              <ChevronLeft size={16} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`flex flex-col overflow-hidden h-full ${isOpen ? "block" : "hidden"}`}
      >
        <ChatSpaceListMolecule
          chatSpaces={chatSpaces}
          activeChatSpaceId={activeChatSpaceId}
          isLoading={isChatSpacesLoading}
          isEditingTitle={isEditingTitle}
          editTitle={editTitle}
          deletingChatSpaceId={deletingChatSpaceId}
          activeMenuChatSpaceId={activeMenuChatSpaceId}
          isUpdatingTitle={isUpdatingTitle}
          isDeletingChatSpace={isDeletingChatSpace}
          isSubmitting={isSubmitting}
          onSetActiveChatSpaceId={onSetActiveChatSpaceId}
          onSetEditTitle={onSetEditTitle}
          onSetIsEditingTitle={onSetIsEditingTitle}
          onUpdateTitle={onUpdateTitle}
          onSetActiveMenuChatSpaceId={onSetActiveMenuChatSpaceId}
          onRemoveChatSpace={onRemoveChatSpace}
          menuRef={menuRef}
        />
      </div>

      {/* Closed-state opener */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="fixed left-2 top-2 z-30 p-2 bg-primary-500 text-white border border-primary-300 rounded-md shadow-md hover:bg-primary-600 sm:hidden"
          aria-label="サイドバーを開く"
          title="開く"
        >
          <ChevronRight size={16} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default ChatSidebarOrganism;
