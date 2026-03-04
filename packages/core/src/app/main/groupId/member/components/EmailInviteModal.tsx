"use client";

import { Mail, UserPlus, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { create_user_to_group_by_email_v2_user_to_group_create_by_email__group_id__post } from "@repo/api-contracts/based_template/service";
import type { UserToGroupCreateByEmailRequestSchemaType } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI } from "@common/errorHandler";

export type Role = "GROUP_OWNER" | "GROUP_MANAGER" | "GROUP_MEMBER";

interface EmailInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function EmailInviteModal({
  isOpen,
  onClose,
  groupId,
  onSuccess,
  onError,
}: EmailInviteModalProps) {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("GROUP_MEMBER");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setError(null);
  };

  const handleInvite = async () => {
    if (!groupId || isInviting || !email || !validateEmail(email)) return;

    setIsInviting(true);
    try {
      const requestData: UserToGroupCreateByEmailRequestSchemaType = {
        email: email,
        groupRole: selectedRole,
      };

      await create_user_to_group_by_email_v2_user_to_group_create_by_email__group_id__post(
        groupId,
        requestData,
      );

      onSuccess();

      // リセット
      setEmail("");
      setError(null);
      setSelectedRole("GROUP_MEMBER");
      onClose();
    } catch (e: unknown) {
      handleErrorWithUI(e, "メンバー招待", onError);
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setSelectedRole("GROUP_MEMBER");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold">メンバーを招待</h3>
          <p className="text-sm text-gray-600">
            メールアドレスでユーザーを招待します
          </p>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            {/* 権限選択 */}
            <div>
              <label
                id="invite_role_label"
                htmlFor="role"
                className="block text-sm font-medium mb-2"
              >
                招待する権限 *
              </label>
              <Select
                id="role"
                aria-labelledby="invite_role_label"
                placeholder="権限を選択"
                selectedKeys={new Set([selectedRole])}
                onSelectionChange={(keys) => {
                  const [key] = Array.from(keys);
                  if (key) setSelectedRole(key as Role);
                }}
                radius="md"
                className="max-w-xs"
              >
                <SelectItem key="GROUP_OWNER" textValue="オーナー">
                  <div className="flex flex-col">
                    <span className="font-medium">オーナー</span>
                    <span className="text-xs text-gray-500">
                      グループの完全な管理権限
                    </span>
                  </div>
                </SelectItem>
                <SelectItem key="GROUP_MEMBER" textValue="メンバー">
                  <div className="flex flex-col">
                    <span className="font-medium">メンバー</span>
                    <span className="text-xs text-gray-500">
                      基本的な利用権限
                    </span>
                  </div>
                </SelectItem>
              </Select>
            </div>

            {/* メールアドレス入力 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                メールアドレス *
              </label>
              <Input
                id="email"
                type="email"
                placeholder="招待するユーザーのメールアドレスを入力"
                value={email}
                onValueChange={handleEmailChange}
                startContent={<Mail size={16} />}
                className="w-full"
              />
              {email && !validateEmail(email) && (
                <p className="text-sm text-red-500 mt-1">
                  有効なメールアドレスを入力してください
                </p>
              )}
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <AlertCircle size={16} className="text-danger-600" />
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" color="default" onPress={handleClose}>
            キャンセル
          </Button>
          <Button
            variant="solid"
            color="primary"
            onPress={handleInvite}
            isDisabled={!email || !validateEmail(email) || isInviting}
            startContent={
              isInviting ? <Spinner size="sm" /> : <UserPlus size={16} />
            }
          >
            {isInviting ? "招待中..." : "招待する"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
