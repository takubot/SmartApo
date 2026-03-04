"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Spinner } from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button, Checkbox, Select, SelectItem } from "@heroui/react";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { create_user_to_group_v2_user_to_group_create__group_id__post } from "@repo/api-contracts/based_template/service";
import type { UserToGroupCreateRequestSchemaType } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI } from "@common/errorHandler";

export type Role = "GROUP_OWNER" | "GROUP_MANAGER" | "GROUP_MEMBER";

interface User {
  user_id: string;
  username?: string;
  email?: string;
  role: Role;
}

interface TenantAdminAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  availableUsers: User[];
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function TenantAdminAddMemberModal({
  isOpen,
  onClose,
  groupId,
  availableUsers,
  onSuccess,
  onError,
}: TenantAdminAddMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<Role>("GROUP_MEMBER");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [isAllUsersSelected, setIsAllUsersSelected] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleSelectAllUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(availableUsers.map((user) => user.user_id)));
    } else {
      setSelectedUserIds(new Set());
    }
    setIsAllUsersSelected(checked);
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
    setIsAllUsersSelected(newSelected.size === availableUsers.length);
  };

  const handleAddMember = async () => {
    if (!groupId || selectedUserIds.size === 0 || isAdding) return;

    setIsAdding(true);
    try {
      const addPromises = Array.from(selectedUserIds).map((userId) => {
        const requestData: UserToGroupCreateRequestSchemaType = {
          userId,
          groupRole: selectedRole,
        };
        return create_user_to_group_v2_user_to_group_create__group_id__post(
          groupId,
          requestData,
        );
      });

      await Promise.all(addPromises);
      onSuccess();

      // リセット
      setSelectedUserIds(new Set());
      setIsAllUsersSelected(false);
      setSelectedRole("GROUP_MEMBER");
      onClose();
    } catch (e: unknown) {
      handleErrorWithUI(e, "メンバー追加", onError);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedUserIds(new Set());
    setIsAllUsersSelected(false);
    setSelectedRole("GROUP_MEMBER");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="4xl">
      <ModalContent>
        <ModalHeader>メンバーを追加</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* role select */}
            <div>
              <label
                id="add_role_label"
                htmlFor="role"
                className="block text-sm font-medium mb-1"
              >
                権限 *
              </label>
              <Select
                id="role"
                aria-labelledby="add_role_label"
                labelPlacement="outside-left"
                placeholder="権限を選択"
                selectedKeys={new Set([selectedRole])}
                onSelectionChange={(keys) => {
                  const [key] = Array.from(keys);
                  if (key) setSelectedRole(key as Role);
                }}
                radius="md"
              >
                <SelectItem key="GROUP_OWNER" textValue="オーナー">
                  オーナー
                </SelectItem>
                <SelectItem key="GROUP_MEMBER" textValue="メンバー">
                  メンバー
                </SelectItem>
              </Select>
            </div>

            {/* user selection table */}
            <div>
              <div className="max-h-64 overflow-auto border border-default-200 rounded-lg">
                <Table aria-label="ユーザー選択" shadow="none">
                  <TableHeader>
                    <TableColumn>
                      <Checkbox
                        isSelected={isAllUsersSelected}
                        onValueChange={handleSelectAllUsers}
                        aria-label="全選択"
                      />
                    </TableColumn>
                    <TableColumn>ユーザー名</TableColumn>
                    <TableColumn>メール</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {availableUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <Checkbox
                            isSelected={selectedUserIds.has(user.user_id)}
                            onValueChange={(checked) =>
                              handleSelectUser(user.user_id, checked)
                            }
                            aria-label={`${user.username || user.user_id}を選択`}
                          />
                        </TableCell>
                        <TableCell>{user.username || "未設定"}</TableCell>
                        <TableCell>{user.email || "未設定"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                選択中: {selectedUserIds.size}人
              </div>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" color="default" onPress={handleClose}>
            キャンセル
          </Button>
          <Button
            variant="solid"
            color="primary"
            onPress={handleAddMember}
            isDisabled={selectedUserIds.size === 0 || isAdding}
          >
            {isAdding ? (
              <Spinner size="sm" />
            ) : (
              `${selectedUserIds.size}人を追加`
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
