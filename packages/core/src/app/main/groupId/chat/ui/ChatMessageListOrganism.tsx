"use client";
import React from "react";
import ChatMessageMolecule from "./ChatMessageMolecule";
import type { Message } from "../types";

const inferChatTypeFromModel = (model?: string): string => {
  const lower = (model || "").toLowerCase();
  if (lower === "rag") return "INTERNAL";
  if (lower.includes("claude")) return "BOT_ANTHROPIC";
  if (lower.includes("gemini")) return "BOT_GEMINI";
  if (lower.includes("sonar") || lower.includes("perplexity")) {
    return "BOT_PERPLEXITY";
  }
  if (lower.includes("gpt")) return "BOT_OPENAI";
  if (lower.includes("nano") && lower.includes("image")) {
    return "BOT_NANOBANANA";
  }
  return "BOT_STANDARD";
};

const getChatTypeIconPath = (chatType?: string): string | undefined => {
  switch ((chatType || "").toUpperCase()) {
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
      return "/botIcon/default.ico";
    default:
      return undefined;
  }
};

type Props = {
  messages: Message[];
  isLoading: boolean;
  iconMap: Record<number, string>;
  modelIconMap?: Record<string, string>;
  onEvaluate?: (chatHistoryId: number, evaluation: "GOOD" | "BAD") => void;
  onFeedback?: (chatHistoryId: number, feedback: string) => void;
  loadingFileId?: number | null;
  onOpenFile?: (fileId: number) => void;
};

const ChatMessageListOrganism: React.FC<Props> = ({
  messages,
  isLoading,
  iconMap,
  modelIconMap = {},
  onEvaluate,
  onFeedback,
  loadingFileId,
  onOpenFile,
}) => {
  return (
    <div className="w-full space-y-3 sm:space-y-4 px-2 sm:px-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-500 text-sm sm:text-base">
            メッセージはありません
          </p>
        </div>
      )}

      {messages.map((message) => {
        // ボットIDの安全な処理
        const botId =
          typeof message.botId === "number"
            ? message.botId
            : typeof message.botId === "string"
              ? parseInt(message.botId)
              : null;

        const messageChatType =
          (message as Message & { chatType?: string }).chatType ||
          inferChatTypeFromModel(message.model);

        // アイコンの優先順位:
        // RAGモデルの場合: botId > modelIconMap > default
        // その他モデルの場合: chatType > modelIconMap > botId > default
        const chatTypeIcon = getChatTypeIconPath(messageChatType);
        const isRagModel =
          messageChatType === "INTERNAL" || message.model === "rag";

        const modelIcon =
          message.model && modelIconMap && modelIconMap[message.model]
            ? modelIconMap[message.model]
            : undefined;
        const botIcon = botId && iconMap[botId] ? iconMap[botId] : undefined;

        // RAGモデルの場合はbotIconを優先、それ以外はproviderIconを優先
        const botIconUrl = isRagModel
          ? botIcon || modelIcon || "/botIcon/default.ico"
          : chatTypeIcon || modelIcon || botIcon || "/botIcon/default.ico";

        return (
          <ChatMessageMolecule
            key={message.id}
            message={message}
            botIconUrl={botIconUrl}
            onEvaluate={onEvaluate}
            onFeedback={onFeedback}
            loadingFileId={loadingFileId}
            onOpenFile={onOpenFile}
          />
        );
      })}
    </div>
  );
};

export default ChatMessageListOrganism;
