"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Switch,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import {
  CpuChipIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useTenantRoleContext } from "../../../../../context/role/tenantRoleContext";
import { LoadingScreen } from "@common/LoadingScreen";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import {
  get_available_models_v2_tenant_config_available_models_get,
  get_tenant_config_v2_tenant_config_get_config__tenant_id__get,
  update_tenant_config_v2_tenant_config_update_config__tenant_id__put,
} from "@repo/api-contracts/based_template/service";
import type { TenantConfigData } from "./TenantConfigModal";
import { tenantId as firebaseTenantId } from "../../../../../lib/firebase";

export default function TenantAdminSettingPage() {
  const { tenantRole } = useTenantRoleContext();
  const tenantId = firebaseTenantId;

  const [activeTab, setActiveTab] = useState<"ip" | "limits" | "models">("ip");

  // IP制限設定
  const [ipRestrictionMode, setIpRestrictionMode] = useState<
    "NONE" | "JAPAN_ONLY" | "SPECIFIC_IP"
  >("NONE");
  const [ipRestrictionTargets, setIpRestrictionTargets] = useState("");

  // 制限設定
  const [monthlyMaxChatCount, setMonthlyMaxChatCount] = useState("");
  const [monthlyMaxImageCount, setMonthlyMaxImageCount] = useState("");
  const [maxPageCount, setMaxPageCount] = useState("");
  const [maxGroupCount, setMaxGroupCount] = useState("");
  const [maxChatEntryCount, setMaxChatEntryCount] = useState("");
  const [maxBotCount, setMaxBotCount] = useState("");
  const [maxUserCount, setMaxUserCount] = useState("");

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

  // テナント設定の取得
  const {
    data: tenantConfig,
    error: tenantConfigError,
    isLoading: isTenantConfigLoading,
    mutate: mutateTenantConfig,
  } = useSWR(["tenantConfig", tenantId], () =>
    get_tenant_config_v2_tenant_config_get_config__tenant_id__get(tenantId),
  );

  // 利用可能なモデル一覧を取得
  useEffect(() => {
    setIsLoadingModels(true);
    get_available_models_v2_tenant_config_available_models_get()
      .then((response) => {
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
  }, []);

  // テナント設定からフォームの初期値を設定
  useEffect(() => {
    if (!tenantConfig) return;

    setIpRestrictionMode(tenantConfig.ipRestrictionMode || "NONE");
    setIpRestrictionTargets(
      tenantConfig.ipRestrictionTargets?.join("\n") || "",
    );
    setMonthlyMaxChatCount(tenantConfig.monthlyMaxChatCount?.toString() ?? "");
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
  }, [tenantConfig]);

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

  const isChatTypeEnabled = (chatType: string): boolean => {
    const chatTypeModels = modelsByChatType[chatType] || [];
    if (chatTypeModels.length === 0) return false;
    return chatTypeModels.every((model) =>
      allowedAiModels.includes(model.apiModelName),
    );
  };

  const toggleChatType = (chatType: string, enabled: boolean) => {
    const chatTypeModels = modelsByChatType[chatType] || [];
    if (enabled) {
      const newModels = [
        ...allowedAiModels,
        ...chatTypeModels.map((m) => m.apiModelName),
      ];
      setAllowedAiModels([...new Set(newModels)]);
    } else {
      const chatTypeModelNames = chatTypeModels.map((m) => m.apiModelName);
      setAllowedAiModels(
        allowedAiModels.filter((name) => !chatTypeModelNames.includes(name)),
      );
    }
  };

  const inputClassNames = {
    input: "focus:outline-none focus-visible:outline-none",
    inputWrapper:
      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
  };

  // 保存ハンドラー
  const handleSave = async () => {
    const payload: TenantConfigData = {
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
        canEditLimits && maxGroupCount !== "" ? parseInt(maxGroupCount, 10) : 0,
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

    setIsSaving(true);
    try {
      await update_tenant_config_v2_tenant_config_update_config__tenant_id__put(
        tenantId,
        {
          ipRestrictionMode: payload.ipRestrictionMode,
          ipRestrictionTargets: payload.ipRestrictionTargets,
          monthlyMaxChatCount: payload.monthlyMaxChatCount,
          monthlyMaxImageCount: payload.monthlyMaxImageCount,
          maxPageCount: payload.maxPageCount,
          maxGroupCount: payload.maxGroupCount,
          maxChatEntryCount: payload.maxChatEntryCount,
          maxBotCount: payload.maxBotCount,
          maxUserCount: payload.maxUserCount,
          allowedAiModels: payload.allowedAiModels,
        },
      );
      await mutateTenantConfig();
      showSuccessToast("テナント設定を更新しました");
    } catch (err) {
      handleErrorWithUI(err, "テナント設定更新");
    } finally {
      setIsSaving(false);
    }
  };

  // エラー処理
  useEffect(() => {
    if (tenantConfigError) {
      handleErrorWithUI(tenantConfigError, "テナント設定取得");
    }
  }, [tenantConfigError]);

  if (isTenantConfigLoading && !tenantConfig) {
    return (
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <LoadingScreen message="テナント設定を読み込み中..." />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                テナント設定
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                color="default"
                variant="flat"
                size="sm"
                onPress={handleSave}
                isLoading={isSaving}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as typeof activeTab)}
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
            <div className="space-y-4">
              <Card shadow="sm" className="border border-default-200">
                <CardBody className="p-4 space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium">IP制限モード</label>
                    <Select
                      selectedKeys={[ipRestrictionMode]}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        setIpRestrictionMode(
                          selectedKey as "NONE" | "JAPAN_ONLY" | "SPECIFIC_IP",
                        );
                      }}
                      variant="bordered"
                      classNames={{
                        trigger: "min-h-10",
                        value: "text-xs",
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
                      <label className="text-xs font-medium">
                        許可するIPアドレス
                      </label>
                      <Textarea
                        value={ipRestrictionTargets}
                        onChange={(e) =>
                          setIpRestrictionTargets(e.target.value)
                        }
                        variant="bordered"
                        placeholder={"192.168.1.1\n10.0.0.1"}
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
                <div className="space-y-4">
                  <Card shadow="sm" className="border border-default-200">
                    <CardBody className="p-4">
                      <p className="text-xs text-default-500 mb-4">
                        各項目で上限を設定できます。空欄の場合は無制限となります。
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                          <label className="text-xs font-medium">
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
                                    <div className="font-medium text-xs">
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
      </div>
    </div>
  );
}
