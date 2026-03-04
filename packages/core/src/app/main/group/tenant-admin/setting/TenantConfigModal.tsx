"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Card, CardBody } from "@heroui/react";
import { Input, Textarea } from "@heroui/react";
import { Select, SelectItem } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";
import { Switch } from "@heroui/react";
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { get_available_models_v2_tenant_config_available_models_get } from "@repo/api-contracts/based_template/service";

interface TenantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: TenantConfigData) => Promise<void>;
  tenantConfig:
    | {
        id: string;
        ipRestrictionMode: "NONE" | "JAPAN_ONLY" | "SPECIFIC_IP";
        ipRestrictionTargets: string[];
        monthlyMaxChatCount?: number | null;
        monthlyMaxImageCount?: number | null;
        maxPageCount?: number | null;
        maxGroupCount?: number | null;
        maxChatEntryCount?: number | null;
        maxBotCount?: number | null;
        maxUserCount?: number | null;
        allowedAiModels?: string[];
      }
    | null
    | undefined;
  tenantRole: "TENANT_ADMIN" | "TENANT_SETTING_ADMIN" | string;
}

export interface TenantConfigData {
  ipRestrictionMode: "NONE" | "JAPAN_ONLY" | "SPECIFIC_IP" | null;
  ipRestrictionTargets: string[] | null;
  monthlyMaxChatCount: number | null;
  monthlyMaxImageCount: number | null;
  maxPageCount: number | null;
  maxGroupCount: number | null;
  maxChatEntryCount: number | null;
  maxBotCount: number | null;
  maxUserCount: number | null;
  allowedAiModels: string[] | null;
}

