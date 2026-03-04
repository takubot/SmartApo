"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type EditModalProps = {
  isOpen: boolean;
  isUpdating: boolean;
  category: CategoryResponseSchemaType | null;
  onClose: () => void;
  onChangeName: (name: string) => void;
  onSubmit: () => void;
};

export default function EditModal({
  isOpen,
  isUpdating,
  category,
  onClose,
  onChangeName,
  onSubmit,
}: EditModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader className="text-lg">カテゴリーを編集</ModalHeader>
        <ModalBody>
          {category && (
            <Input
              label="カテゴリー名"
              value={category.categoryName || ""}
              onChange={(e) => onChangeName(e.target.value)}
              variant="bordered"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isUpdating) {
                  onSubmit();
                }
              }}
            />
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isUpdating}>
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={onSubmit}
            isLoading={isUpdating}
            isDisabled={!category?.categoryName?.trim()}
          >
            更新
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
