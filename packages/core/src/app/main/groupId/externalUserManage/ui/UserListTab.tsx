"use client";

import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { Search, Send, Tags } from "lucide-react";
import type { UseExternalUserManageResult } from "../hooks/useExternalUserManage";
import { normalizeExternalUserId } from "../hooks/useExternalUserManage";

type Props = {
  state: UseExternalUserManageResult;
};

export function UserListTab({ state }: Props) {
  return (
    <div className="space-y-3">
      <Card className="border border-default-200">
        <CardBody className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 py-3">
          <Input
            size="sm"
            className="xl:col-span-4"
            label="ユーザー検索"
            labelPlacement="outside"
            placeholder="名前 / メール"
            value={state.searchTerm}
            onValueChange={state.setSearchTerm}
            startContent={<Search className="w-4 h-4 text-default-400" />}
          />
          <Select
            size="sm"
            className="xl:col-span-2"
            label="外部ユーザータグ"
            labelPlacement="outside"
            selectedKeys={[state.selectedTag]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key) state.setSelectedTag(String(key));
            }}
            startContent={<Tags className="w-4 h-4 text-default-500" />}
            items={[
              { key: "all", label: "すべて" },
              ...state.tagOptionList.map((tag) => ({ key: tag, label: tag })),
            ]}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
          <Select
            size="sm"
            className="xl:col-span-2"
            label="予約アイテム"
            labelPlacement="outside"
            selectedKeys={[state.bookingMenuFilter]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (!key) return;
              state.setBookingMenuFilter(String(key));
            }}
            items={[
              { key: "none", label: "なし" },
              ...state.bookingMenuOptionList,
            ]}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
          <Select
            size="sm"
            className="xl:col-span-2"
            label="送信対象フィルタ"
            labelPlacement="outside"
            selectedKeys={[state.sendTargetFilter]}
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (!key) return;
              state.setSendTargetFilter(key as "all" | "unsent" | "sent");
            }}
          >
            <SelectItem key="all">すべて</SelectItem>
            <SelectItem key="unsent">未送信のみ（選択テンプレ）</SelectItem>
            <SelectItem key="sent">送信済みのみ（選択テンプレ）</SelectItem>
          </Select>
          <Select
            size="sm"
            className="xl:col-span-2"
            label="送信テンプレート"
            labelPlacement="outside"
            placeholder="テンプレートを選択"
            selectedKeys={
              state.selectedTemplateId ? [state.selectedTemplateId] : []
            }
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              if (key) state.setSelectedTemplateId(String(key));
            }}
          >
            {state.mailTemplateList.map((template) => (
              <SelectItem key={String(template.mailTemplateId)}>
                {template.templateName}
              </SelectItem>
            ))}
          </Select>
          <Select
            size="sm"
            className="xl:col-span-1"
            label="送信元（任意）"
            labelPlacement="outside"
            placeholder="既定を使用"
            selectedKeys={
              state.selectedSenderConfigId ? [state.selectedSenderConfigId] : []
            }
            onSelectionChange={(keys) => {
              const key = Array.from(keys)[0];
              state.setSelectedSenderConfigId(key ? String(key) : "");
            }}
          >
            {state.senderConfigList.map((senderConfig) => (
              <SelectItem key={String(senderConfig.senderConfigId)}>
                {senderConfig.senderEmail}
              </SelectItem>
            ))}
          </Select>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardBody className="py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Chip size="sm" variant="flat" color="primary">
                表示 {state.totalCount} 件
              </Chip>
              <Chip size="sm" variant="flat" color="success">
                送信可能 {state.mailableCount} 件
              </Chip>
              <Chip size="sm" variant="flat" color="warning">
                選択中 {state.selectedCount} 件
              </Chip>
              {state.selectedTemplateIdNumber !== null && (
                <Chip size="sm" variant="flat" color="danger">
                  送信済み重複候補 {state.selectedAlreadySentCount} 件
                </Chip>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                isSelected={state.allowResend}
                onValueChange={state.setAllowResend}
              >
                送信済みにも再送する
              </Checkbox>
              <Button
                color="primary"
                onPress={state.handleSendBulkMail}
                isLoading={state.isSendingMail}
                startContent={<Send className="w-4 h-4" />}
              >
                一斉送信
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200">
        <CardBody className="pt-2">
          <Table
            aria-label="external-users-table"
            removeWrapper
            classNames={{
              th: "bg-default-100 text-default-700 text-xs font-semibold",
              td: "align-top",
            }}
          >
            <TableHeader>
              <TableColumn width={170}>
                <Checkbox
                  size="sm"
                  isSelected={state.isAllFilteredUsersSelected}
                  onValueChange={state.handleToggleSelectAll}
                >
                  全選択
                </Checkbox>
              </TableColumn>
              <TableColumn>ユーザー名</TableColumn>
              <TableColumn>メール</TableColumn>
              <TableColumn width={120}>予約</TableColumn>
              <TableColumn width={220}>予約アイテム</TableColumn>
              <TableColumn width={160}>送信状況</TableColumn>
              <TableColumn>タグ</TableColumn>
              <TableColumn width={180}>登録日時</TableColumn>
            </TableHeader>
            <TableBody emptyContent="条件に一致する外部ユーザーがいません">
              {state.searchedUsers.map((user) => {
                const userId = normalizeExternalUserId(user.externalUserId);
                return (
                  <TableRow key={userId || String(user.externalUserId)}>
                    <TableCell>
                      <Checkbox
                        isSelected={state.selectedUserIdSet.has(userId)}
                        isDisabled={!userId}
                        onValueChange={(checked) =>
                          state.handleToggleUser(userId, checked)
                        }
                        aria-label={`${user.displayName || userId}を選択`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">
                        {user.displayName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.email ? (
                        <span className="text-sm break-all">{user.email}</span>
                      ) : (
                        <Chip size="sm" variant="flat" color="default">
                          未登録
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.hasBooking ? (
                        <Chip size="sm" color="success" variant="flat">
                          予約あり
                        </Chip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat">
                          予約なし
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.bookingMenuNameList ?? []).length > 0 ? (
                          (user.bookingMenuNameList ?? []).map((menuName) => (
                            <Chip key={menuName} size="sm" variant="flat">
                              {menuName}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-xs text-default-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {state.selectedTemplateIdNumber !== null &&
                      (user.sentMailTemplateIdList ?? []).includes(
                        state.selectedTemplateIdNumber,
                      ) ? (
                        <Chip size="sm" color="warning" variant="flat">
                          このテンプレートは送信済み
                        </Chip>
                      ) : (
                        <Chip size="sm" color="success" variant="flat">
                          未送信
                        </Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.externalUserTagList ?? []).length > 0 ? (
                          (user.externalUserTagList ?? []).map((tag) => (
                            <Chip key={tag} size="sm" variant="flat">
                              {tag}
                            </Chip>
                          ))
                        ) : (
                          <span className="text-xs text-default-400">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(user.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
