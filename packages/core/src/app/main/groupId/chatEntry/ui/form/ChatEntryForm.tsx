"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  Button,
  Card,
  CardBody,
  Tabs,
  Tab,
  Spinner,
  Badge,
} from "@heroui/react";
import { useForm, FormProvider } from "react-hook-form";
import {
  BotResponseSchemaType,
  BookingMenuResponseSchemaType,
  ChatEntryDetailResponseType,
  SuggestPackageResponseSchemaType,
  CustomFormResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import GeneralAccessStep from "./tabs/GeneralAccessTab";
import AiConnectionStep from "./tabs/AiConnectionTab";
import DesignSettingsStep from "./tabs/DesignSettingsTab";
import LineIntegrationTabContent from "./tabs/LineIntegrationTab";
import { resolveChatEntryKind } from "../../types";
import { FormData } from "../../hooks/useChatEntryForm";
import {
  ChevronLeft,
  Settings,
  Link,
  Palette,
  MessageCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatEntryFormProps {
  groupId: string;
  entryId?: string;
  editTarget?: ChatEntryDetailResponseType | null;
  botList: BotResponseSchemaType[];
  suggestList: SuggestPackageResponseSchemaType[];
  customFormList: CustomFormResponseSchemaType[];
  bookingMenuList: BookingMenuResponseSchemaType[];
  onSubmit: (data: FormData) => Promise<void>;
  isLoading: boolean;
  isDataLoading: boolean;
  isConnectionDataLoading: boolean;
}

type StepKey = "general" | "aiConnection" | "design" | "line";

const DEFAULT_WEB_CONFIG = {
  webMode: "EXTERNAL_USER_WEB",
  isEmbedUserSyncEnabled: false,
  embedUserPublicKey: null,
  embedUserJwtAlgorithm: "RS256",
  embedUserJwtIssuer: null,
  embedUserJwtAudience: null,
  embedUserIdClaim: "sub",
  embedUserNameClaim: "name",
  embedUserEmailClaim: "email",
  embedUserPictureClaim: "picture",
} as const;

const ChatEntryForm: React.FC<ChatEntryFormProps> = ({
  groupId,
  entryId,
  editTarget,
  botList,
  suggestList,
  customFormList,
  bookingMenuList,
  onSubmit,
  isLoading,
  isDataLoading,
  isConnectionDataLoading,
}) => {
  const router = useRouter();

  const defaultValues = useMemo(() => {
    if (editTarget) {
      const kind = resolveChatEntryKind(editTarget);
      const isLineEntry = kind === "LINE";

      // lineConfig と webConfig の正規化（snake_case も考慮）
      const raw: any = editTarget;
      const normalizedLineConfig = raw.lineConfig || raw.line_config || null;
      const normalizedWebConfig = raw.webConfig || raw.web_config || null;
      const normalizedThemeConfig = raw.themeConfig || raw.theme_config || null;
      const normalizedAccessPolicy =
        raw.accessPolicy || raw.access_policy || null;
      const normalizedPreChatCustomFormId =
        raw.preChatCustomFormId ?? raw.pre_chat_custom_form_id ?? null;
      const normalizedOnDemandCustomFormIdList = (
        raw.onDemandCustomFormIdList ??
        raw.on_demand_custom_form_id_list ??
        []
      )
        .map((id: unknown) => Number(id))
        .filter((id: number) => Number.isInteger(id) && id > 0);
      const normalizedHumanHandoffAvailabilitySlots = (
        raw.humanHandoffAvailabilitySlots ??
        raw.human_handoff_availability_slots ??
        []
      )
        .map((slot: any) => ({
          dayOfWeek: Number(slot?.dayOfWeek ?? slot?.day_of_week),
          startTime: String(slot?.startTime ?? slot?.start_time ?? ""),
          endTime: String(slot?.endTime ?? slot?.end_time ?? ""),
        }))
        .filter(
          (slot: any) =>
            Number.isInteger(slot.dayOfWeek) &&
            slot.dayOfWeek >= 0 &&
            slot.dayOfWeek <= 6 &&
            slot.startTime &&
            slot.endTime,
        );
      const normalizedHandoffBookingMenuIdRaw =
        raw.handoffBookingMenuId ?? raw.handoff_booking_menu_id ?? null;
      const normalizedHandoffBookingMenuId =
        Number.isInteger(Number(normalizedHandoffBookingMenuIdRaw)) &&
        Number(normalizedHandoffBookingMenuIdRaw) > 0
          ? Number(normalizedHandoffBookingMenuIdRaw)
          : null;

      let allowedIpList = "";
      if (
        normalizedAccessPolicy?.allowedIpList &&
        Array.isArray(normalizedAccessPolicy.allowedIpList)
      ) {
        allowedIpList = normalizedAccessPolicy.allowedIpList.join(", ");
      }

      let botIdList: number[] = [];
      if (Array.isArray(raw.botIdList)) {
        botIdList = raw.botIdList.map((v: any) => Number(v));
      } else if (Array.isArray(raw.botIds)) {
        botIdList = raw.botIds.map((v: any) => Number(v));
      }

      return {
        ...editTarget,
        lineConfig: normalizedLineConfig,
        webConfig: isLineEntry
          ? null
          : {
              ...DEFAULT_WEB_CONFIG,
              ...(normalizedWebConfig || {}),
              webMode:
                normalizedWebConfig?.webMode === "EMBED"
                  ? "EXTERNAL_USER_WEB"
                  : (normalizedWebConfig?.webMode ??
                    DEFAULT_WEB_CONFIG.webMode),
              isEmbedUserSyncEnabled:
                normalizedWebConfig?.isEmbedUserSyncEnabled ??
                normalizedWebConfig?.webMode === "EXTERNAL_USER_WEB_WITH_AUTH",
            },
        themeConfig: normalizedThemeConfig || {
          chatButtonColor: "#00AAFF",
          chatWidth: 25,
          chatHeight: 80,
          initialGreeting: "",
          headerColor: "#F1F1F1",
          headerText: "ヘッダー",
          headerTextColor: "#000000",
        },
        accessPolicy: normalizedAccessPolicy || { ipRestrictionMode: "NONE" },
        allowedIpList,
        botIdList,
        preChatCustomFormId: normalizedPreChatCustomFormId,
        onDemandCustomFormIdList: normalizedOnDemandCustomFormIdList,
        isBookingEnabled:
          raw.isBookingEnabled ?? raw.is_booking_enabled ?? false,
        bookingMenuIdList:
          raw.bookingMenuIdList ?? raw.booking_menu_id_list ?? [],
        handoffBookingMenuId: normalizedHandoffBookingMenuId,
        isHumanHandoffEnabled:
          raw.isHumanHandoffEnabled ?? raw.is_human_handoff_enabled ?? false,
        humanHandoffAvailabilitySlots: normalizedHumanHandoffAvailabilitySlots,
        bookingButtonLabel:
          raw.bookingButtonLabel ?? raw.booking_button_label ?? null,
        customFormList: customFormList || [],
      } as FormData;
    }

    return {
      entryName: "",
      showReferenceInfo: false,
      isShowReferenceLink: false,
      isVisible: true,
      selectionType: "BOT",
      botSelectionMethod: "CHUNK_BASED",
      chatFlowType: "CHUNK_SEARCH",
      accessPolicy: { ipRestrictionMode: "NONE" },
      webConfig: DEFAULT_WEB_CONFIG,
      themeConfig: {
        chatButtonColor: "#00AAFF",
        chatWidth: 25,
        chatHeight: 80,
        initialGreeting: "",
        headerColor: "#F1F1F1",
        headerText: "ヘッダー",
        headerTextColor: "#000000",
      },
      customFormList: customFormList || [],
      preChatCustomFormId: null,
      onDemandCustomFormIdList: [],
      bookingMenuIdList: [],
      handoffBookingMenuId: null,
      humanHandoffAvailabilitySlots: [],
    } as FormData;
  }, [editTarget, customFormList]);

  const methods = useForm<FormData>({
    defaultValues,
  });

  const { handleSubmit, watch, reset, trigger } = methods;

  // 編集データの取得完了時にフォームをリセットして値を反映させる
  useEffect(() => {
    if (editTarget && !isDataLoading) {
      reset(defaultValues);
    }
  }, [editTarget, isDataLoading, reset, defaultValues]);

  const formValues = watch();
  const urlType = useMemo(
    () => (resolveChatEntryKind(formValues) === "LINE" ? "LINE" : "WEB"),
    [formValues],
  );
  const stepOrder = useMemo<StepKey[]>(
    () =>
      urlType === "LINE"
        ? ["general", "aiConnection", "design", "line"]
        : ["general", "aiConnection", "design"],
    [urlType],
  );
  const [currentStepKey, setCurrentStepKey] = useState<StepKey>("general");

  useEffect(() => {
    if (!stepOrder.includes(currentStepKey)) {
      const fallbackStep = stepOrder[stepOrder.length - 1];
      if (fallbackStep) {
        setCurrentStepKey(fallbackStep);
      }
    }
  }, [currentStepKey, stepOrder]);

  const currentStepIndex = stepOrder.indexOf(currentStepKey);
  const isLastStep = currentStepIndex === stepOrder.length - 1;

  const getValidationFields = useCallback(
    (stepKey: StepKey): string[] => {
      if (stepKey === "general") {
        const fields = ["entryName"];
        if (urlType === "WEB") {
          fields.push("webConfig.webMode", "accessPolicy.ipRestrictionMode");
          if (formValues.accessPolicy?.ipRestrictionMode === "SPECIFIC_IP") {
            fields.push("allowedIpList");
          }
          if (formValues.webConfig?.isEmbedUserSyncEnabled) {
            fields.push("webConfig.embedUserPublicKey");
          }
        }
        return fields;
      }

      if (stepKey === "aiConnection") {
        const fields = ["selectionType"];
        const selectionType = formValues.selectionType || "BOT";
        if (selectionType === "BOT") {
          fields.push("botIdList");
        } else if (selectionType === "SUGGEST") {
          fields.push("suggestId");
        }
        return fields;
      }

      if (stepKey === "line") {
        return ["lineConfig.botChannelId", "lineConfig.botChannelSecret"];
      }

      return [];
    },
    [formValues, urlType],
  );

  const validateStep = useCallback(
    async (stepKey: StepKey) => {
      const fields = getValidationFields(stepKey);
      if (fields.length === 0) {
        return true;
      }
      return trigger(fields as any, { shouldFocus: true });
    },
    [getValidationFields, trigger],
  );

  const goNext = useCallback(async () => {
    const currentStep = stepOrder[currentStepIndex];
    if (!currentStep) {
      return;
    }

    const isValid = await validateStep(currentStep);
    if (!isValid || isLastStep) {
      return;
    }

    const nextStep = stepOrder[currentStepIndex + 1];
    if (nextStep) {
      setCurrentStepKey(nextStep);
    }
  }, [currentStepIndex, isLastStep, stepOrder, validateStep]);

  const handleSave = useCallback(() => {
    void handleSubmit(onSubmit)();
  }, [handleSubmit, onSubmit]);

  const handlePrimaryAction = useCallback(() => {
    if (isLastStep) {
      handleSave();
      return;
    }
    void goNext();
  }, [goNext, handleSave, isLastStep]);

  const handleSelectionChange = useCallback(
    (key: React.Key) => {
      const nextStep = String(key) as StepKey;
      if (!stepOrder.includes(nextStep) || nextStep === currentStepKey) {
        return;
      }

      const nextIndex = stepOrder.indexOf(nextStep);
      if (nextIndex < currentStepIndex) {
        setCurrentStepKey(nextStep);
        return;
      }

      void (async () => {
        for (let index = currentStepIndex; index < nextIndex; index += 1) {
          const step = stepOrder[index];
          if (!step) {
            return;
          }
          const valid = await validateStep(step);
          if (!valid) {
            return;
          }
        }
        setCurrentStepKey(nextStep);
      })();
    },
    [currentStepIndex, currentStepKey, stepOrder, validateStep],
  );

  if (entryId && isDataLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="primary" />
          <p className="text-default-500 animate-pulse">
            設定を読み込んでいます...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F9FB] overflow-hidden">
      {/* ヘッダー */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 px-5 py-2.5 shadow-sm z-10">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              variant="flat"
              onPress={() => router.push(`/main/${groupId}/chatEntry`)}
              className="bg-default-100 hover:bg-default-200"
              size="sm"
            >
              <ChevronLeft className="w-5 h-5 text-default-600" />
            </Button>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">
                  {entryId ? "外部チャットの編集" : "新規外部チャットの作成"}
                </h1>
                <Badge
                  color={urlType === "WEB" ? "primary" : "success"}
                  variant="flat"
                  size="sm"
                  className="ml-1"
                >
                  {urlType === "WEB" ? "Web" : "LINE"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="light"
              onPress={() => router.push(`/main/${groupId}/chatEntry`)}
              disabled={isLoading}
              className="text-default-600 h-9 px-4"
              size="sm"
            >
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handlePrimaryAction}
              isLoading={isLoading}
              className="font-semibold shadow-md px-6 h-9 text-sm"
              radius="full"
            >
              {isLastStep ? "設定を保存する" : "次へ"}
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full pt-2 pb-4 px-5">
          <FormProvider {...methods}>
            <Tabs
              aria-label="Chat Entry Settings"
              selectedKey={currentStepKey}
              onSelectionChange={handleSelectionChange}
              color="primary"
              variant="underlined"
              classNames={{
                base: "sticky top-0 z-20 bg-[#F8F9FB] pb-0",
                tabList:
                  "inline-flex w-auto justify-start gap-0.5 bg-transparent border-b border-default-200 rounded-none p-0",
                cursor: "h-0.5 bg-primary rounded-full shadow-none",
                tab: "h-8 px-2.5 min-w-0 rounded-t-md text-default-500 data-[hover-unselected=true]:bg-default-100 data-[selected=true]:text-primary",
                tabContent: "font-medium text-[13px]",
              }}
            >
              <Tab
                key="general"
                title={
                  <div className="flex items-center space-x-1.5 text-inherit">
                    <Settings className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">
                      基本・アクセス設定
                    </span>
                  </div>
                }
              >
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Card
                    shadow="none"
                    className="border border-default-200 rounded-xl bg-white"
                  >
                    <CardBody className="p-8">
                      <GeneralAccessStep
                        mode={entryId ? "edit" : "create"}
                        showOnly="general"
                      />
                    </CardBody>
                  </Card>
                </div>
              </Tab>

              <Tab
                key="aiConnection"
                title={
                  <div className="flex items-center space-x-1.5 text-inherit">
                    <Link className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">AI・接続設定</span>
                  </div>
                }
              >
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <AiConnectionStep
                    botList={botList}
                    isLoadingBotList={isConnectionDataLoading}
                    suggestList={suggestList}
                    customFormList={customFormList}
                    bookingMenuList={bookingMenuList}
                  />
                </div>
              </Tab>

              <Tab
                key="design"
                title={
                  <div className="flex items-center space-x-1.5 text-inherit">
                    <Palette className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">チャットデザイン</span>
                  </div>
                }
              >
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <DesignSettingsStep
                    urlType={urlType}
                    setExistingImageFromBase64={() => {}}
                  />
                </div>
              </Tab>

              {urlType === "LINE" && (
                <Tab
                  key="line"
                  title={
                    <div className="flex items-center space-x-1.5 text-inherit">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="whitespace-nowrap">LINE連携詳細</span>
                    </div>
                  }
                >
                  <LineIntegrationTabContent
                    mode={entryId ? "edit" : "create"}
                  />
                </Tab>
              )}
            </Tabs>
          </FormProvider>
        </div>
      </div>
    </div>
  );
};

export default ChatEntryForm;
