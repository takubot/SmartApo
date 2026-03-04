"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Button, Chip } from "@heroui/react";
import {
  Calendar,
  Bot,
  Users,
  MessageSquare,
  Tag,
  FileText,
  Building,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { type ChatLogItemType } from "@repo/api-contracts/based_template/zschema";
import {
  markdownComponents,
  reactMarkdownPlugins,
  markdownStyles,
} from "@common/reactMarkdown";
import {
  getFileReferences,
  getFormReferences,
  type FormReference,
} from "../utils/referenceUtils";

interface DataModalProps {
  isOpen: boolean;
  chatLog: ChatLogItemType;
  onClose: () => void;
}

export default function DataModalMolecule({
  isOpen,
  chatLog,
  onClose,
}: DataModalProps) {
  const chatLogData = chatLog ?? null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "未設定";
    try {
      return new Date(dateString).toLocaleString("ja-JP");
    } catch {
      return "日付エラー";
    }
  };

  const getUserDisplayName = (data: ChatLogItemType) => {
    if (data.userName) return data.userName;
    if (data.userId) return data.userId;
    return "未設定";
  };

  const getCategoryNames = (data: ChatLogItemType) => {
    if (data.categoryNames && data.categoryNames.length > 0) {
      return data.categoryNames;
    }
    if (data.usedCategoryIds && data.usedCategoryIds.length > 0) {
      return data.usedCategoryIds.map((id) => `カテゴリID: ${id}`);
    }
    return [];
  };

  const fileReferences = chatLogData ? getFileReferences(chatLogData) : [];
  const formReferences = chatLogData ? getFormReferences(chatLogData) : [];

  const renderReferenceList = (
    title: string,
    entries: Array<{ label: string; description?: string }>,
  ) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-600" />
        {title}
      </p>
      {entries.length > 0 ? (
        <ul className="space-y-1">
          {entries.map((entry, index) => (
            <li key={`${title}-${index}`} className="text-sm text-gray-700">
              <span className="font-medium text-gray-900">{entry.label}</span>
              {entry.description && (
                <span className="text-gray-500 text-xs ml-2">
                  {entry.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">なし</p>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      backdrop="blur"
    >
      <ModalContent>
        {(onCloseModal) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center justify-between w-full">
                <h2 className="text-xl font-bold">チャットログ詳細</h2>
                {chatLogData?.chatLogId && (
                  <span className="text-sm text-gray-500">
                    ID: {chatLogData.chatLogId}
                  </span>
                )}
              </div>
            </ModalHeader>
            <ModalBody className="space-y-6">
              {chatLogData ? (
                <>
                  {/* 基本情報 */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* グループ名 */}
                    {(chatLogData.groupId ||
                      (chatLogData as { groupName?: string }).groupName) && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Building className="w-4 h-4 text-indigo-600" />
                          <span className="text-sm font-semibold text-indigo-800">
                            グループ名
                          </span>
                        </div>
                        <p className="text-sm text-indigo-700 font-medium">
                          {(chatLogData as { groupName?: string }).groupName ||
                            chatLogData.groupId ||
                            "未設定"}
                        </p>
                        {chatLogData.groupId &&
                          (chatLogData as { groupName?: string }).groupName && (
                            <p className="text-xs text-indigo-500 mt-1 font-mono">
                              ID: {chatLogData.groupId}
                            </p>
                          )}
                      </div>
                    )}

                    {/* 会話時間 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-800">
                          会話時間
                        </span>
                      </div>
                      <p className="text-sm text-blue-700">
                        {formatDate(chatLogData.createdAt || "")}
                      </p>
                    </div>

                    {/* ボット名 */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-800">
                          ボット名
                        </span>
                      </div>
                      <p className="text-sm text-green-700">
                        {chatLogData.botName || "未設定"}
                      </p>
                    </div>

                    {/* ユーザー名 */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-800">
                          ユーザー名
                        </span>
                      </div>
                      <p className="text-sm text-purple-700">
                        {getUserDisplayName(chatLogData)}
                      </p>
                    </div>
                  </div>

                  {/* ユーザーの質問 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-800">
                        ユーザーの質問
                      </span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {chatLogData.chatQuestion || "質問なし"}
                      </p>
                    </div>
                  </div>

                  {/* ボットの回答 */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-800">
                        ボットの回答
                      </span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="markdown-content text-sm text-gray-800">
                        <style>{markdownStyles}</style>
                        <ReactMarkdown
                          components={markdownComponents}
                          remarkPlugins={reactMarkdownPlugins}
                        >
                          {chatLogData.chatAnswer || "回答なし"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  {/* 使用カテゴリ */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-800">
                        使用カテゴリ
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getCategoryNames(chatLogData).length > 0 ? (
                        getCategoryNames(chatLogData).map((category, index) => (
                          <Chip
                            key={index}
                            color="secondary"
                            variant="flat"
                            size="sm"
                            className="text-xs"
                          >
                            {category}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">
                          カテゴリなし
                        </span>
                      )}
                    </div>
                  </div>

                  {(fileReferences.length > 0 || formReferences.length > 0) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-800">
                          参考情報
                        </span>
                      </div>
                      {renderReferenceList(
                        `ファイル (${fileReferences.length})`,
                        fileReferences.map((file) => ({
                          label:
                            file.fileName || `ファイル(ID: ${file.fileId})`,
                          description:
                            file.relevantPages && file.relevantPages.length > 0
                              ? `Pages: ${file.relevantPages.join(", ")}`
                              : undefined,
                        })),
                      )}
                      {renderReferenceList(
                        `フォーム (${formReferences.length})`,
                        formReferences.map((form: FormReference) => ({
                          label:
                            form.formName || `フォーム(ID: ${form.formId})`,
                          description: form.description,
                        })),
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>データの読み込みに失敗しました</p>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                color="default"
                variant="light"
                onPress={onCloseModal}
                size="lg"
              >
                閉じる
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
