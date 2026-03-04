"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

interface HumanHandoffConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export default function HumanHandoffConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: HumanHandoffConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={!isLoading}>
      <ModalContent>
        <ModalHeader>有人対応へ切り替えますか？</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600">
            これ以降はオペレーター接続待機状態になります。よろしければ続行してください。
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={onClose}
            isDisabled={isLoading}
            color="default"
          >
            キャンセル
          </Button>
          <Button color="warning" onPress={onConfirm} isLoading={isLoading}>
            有人対応を開始
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
