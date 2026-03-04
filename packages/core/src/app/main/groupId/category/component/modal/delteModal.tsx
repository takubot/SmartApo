"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type DeleteModalProps = {
  isOpen: boolean;
  isDeleting: boolean;
  category: CategoryResponseSchemaType | null;
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteModal({
  isOpen,
  isDeleting,
  category,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="text-lg">カテゴリーを削除</ModalHeader>
        <ModalBody>
          {category && (
            <div className="space-y-4">
              <p className="text-lg">
                「<span className="font-semibold">{category.categoryName}</span>
                」を削除しますか？
              </p>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-900">
                      この操作は取り消せません
                    </h4>
                    <ul className="text-sm text-red-800 space-y-1">
                      <li>• カテゴリーが完全に削除されます</li>
                      <li>
                        • 関連する {category.chunkList?.length ?? 0}{" "}
                        個のチャンクとの紐付けも削除されます
                      </li>
                      <li>• この操作は元に戻すことができません</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isDeleting}>
            キャンセル
          </Button>
          <Button color="danger" onPress={onConfirm} isLoading={isDeleting}>
            削除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
