"use client";

import React, { useState, useCallback } from "react";
import { useGroupContext } from "../../layout-client";
import { ListChecks } from "lucide-react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
} from "@heroui/react";
import {
  PlusIcon,
  ArrowLeftIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useChunkTable } from "../hooks/useChunkTable";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import type {
  ChunkTableTemplateItemType,
  ChunkTableHeaderSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { ColumnDataTypeEnum } from "@repo/api-contracts/based_template/zschema";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";

// コンポーネント
import TableTemplateView from "../components/TableTemplateView";

type ViewMode = "list" | "edit" | "data";

const TableDataTemplate: React.FC = () => {
  const groupId = useGroupContext();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ChunkTableTemplateItemType | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTemplateName, setCreateTemplateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createHeaders, setCreateHeaders] = useState<
    ChunkTableHeaderSchemaType[]
  >([]);

  const { createTemplate, mutateTemplates, isMutating } = useChunkTable({
    groupId,
  });

  // 一覧に戻る
  const handleBack = useCallback(() => {
    setViewMode("list");
    setSelectedTemplate(null);
  }, []);

  // 新規テンプレート作成モーダルを開く
  const handleOpenCreateModal = useCallback(() => {
    setCreateTemplateName("");
    setCreateDescription("");
    setCreateHeaders([
      {
        key: "column_1",
        name: "項目1",
        type: ColumnDataTypeEnum.enum.TEXT,
        description: null,
      },
    ]);
    setIsCreateModalOpen(true);
  }, []);

  // 新規テンプレート作成モーダルを閉じる
  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreateTemplateName("");
    setCreateDescription("");
    setCreateHeaders([]);
  }, []);

  // 新規テンプレート作成
  const handleCreateTemplate = useCallback(async () => {
    if (!createTemplateName.trim()) {
      handleErrorWithUI(
        { message: "テンプレート名を入力してください" } as any,
        "テンプレート作成",
      );
      return;
    }

    try {
      const templateId = await createTemplate({
        templateName: createTemplateName.trim(),
        description: createDescription.trim() || null,
        headersSchema: createHeaders.length > 0 ? createHeaders : null,
      });

      showSuccessToast("テンプレート作成");

      // 作成したテンプレートを選択してデータ編集画面へ
      await mutateTemplates();
      const newTemplate = {
        templateId,
        templateName: createTemplateName.trim(),
        description: createDescription.trim() || null,
        headersSchema: createHeaders.length > 0 ? createHeaders : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ChunkTableTemplateItemType;

      setSelectedTemplate(newTemplate);
      setViewMode("data");
      handleCloseCreateModal();
    } catch (error) {
      handleErrorWithUI(error, "テンプレート作成");
    }
  }, [
    createTemplateName,
    createDescription,
    createHeaders,
    createTemplate,
    mutateTemplates,
    handleCloseCreateModal,
  ]);

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {viewMode === "data" && (
                <Button
                  size="sm"
                  variant="light"
                  isIconOnly
                  onPress={handleBack}
                  className="mr-1"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
              )}
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                {viewMode === "data"
                  ? selectedTemplate?.templateName
                  : "テーブル管理"}
              </h1>
            </div>

            {/* 新規作成ボタン（一覧モード時のみ表示） */}
            {viewMode === "list" && (
              <Button
                color="primary"
                variant="solid"
                size="sm"
                startContent={<PlusIcon className="h-4 w-4" />}
                onPress={handleOpenCreateModal}
                className="font-bold"
              >
                新しいテンプレート
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツセクション */}
      <div className="flex-1 overflow-auto p-3 sm:p-6 min-h-0 flex flex-col">
        <TableTemplateView
          groupId={groupId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          onOpenCreateModal={handleOpenCreateModal}
        />
      </div>

      {/* テンプレート作成モーダル */}
      <Modal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>新規テンプレート作成</ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">
                      基本情報
                    </h4>
                    <Input
                      label="テンプレート名"
                      placeholder="例: 料金表"
                      value={createTemplateName}
                      onChange={(e) => setCreateTemplateName(e.target.value)}
                      isRequired
                      autoFocus
                    />
                    <Textarea
                      label="説明"
                      placeholder="このテンプレートの説明を入力してください（任意）"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      minRows={2}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">
                        列定義（スキーマ）
                      </h4>
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        startContent={<PlusIcon className="h-4 w-4" />}
                        onClick={() => {
                          const newHeader: ChunkTableHeaderSchemaType = {
                            key: `col_${createHeaders.length + 1}`,
                            name: `列 ${createHeaders.length + 1}`,
                            type: ColumnDataTypeEnum.enum.TEXT,
                            description: null,
                          };
                          setCreateHeaders([...createHeaders, newHeader]);
                        }}
                      >
                        列を追加
                      </Button>
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              表示名
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              キー
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              型
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {createHeaders.map((header, index) => (
                            <tr key={index}>
                              <td className="px-2 py-2">
                                <Input
                                  size="sm"
                                  variant="bordered"
                                  value={header.name}
                                  onChange={(e) => {
                                    const newHeaders = [...createHeaders];
                                    newHeaders[index] = {
                                      ...header,
                                      name: e.target.value,
                                    };
                                    setCreateHeaders(newHeaders);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  size="sm"
                                  variant="bordered"
                                  value={header.key}
                                  onChange={(e) => {
                                    const newHeaders = [...createHeaders];
                                    newHeaders[index] = {
                                      ...header,
                                      key: e.target.value,
                                    };
                                    setCreateHeaders(newHeaders);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Dropdown size="sm">
                                  <DropdownTrigger>
                                    <Button
                                      size="sm"
                                      variant="bordered"
                                      className="w-full justify-start font-normal"
                                    >
                                      {header.type}
                                    </Button>
                                  </DropdownTrigger>
                                  <DropdownMenu
                                    aria-label="データ型を選択"
                                    onAction={(key) => {
                                      const newHeaders = [...createHeaders];
                                      newHeaders[index] = {
                                        ...header,
                                        type: key as any,
                                      };
                                      setCreateHeaders(newHeaders);
                                    }}
                                  >
                                    {Object.values(ColumnDataTypeEnum.enum).map(
                                      (type) => (
                                        <DropdownItem key={type}>
                                          {type}
                                        </DropdownItem>
                                      ),
                                    )}
                                  </DropdownMenu>
                                </Dropdown>
                              </td>
                              <td className="px-2 py-2 text-right">
                                <Button
                                  size="sm"
                                  isIconOnly
                                  color="danger"
                                  variant="light"
                                  onClick={() => {
                                    const newHeaders = [...createHeaders];
                                    newHeaders.splice(index, 1);
                                    setCreateHeaders(newHeaders);
                                  }}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {createHeaders.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-4 text-center text-sm text-gray-500"
                              >
                                列が定義されていません。「列を追加」から定義してください。
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={handleCloseCreateModal}
                >
                  キャンセル
                </Button>
                <Button
                  color="primary"
                  onPress={handleCreateTemplate}
                  isLoading={isMutating}
                  isDisabled={!createTemplateName.trim()}
                >
                  作成して編集開始
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TableDataTemplate;
