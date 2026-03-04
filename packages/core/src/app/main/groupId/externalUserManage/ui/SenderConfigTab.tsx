"use client";

import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { PencilLine, Plus, Trash2 } from "lucide-react";
import type { UseExternalUserManageResult } from "../hooks/useExternalUserManage";

type Props = {
  state: UseExternalUserManageResult;
};

export function SenderConfigTab({ state }: Props) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      <Card className="border border-default-200 xl:col-span-5">
        <CardHeader className="pb-1">
          <div className="w-full flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">送信元設定</h2>
            {state.editingSenderConfigId ? (
              <Chip size="sm" color="primary" variant="flat">
                編集モード
              </Chip>
            ) : (
              <Chip size="sm" color="success" variant="flat">
                新規追加
              </Chip>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-default-700">
              送信元表示名（任意）
            </p>
            <Input
              size="sm"
              placeholder="例: サポート窓口"
              value={state.senderNameInput}
              onValueChange={state.setSenderNameInput}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-default-700">
              送信元メールアドレス
            </p>
            <Input
              size="sm"
              placeholder="example@domain.com"
              value={state.senderEmailInput}
              onValueChange={state.setSenderEmailInput}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-default-700">
              アプリパスワード
            </p>
            <Input
              size="sm"
              type="password"
              placeholder="xxxx xxxx xxxx xxxx"
              value={state.senderAppPasswordInput}
              onValueChange={state.setSenderAppPasswordInput}
            />
            <p className="text-[11px] text-default-500 leading-relaxed">
              {state.editingSenderConfigId
                ? "編集時は入力したときのみアプリパスワードを更新します。"
                : "新規追加時はアプリパスワードの入力が必須です。"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              color="primary"
              onPress={state.handleSaveSenderConfig}
              isLoading={state.isSavingSenderConfig}
              startContent={
                state.editingSenderConfigId ? (
                  <PencilLine className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )
              }
            >
              {state.editingSenderConfigId ? "更新する" : "追加する"}
            </Button>
            <Button variant="flat" onPress={state.resetSenderForm}>
              クリア
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 xl:col-span-7">
        <CardHeader className="pb-1">
          <h2 className="text-sm font-semibold">送信元一覧</h2>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-2">
            {state.senderConfigList.length === 0 && (
              <div className="text-sm text-default-500 py-6 text-center">
                送信元設定がありません
              </div>
            )}
            {state.senderConfigList.map((senderConfig) => {
              const senderConfigId = String(senderConfig.senderConfigId);
              const isEditing = state.editingSenderConfigId === senderConfigId;
              return (
                <div
                  key={senderConfigId}
                  className={`rounded-lg border p-3 ${
                    isEditing
                      ? "border-primary bg-primary-50"
                      : "border-default-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        {senderConfig.senderName || "(表示名なし)"}
                      </p>
                      <p className="text-sm text-default-700 break-all">
                        {senderConfig.senderEmail}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="flat"
                        onPress={() =>
                          state.handleStartEditSenderConfig(senderConfigId)
                        }
                        startContent={<PencilLine className="w-4 h-4" />}
                      >
                        編集
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        isLoading={
                          state.deletingSenderConfigId === senderConfigId
                        }
                        onPress={() =>
                          state.handleDeleteSenderConfig(senderConfigId)
                        }
                        startContent={<Trash2 className="w-4 h-4" />}
                      >
                        削除
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
