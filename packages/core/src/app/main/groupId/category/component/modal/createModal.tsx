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

type CreateModalProps = {
  isOpen: boolean;
  isCreating: boolean;
  name: string;
  onClose: () => void;
  onChangeName: (name: string) => void;
  onSubmit: () => void;
};

export default function CreateModal({
  isOpen,
  isCreating,
  name,
  onClose,
  onChangeName,
  onSubmit,
}: CreateModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader className="text-lg">新しいカテゴリーを作成</ModalHeader>
        <ModalBody>
          <Input
            label="カテゴリー名"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            placeholder="カテゴリー名を入力"
            variant="bordered"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isCreating) {
                onSubmit();
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={isCreating}>
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={onSubmit}
            isLoading={isCreating}
            isDisabled={!name.trim()}
          >
            作成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
