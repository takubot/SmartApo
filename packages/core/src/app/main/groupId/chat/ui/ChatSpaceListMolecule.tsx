import React from "react";
import { LoadingScreen } from "../../../../../common/LoadingScreen";
import { MessageCircle, MoreVertical, Pencil, X } from "lucide-react";
import type { ChatSpace } from "../types";

const formatDate = (value?: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

type ChatSpaceListMoleculeProps = {
  chatSpaces: ChatSpace[];
  activeChatSpaceId: string | null;
  isLoading: boolean;
  isEditingTitle: boolean;
  editTitle: string;
  deletingChatSpaceId: string | null;
  activeMenuChatSpaceId: string | null;
  isUpdatingTitle: boolean;
  isDeletingChatSpace: boolean;
  isSubmitting: boolean;
  onSetActiveChatSpaceId: (chatSpaceId: string) => void;
  onSetEditTitle: (title: string) => void;
  onSetIsEditingTitle: (isEditing: boolean) => void;
  onUpdateTitle: () => void;
  onSetActiveMenuChatSpaceId: (chatSpaceId: string | null) => void;
  onRemoveChatSpace: (chatSpaceId: string) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
};

const ChatSpaceListMolecule: React.FC<ChatSpaceListMoleculeProps> = ({
  chatSpaces,
  activeChatSpaceId,
  isLoading,
  isEditingTitle,
  editTitle,
  deletingChatSpaceId,
  activeMenuChatSpaceId,
  isUpdatingTitle,
  isSubmitting,
  onSetActiveChatSpaceId,
  onSetEditTitle,
  onSetIsEditingTitle,
  onUpdateTitle,
  onSetActiveMenuChatSpaceId,
  onRemoveChatSpace,
  menuRef,
}) => {
  if (isLoading) {
    return <LoadingScreen message="読み込み中..." />;
  }

  if (chatSpaces.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">会話がありません</div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <ul className="space-y-1 p-2">
        {chatSpaces.map((chatSpace, index) => {
          const isActive = activeChatSpaceId === chatSpace.chatSpaceId;
          const isDeleting = deletingChatSpaceId === chatSpace.chatSpaceId;
          const isMenuOpen = activeMenuChatSpaceId === chatSpace.chatSpaceId;

          const handleTitleEdit = () => {
            if (isSubmitting || isUpdatingTitle) return;
            onSetActiveChatSpaceId(chatSpace.chatSpaceId);
            onSetEditTitle(chatSpace.title || "");
            onSetIsEditingTitle(true);
            onSetActiveMenuChatSpaceId(null);
          };

          const handleTitleUpdate = () => {
            if (!isUpdatingTitle) {
              onUpdateTitle();
            }
          };

          const handleTitleCancel = () => {
            onSetIsEditingTitle(false);
            onSetEditTitle(chatSpace.title || "");
          };

          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onUpdateTitle();
            } else if (e.key === "Escape") {
              e.preventDefault();
              handleTitleCancel();
            }
          };

          const handleRemoveChatSpace = (e: React.MouseEvent) => {
            e.stopPropagation();
            onRemoveChatSpace(chatSpace.chatSpaceId);
          };

          const isDisabled = isDeleting || (isSubmitting && !isActive);

          return (
            <li
              key={`${chatSpace.chatSpaceId}-${index}`}
              className={`rounded-md relative transition-all duration-200 h-16 flex ${
                isEditingTitle && isActive
                  ? "bg-primary-50 border-2 border-primary-300 shadow-md p-3 mb-3"
                  : isActive
                    ? "bg-primary-50 border-primary-300"
                    : "bg-white hover:bg-gray-50"
              } border border-gray-300 ${isDeleting ? "opacity-70" : ""} ${
                isSubmitting && !isActive ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isDeleting && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-60 z-20 rounded-md">
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">削除中...</span>
                  </div>
                </div>
              )}

              {isSubmitting && !isActive && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-70 z-20 rounded-md"></div>
              )}

              <button
                onClick={() => {
                  if (isDisabled) return;
                  onSetActiveChatSpaceId(chatSpace.chatSpaceId);
                }}
                className={`w-full text-left text-sm flex items-center h-full transition-all duration-200 ${
                  isEditingTitle && isActive ? "p-0" : "p-2 hover:bg-gray-50"
                }`}
                disabled={isDisabled}
              >
                <MessageCircle
                  size={16}
                  className={`mr-2 flex-shrink-0 ${
                    isEditingTitle && isActive ? "hidden" : ""
                  }`}
                />
                <div className="flex-1 min-w-0 overflow-hidden pr-6">
                  {isEditingTitle && isActive ? (
                    <div className="relative w-full py-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => onSetEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleTitleUpdate}
                        className="w-full px-3 py-2 text-base font-medium border-2 border-primary-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed shadow-sm bg-white"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        disabled={isUpdatingTitle}
                        placeholder="タイトルを入力してください"
                        maxLength={100}
                      />
                      {isUpdatingTitle && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                        Enter: 保存 / Esc: キャンセル
                      </div>
                    </div>
                  ) : (
                    <>
                      {chatSpace.title ? (
                        <>
                          <div className="font-medium truncate">
                            {chatSpace.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {formatDate(chatSpace.createdAt)}
                          </div>
                        </>
                      ) : (
                        <div className="font-medium truncate">
                          {formatDate(chatSpace.createdAt)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </button>

              {!(isEditingTitle && isActive) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (isSubmitting) return;
                    onSetActiveMenuChatSpaceId(
                      isMenuOpen ? null : chatSpace.chatSpaceId,
                    );
                  }}
                  className={`absolute top-2 right-2 p-1 text-gray-500 hover:bg-gray-200 rounded-full transition-colors ${
                    isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  aria-label="チャットスペースメニュー"
                  disabled={isDeleting || isSubmitting}
                >
                  <MoreVertical size={14} />
                </button>
              )}

              {isMenuOpen && !isSubmitting && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-8 w-32 bg-white shadow-lg rounded-md border border-gray-200 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={handleTitleEdit}
                    className="w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isUpdatingTitle}
                  >
                    <Pencil size={14} className="mr-2" />
                    <span>
                      {isUpdatingTitle ? "更新中..." : "スペース名を編集"}
                    </span>
                  </button>
                  <button
                    onClick={handleRemoveChatSpace}
                    className="w-full p-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    disabled={isUpdatingTitle}
                  >
                    <X size={14} className="mr-2" />
                    <span>削除</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChatSpaceListMolecule;
