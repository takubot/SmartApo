"use client";

import {
  create_chat_entry_v2_chat_entry_create__group_id__post,
  get_chat_entry_detail_v2_chat_entry__chat_entry_id__get,
  update_chat_entry_v2_chat_entry__chat_entry_id__put,
  list_bot_v2_bot_list__group_id__post,
  list_packages_v2_suggest_list_package__group_id__get,
  list_custom_forms_v2_custom_form_list__group_id__get,
  list_booking_menus_v2_booking_menu_list__group_id__get,
} from "@repo/api-contracts/based_template/service";
import {
  ChatEntryCreateRequest,
  BotResponseSchemaType,
  ChatEntryCreateRequestType,
  ChatEntryDetailResponseType,
  ChatEntryThemeSchemaType,
  ChatEntryUpdateRequest,
  ChatEntryUpdateRequestType,
  SuggestPackageResponseSchemaType,
  CustomFormResponseSchemaType,
  BookingMenuResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useEffect, useState } from "react";
import { mutate as globalMutate } from "swr"; // Added
import {
  handleErrorWithUI,
  showLoadingToast,
  showSuccessToast,
} from "@common/errorHandler";
import { resolveChatEntryKind } from "../types";
import { useRouter } from "next/navigation";

export type FormData = Partial<ChatEntryCreateRequestType> & {
  allowedIpList?: string;
  customFormList?: CustomFormResponseSchemaType[];
  preChatCustomFormId?: number | null;
  onDemandCustomFormIdList?: number[];
  bookingMenuIdList?: number[];
  handoffBookingMenuId?: number | null;
  humanHandoffAvailabilitySlots?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
};

export type ImageData = {
  themeImageFile?: string | null;
  themeImageFileDesktop?: string | null;
  themeImageFileMobile?: string | null;
} | null;

type WebConfigLike = {
  webMode?: string | null;
  fullEntryUrl?: string | null;
  embedScript?: string | null;
  isEmbedUserSyncEnabled?: boolean | null;
  embedUserPublicKey?: string | null;
  embedUserJwtAlgorithm?: string | null;
  embedUserJwtIssuer?: string | null;
  embedUserJwtAudience?: string | null;
  embedUserIdClaim?: string | null;
  embedUserNameClaim?: string | null;
  embedUserEmailClaim?: string | null;
  embedUserPictureClaim?: string | null;
};

type LineConfigLike = {
  botChannelId?: string | null;
  botChannelSecret?: string | null;
  botBasicId?: string | null;
  liffId?: string | null;
  miniappChannelId?: string | null;
  aiTriggerPrefix?: string | null;
  externalWebhookUrl?: string | null;
};

const WEB_CONFIG_DEFAULTS: Required<
  Pick<
    WebConfigLike,
    | "webMode"
    | "isEmbedUserSyncEnabled"
    | "embedUserJwtAlgorithm"
    | "embedUserIdClaim"
    | "embedUserNameClaim"
    | "embedUserEmailClaim"
    | "embedUserPictureClaim"
  >
> = {
  webMode: "EXTERNAL_USER_WEB",
  isEmbedUserSyncEnabled: false,
  embedUserJwtAlgorithm: "RS256",
  embedUserIdClaim: "sub",
  embedUserNameClaim: "name",
  embedUserEmailClaim: "email",
  embedUserPictureClaim: "picture",
};

const normalizeWebConfig = (webConfig: WebConfigLike | null | undefined) => {
  const merged = {
    ...WEB_CONFIG_DEFAULTS,
    ...(webConfig || {}),
  };

  const syncEnabled =
    webConfig?.isEmbedUserSyncEnabled ??
    merged.webMode === "EXTERNAL_USER_WEB_WITH_AUTH";
  return {
    ...merged,
    isEmbedUserSyncEnabled: !!syncEnabled,
    embedUserPublicKey: syncEnabled ? merged.embedUserPublicKey || null : null,
    embedUserJwtIssuer: syncEnabled ? merged.embedUserJwtIssuer || null : null,
    embedUserJwtAudience: syncEnabled
      ? merged.embedUserJwtAudience || null
      : null,
  };
};

