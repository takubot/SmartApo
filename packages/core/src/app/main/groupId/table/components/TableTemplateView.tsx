"use client";

import React, { useState, useCallback } from "react";
import {
  Button,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Textarea,
} from "@heroui/react";
import {
  PlusIcon,
  TrashIcon,
  TableCellsIcon,
  EllipsisVerticalIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { ListChecks } from "lucide-react";
import { useChunkTable } from "../hooks/useChunkTable";
import TableDataEditor from "./TableDataEditor";
import type {
  ChunkTableTemplateItemType,
  ChunkTableHeaderSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { ColumnDataTypeEnum } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

interface TableTemplateViewProps {
  groupId: string;
}

interface HeaderColumn {
  label: string;
  key?: string;
  type?: string;
  description?: string;
}

type ViewMode = "list" | "edit" | "data";

interface TableTemplateViewProps {
  groupId: string;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedTemplate: ChunkTableTemplateItemType | null;
  setSelectedTemplate: (template: ChunkTableTemplateItemType | null) => void;
  onOpenCreateModal?: () => void;
}

const TableTemplateView: React.FC<TableTemplateViewProps> = ({
  groupId,
  viewMode,
  setViewMode,
  selectedTemplate,
  setSelectedTemplate,
  onOpenCreateModal,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] =
    useState<ChunkTableTemplateItemType | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] =
    useState<ChunkTableTemplateItemType | null>(null);
  const [editTemplateName, setEditTemplateName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHeaders, setEditHeaders] = useState<ChunkTableHeaderSchemaType[]>(
    [],
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    templates,
    templatesLoading,
    templatesError,
    updateTemplate,
    deleteTemplate,
    mutateTemplates,
    getTablesByTemplate,
    batchUpdateTableRows,
    isMutating,
  } = useChunkTable({ groupId });

  // テンプレート削除確認
  const handleDeleteClick = useCallback(
    (template: ChunkTableTemplateItemType) => {
      setTemplateToDelete(template);
      setIsDeleteModalOpen(true);
    },
    [],
  );

  // テンプレート削除実行
  const confirmDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate(templateToDelete.templateId);
      showSuccessToast("テンプレート削除");
      await mutateTemplates();
    } catch (error) {
      handleErrorWithUI(error, "テンプレート削除");
    } finally {
      setIsDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  }, [templateToDelete, deleteTemplate, mutateTemplates]);

  // テンプレート編集モーダルを開く
  const handleEditTemplate = useCallback(
    (template: ChunkTableTemplateItemType) => {
      setTemplateToEdit(template);
      setEditTemplateName(template.templateName);
      setEditDescription(template.description || "");
      setEditHeaders(
        (template.headersSchema as ChunkTableHeaderSchemaType[]) || [],
      );
      setIsEditModalOpen(true);
    },
    [],
  );

  // 編集モーダルを閉じる
  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setTemplateToEdit(null);
    setEditTemplateName("");
    setEditDescription("");
    setEditHeaders([]);
  }, []);

  // テンプレート編集を保存
  const handleSaveTemplateEdit = useCallback(async () => {
    if (!templateToEdit) return;

    try {
      await updateTemplate({
        templateId: templateToEdit.templateId,
        templateName: editTemplateName,
        description: editDescription || null,
        headersSchema: editHeaders.length > 0 ? editHeaders : null,
      });

      showSuccessToast("テンプレート更新");

      await mutateTemplates();
      handleCloseEditModal();
    } catch (error) {
      handleErrorWithUI(error, "テンプレート更新");
    }
  }, [
    templateToEdit,
    editTemplateName,
    editDescription,
    editHeaders,
    updateTemplate,
    mutateTemplates,
    handleCloseEditModal,
  ]);

  // データ編集画面へ遷移
  const handleEditData = useCallback(
    async (template: ChunkTableTemplateItemType) => {
      setIsTransitioning(true);

      // 少し遅延を入れて遷移感を演出
      setTimeout(() => {
        setSelectedTemplate(template);
        setViewMode("data");
        setIsTransitioning(false);
      }, 500);
    },
    [setSelectedTemplate, setViewMode],
  );

  // 一覧に戻る
  const handleBackToList = useCallback(() => {
    setViewMode("list");
    setSelectedTemplate(null);
  }, [setSelectedTemplate, setViewMode]);

  // ヘッダー情報を取得
  const getHeadersFromTemplate = useCallback(
    (template?: ChunkTableTemplateItemType | null): HeaderColumn[] => {
      if (!template) return [{ label: "Column 1" }];

      const hs = template.headersSchema as ChunkTableHeaderSchemaType[];
      if (Array.isArray(hs) && hs.length > 0) {
        return hs.map((h) => ({
          label: h.name,
          key: h.key,
          type: h.type,
          description: h.description || undefined,
        }));
      }

      const tables = getTablesByTemplate(template.templateId);
      const first = tables?.[0]?.chunkContent;
      const firstRow =
        Array.isArray(first) && first.length > 0 ? (first[0] as any) : null;

      if (firstRow && typeof firstRow === "object") {
        return Object.keys(firstRow).map((k) => ({ label: k }));
      }

      return [{ label: "Column 1" }];
    },
    [getTablesByTemplate],
  );

  // ローディング状態
  if (templatesLoading || isTransitioning) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="primary" />
          <p className="text-sm text-gray-600">
            {isTransitioning ? "データを読み込み中..." : "読み込み中..."}
          </p>
        </div>
      </div>
    );
  }

  // エラー状態
  if (templatesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">!</span>
          </div>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          テンプレートの読み込みに失敗しました
        </h3>
        <p className="text-gray-500 mb-6">
          ネットワーク接続を確認して、再読み込みを試してください
        </p>
        <Button
          color="primary"
          variant="flat"
          onPress={() => window.location.reload()}
        >
          再読み込み
        </Button>
      </div>
    );
  }

  // データ編集画面
  if (viewMode === "data" && selectedTemplate) {
    const headers = getHeadersFromTemplate(selectedTemplate);

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <TableDataEditor
          templateName={selectedTemplate.templateName}
          templateId={selectedTemplate.templateId}
          headers={headers}
          initialData={[]}
          onSave={async () => {
            // データ保存は自動保存で処理されます
          }}
          updateTemplateHeaders={async (templateId, headerData) => {
            await updateTemplate({
              templateId,
              headersSchema: headerData as any,
            });
          }}
          onBack={handleBackToList}
          isLoading={isMutating}
          getTablesByTemplate={getTablesByTemplate}
          batchUpdateTableRows={batchUpdateTableRows}
        />
      </div>
    );
  }

  // テンプレート一覧画面
  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-default-200 overflow-hidden">
      {/* テンプレート一覧 */}
      <div className="flex-1 overflow-y-auto">
        {templates && templates.length > 0 ? (
          <div>
            {/* ヘッダー行 */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-10"></div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    テンプレート名
                  </span>
                </div>
                <div className="flex-1">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    説明
                  </span>
                </div>
                <div className="min-w-[80px]">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    列数
                  </span>
                </div>
                <div className="min-w-[140px]">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    作成日
                  </span>
                </div>
                <div className="min-w-[140px]">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    更新日
                  </span>
                </div>
                <div className="w-10"></div>
              </div>
            </div>

            {/* テンプレートリスト */}
            <div className="divide-y divide-gray-100">
              {templates.map((template) => {
                const headers = getHeadersFromTemplate(template);
                const isSelected = false; // 選択状態の管理が必要な場合は追加

                const formatDate = (dateString: string) => {
                  const date = new Date(dateString);
                  return date.toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  });
                };

                return (
                  <div
                    key={template.templateId}
                    className={`group px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
                      isSelected ? "bg-green-50" : ""
                    }`}
                    onClick={() => handleEditData(template)}
                  >
                    <div className="flex items-center gap-4">
                      {/* アイコン */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <TableCellsIcon className="h-5 w-5 text-green-600" />
                        </div>
                      </div>

                      {/* テンプレート名 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 truncate">
                          {template.templateName}
                        </h3>
                      </div>

                      {/* 説明 */}
                      <div className="flex-1 min-w-0">
                        {template.description ? (
                          <p className="text-sm text-gray-600 truncate">
                            {template.description}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">説明なし</p>
                        )}
                      </div>

                      {/* 列数 */}
                      <div className="flex items-center gap-1 text-sm text-gray-600 min-w-[80px]">
                        <TableCellsIcon className="h-4 w-4" />
                        <span>{headers.length} 列</span>
                      </div>

                      {/* 作成日 */}
                      <div className="text-sm text-gray-500 min-w-[140px]">
                        {formatDate(template.createdAt)}
                      </div>

                      {/* 更新日 */}
                      <div className="text-sm text-gray-500 min-w-[140px]">
                        {template.updatedAt && formatDate(template.updatedAt)}
                      </div>

                      {/* アクションメニュー */}
                      <div className="flex-shrink-0">
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              size="sm"
                              variant="light"
                              className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              isIconOnly
                              onClick={(e) => e.stopPropagation()}
                            >
                              <EllipsisVerticalIcon className="h-5 w-5 text-gray-500" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            onAction={(key) => {
                              if (key === "edit") {
                                handleEditTemplate(template);
                              } else if (key === "delete") {
                                handleDeleteClick(template);
                              }
                            }}
                          >
                            <DropdownItem
                              key="edit"
                              startContent={<PencilIcon className="h-4 w-4" />}
                            >
                              編集
                            </DropdownItem>
                            <DropdownItem
                              key="delete"
                              className="text-danger"
                              color="danger"
                              startContent={<TrashIcon className="h-4 w-4" />}
                            >
                              削除
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <TableCellsIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              テンプレートがありません
            </h3>
            <p className="text-base text-gray-500 mb-8 max-w-sm">
              新しいテーブルテンプレートを作成して、データを管理しましょう
            </p>
            <Button
              color="primary"
              size="lg"
              startContent={<PlusIcon className="h-5 w-5" />}
              onPress={onOpenCreateModal}
            >
              最初のテンプレートを作成
            </Button>
          </div>
        )}
      </div>

      {/* テンプレート編集モーダル */}
      <Modal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {() => (
            <>
              <ModalHeader>テンプレート編集</ModalHeader>
              <ModalBody>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">
                      基本情報
                    </h4>
                    <Input
                      label="テンプレート名"
                      placeholder="テンプレート名を入力"
                      value={editTemplateName}
                      onChange={(e) => setEditTemplateName(e.target.value)}
                      isRequired
                    />
                    <Textarea
                      label="説明"
                      placeholder="テンプレートの説明を入力（任意）"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
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
                            key: `col_${editHeaders.length + 1}`,
                            name: `列 ${editHeaders.length + 1}`,
                            type: ColumnDataTypeEnum.enum.TEXT,
                            description: null,
                          };
                          setEditHeaders([...editHeaders, newHeader]);
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
                          {editHeaders.map((header, index) => (
                            <tr key={index}>
                              <td className="px-2 py-2">
                                <Input
                                  size="sm"
                                  variant="bordered"
                                  value={header.name}
                                  onChange={(e) => {
                                    const newHeaders = [...editHeaders];
                                    newHeaders[index] = {
                                      ...header,
                                      name: e.target.value,
                                    };
                                    setEditHeaders(newHeaders);
                                  }}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <Input
                                  size="sm"
                                  variant="bordered"
                                  value={header.key}
                                  onChange={(e) => {
                                    const newHeaders = [...editHeaders];
                                    newHeaders[index] = {
                                      ...header,
                                      key: e.target.value,
                                    };
                                    setEditHeaders(newHeaders);
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
                                      const newHeaders = [...editHeaders];
                                      newHeaders[index] = {
                                        ...header,
                                        type: key as any,
                                      };
                                      setEditHeaders(newHeaders);
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
                                    const newHeaders = [...editHeaders];
                                    newHeaders.splice(index, 1);
                                    setEditHeaders(newHeaders);
                                  }}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {editHeaders.length === 0 && (
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
                  onPress={handleCloseEditModal}
                >
                  キャンセル
                </Button>
                <Button
                  color="primary"
                  onPress={handleSaveTemplateEdit}
                  isLoading={isMutating}
                  isDisabled={!editTemplateName.trim()}
                >
                  保存
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        size="sm"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>テンプレート削除確認</ModalHeader>
              <ModalBody>
                <p>「{templateToDelete?.templateName}」を削除しますか？</p>
                <p className="text-sm text-gray-600 mt-2">
                  この操作は取り消せません。関連するデータも削除されます。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  キャンセル
                </Button>
                <Button
                  color="danger"
                  onPress={confirmDeleteTemplate}
                  isLoading={isMutating}
                >
                  削除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default TableTemplateView;
