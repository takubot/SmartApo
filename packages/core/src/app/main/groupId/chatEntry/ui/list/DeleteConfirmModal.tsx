import React, { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Textarea,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { ChatEntryDetailResponseType } from "@repo/api-contracts/based_template/zschema";
import { AlertTriangle, Trash2 } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  selectedChatEntries: ChatEntryDetailResponseType[];
  isLoading: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedChatEntries,
  isLoading,
}) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // モーダルが開かれたときにリセット
  React.useEffect(() => {
    if (isOpen) {
      setConfirmationText("");
      setIsConfirmed(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isConfirmed) {
      await onConfirm();
      handleClose();
    }
  };

  const handleClose = () => {
    setConfirmationText("");
    setIsConfirmed(false);
    onClose();
  };

  const handleConfirmationTextChange = (value: string) => {
    setConfirmationText(value);
    const normalized = value.trim();
    const deleteKeyword = "DELETE";
    const matchesDeleteKeyword = normalized.toUpperCase() === deleteKeyword;
    setIsConfirmed(matchesDeleteKeyword);
  };

  const selectedCount = selectedChatEntries.length;
  // 名称一致は不要（DELETE のみで確認）

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={"xl"}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 text-red-600">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-tight">URL削除確認</span>
            <span className="text-xs text-red-500">{selectedCount} 件</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-5">
            {/* アラートメッセージ */}
            <div className="rounded-lg border border-red-200/60 bg-red-50/60 p-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium leading-6">
                    この操作は取り消せません。削除対象のURL名を正確に入力して確認してください。
                  </p>
                </div>
              </div>
            </div>

            {/* 削除対象の表示（単一・複数共通） */}
            <Card className="shadow-none border border-gray-200">
              <CardBody className="p-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    以下の{" "}
                    <span className="font-semibold">{selectedCount}</span>{" "}
                    件のURLを削除します：
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto pr-1">
                    {selectedChatEntries.map((entry) => (
                      <Chip
                        key={entry.chatEntryId}
                        className="bg-gray-100 text-gray-800"
                        radius="sm"
                        variant="flat"
                      >
                        {entry.entryName || "未設定"}
                      </Chip>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* 影響範囲の説明 */}
            <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-medium mb-1">
                    削除により以下の影響があります：
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800">
                    <li>このURLでのチャット機能が完全に停止します</li>
                    <li>関連する設定データがすべて削除されます</li>
                    <li>埋め込みコードが無効になります</li>
                    <li>この操作は取り消すことができません</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 確認入力欄 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800">
                削除を実行するには DELETE と入力してください：
              </label>
              <Textarea
                placeholder={"DELETE と入力"}
                value={confirmationText}
                onChange={(e) => handleConfirmationTextChange(e.target.value)}
                className={"min-h-[84px]"}
                isInvalid={confirmationText.length > 0 && !isConfirmed}
                errorMessage={
                  confirmationText.length > 0 && !isConfirmed
                    ? "入力されたテキストが正しくありません"
                    : ""
                }
              />
              <div className="text-xs text-gray-600">
                期待される入力：
                <span className="ml-1 font-mono bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  DELETE
                </span>
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            color="default"
            onPress={handleClose}
            isDisabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            color="danger"
            onPress={handleConfirm}
            isLoading={isLoading}
            isDisabled={!isConfirmed}
            startContent={<Trash2 className="h-4 w-4" />}
            className="shadow-md"
          >
            {isLoading ? "削除中..." : "削除実行"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
