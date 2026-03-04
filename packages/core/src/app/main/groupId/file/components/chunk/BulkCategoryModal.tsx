"use client";

import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Button } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Divider } from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { RadioGroup, Radio } from "@heroui/react";
import { Input } from "@heroui/react";
import { TagIcon } from "@heroicons/react/24/outline";

// 新しいhooks構造の型を使用
import type { FileListItemType } from "@repo/api-contracts/based_template/zschema";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type FileListItem = FileListItemType & {
  categoryNames: string[];
  displayChunkCount?: number;
};

type BulkCategoryMode = "add" | "remove" | "replace";

interface BulkCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFile: FileListItem | null;
  categoryList: CategoryResponseSchemaType[];
  isCategoryLoading: boolean;
  onSuccess: () => void;
  onBulkUpdateFileCategories: (payload: {
    fileId: number;
    categoryIds: number[];
  }) => Promise<any>;
  onBulkAddFileCategories: (payload: {
    fileId: number;
    categoryIds: number[];
  }) => Promise<any>;
  onBulkRemoveFileCategories: (payload: {
    fileId: number;
    categoryIds: number[];
  }) => Promise<any>;
}

const BulkCategoryModal: React.FC<BulkCategoryModalProps> = ({
  isOpen,
  onClose,
  selectedFile,
  categoryList,
  isCategoryLoading,
  onSuccess,
  onBulkUpdateFileCategories,
  onBulkAddFileCategories,
  onBulkRemoveFileCategories,
}) => {
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [mode, setMode] = useState<BulkCategoryMode>("add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // デバッグ: BulkCategoryModalでのカテゴリデータを確認
  console.log("BulkCategoryModal Category Debug:", {
    isOpen,
    categoryList,
    categoryListLength: categoryList?.length,
    isCategoryLoading,
    selectedFile,
  });

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const filteredCategories = (categoryList || []).filter((cat) =>
    (cat.categoryName || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectAllVisible = () => {
    const visibleIds = filteredCategories.map((cat) => cat.categoryId);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedCategoryIds.includes(id));

    if (allVisibleSelected) {
      setSelectedCategoryIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedCategoryIds((prev) =>
        Array.from(new Set([...prev, ...visibleIds])),
      );
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      handleErrorWithUI(
        { message: "ファイルが選択されていません" } as any,
        "カテゴリ一括操作",
      );
      return;
    }

    if (selectedCategoryIds.length === 0) {
      handleErrorWithUI(
        { message: "少なくとも1つのカテゴリを選択してください" } as any,
        "カテゴリ一括操作",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      const payload = {
        fileId: selectedFile.fileId,
        categoryIds: selectedCategoryIds,
      };

      switch (mode) {
        case "add":
          response = await onBulkAddFileCategories(payload);
          break;
        case "remove":
          response = await onBulkRemoveFileCategories(payload);
          break;
        case "replace":
          response = await onBulkUpdateFileCategories(payload);
          break;
        default:
          throw new Error("Invalid mode");
      }

      const actionText =
        mode === "add" ? "追加" : mode === "remove" ? "削除" : "置換";
      showSuccessToast(
        `カテゴリ一括${actionText} (${response?.updatedChunksCount || 0}件)`,
      );

      onSuccess();
      onClose();
      setSelectedCategoryIds([]);
    } catch (error) {
      const actionText =
        mode === "add" ? "追加" : mode === "remove" ? "削除" : "置換";
      handleErrorWithUI(error, `カテゴリ一括${actionText}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedCategoryIds([]);
    setMode("add");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <TagIcon className="h-6 w-6 text-primary" />
            <span>ファイル全体のカテゴリ一括操作</span>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600 font-normal">
              ファイル: {selectedFile.fileName}
            </p>
          )}
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {/* モード選択 */}
            <Card>
              <CardHeader className="pb-2">
                <h4 className="text-lg font-semibold">操作モード</h4>
              </CardHeader>
              <Divider />
              <CardBody>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) => setMode(value as BulkCategoryMode)}
                  orientation="horizontal"
                  className="gap-4"
                >
                  <Radio value="add" color="success">
                    <div className="flex flex-col">
                      <span className="font-medium">追加</span>
                      <span className="text-xs text-gray-500">
                        既存カテゴリを保持して新しいカテゴリを追加
                      </span>
                    </div>
                  </Radio>
                  <Radio value="remove" color="danger">
                    <div className="flex flex-col">
                      <span className="font-medium">削除</span>
                      <span className="text-xs text-gray-500">
                        選択したカテゴリを削除
                      </span>
                    </div>
                  </Radio>
                  <Radio value="replace" color="warning">
                    <div className="flex flex-col">
                      <span className="font-medium">置換</span>
                      <span className="text-xs text-gray-500">
                        既存カテゴリを削除して新しいカテゴリに置換
                      </span>
                    </div>
                  </Radio>
                </RadioGroup>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center w-full">
                  <h4 className="text-lg font-semibold">カテゴリ選択</h4>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onPress={handleSelectAllVisible}
                    isDisabled={
                      isCategoryLoading || filteredCategories.length === 0
                    }
                  >
                    {filteredCategories.length > 0 &&
                    filteredCategories.every((c) =>
                      selectedCategoryIds.includes(c.categoryId),
                    )
                      ? "すべて解除"
                      : "すべて選択"}
                  </Button>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                <div className="pb-3">
                  <Input
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    placeholder="カテゴリを検索..."
                    size="sm"
                    variant="bordered"
                    aria-label="カテゴリ検索"
                  />
                </div>
                {isCategoryLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Spinner
                      size="lg"
                      color="primary"
                      label="カテゴリを読み込み中..."
                    />
                  </div>
                ) : categoryList.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    カテゴリがありません
                  </p>
                ) : filteredCategories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    該当するカテゴリがありません
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {filteredCategories.map((category) => (
                      <div
                        key={category.categoryId}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Checkbox
                          isSelected={selectedCategoryIds.includes(
                            category.categoryId,
                          )}
                          onValueChange={() =>
                            handleCategoryToggle(category.categoryId)
                          }
                          color="primary"
                        />
                        <span className="flex-1 text-sm">
                          {category.categoryName}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {selectedCategoryIds.length > 0 && (
              <Card
                className={`border-2 ${
                  mode === "add"
                    ? "bg-green-50 border-green-200"
                    : mode === "remove"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <CardBody className="py-3">
                  <p
                    className={`text-sm ${
                      mode === "add"
                        ? "text-green-800"
                        : mode === "remove"
                          ? "text-red-800"
                          : "text-yellow-800"
                    }`}
                  >
                    <strong>{selectedCategoryIds.length}</strong>{" "}
                    個のカテゴリが選択されています。
                    {mode === "add" &&
                      "このファイルのすべてのチャンクに選択したカテゴリが追加されます。"}
                    {mode === "remove" &&
                      "このファイルのすべてのチャンクから選択したカテゴリが削除されます。"}
                    {mode === "replace" &&
                      "このファイルのすべてのチャンクのカテゴリが選択したカテゴリに置換されます。"}
                  </p>
                </CardBody>
              </Card>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            color="danger"
            variant="light"
            onPress={handleClose}
            isDisabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            color={
              mode === "add"
                ? "success"
                : mode === "remove"
                  ? "danger"
                  : "warning"
            }
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={selectedCategoryIds.length === 0 || !selectedFile}
          >
            {isSubmitting
              ? "処理中..."
              : mode === "add"
                ? "カテゴリを一括追加"
                : mode === "remove"
                  ? "カテゴリを一括削除"
                  : "カテゴリを一括置換"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkCategoryModal;
