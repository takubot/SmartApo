"use client";

import { Avatar, Card, CardBody } from "@heroui/react";
import React from "react";
import ReactMarkdown from "react-markdown";
import {
  markdownComponents,
  reactMarkdownPlugins,
  markdownStyles,
} from "@common/reactMarkdown";
import type { Message } from "../../../types";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import ChatReferenceListMolecule from "./ChatReferenceListMolecule";
import ChatEvaluation from "../feedback/ChatEvaluation";
import StreamingMarkdown from "./StreamingMarkdown";
import { getAssistantIconSrc } from "../shared/botIconUtils";

interface ChatMessageProps {
  message: Message;
  showReferenceInfo: boolean;
  selectedBot?: BotResponseSchemaType | null;
  botList: BotResponseSchemaType[];
  iconMap: Record<number, string>;
  headerColor?: string;
  headerTextColor?: string;
  onEvaluate?: (chatLogId: number, evaluation: "GOOD" | "BAD") => void;
  onFeedback?: (chatLogId: number, feedback: string) => void;
}

export const ChatMessage = React.memo(
  ({
    message,
    showReferenceInfo,
    selectedBot,
    botList,
    iconMap,
    headerColor,
    headerTextColor,
    onEvaluate,
  }: ChatMessageProps) => {
    const isOwn = message.isOwnMessage;
    const timestampText = message.timestamp
      ? new Date(message.timestamp).toLocaleString()
      : undefined;
    const hasContent =
      typeof message.content === "string" && message.content.trim().length > 0;

    const messageBot = React.useMemo(() => {
      if (message.botId && botList.length > 0) {
        return botList.find((bot) => bot.botId === message.botId);
      }
      return null;
    }, [message.botId, botList]);

    const displayBot = React.useMemo(() => {
      if (messageBot) return messageBot;
      if (message.botId && botList.length > 0) {
        const foundBot = botList.find((bot) => bot.botId === message.botId);
        if (foundBot) return foundBot;
      }
      return selectedBot || (botList.length > 0 ? botList[0] : null);
    }, [messageBot, message.botId, selectedBot, botList]);

    const hasReferenceData = React.useMemo(() => {
      if (
        !message.fileReferenceLinkJson ||
        typeof message.fileReferenceLinkJson !== "object"
      ) {
        return false;
      }
      const fileCount = Array.isArray(message.fileReferenceLinkJson.files)
        ? message.fileReferenceLinkJson.files.length
        : 0;
      const linkCount = Array.isArray(message.fileReferenceLinkJson.links)
        ? message.fileReferenceLinkJson.links.length
        : 0;
      return fileCount + linkCount > 0;
    }, [message.fileReferenceLinkJson]);

    return (
      <div
        className={`flex gap-1 sm:gap-2 p-1 sm:p-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isOwn && displayBot && (
          <Avatar
            src={getAssistantIconSrc({
              bot: displayBot,
              iconMap,
              botList,
              isHumanHandoff: false,
            })}
            alt="ボット"
            className="flex-shrink-0"
            size="sm"
          />
        )}
        <div
          className={
            isOwn
              ? "ml-auto max-w-[90%] sm:max-w-[75%] md:max-w-[65%] self-end items-end text-right"
              : "max-w-[95%] sm:max-w-[80%] md:max-w-[70%] text-left"
          }
        >
          {!message.isStreaming && !hasContent ? null : (
            <Card
              className={
                isOwn
                  ? "inline-block border-0 shadow-sm rounded-2xl"
                  : "inline-block border border-gray-200 shadow-sm rounded-2xl bg-white"
              }
              style={{
                backgroundColor: isOwn ? headerColor || "#3b82f6" : undefined,
              }}
            >
              <CardBody className="px-3 py-2 sm:px-4 sm:py-2.5">
                <div
                  className={`text-[13px] sm:text-[14px] md:text-[15px] lg:text-[16px] ${isOwn ? "" : "text-gray-900"} break-words leading-relaxed`}
                  style={{
                    color: isOwn ? headerTextColor || "#ffffff" : undefined,
                  }}
                >
                  {message.isStreaming ? (
                    <StreamingMarkdown
                      text={message.content}
                      isStreaming
                      className="markdown-content"
                      style={{
                        color: isOwn ? headerTextColor || "#ffffff" : undefined,
                      }}
                    />
                  ) : (
                    <>
                      <style>{markdownStyles}</style>
                      <ReactMarkdown
                        remarkPlugins={reactMarkdownPlugins}
                        components={markdownComponents}
                        className="markdown-content"
                      >
                        {(message.content || "").replace(/\n+$/, "")}
                      </ReactMarkdown>
                    </>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* 日付と評価アイコン（横並び） */}
          {!message.isStreaming && !hasContent ? null : (
            <div
              className={`flex items-center gap-2 mt-1 ${
                isOwn ? "justify-end" : "justify-start"
              }`}
            >
              {timestampText && (
                <p className="text-xs sm:text-sm text-gray-500">
                  {timestampText}
                </p>
              )}

              {/* 評価アイコン（assistantのみ） */}
              {!isOwn && message.chatLogId && (
                <ChatEvaluation
                  evaluation={message.evaluation ?? null}
                  onEvaluate={(val) => onEvaluate?.(message.chatLogId!, val)}
                />
              )}
            </div>
          )}

          {showReferenceInfo && hasReferenceData && (
            <div className="mt-2">
              <ChatReferenceListMolecule
                fileReferenceLinkJson={message.fileReferenceLinkJson}
              />
            </div>
          )}
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";

// メモ化用の比較関数
export const ChatMessageMemo = React.memo(
  ChatMessage,
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.botId === nextProps.message.botId &&
      prevProps.message.chatLogId === nextProps.message.chatLogId &&
      prevProps.message.evaluation === nextProps.message.evaluation &&
      (prevProps.message.fileReferenceLinkJson?.files?.length || 0) ===
        (nextProps.message.fileReferenceLinkJson?.files?.length || 0) &&
      (prevProps.message.fileReferenceLinkJson?.links?.length || 0) ===
        (nextProps.message.fileReferenceLinkJson?.links?.length || 0) &&
      prevProps.showReferenceInfo === nextProps.showReferenceInfo &&
      prevProps.selectedBot?.botId === nextProps.selectedBot?.botId &&
      prevProps.botList.length === nextProps.botList.length &&
      prevProps.headerColor === nextProps.headerColor &&
      prevProps.headerTextColor === nextProps.headerTextColor &&
      prevProps.message.isStreaming === nextProps.message.isStreaming
    );
  },
);
