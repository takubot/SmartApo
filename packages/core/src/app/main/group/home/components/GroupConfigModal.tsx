"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Card, CardBody } from "@heroui/react";
import { Switch } from "@heroui/switch";
import { Input } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";
import {
  InformationCircleIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface GroupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GroupConfigData) => Promise<void>;
  groupConfig: {
    groupId: string;
    allowGeneralInfoAnswers: boolean;
    botSelectionMethod: string;
    chatFlowType: string;
    monthlyMaxChatCount?: number | null;
    monthlyMaxImageCount?: number | null;
    maxPageCount?: number | null;
    maxChatEntryCount?: number | null;
    maxBotCount?: number | null;
    maxUserCount?: number | null;
  } | null;
  initialGroupData: {
    groupName: string;
    groupDescription: string;
    tag: string;
  };
}

export interface GroupConfigData {
  groupName: string;
  groupDescription: string;
  tag: string;
  allowGeneralInfoAnswers: boolean;
  botSelectionMethod: "CHUNK_BASED" | "DESCRIPTION_BASED";
  chatFlowType: "CHUNK_SEARCH" | "CATEGORY_BASED";
  monthlyMaxChatCount: number | null;
  monthlyMaxImageCount: number | null;
  maxPageCount: number | null;
  maxChatEntryCount: number | null;
  maxBotCount: number | null;
  maxUserCount: number | null;
}