export default function TenantConfigModal({
  isOpen,
  onClose,
  onSave,
  tenantConfig,
  tenantRole,
}: TenantConfigModalProps) {
  const [activeTab, setActiveTab] = useState("ip");

  // IP制限設定
  const [ipRestrictionMode, setIpRestrictionMode] = useState<
    "NONE" | "JAPAN_ONLY" | "SPECIFIC_IP"
  >("NONE");
  const [ipRestrictionTargets, setIpRestrictionTargets] = useState<string>("");

  // 制限設定
  const [monthlyMaxChatCount, setMonthlyMaxChatCount] = useState<string>("");
  const [monthlyMaxImageCount, setMonthlyMaxImageCount] = useState<string>("");
  const [maxPageCount, setMaxPageCount] = useState<string>("");
  const [maxGroupCount, setMaxGroupCount] = useState<string>("");
  const [maxChatEntryCount, setMaxChatEntryCount] = useState<string>("");
  const [maxBotCount, setMaxBotCount] = useState<string>("");
  const [maxUserCount, setMaxUserCount] = useState<string>("");

  // モデル制限設定
  const [allowedAiModels, setAllowedAiModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<
    Array<{
      apiModelName: string;
      displayName: string;
      chatType: string;
    }>
  >([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // TENANT_ADMINはIP制限のみ編集可能、TENANT_SETTING_ADMINはすべて編集可能
  const canEditLimits = tenantRole === "TENANT_SETTING_ADMIN";

  // 利用可能なモデル一覧を取得
  useEffect(() => {
    if (isOpen) {
      setIsLoadingModels(true);
      get_available_models_v2_tenant_config_available_models_get()
        .then((response) => {
          // レスポンスは { models: [...] } の形式
          if (response && Array.isArray(response.models)) {
            setAvailableModels(response.models);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch AI models:", error);
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    }
  }, [isOpen]);

  // モーダルが開かれた時、または設定が変更された時に初期値を設定
  useEffect(() => {
    if (isOpen && tenantConfig) {
      setIpRestrictionMode(tenantConfig.ipRestrictionMode || "NONE");
      setIpRestrictionTargets(
        tenantConfig.ipRestrictionTargets?.join("\n") || "",
      );
      setMonthlyMaxChatCount(
        tenantConfig.monthlyMaxChatCount?.toString() ?? "",
      );
      setMonthlyMaxImageCount(
        tenantConfig.monthlyMaxImageCount?.toString() ?? "",
      );
      setMaxPageCount(tenantConfig.maxPageCount?.toString() ?? "");
      setMaxGroupCount(tenantConfig.maxGroupCount?.toString() ?? "");
      setMaxChatEntryCount(tenantConfig.maxChatEntryCount?.toString() ?? "");
      setMaxBotCount(tenantConfig.maxBotCount?.toString() ?? "");
      setMaxUserCount(tenantConfig.maxUserCount?.toString() ?? "");
      setAllowedAiModels(tenantConfig.allowedAiModels || []);
      setActiveTab("ip");
    }
  }, [isOpen, tenantConfig]);

  // chatTypeごとにモデルをグループ化
  const modelsByChatType = useMemo(() => {
    const grouped: Record<string, typeof availableModels> = {};
    availableModels.forEach((model) => {
      const chatType = model.chatType;
      if (!grouped[chatType]) {
        grouped[chatType] = [];
      }
      grouped[chatType].push(model);
    });
    return grouped;
  }, [availableModels]);

  // chatTypeのアイコンパスを取得
  const getChatTypeIcon = (chatType: string): string => {
    switch (chatType) {
      case "BOT_OPENAI":
        return "/botIcon/openai.png";
      case "BOT_ANTHROPIC":
        return "/botIcon/claude.png";
      case "BOT_GEMINI":
        return "/botIcon/gemini.png";
      case "BOT_PERPLEXITY":
        return "/botIcon/perplexity.png";
      case "BOT_NANOBANANA":
        return "/botIcon/nano-banana.png";
      case "BOT_STANDARD":
      case "BOT_AGENTIC":
      case "BOT_OTHER":
      case "SYSTEM_EVENT":
      case "USER":
      case "HUMAN_OPERATOR":
      case "INTERNAL":
        return "/botIcon/default.ico";
      default:
        return "/botIcon/default.ico";
    }
  };

  // chatType名を表示用に変換
  const getChatTypeName = (chatType: string): string => {
    switch (chatType) {
      case "BOT_OPENAI":
        return "OpenAI";
      case "BOT_ANTHROPIC":
        return "Anthropic (Claude)";
      case "BOT_GEMINI":
        return "Google (Gemini)";
      case "BOT_PERPLEXITY":
        return "Perplexity";
      case "BOT_NANOBANANA":
        return "Nano Banana";
      case "BOT_AGENTIC":
        return "Agentic";
      case "BOT_STANDARD":
        return "Standard Bot";
      case "HUMAN_OPERATOR":
        return "Human Operator";
      case "SYSTEM_EVENT":
        return "System Event";
      default:
        return chatType;
    }
  };

  // chatTypeのスイッチ状態を取得（そのchatTypeの全モデルが許可されているか）
  const isChatTypeEnabled = (chatType: string): boolean => {
    const chatTypeModels = modelsByChatType[chatType] || [];
    if (chatTypeModels.length === 0) return false;
    return chatTypeModels.every((model) =>
      allowedAiModels.includes(model.apiModelName),
    );
  };

  // chatTypeのスイッチを切り替え
  const toggleChatType = (chatType: string, enabled: boolean) => {
    const chatTypeModels = modelsByChatType[chatType] || [];
    if (enabled) {
      // そのchatTypeの全モデルを追加
      const newModels = [
        ...allowedAiModels,
        ...chatTypeModels.map((m) => m.apiModelName),
      ];
      // 重複を削除
      setAllowedAiModels([...new Set(newModels)]);
    } else {
      // そのchatTypeの全モデルを削除
      const chatTypeModelNames = chatTypeModels.map((m) => m.apiModelName);
      setAllowedAiModels(
        allowedAiModels.filter((name) => !chatTypeModelNames.includes(name)),
      );
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const config: TenantConfigData = {
        ipRestrictionMode,
        ipRestrictionTargets:
          ipRestrictionMode === "SPECIFIC_IP" && ipRestrictionTargets.trim()
            ? ipRestrictionTargets
                .split("\n")
                .map((ip) => ip.trim())
                .filter((ip) => ip.length > 0)
            : null,
        monthlyMaxChatCount:
          canEditLimits && monthlyMaxChatCount !== ""
            ? parseInt(monthlyMaxChatCount, 10)
            : 0,
        monthlyMaxImageCount:
          canEditLimits && monthlyMaxImageCount !== ""
            ? parseInt(monthlyMaxImageCount, 10)
            : 0,
        maxPageCount:
          canEditLimits && maxPageCount !== "" ? parseInt(maxPageCount, 10) : 0,
        maxGroupCount:
          canEditLimits && maxGroupCount !== ""
            ? parseInt(maxGroupCount, 10)
            : 0,
        maxChatEntryCount:
          canEditLimits && maxChatEntryCount !== ""
            ? parseInt(maxChatEntryCount, 10)
            : 0,
        maxBotCount:
          canEditLimits && maxBotCount !== "" ? parseInt(maxBotCount, 10) : 0,
        maxUserCount:
          canEditLimits && maxUserCount !== "" ? parseInt(maxUserCount, 10) : 0,
        allowedAiModels: allowedAiModels.length > 0 ? allowedAiModels : [],
      };

      await onSave(config);
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
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">テナント設定</h2>
          </div>
          <p className="text-sm text-default-500 font-normal">
            テナント全体のIP制限設定と制限設定を管理できます
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
              key="ip"
              title={
                <div className="flex items-center gap-2">
                  <LockClosedIcon className="h-4 w-4" />
                  <span>IP制限設定</span>
                </div>
              }
            >
              {/* IP制限設定タブ */}
              <div className="space-y-4">
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium">
                        IP制限モード
                      </label>
                      <Select
                        selectedKeys={[ipRestrictionMode]}
                        onSelectionChange={(keys) => {
                          const selectedKey = Array.from(keys)[0] as string;
                          setIpRestrictionMode(
                            selectedKey as
                              | "NONE"
                              | "JAPAN_ONLY"
                              | "SPECIFIC_IP",
                          );
                        }}
                        variant="bordered"
                        classNames={{
                          trigger: "min-h-12",
                          value: "text-sm",
                        }}
                      >
                        <SelectItem key="NONE" textValue="制限なし">
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              制限なし
                            </span>
                            <span className="text-xs text-default-500">
                              IPアドレスによる制限を行いません
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem key="JAPAN_ONLY" textValue="日本国内のみ">
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              日本国内のみ
                            </span>
                            <span className="text-xs text-default-500">
                              日本国内のIPアドレスのみアクセスを許可
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem
                          key="SPECIFIC_IP"
                          textValue="特定IPアドレスのみ"
                        >
                          <div className="flex flex-col py-1">
                            <span className="font-medium text-foreground">
                              特定IPアドレスのみ
                            </span>
                            <span className="text-xs text-default-500">
                              指定したIPアドレスのみアクセスを許可
                            </span>
                          </div>
                        </SelectItem>
                      </Select>
                    </div>

                    {ipRestrictionMode === "SPECIFIC_IP" && (
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">
                          許可するIPアドレス
                        </label>
                        <Textarea
                          value={ipRestrictionTargets}
                          onChange={(e) =>
                            setIpRestrictionTargets(e.target.value)
                          }
                          variant="bordered"
                          placeholder="192.168.1.1&#10;10.0.0.1"
                          minRows={4}
                          classNames={inputClassNames}
                        />
                        <p className="text-xs text-default-500">
                          1行に1つのIPアドレスを入力してください
                        </p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {canEditLimits && (
              <>
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
                              最大グループ数
                            </label>
                            <Input
                              type="number"
                              value={maxGroupCount}
                              onValueChange={setMaxGroupCount}
                              variant="bordered"
                              placeholder="無制限"
                              min="1"
                              classNames={inputClassNames}
                            />
                            <p className="text-xs text-default-500">
                              作成できる最大グループ数
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
                  key="models"
                  title={
                    <div className="flex items-center gap-2">
                      <CpuChipIcon className="h-4 w-4" />
                      <span>モデル制限設定</span>
                    </div>
                  }
                >
                  {/* モデル制限設定タブ */}
                  <div className="space-y-4">
                    <Card shadow="sm" className="border border-default-200">
                      <CardBody className="p-4 space-y-4">
                        <p className="text-xs text-default-500 mb-4">
                          各AI種別を有効/無効にすることで、使用可能なモデルを制限できます。
                          すべて無効の場合はRAGモデルのみ使用可能です。
                        </p>
                        {isLoadingModels ? (
                          <div className="text-center py-8 text-default-500">
                            モデル一覧を読み込み中...
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.keys(modelsByChatType).map((chatType) => {
                              const isEnabled = isChatTypeEnabled(chatType);
                              const iconPath = getChatTypeIcon(chatType);
                              const chatTypeName = getChatTypeName(chatType);
                              const chatTypeModels =
                                modelsByChatType[chatType] || [];

                              return (
                                <div
                                  key={chatType}
                                  className="flex items-center justify-between p-4 border border-default-200 rounded-lg"
                                >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="relative w-10 h-10 flex-shrink-0">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={iconPath}
                                        alt={chatTypeName}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">
                                        {chatTypeName}
                                      </div>
                                      <div className="text-xs text-default-500">
                                        {chatTypeModels.length}個のモデル
                                      </div>
                                    </div>
                                  </div>
                                  <Switch
                                    isSelected={isEnabled}
                                    onValueChange={(enabled) =>
                                      toggleChatType(chatType, enabled)
                                    }
                                    color="primary"
                                  />
                                </div>
                              );
                            })}
                            {Object.keys(modelsByChatType).length === 0 && (
                              <div className="text-center py-8 text-default-500">
                                利用可能なモデルが見つかりませんでした
                              </div>
                            )}
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </div>
                </Tab>
              </>
            )}
          </Tabs>
        </ModalBody>
        <ModalFooter className="pt-4 border-t">
          <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
            キャンセル
          </Button>
          <Button color="primary" onPress={handleSave} isLoading={isSaving}>
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