const normalizeLineConfig = (lineConfig: LineConfigLike | null | undefined) => {
  if (!lineConfig) {
    return null;
  }
  const raw = lineConfig as LineConfigLike & {
    bot_channel_id?: string | null;
    bot_channel_secret?: string | null;
    bot_basic_id?: string | null;
    liff_id?: string | null;
    miniapp_channel_id?: string | null;
    ai_trigger_prefix?: string | null;
    external_webhook_url?: string | null;
  };
  return {
    botChannelId: raw.botChannelId ?? raw.bot_channel_id ?? null,
    botChannelSecret: raw.botChannelSecret ?? raw.bot_channel_secret ?? null,
    botBasicId: raw.botBasicId ?? raw.bot_basic_id ?? null,
    liffId: raw.liffId ?? raw.liff_id ?? null,
    miniappChannelId: raw.miniappChannelId ?? raw.miniapp_channel_id ?? null,
    aiTriggerPrefix: raw.aiTriggerPrefix ?? raw.ai_trigger_prefix ?? null,
    externalWebhookUrl:
      raw.externalWebhookUrl ?? raw.external_webhook_url ?? null,
  };
};

const normalizeIdList = (rawIds: unknown): number[] => {
  if (!Array.isArray(rawIds)) {
    return [];
  }
  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const raw of rawIds) {
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
};

