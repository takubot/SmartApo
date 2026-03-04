"use client";

import React, { useEffect, useState } from "react";
import { basedTemplateService } from "@repo/api-contracts/based_template/service";
import type {
  SuggestPackageUpdateRequestSchemaType,
  SuggestPackageCreateRequestSchemaType,
  BotResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button, Input, Spinner, Checkbox } from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  groupId: string;
  suggestId?: number; // edit のとき必須
  defaultName?: string; // create のときは未指定でOK
  defaultDescription?: string | null;
  defaultBotIdList?: number[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function PackageDialog({
  mode,
  groupId,
  suggestId,
  defaultName = "",
  defaultDescription = "",
  defaultBotIdList = [],
  isOpen,
  onClose,
  onSubmitted,
}: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription ?? "");
  const [selectedBotIds, setSelectedBotIds] = useState<number[]>(
    defaultBotIdList ?? [],
  );
  const [botList, setBotList] = useState<BotResponseSchemaType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // defaultBotIdList は配列参照が毎レンダーで変わり得るため、内容ベースのキーを用意
  const defaultBotsKey = React.useMemo(
    () => JSON.stringify(defaultBotIdList ?? []),
    [defaultBotIdList],
  );

  useEffect(() => {
    if (!isOpen) return;

    // 変更がある時だけ更新（無駄な再レンダーと依存ループを防止）
    setName((prev) => (prev === defaultName ? prev : defaultName));
    const nextDesc = defaultDescription ?? "";
    setDescription((prev) => (prev === nextDesc ? prev : nextDesc));
    const nextBots = defaultBotIdList ?? [];
    setSelectedBotIds((prev) => {
      if (
        prev.length === nextBots.length &&
        prev.every((v, i) => v === nextBots[i])
      ) {
        return prev;
      }
      return nextBots;
    });
  }, [
    isOpen,
    mode,
    suggestId,
    defaultName,
    defaultDescription,
    defaultBotsKey,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchBots = async () => {
      setLoadingBots(true);
      try {
        const data =
          await basedTemplateService.list_bot_v2_bot_list__group_id__post(
            groupId,
            {
              includeIcon: false,
            },
          );
        setBotList(data?.botList || []);
      } catch (error) {
        handleErrorWithUI(error, "ボット一覧取得");
      } finally {
        setLoadingBots(false);
      }
    };
    fetchBots();
  }, [groupId, isOpen]);

  const submit = async () => {
    if (selectedBotIds.length === 0) {
      setError("少なくとも1つのボットを選択してください");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "edit") {
        const body: SuggestPackageUpdateRequestSchemaType = {
          suggestName: name,
          description,
          suggestBotList: selectedBotIds,
        };
        await basedTemplateService.update_package_v2_suggest_update_package__suggest_id__put(
          String(suggestId!),
          body,
        );
        showSuccessToast("パッケージ更新");
      } else {
        const body: SuggestPackageCreateRequestSchemaType = {
          suggestName: name,
          description,
          suggestBotList: selectedBotIds,
        };
        await basedTemplateService.create_package_v2_suggest_create_package__group_id__post(
          groupId,
          body,
        );
        showSuccessToast("パッケージ作成");
      }
      onSubmitted();
    } catch (e: unknown) {
      handleErrorWithUI(
        e,
        mode === "edit" ? "パッケージ更新" : "パッケージ作成",
        setError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>
          {mode === "edit" ? "パッケージを編集" : "パッケージを作成"}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">名称</label>
              <Input value={name} onValueChange={setName} isRequired />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">説明</label>
              <Input
                value={description}
                onValueChange={setDescription}
                placeholder="任意"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                <span>
                  ボット選択 <span className="text-red-500">*</span>
                </span>
              </label>
              {loadingBots ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" />
                  <span className="text-sm text-gray-500">
                    ボット一覧を読み込み中...
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {botList.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      利用可能なボットがありません
                    </p>
                  ) : (
                    botList.map((bot) => (
                      <Checkbox
                        key={bot.botId}
                        isSelected={selectedBotIds.includes(bot.botId)}
                        onValueChange={(isSelected) => {
                          if (isSelected) {
                            setSelectedBotIds([...selectedBotIds, bot.botId]);
                          } else {
                            setSelectedBotIds(
                              selectedBotIds.filter((id) => id !== bot.botId),
                            );
                          }
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {bot.botName}
                          </span>
                          {bot.botDescription && (
                            <span className="text-xs text-gray-500">
                              {bot.botDescription}
                            </span>
                          )}
                        </div>
                      </Checkbox>
                    ))
                  )}
                </div>
              )}
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose} isDisabled={loading}>
            キャンセル
          </Button>
          <Button
            color="primary"
            variant="solid"
            onPress={submit}
            isDisabled={loading || !name.trim() || selectedBotIds.length === 0}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : mode === "edit" ? (
              "更新"
            ) : (
              "作成"
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