export default function GroupConfigModal({
  isOpen,
  onClose,
  onSave,
  groupConfig,
  initialGroupData,
}: GroupConfigModalProps) {
  const [activeTab, setActiveTab] = useState("basic");

  // 基本情報
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [tag, setTag] = useState("");

  // チャット設定
  const [allowGeneralInfoAnswers, setAllowGeneralInfoAnswers] =
    useState<boolean>(true);
  const [botSelectionMethod, setBotSelectionMethod] =
    useState<string>("CHUNK_BASED");
  const [chatFlowType, setChatFlowType] = useState<string>("CHUNK_SEARCH");

  // 制限設定
  const [monthlyMaxChatCount, setMonthlyMaxChatCount] = useState<string>("");
  const [monthlyMaxImageCount, setMonthlyMaxImageCount] = useState<string>("");
  const [maxPageCount, setMaxPageCount] = useState<string>("");
  const [maxChatEntryCount, setMaxChatEntryCount] = useState<string>("");
  const [maxBotCount, setMaxBotCount] = useState<string>("");
  const [maxUserCount, setMaxUserCount] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);

  // モーダルが開かれた時、または設定が変更された時に初期値を設定
  useEffect(() => {
    if (isOpen) {
      setGroupName(initialGroupData.groupName || "");
      setGroupDescription(initialGroupData.groupDescription || "");
      setTag(initialGroupData.tag || "");

      if (groupConfig) {
        setAllowGeneralInfoAnswers(groupConfig.allowGeneralInfoAnswers ?? true);
        setBotSelectionMethod(groupConfig.botSelectionMethod ?? "CHUNK_BASED");
        setChatFlowType(groupConfig.chatFlowType ?? "CHUNK_SEARCH");
        setMonthlyMaxChatCount(
          groupConfig.monthlyMaxChatCount?.toString() ?? "",
        );
        setMonthlyMaxImageCount(
          groupConfig.monthlyMaxImageCount?.toString() ?? "",
        );
        setMaxPageCount(groupConfig.maxPageCount?.toString() ?? "");
        setMaxChatEntryCount(groupConfig.maxChatEntryCount?.toString() ?? "");
        setMaxBotCount(groupConfig.maxBotCount?.toString() ?? "");
        setMaxUserCount(groupConfig.maxUserCount?.toString() ?? "");
      }
      setActiveTab("basic");
    }
  }, [isOpen, groupConfig, initialGroupData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        groupName,
        groupDescription,
        tag,
        allowGeneralInfoAnswers,
        botSelectionMethod: botSelectionMethod as
          | "CHUNK_BASED"
          | "DESCRIPTION_BASED",
        chatFlowType: chatFlowType as "CHUNK_SEARCH" | "CATEGORY_BASED",
        monthlyMaxChatCount:
          monthlyMaxChatCount === "" ? 0 : parseInt(monthlyMaxChatCount, 10),
        monthlyMaxImageCount:
          monthlyMaxImageCount === "" ? 0 : parseInt(monthlyMaxImageCount, 10),
        maxPageCount: maxPageCount === "" ? 0 : parseInt(maxPageCount, 10),
        maxChatEntryCount:
          maxChatEntryCount === "" ? 0 : parseInt(maxChatEntryCount, 10),
        maxBotCount: maxBotCount === "" ? 0 : parseInt(maxBotCount, 10),
        maxUserCount: maxUserCount === "" ? 0 : parseInt(maxUserCount, 10),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClassNames = {
    input: "focus:outline-none focus-visible:outline-none",
    inputWrapper:
      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-h-[90vh]",
        body: "p-6",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pb-4">
          <h2 className="text-xl font-semibold">グループ設定</h2>
          <p className="text-sm text-default-500 font-normal">
            グループの基本情報、チャット設定、制限設定を管理できます
          </p>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            classNames={{
              tabList: "gap-2 w-full",
              tab: "flex-1",
              panel: "pt-4",
            }}
          >
            <Tab
              key="basic"
              title={
                <div className="flex items-center gap-2">
                  <InformationCircleIcon className="h-4 w-4" />
                  <span>基本情報</span>
                </div>
              }
            >
              {/* 基本情報タブ */}
              <div className="space-y-4">
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        グループ名 <span className="text-danger">*</span>
                      </label>
                      <Input
                        value={groupName}
                        onValueChange={setGroupName}
                        variant="bordered"
                        placeholder="グループ名を入力"
                        classNames={inputClassNames}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        グループの説明
                      </label>
                      <Input
                        value={groupDescription}
                        onValueChange={setGroupDescription}
                        variant="bordered"
                        placeholder="グループの説明を入力"
                        classNames={inputClassNames}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">タグ</label>
                      <Input
                        value={tag}
                        onValueChange={setTag}
                        variant="bordered"
                        placeholder="タグを入力"
                        classNames={inputClassNames}
                      />
                      <p className="text-xs text-default-500">
                        グループを分類するためのタグを設定できます
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab
              key="limits"
              title={
                <div className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4" />
                  <span>制限設定</span>
                </div>
              }
            >
              {/* 制限設定タブ */}
              <div className="space-y-4">
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-4">
                    <p className="text-xs text-default-500 mb-4">
                      各項目で上限を設定できます。空欄の場合は無制限となります。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          月間最大チャット数
                        </label>
                        <Input
                          type="number"
                          value={monthlyMaxChatCount}
                          onValueChange={setMonthlyMaxChatCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          1か月あたりの最大チャット数
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          月間最大画像生成数
                        </label>
                        <Input
                          type="number"
                          value={monthlyMaxImageCount}
                          onValueChange={setMonthlyMaxImageCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          1か月あたりの最大画像生成数
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          最大ページ数
                        </label>
                        <Input
                          type="number"
                          value={maxPageCount}
                          onValueChange={setMaxPageCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          作成できる最大ページ数
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          最大チャットエントリ数
                        </label>
                        <Input
                          type="number"
                          value={maxChatEntryCount}
                          onValueChange={setMaxChatEntryCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          chatEntryの最大設定数
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          最大ボット数
                        </label>
                        <Input
                          type="number"
                          value={maxBotCount}
                          onValueChange={setMaxBotCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          ボットの最大個数
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          最大ユーザー数
                        </label>
                        <Input
                          type="number"
                          value={maxUserCount}
                          onValueChange={setMaxUserCount}
                          variant="bordered"
                          placeholder="無制限"
                          min="1"
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          ユーザーの最大個数
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab
              key="chat"
              title={
                <div className="flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  <span>チャット設定</span>
                </div>
              }
            >
              {/* チャット設定タブ */}
              <div className="space-y-4">
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-4 space-y-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium">
                            一般情報への回答
                          </label>
                          <p className="text-xs text-default-500">
                            参考資料に関連しない一般的な質問にも回答するかどうか
                          </p>
                        </div>
                        <Switch
                          isSelected={allowGeneralInfoAnswers}
                          onValueChange={setAllowGeneralInfoAnswers}
                          color="primary"
                          size="lg"
                        />
                      </div>
                      <div className="bg-default-50 rounded-lg p-3">
                        <p className="text-xs text-default-600">
                          {allowGeneralInfoAnswers
                            ? "✓ 参考資料に関連しない質問にも回答します。より柔軟な回答が可能です。"
                            : "✓ 参考資料に関連する質問のみ回答します。より正確な回答に特化します。"}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex flex-col gap-2 mb-3">
                        <label className="text-sm font-medium">
                          ボット自動選択方式
                        </label>
                        <p className="text-xs text-default-500">
                          質問に対してどのボットが回答するかを自動で決定する方式
                        </p>
                      </div>
                      <Select
                        selectedKeys={[botSelectionMethod]}
                        onSelectionChange={(keys) => {
                          const selectedKey = Array.from(keys)[0] as string;
                          setBotSelectionMethod(selectedKey);
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "min-h-12",
                          value: "text-sm",
                        }}
                      >
                        <SelectItem
                          key="CHUNK_BASED"
                          textValue="チャンクベース"
                        >
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              チャンクベース
                            </span>
                            <span className="text-xs text-default-500">
                              質問内容に最も関連するチャンクを持つボットを自動選択
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem
                          key="DESCRIPTION_BASED"
                          textValue="説明ベース"
                        >
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              説明ベース
                            </span>
                            <span className="text-xs text-default-500">
                              ボットの説明文に基づいてボットを自動選択
                            </span>
                          </div>
                        </SelectItem>
                      </Select>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex flex-col gap-2 mb-3">
                        <label className="text-sm font-medium">
                          チャットフロータイプ
                        </label>
                        <p className="text-xs text-default-500">
                          チャットの回答フローの種類を選択
                        </p>
                      </div>
                      <Select
                        selectedKeys={[chatFlowType]}
                        onSelectionChange={(keys) => {
                          const selectedKey = Array.from(keys)[0] as string;
                          setChatFlowType(selectedKey);
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "min-h-12",
                          value: "text-sm",
                        }}
                      >
                        <SelectItem key="CHUNK_SEARCH" textValue="チャンク検索">
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              チャンク検索
                            </span>
                            <span className="text-xs text-default-500">
                              従来の検索ベースの回答フロー
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem
                          key="CATEGORY_BASED"
                          textValue="カテゴリーベース"
                        >
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              カテゴリーベース
                            </span>
                            <span className="text-xs text-default-500">
                              カテゴリー選択から始まるフロー
                            </span>
                          </div>
                        </SelectItem>
                      </Select>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter className="pt-4 border-t">
          <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!groupName.trim()}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
