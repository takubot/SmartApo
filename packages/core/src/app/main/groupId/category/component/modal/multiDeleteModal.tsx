"use client";

import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import {
  ExclamationTriangleIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type MultiDeleteModalProps = {
  isOpen: boolean;
  isDeleting: boolean;
  selectedCategories: CategoryResponseSchemaType[];
  onClose: () => void;
  onConfirm: () => void;
};

export default function MultiDeleteModal({
  isOpen,
  isDeleting,
  selectedCategories,
  onClose,
  onConfirm,
}: MultiDeleteModalProps) {
  const count = selectedCategories.length;
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>複数のカテゴリーを削除</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className="text-lg">
              選択した{count}個のカテゴリーを削除しますか？
            </p>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 gradient-primary-light shadow-sm">
              <h4 className="font-semibold mb-2 text-primary-800">
                削除対象カテゴリー:
              </h4>
              <div className="space-y-2">
                {selectedCategories.map((category) => (
                  <div
                    key={category.categoryId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <HashtagIcon className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{category.categoryName}</span>
                    {/* チャンク数の表示は削除 */}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-900">
                    この操作は取り消せません
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• 選択したすべてのカテゴリーが完全に削除されます</li>
                    <li>• 関連するチャンクとの紐付けも削除されます</li>
                    <li>• この操作は元に戻すことができません</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isDeleting}>
            キャンセル
          </Button>
          <Button
            color="danger"
            onPress={onConfirm}
            isLoading={isDeleting}
            className="shadow-md"
          >
            {count}個のカテゴリーを削除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
