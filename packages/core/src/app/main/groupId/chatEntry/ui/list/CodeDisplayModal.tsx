import React, { useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Snippet,
  Tooltip,
  Spinner,
} from "@heroui/react";

type CodeDisplayType = "script" | "url" | "line_webhook" | "endpoint_url";

interface CodeDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  type: CodeDisplayType;
  isLoading?: boolean;
}

export const CodeDisplayModal: React.FC<CodeDisplayModalProps> = ({
  isOpen,
  onClose,
  content,
  type,
  isLoading = false,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = () => {
    if (isLoading || !content) return;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error("コピーに失敗しました:", err);
      });
  };

  const handleClose = () => {
    setCopySuccess(false);
    onClose();
  };

  const getModalConfig = () => {
    switch (type) {
      case "script":
        return {
          title: "埋め込みコード",
          description: "以下のコードをウェブサイトに埋め込んでください",
          showLink: false,
        };
      case "url":
        return {
          title: "フルスクリーンチャットURL",
          description:
            "このURLにアクセスすると、画面全体でチャットを利用できます",
          showLink: true,
        };
      case "line_webhook":
        return {
          title: "LINE Webhook URL",
          description:
            "このURLをLINE DevelopersコンソールのWebhook URLに設定してください",
          showLink: false,
        };
      case "endpoint_url":
        return {
          title: "エンドポイントURL",
          description: "埋め込みスクリプト用のエンドポイントURL",
          showLink: false,
        };
      default:
        return {
          title: "コード表示",
          description: "",
          showLink: false,
        };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="xl"
      classNames={{
        base: "max-h-[90vh] mx-2 sm:mx-4",
        body: "overflow-y-auto max-h-[calc(90vh-120px)] p-3 sm:p-6",
        wrapper: "items-start sm:items-center pt-4 sm:pt-0",
      }}
    >
      <ModalContent>
        <ModalHeader className="border-b pb-3 flex justify-between items-center">
          <span className="text-xl font-semibold">{config.title}</span>
          <div className="flex gap-2">
            <Tooltip
              content={
                isLoading
                  ? "読み込み中..."
                  : copySuccess
                    ? "コピーしました"
                    : "クリップボードにコピー"
              }
            >
              <Button
                color={copySuccess ? "success" : "primary"}
                variant="flat"
                size="sm"
                onPress={copyToClipboard}
                isDisabled={isLoading || !content}
                startContent={
                  isLoading ? <Spinner size="sm" color="current" /> : undefined
                }
                className={copySuccess ? "" : "shadow-sm"}
              >
                {copySuccess ? "コピーしました" : "コピー"}
              </Button>
            </Tooltip>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="bg-gray-50 p-4 rounded-md">
            <div
              className={`text-sm text-gray-500 ${type === "script" || type === "endpoint_url" ? "mb-4" : "mb-2"}`}
            >
              {config.description}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Spinner size="lg" className="mb-4" />
                  <p className="text-gray-600">読み込み中...</p>
                </div>
              </div>
            ) : !content ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-gray-500">
                    コンテンツを取得できませんでした
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-gray-200 bg-white scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                  <Snippet
                    hideSymbol
                    className="min-w-max text-sm font-mono whitespace-pre p-3"
                    classNames={{
                      base: "min-w-max",
                      content: "",
                    }}
                  >
                    {content}
                  </Snippet>
                </div>
                {config.showLink && content && (
                  <div className="mt-3 text-sm text-blue-600">
                    <a
                      href={content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      新しいタブで開く →
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
