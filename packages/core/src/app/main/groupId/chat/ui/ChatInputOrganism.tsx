// app/(main)/chat/organisms/ChatInputOrganism.tsx
"use client";
import React, { useCallback, useMemo } from "react";
import { Button } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Textarea } from "@heroui/react";
import { Send, Bot, Link, Paperclip, X, Plus } from "lucide-react";
import type { ChatFileSchemaType } from "@repo/api-contracts/based_template/zschema";

type BotData = {
  botId: number;
  botName: string;
};

type ChatFileForRequest = ChatFileSchemaType;

type Props = {
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  handleSubmit: () => void;
  isSubmitting: boolean;
  isLoading?: boolean;
  botList: BotData[];
  selectedBotId: number | null;
  setIsBotSelectModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isReferenceLinkDisplay: boolean;
  setIsReferenceLinkDisplay: React.Dispatch<React.SetStateAction<boolean>>;
  isRagMode?: boolean; // Optional prop to control visibility of RAG-specific features
  // AI Platform 用ファイル添付
  attachedFiles: ChatFileForRequest[];
  onFilesChange: (files: ChatFileForRequest[]) => void;
  canUploadFile?: boolean;
  maxUploadBytes?: number | null;
  supportedExtensions?: string[];
};

const ChatInputOrganism: React.FC<Props> = ({
  inputText,
  setInputText,
  handleSubmit,
  isSubmitting,
  isLoading = false,
  botList,
  selectedBotId,
  setIsBotSelectModalOpen,
  isReferenceLinkDisplay,
  setIsReferenceLinkDisplay,
  isRagMode = true, // Default to true for backward compatibility
  attachedFiles,
  onFilesChange,
  canUploadFile,
  maxUploadBytes,
  supportedExtensions = [],
}) => {
  // Get the selected bot name if any
  const selectedBotName = botList.find(
    (bot) => bot.botId === selectedBotId,
  )?.botName;

  // Determine if we should disable the action buttons
  const isDisabled = isSubmitting || isLoading;

  // Calculate rows for textarea based on content
  const calculateRows = (text: string): number => {
    const lines = text.split("\n").length;
    const minRows = 1;
    const maxRows = 8;
    return Math.min(Math.max(lines, minRows), maxRows);
  };

  const textareaRows = calculateRows(inputText);

  // Ctrl+Enter（Mac: Cmd+Enter）で送信、Enter単体は改行のみ
  const onTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      if (!isSubmitting && !isLoading && inputText.trim()) {
        handleSubmit();
      }
    }
    // Enter単体はデフォルト動作（改行）
  };

  // サポートされている拡張子からaccept属性用の文字列を生成
  const acceptAttribute = useMemo(() => {
    if (supportedExtensions.length === 0) {
      return undefined; // accept属性を設定しない（すべてのファイルを許可）
    }
    // 拡張子をカンマ区切りで結合（例: ".pdf,.txt,.jpg"）
    return supportedExtensions.join(",");
  }, [supportedExtensions]);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      const readAsBase64 = (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === "string") {
              // data:*/*;base64,... の形式の場合はカンマ以降のみを使用
              const commaIndex = result.indexOf(",");
              resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
            } else {
              reject(new Error("Failed to read file as base64 string"));
            }
          };
          reader.onerror = () =>
            reject(reader.error || new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

      try {
        const converted: ChatFileForRequest[] = [];
        for (const file of files) {
          // ファイルサイズチェック
          if (
            typeof maxUploadBytes === "number" &&
            file.size > maxUploadBytes
          ) {
            alert(
              `ファイル "${file.name}" が大きすぎます。最大 ${Math.round(maxUploadBytes / 1024 / 1024)} MB までです。`,
            );
            continue;
          }
          const base64 = await readAsBase64(file);
          const sizeBytes = file.size;
          converted.push({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            base64Data: base64,
            sizeBytes,
          });
        }

        onFilesChange([...attachedFiles, ...converted]);
      } catch (e) {
        console.error("ファイルの読み込みに失敗しました", e);
        alert("ファイルの読み込みに失敗しました");
      } finally {
        // 同じファイルを再選択できるように値をクリア
        event.target.value = "";
      }
    },
    [attachedFiles, onFilesChange, maxUploadBytes],
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const newFiles = attachedFiles.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [attachedFiles, onFilesChange],
  );

  return (
    <div className="w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.03)]">
      {/* 添付ファイル表示エリア（コンパクト） */}
      {!isRagMode && canUploadFile && attachedFiles.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/80 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            {attachedFiles.map((f, index) => (
              <div
                key={`${f.fileName}-${f.sizeBytes}-${index}`}
                className="group flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md shadow-sm hover:shadow transition-all duration-150"
              >
                <Paperclip size={11} className="text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-700 truncate max-w-[150px]">
                  {f.fileName}
                </span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  disabled={isDisabled}
                  className="ml-0.5 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 disabled:opacity-50"
                  title="削除"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* メイン入力エリア - AIライクなデザイン */}
      <div className="px-4 py-3">
        <div className="relative flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-200 shadow-sm">
          {/* 左側: オプションボタン（プラスアイコン） */}
          <div className="flex items-center gap-1 pl-3">
            {/* RAGモード: Bot選択 */}
            {isRagMode && (
              <button
                onClick={() => setIsBotSelectModalOpen(true)}
                disabled={isDisabled}
                className={`p-2 rounded-full transition-all duration-200 ${
                  selectedBotId
                    ? "bg-primary-100 text-primary-600 hover:bg-primary-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={
                  selectedBotId ? `選択中: ${selectedBotName}` : "Botを選択"
                }
              >
                <Bot size={18} />
              </button>
            )}

            {/* AI Platform モード: ファイル添付 */}
            {!isRagMode && canUploadFile && (
              <label
                className={`p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200 cursor-pointer ${
                  isDisabled
                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                    : ""
                }`}
                title={
                  supportedExtensions.length > 0
                    ? `ファイルを添付（対応形式: ${supportedExtensions.join(", ")})`
                    : "ファイルを添付"
                }
              >
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept={acceptAttribute}
                  onChange={handleFileChange}
                  disabled={isDisabled}
                />
                <Plus size={18} />
              </label>
            )}

            {/* RAGモード: 参照リンク表示トグル */}
            {isRagMode && (
              <button
                onClick={() =>
                  setIsReferenceLinkDisplay(!isReferenceLinkDisplay)
                }
                disabled={isDisabled}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isReferenceLinkDisplay
                    ? "bg-green-100 text-green-600 hover:bg-green-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={
                  isReferenceLinkDisplay
                    ? "参照リンク表示: ON"
                    : "参照リンク表示: OFF"
                }
              >
                <Link size={18} />
              </button>
            )}
          </div>

          {/* 中央: テキスト入力エリア */}
          <div className="flex-1 relative min-w-0">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={onTextareaKeyDown}
              placeholder="質問してみましょう..."
              maxLength={2000}
              variant="bordered"
              disabled={isDisabled}
              rows={textareaRows}
              classNames={{
                base: "w-full bg-transparent",
                input:
                  "text-sm py-3 pr-12 resize-none bg-transparent border-0 focus:outline-none placeholder:text-gray-400",
                inputWrapper:
                  "bg-transparent border-0 shadow-none p-0 hover:bg-transparent focus-within:bg-transparent",
              }}
            />
            {/* 文字数カウント（右下） */}
            {inputText.length > 0 && (
              <div className="absolute right-2 bottom-2 flex items-center">
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    inputText.length > 1800
                      ? "text-red-500"
                      : inputText.length > 1500
                        ? "text-orange-500"
                        : "text-gray-400"
                  }`}
                >
                  {inputText.length}/2000
                </span>
              </div>
            )}
          </div>

          {/* 右側: 送信ボタン */}
          <div className="pr-2 pb-1">
            <Button
              disabled={!inputText.trim() || isDisabled}
              onPress={handleSubmit}
              isIconOnly
              size="lg"
              color="primary"
              className={`min-w-[40px] h-[40px] rounded-full transition-all duration-200 ${
                inputText.trim() && !isDisabled
                  ? "shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                  : "opacity-40"
              }`}
              aria-label="送信"
            >
              {isSubmitting ? (
                <Spinner size="sm" color="white" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInputOrganism;