const normalizeOptionalPositiveInt = (rawValue: unknown): number | null => {
  const value = Number(rawValue);
  if (!Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
};

const normalizeCustomFormSelection = (data: FormData) => {
  const preChatCustomFormId =
    typeof data.preChatCustomFormId === "number" && data.preChatCustomFormId > 0
      ? data.preChatCustomFormId
      : null;
  const onDemandCustomFormIdList = normalizeIdList(
    data.onDemandCustomFormIdList,
  ).filter((id) => id !== preChatCustomFormId);
  return { preChatCustomFormId, onDemandCustomFormIdList };
};

export function useChatEntryForm(groupId: string, entryId?: string) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(!!entryId);
  const [isConnectionDataLoading, setIsConnectionDataLoading] = useState(false);
  const [editTarget, setEditTarget] =
    useState<ChatEntryDetailResponseType | null>(null);
  const [botList, setBotList] = useState<BotResponseSchemaType[]>([]);
  const [suggestList, setSuggestList] = useState<
    SuggestPackageResponseSchemaType[]
  >([]);
  const [customFormList, setCustomFormList] = useState<
    CustomFormResponseSchemaType[]
  >([]);
  const [bookingMenuList, setBookingMenuList] = useState<
    BookingMenuResponseSchemaType[]
  >([]);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    const fetchConnectionData = async () => {
      setIsConnectionDataLoading(true);
      try {
        const [botsResult, suggestsResult, formsResult, bookingResult] =
          await Promise.allSettled([
            list_bot_v2_bot_list__group_id__post(groupId, {
              includeIcon: true,
            }),
            list_packages_v2_suggest_list_package__group_id__get(groupId),
            list_custom_forms_v2_custom_form_list__group_id__get(groupId),
            list_booking_menus_v2_booking_menu_list__group_id__get(groupId),
          ]);

        if (cancelled) return;

        if (botsResult.status === "fulfilled") {
          setBotList(botsResult.value?.botList || []);
        } else {
          handleErrorWithUI(botsResult.reason, "Bot一覧の取得");
        }

        if (suggestsResult.status === "fulfilled") {
          setSuggestList(suggestsResult.value?.packageList || []);
        } else {
          handleErrorWithUI(suggestsResult.reason, "サジェスト一覧の取得");
        }

        if (formsResult.status === "fulfilled") {
          setCustomFormList(formsResult.value?.formList || []);
        } else {
          handleErrorWithUI(formsResult.reason, "フォーム一覧の取得");
        }
        if (bookingResult.status === "fulfilled") {
          const bookingMenus = Array.isArray(bookingResult.value)
            ? bookingResult.value
            : bookingResult.value?.menuList || [];
          setBookingMenuList(bookingMenus);
        } else {
          handleErrorWithUI(bookingResult.reason, "予約メニュー一覧の取得");
        }
      } finally {
        if (!cancelled) {
          setIsConnectionDataLoading(false);
        }
      }
    };

    fetchConnectionData();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (!entryId) {
      setIsDataLoading(false);
      setEditTarget(null);
      return;
    }

    let cancelled = false;

    const fetchEditDetail = async () => {
      setIsDataLoading(true);
      try {
        const detail =
          await get_chat_entry_detail_v2_chat_entry__chat_entry_id__get(
            entryId,
          );
        if (!cancelled) {
          setEditTarget(detail as ChatEntryDetailResponseType);
        }
      } catch (error) {
        if (!cancelled) {
          handleErrorWithUI(error, "編集設定の取得");
        }
      } finally {
        if (!cancelled) {
          setIsDataLoading(false);
        }
      }
    };

    fetchEditDetail();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  const buildThemeConfig = (
    data: FormData,
  ): ChatEntryThemeSchemaType & {
    themeImageFileDesktop?: string | null;
    themeImageFileMobile?: string | null;
  } => {
    return {
      chatPositionAnchorDesktop:
        data.themeConfig?.chatPositionAnchorDesktop || "bottom-right",
      chatButtonHorizontalPositionPercentageDesktop:
        data.themeConfig?.chatButtonHorizontalPositionPercentageDesktop ?? 0,
      chatButtonVerticalPositionPercentageDesktop:
        data.themeConfig?.chatButtonVerticalPositionPercentageDesktop ?? 0,
      chatWidgetHorizontalPositionPercentageDesktop:
        data.themeConfig?.chatWidgetHorizontalPositionPercentageDesktop ?? 0,
      chatWidgetVerticalPositionPercentageDesktop:
        data.themeConfig?.chatWidgetVerticalPositionPercentageDesktop ?? 0,
      chatPositionAnchorMobile:
        data.themeConfig?.chatPositionAnchorMobile || "bottom-right",
      chatButtonHorizontalPositionPercentageMobile:
        data.themeConfig?.chatButtonHorizontalPositionPercentageMobile ?? 0,
      chatButtonVerticalPositionPercentageMobile:
        data.themeConfig?.chatButtonVerticalPositionPercentageMobile ?? 0,
      chatButtonColor: data.themeConfig?.chatButtonColor || "#00AAFF",
      chatWidth: data.themeConfig?.chatWidth ?? 25,
      chatHeight: data.themeConfig?.chatHeight ?? 80,
      initialGreeting: data.themeConfig?.initialGreeting || "",
      isMultiLanguage: data.themeConfig?.isMultiLanguage ?? false,
      initialGreetingTranslations: null,
      isGreetingStreamingEnabled:
        data.themeConfig?.isGreetingStreamingEnabled ?? false,
      autoOpenDelaySeconds: data.themeConfig?.autoOpenDelaySeconds ?? null,
      chatOpenTypeDesktop:
        data.themeConfig?.chatOpenTypeDesktop === "IMAGE" ? "IMAGE" : "BUTTON",
      chatOpenLabelDesktop:
        data.themeConfig?.chatOpenLabelDesktop || "チャット開始",
      chatOpenLabelDesktopTranslations: null,
      chatOpenImageUrlDesktop:
        data.themeConfig?.chatOpenImageUrlDesktop ?? null,
      chatOpenButtonWidthDesktop:
        data.themeConfig?.chatOpenButtonWidthDesktop || 25,
      chatOpenButtonHeightDesktop:
        data.themeConfig?.chatOpenButtonHeightDesktop || 10,
      chatOpenImageWidthDesktop:
        data.themeConfig?.chatOpenImageWidthDesktop || 5,
      chatOpenTypeMobile:
        data.themeConfig?.chatOpenTypeMobile === "IMAGE" ? "IMAGE" : "BUTTON",
      chatOpenLabelMobile:
        data.themeConfig?.chatOpenLabelMobile || "チャット開始",
      chatOpenLabelMobileTranslations: null,
      chatOpenImageUrlMobile: data.themeConfig?.chatOpenImageUrlMobile ?? null,
      chatEntryImageUrl: data.themeConfig?.chatEntryImageUrl ?? null,
      chatOpenButtonWidthMobile:
        data.themeConfig?.chatOpenButtonWidthMobile || 25,
      chatOpenButtonHeightMobile:
        data.themeConfig?.chatOpenButtonHeightMobile || 10,
      chatOpenImageWidthMobile: data.themeConfig?.chatOpenImageWidthMobile || 5,
      headerColor: data.themeConfig?.headerColor || "#F1F1F1",
      headerText: data.themeConfig?.headerText || "ヘッダー",
      headerTextColor: data.themeConfig?.headerTextColor || "#000000",
      themeImageFile: data.themeConfig?.themeImageFile || null,
      themeImageFileDesktop:
        (data.themeConfig as any)?.themeImageFileDesktop || null,
      themeImageFileMobile:
        (data.themeConfig as any)?.themeImageFileMobile || null,
    };
  };

  const handleCreate = async (data: FormData) => {
    setIsLoading(true);
    showLoadingToast("登録");
    try {
      const { preChatCustomFormId, onDemandCustomFormIdList } =
        normalizeCustomFormSelection(data);
      const handoffBookingMenuId = normalizeOptionalPositiveInt(
        data.handoffBookingMenuId,
      );
      if (data.isHumanHandoffEnabled && handoffBookingMenuId === null) {
        throw new Error(
          "有人対応を有効化する場合は、有人対応用の予約メニューを選択してください。",
        );
      }
      const allowedIpList = data.allowedIpList
        ? data.allowedIpList
            .split(",")
            .map((ip) => ip.trim())
            .filter((ip) => ip.length > 0)
        : [];
      const payload: ChatEntryCreateRequestType = {
        entryName: data.entryName || "",
        showReferenceInfo: data.showReferenceInfo || false,
        isShowReferenceLink: data.isShowReferenceLink || false,
        botIdList: data.selectionType === "BOT" ? data.botIdList || [] : [],
        suggestId:
          data.selectionType === "SUGGEST" ? (data.suggestId ?? null) : null,
        preChatCustomFormId,
        onDemandCustomFormIdList,
        isBookingEnabled: !!data.isBookingEnabled,
        bookingMenuIdList: data.bookingMenuIdList ?? [],
        handoffBookingMenuId,
        isHumanHandoffEnabled: !!data.isHumanHandoffEnabled,
        bookingButtonLabel: data.bookingButtonLabel ?? null,
        botSelectionMethod: data.botSelectionMethod || "CHUNK_BASED",
        chatFlowType: data.chatFlowType || "CHUNK_SEARCH",
        selectionType: data.selectionType || "BOT",
        accessPolicy: {
          ...data.accessPolicy,
          allowedIpList,
          ipRestrictionMode: data.accessPolicy?.ipRestrictionMode || "NONE",
        },
        apiKey: data.apiKey || null,
        lineConfig: data.lineConfig || null,
        themeConfig: buildThemeConfig(data),
        webConfig: data.lineConfig
          ? null
          : (normalizeWebConfig(data.webConfig as WebConfigLike) as any),
        frontDomainUrl:
          data.frontDomainUrl ||
          (typeof window !== "undefined" ? window.location.origin : null),
      };
      const validatedData: ChatEntryCreateRequestType =
        ChatEntryCreateRequest.parse(payload);
      await create_chat_entry_v2_chat_entry_create__group_id__post(
        groupId,
        validatedData,
      );
      showSuccessToast("URLを登録しました");

      // 一覧のキャッシュをクリア
      await globalMutate(["chat-entries", groupId]);

      router.push(`/main/${groupId}/chatEntry`);
    } catch (error) {
      handleErrorWithUI(error, "URL登録");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: FormData) => {
    if (!entryId || !editTarget) return;
    setIsLoading(true);
    showLoadingToast("更新");
    try {
      const { preChatCustomFormId, onDemandCustomFormIdList } =
        normalizeCustomFormSelection(data);
      const handoffBookingMenuId = normalizeOptionalPositiveInt(
        data.handoffBookingMenuId,
      );
      if (data.isHumanHandoffEnabled && handoffBookingMenuId === null) {
        throw new Error(
          "有人対応を有効化する場合は、有人対応用の予約メニューを選択してください。",
        );
      }
      const allowedIpList = data.allowedIpList
        ? data.allowedIpList
            .split(",")
            .map((ip) => ip.trim())
            .filter((ip) => ip.length > 0)
        : [];
      const kind = resolveChatEntryKind(editTarget);
      const isLineEntry = kind === "LINE";

      const selectionType = data.selectionType || "BOT";
      const payload: ChatEntryUpdateRequestType = {
        entryName: data.entryName || null,
        showReferenceInfo:
          typeof data.showReferenceInfo === "boolean"
            ? data.showReferenceInfo
            : null,
        isShowReferenceLink:
          typeof data.isShowReferenceLink === "boolean"
            ? data.isShowReferenceLink
            : null,
        botIdList: selectionType === "BOT" ? data.botIdList || null : [],
        preChatCustomFormId: preChatCustomFormId ?? 0,
        onDemandCustomFormIdList,
        isBookingEnabled: !!data.isBookingEnabled,
        bookingMenuIdList: data.bookingMenuIdList ?? [],
        handoffBookingMenuId,
        isHumanHandoffEnabled: !!data.isHumanHandoffEnabled,
        bookingButtonLabel: data.bookingButtonLabel ?? null,
        botSelectionMethod: data.botSelectionMethod || "CHUNK_BASED",
        chatFlowType: data.chatFlowType || "CHUNK_SEARCH",
        selectionType,
        accessPolicy: {
          ...data.accessPolicy,
          allowedIpList,
          ipRestrictionMode: data.accessPolicy?.ipRestrictionMode || "NONE",
        },
        apiKey: data.apiKey || null,
        lineConfig: normalizeLineConfig(data.lineConfig as LineConfigLike),
        themeConfig: buildThemeConfig(data),
        webConfig: isLineEntry
          ? null
          : (normalizeWebConfig(data.webConfig as WebConfigLike) as any),
        frontDomainUrl:
          data.frontDomainUrl ||
          (typeof window !== "undefined" ? window.location.origin : null),
      };
      // BOT選択時は suggestId を送らず、SUGGEST選択時のみ送る
      if (selectionType === "SUGGEST") {
        payload.suggestId = data.suggestId ?? null;
      }

      // WEBエントリの場合、ドメインURLがあれば webConfig を補完してスクリプト生成を促す
      if (!isLineEntry && !!payload.frontDomainUrl && !payload.webConfig) {
        payload.webConfig = normalizeWebConfig(null) as any;
      }
      const validatedData: ChatEntryUpdateRequestType =
        ChatEntryUpdateRequest.parse(payload);
      await update_chat_entry_v2_chat_entry__chat_entry_id__put(
        entryId,
        validatedData,
      );
      showSuccessToast("URLを更新しました");

      // キャッシュをクリア
      await globalMutate(["chat-entries", groupId]);

      router.push(`/main/${groupId}/chatEntry`);
    } catch (error) {
      handleErrorWithUI(error, "URL更新");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    isDataLoading,
    isConnectionDataLoading,
    editTarget,
    botList,
    suggestList,
    customFormList,
    bookingMenuList,
    handleCreate,
    handleUpdate,
  };
}
