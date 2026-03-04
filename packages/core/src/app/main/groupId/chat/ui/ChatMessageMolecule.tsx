"use client";

import React from "react";
import {
  Avatar,
  Card,
  CardBody,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Textarea,
} from "@heroui/react";
import ReactMarkdown from "react-markdown";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  markdownStyles,
  markdownComponents,
  createMarkdownComponents,
  reactMarkdownPlugins,
} from "../../../../../common/reactMarkdown";
import type { Message } from "../types";
import ChatReferenceListMolecule from "./ChatReferenceListMolecule";

type Props = {
  message: Message;
  botIconUrl?: string;
  onEvaluate?: (chatHistoryId: number, evaluation: "GOOD" | "BAD") => void;
  onFeedback?: (chatHistoryId: number, feedback: string) => void;
  loadingFileId?: number | null;
  onOpenFile?: (fileId: number) => void;
};

const ChatEvaluation = ({
  evaluation,
  onEvaluate,
  disabled,
}: {
  evaluation: "GOOD" | "BAD" | null;
  onEvaluate: (val: "GOOD" | "BAD") => void;
  disabled?: boolean;
}) => {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`p-1 rounded-full transition ${evaluation === "GOOD" ? "text-green-600 bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"}`}
        disabled={disabled}
        onClick={() => onEvaluate("GOOD")}
        aria-label="good"
      >
        <ThumbsUp size={14} />
      </button>
      <button
        type="button"
        className={`p-1 rounded-full transition ${evaluation === "BAD" ? "text-red-600 bg-red-50" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
        disabled={disabled}
        onClick={() => onEvaluate("BAD")}
        aria-label="bad"
      >
        <ThumbsDown size={14} />
      </button>
    </div>
  );
};

const ChatMessageMolecule: React.FC<Props> = ({
  message,
  botIconUrl,
  onEvaluate,
  onFeedback,
  loadingFileId,
  onOpenFile,
}) => {
  const [evaluation, setEvaluation] = React.useState<"GOOD" | "BAD" | null>(
    message.evaluation ?? null,
  );
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);

  React.useEffect(() => {
    setEvaluation(message.evaluation ?? null);
  }, [message.evaluation]);

  const references = React.useMemo(() => {
    if (!Array.isArray(message.fileInfo)) return [];
    return message.fileInfo
      .filter((fi) => fi && typeof fi.fileId === "number")
      .map((fi) => ({
        fileId: fi.fileId,
        fileName: fi.fileName || `ファイル(ID: ${fi.fileId})`,
        shortDescription: fi.shortDescription || "ファイル情報",
        relevantPages: Array.isArray(fi.relevantPages) ? fi.relevantPages : [],
      }));
  }, [message.fileInfo]);

  const { referenceLinks, citations } = React.useMemo(() => {
    if (!Array.isArray(message.referenceLinkInfo)) {
      return { referenceLinks: [], citations: [] as string[] };
    }
    const citationLinks = message.referenceLinkInfo.filter(
      (link) => link.referenceLinkId < 0,
    );
    const normalLinks = message.referenceLinkInfo.filter(
      (link) => link.referenceLinkId > 0,
    );
    return {
      referenceLinks: normalLinks,
      citations: citationLinks
        .sort((a, b) => a.referenceLinkId - b.referenceLinkId)
        .map((link) => link.linkUrl)
        .filter((url): url is string => Boolean(url)),
    };
  }, [message.referenceLinkInfo]);

  const hasText =
    typeof message.text === "string" && message.text.trim().length > 0;
  const hasStatus =
    typeof message.status === "string" && message.status.trim().length > 0;
  const hasAuxContent =
    !!message.generatedImageSignedUrl ||
    references.length > 0 ||
    referenceLinks.length > 0 ||
    citations.length > 0;
  const shouldRenderCard = hasText || hasStatus;
  const shouldRenderMessage = shouldRenderCard || hasAuxContent;

  if (!shouldRenderMessage) {
    return null;
  }

  const handleEvaluate = async (newEvaluation: "GOOD" | "BAD") => {
    if (!message.chatHistoryId || !onEvaluate) return;
    setEvaluation(newEvaluation);
    if (newEvaluation === "BAD") {
      setIsFeedbackModalOpen(true);
    } else {
      setIsFeedbackModalOpen(false);
      setFeedbackText("");
    }
    try {
      await onEvaluate(message.chatHistoryId, newEvaluation);
    } catch {
      setEvaluation(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!message.chatHistoryId || !onFeedback || !feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    try {
      await onFeedback(message.chatHistoryId, feedbackText.trim());
      setIsFeedbackModalOpen(false);
      setFeedbackText("");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleCancelFeedback = () => {
    setIsFeedbackModalOpen(false);
    setFeedbackText("");
    setEvaluation(null);
  };

  return (
    <>
      <div
        className={`flex w-full ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
      >
        {!message.isOwnMessage && (
          <Avatar
            src={botIconUrl || "/botIcon/default.ico"}
            size="sm"
            className="rounded mr-2 sm:mr-3 flex-shrink-0 bg-white w-8 h-8 sm:w-10 sm:h-10"
          />
        )}

        <div
          className={`flex flex-col ${message.isOwnMessage ? "items-end" : "items-start"}`}
        >
          {!message.isOwnMessage && message.model && (
            <span className="text-[10px] text-gray-400 ml-1 mb-1">
              {message.model}
            </span>
          )}

          {shouldRenderCard && (
            <div className="max-w-[280px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px] min-w-0">
              <Card
                className={
                  message.isOwnMessage
                    ? "bg-primary-500 text-white rounded-2xl px-3 py-2 sm:px-4 sm:py-2 shadow-sm"
                    : "bg-white text-black rounded-2xl px-3 py-2 sm:px-4 sm:py-2 shadow-sm border border-gray-100"
                }
              >
                <CardBody className="p-1 sm:p-2">
                  <div className="break-words whitespace-normal">
                    <style>{markdownStyles}</style>
                    <div className="markdown-content">
                      {!hasText && hasStatus ? (
                        <div className="flex items-center gap-2 py-1 px-2 text-gray-500 italic text-sm animate-pulse">
                          <Loader2
                            size={16}
                            className="animate-spin text-primary-400"
                          />
                          <span>{message.status}</span>
                        </div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={reactMarkdownPlugins}
                          components={
                            message.citations
                              ? createMarkdownComponents(message.citations)
                              : markdownComponents
                          }
                        >
                          {message.text || ""}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {!message.isOwnMessage && message.generatedImageSignedUrl && (
            <div className="mt-2 max-w-[280px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px]">
              <a
                href={message.generatedImageSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-gray-200 shadow-sm hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.generatedImageSignedUrl}
                  alt="Generated by AI"
                  className="w-full h-auto object-cover max-h-[400px]"
                  loading="lazy"
                />
              </a>
            </div>
          )}

          {shouldRenderCard && (
            <div
              className={`flex items-center gap-2 mt-1 ${message.isOwnMessage ? "justify-end" : "justify-start"}`}
            >
              {message.timestamp && (
                <p className="text-xs sm:text-sm text-gray-500">
                  {message.timestamp}
                </p>
              )}
              {!message.isOwnMessage && message.chatHistoryId && (
                <ChatEvaluation
                  evaluation={evaluation}
                  onEvaluate={(val) => handleEvaluate(val)}
                  disabled={isSubmittingFeedback}
                />
              )}
            </div>
          )}

          {(references.length > 0 ||
            referenceLinks.length > 0 ||
            citations.length > 0) && (
            <div className="mt-1 max-w-[280px] sm:max-w-[400px] md:max-w-[500px] lg:max-w-[600px]">
              <ChatReferenceListMolecule
                files={references}
                links={referenceLinks}
                loadingFileId={loadingFileId}
                onOpenFile={onOpenFile}
                citations={citations}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
        placement="center"
        backdrop="blur"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            フィードバックを送信
          </ModalHeader>
          <ModalBody>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="この回答についてのフィードバックを入力してください..."
              minRows={4}
              maxRows={8}
              className="w-full"
              disabled={isSubmittingFeedback}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={handleCancelFeedback}
              disabled={isSubmittingFeedback}
            >
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handleSubmitFeedback}
              isLoading={isSubmittingFeedback}
              disabled={!feedbackText.trim()}
            >
              送信
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ChatMessageMolecule;
