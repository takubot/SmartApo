/* eslint-disable turbo/no-undeclared-env-vars */
import React from "react";
import { Menu, MessageSquare, ChevronDown } from "lucide-react";
import Image from "next/image";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";

type ChatHeaderProps = {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  title?: string;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: Array<{
    id: string;
    name: string;
    chatType?: string;
  }>;
  isLoadingModels?: boolean;
};

const FAVICON_ICON = `/favicon/${
  process.env.NEXT_PUBLIC_FAVICON || "doppel.ico"
}`;

const ChatHeader: React.FC<ChatHeaderProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  title,
  selectedModel,
  onSelectModel,
  availableModels,
  isLoadingModels = false,
}) => {
  const inferChatType = (modelId: string): string => {
    const lower = modelId.toLowerCase();
    if (lower.includes("claude")) return "BOT_ANTHROPIC";
    if (lower.includes("gemini")) return "BOT_GEMINI";
    if (lower.includes("sonar") || lower.includes("perplexity")) {
      return "BOT_PERPLEXITY";
    }
    if (lower.includes("gpt")) return "BOT_OPENAI";
    if (lower.includes("nano") && lower.includes("image")) {
      return "BOT_NANOBANANA";
    }
    if (lower === "rag") return "INTERNAL";
    return "BOT_STANDARD";
  };

  const getIcon = (chatType: string) => {
    const normalized = chatType.toUpperCase();
    switch (normalized) {
      case "BOT_OPENAI":
        return "/botIcon/openai.png";
      case "BOT_ANTHROPIC":
        return "/botIcon/claude.png";
      case "BOT_GEMINI":
        return "/botIcon/gemini.png";
      case "BOT_PERPLEXITY":
        return "/botIcon/perplexity.png";
      case "BOT_NANOBANANA":
        return "/botIcon/nano-banana.png";
      case "INTERNAL":
        return FAVICON_ICON;
      default:
        return "/botIcon/default.png";
    }
  };

  // RAGのみの場合（モデルが1個でRAGのみ）はプルダウンを非表示
  const isRagOnly =
    availableModels.length === 1 && availableModels[0]?.id === "rag";

  const currentModelName =
    availableModels.find((m) => m.id === selectedModel)?.name || selectedModel;
  const selectedModelItem = availableModels.find((m) => m.id === selectedModel);
  const currentChatType =
    selectedModelItem?.chatType || inferChatType(selectedModel);

  return (
    <div className="flex items-center justify-between p-1.5 sm:p-2 bg-gray-50 border-b border-gray-300">
      <div className="flex items-center">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1 mr-2 rounded hover:bg-gray-200 flex-shrink-0 touch-friendly"
            aria-label="サイドバーを開く"
          >
            <Menu size={16} className="sm:w-4 sm:h-4" />
          </button>
        )}
        <div className="flex items-center">
          <div className="w-5 h-5 sm:w-6 sm:h-6 gradient-primary rounded-xl flex items-center justify-center mr-2 shadow-md">
            <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:block">
            {title || "Chat Assistant"}
          </h1>
        </div>
      </div>

      {isRagOnly ? (
        // RAGのみの場合はプルダウンを非表示にして、独自モデルのみを表示
        <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700">
          <Image
            src={getIcon("INTERNAL")}
            alt="独自モデル"
            width={20}
            height={20}
            className="rounded-sm object-contain"
          />
          <span>独自モデル</span>
        </div>
      ) : (
        <Dropdown placement="bottom-end">
          <DropdownTrigger>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <Image
                src={getIcon(currentChatType)}
                alt={currentModelName}
                width={20}
                height={20}
                className="rounded-sm object-contain"
              />
              <span>{currentModelName}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </DropdownTrigger>
          <DropdownMenu
            aria-label="モデル選択"
            selectedKeys={[selectedModel]}
            selectionMode="single"
            onAction={(key) => onSelectModel(String(key))}
            className="w-56"
          >
            {[
              ...(isLoadingModels
                ? [
                    <DropdownItem key="loading" isDisabled>
                      モデル一覧を取得中...
                    </DropdownItem>,
                  ]
                : []),
              ...availableModels.map((model) => (
                <DropdownItem key={model.id}>
                  <div className="flex items-center gap-2">
                    <Image
                      src={getIcon(model.chatType || inferChatType(model.id))}
                      alt={model.name}
                      width={20}
                      height={20}
                      className="rounded-sm object-contain"
                    />
                    <span>{model.name}</span>
                  </div>
                </DropdownItem>
              )),
            ]}
          </DropdownMenu>
        </Dropdown>
      )}
    </div>
  );
};

export default ChatHeader;
