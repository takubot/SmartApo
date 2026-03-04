"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Button } from "@heroui/react";
import React from "react";
import { mutate as globalMutate } from "swr";

import { delete_bot_v2_bot_delete__group_id___bot_id__post } from "@repo/api-contracts/based_template/service";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import validator from "validator";
import { useGroupContext } from "../../layout-client";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

/**
 * ボット削除 (POST /delete/bot/{group_id}/{bot_id})
 */
export async function botDeleteRequest(groupId: string, botId: number) {
  if (!validator.isUUID(groupId)) {
    throw new Error(`Invalid groupId: ${groupId}`);
  }

  try {
    return await delete_bot_v2_bot_delete__group_id___bot_id__post(
      groupId,
      botId.toString(),
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      (error as { response?: { status?: number } }).response?.status === 401
    ) {
      console.log("認証エラー: ログインページにリダイレクトします");
      window.location.href = "/login";
      throw new Error("認証エラー: ログインが必要です");
    }
    throw new Error("ボット削除に失敗しました");
  }
}

/** groupId がUUIDか判定する簡易関数 */
function isValidUuid(value: string | undefined): boolean {
  if (!value) return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

interface BotDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBot: BotResponseSchemaType | null;
}

export const BotDeleteModal: React.FC<BotDeleteModalProps> = ({
  isOpen,
  onClose,
  targetBot,
}) => {
  // グループIDを取得
  const groupId = useGroupContext();

  // 削除ロジック
  const handleDeleteBot = async () => {
    if (!targetBot) return;

    if (!isValidUuid(groupId)) {
      handleErrorWithUI({ message: "グループIDが不正です。" }, "ボット削除");
      return;
    }

    try {
      await botDeleteRequest(groupId!, targetBot.botId);

      showSuccessToast("ボットを削除しました");
      onClose();

      // 一覧とアイコン一覧を再取得（SWRキーに合わせて更新）
      globalMutate(["bot-list", groupId]);
      globalMutate(["bot-icons", groupId]);
    } catch (error) {
      handleErrorWithUI(error, "ボット削除");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent className="shadow-lg">
        <ModalHeader className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-800">
          削除の確認
        </ModalHeader>
        <ModalBody>
          {targetBot ? (
            <p>
              ボット「{targetBot.botName}」を削除してもよろしいですか？
              <br />
              この操作は取り消せません。
            </p>
          ) : (
            <p>削除対象のボットがありません。</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="default" variant="light" onPress={onClose}>
            キャンセル
          </Button>
          <Button
            color="danger"
            onPress={handleDeleteBot}
            className="shadow-md"
          >
            削除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
