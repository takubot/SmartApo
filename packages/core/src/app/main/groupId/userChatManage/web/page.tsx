"use client";

import {
  MessageSquare,
  User,
  FileText,
  Calendar,
  Globe,
  Clock,
  ChevronRight,
  UserCircle2,
  Send,
} from "lucide-react";
import { useMemo, useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useGroupContext } from "../../layout-client";
/* ==== API ==== */
import {
  list_web_users_v2_user_manage_web__group_id__get,
  get_internal_web_user_chat_history_v2_chat_history_internal_web_user_history__group_id___external_user_id___chat_entry_id__get,
  get_chat_entry_list_by_channel_type_v2_chat_entry_list__group_id___channel_type__get,
  list_custom_forms_v2_custom_form_list__group_id__get,
  list_user_custom_form_responses_v2_custom_form_response_user__external_user_id__get,
  list_user_bookings_v2_booking_list_user__external_user_id__get,
  send_message_to_web_user_v2_user_manage_web_send_message__group_id__post,
  get_web_chat_status_v2_user_manage_web_chat_status__group_id___chat_space_id__get,
  accept_web_handoff_v2_user_manage_web_handoff_accept__group_id__post,
  close_web_handoff_v2_user_manage_web_handoff_close__group_id__post,
} from "@repo/api-contracts/based_template/service";
import {
  ChatEntryListResponseType,
  WebUserListResponseType,
  LineUserChatHistoryResponseType,
  CustomFormResponseListSchemaType,
  CustomFormListResponseSchemaType,
  BookingListResponseSchemaType,
  WebChatStatusResponseType,
  WebUserResponseType, // 追加
} from "@repo/api-contracts/based_template/zschema";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";

/* ==== Common ==== */
import ChatManageLayout from "../common/ChatManageLayout";

/* ==== HeroUI ==== */
import {
  Select,
  SelectItem,
  Tabs,
  Tab,
  Card,
  CardBody,
  ScrollShadow,
  Button,
  Chip,
  cn,
  Textarea,
  Skeleton,
  Avatar,
} from "@heroui/react";
import { useHandoffFirestoreRealtime } from "@common/useHandoffFirestoreRealtime";
import {
  getAssistantIconByChatType,
  isHumanOperatorChatType,
} from "../common/chatTypeIcon";
import {
  applyHandoffModeState,
  applyHandoffModeToList,
  executeHandoffTransition,
  getHandoffUiPresentation,
  resolveHandoffTransition,
} from "../common/handoffMode";
import { useAutoResetHandoffOnLeave } from "../common/useAutoResetHandoffOnLeave";
import { CustomFormResponseViewer } from "@common/customForm";
import type { CustomFormSection } from "@common/customForm";

/**
 * チャットメッセージのスケルトン表示
 */
const ChatSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div
        key={`chat-skeleton-${i}`}
        className={cn(
          "flex items-end gap-3",
          i % 2 === 0 ? "flex-row" : "flex-row-reverse",
        )}
      >
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton
          className={cn(
            "w-[60%] h-12 rounded-[24px]",
            i % 2 === 0 ? "rounded-bl-none" : "rounded-br-none",
          )}
        />
      </div>
    ))}
  </div>
);

const formatBookingStatus = (status: string | null | undefined): string => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "confirmed") return "確定";
  if (normalized === "pending") return "調整中";
  if (normalized === "cancelled" || normalized === "canceled")
    return "キャンセル";
  return status || "-";
};

export default function WebUserManagePage() {
  const groupId = useGroupContext();
  const [selectedKey, setSelectedKey] = useState<string | null>(null); // user_id:chat_entry_id
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isSwitchingResponseMode, setIsSwitchingResponseMode] = useState(false);
  const [optimisticResponseMode, setOptimisticResponseMode] = useState<
    "AI" | "FRIEND" | null
  >(null);
  const [selectedChatEntryId, setSelectedChatEntryId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    // 以前はここで通知権限をリクエストしていましたが、Headerに移動しました
  }, []);

  // Webチャットエントリ一覧取得
  const {
    data: webChatEntriesData,
    isLoading: isChatEntriesLoading,
    mutate: mutateChatEntries,
  } = useSWR(groupId ? `web-chat-entries-${groupId}` : null, () =>
    get_chat_entry_list_by_channel_type_v2_chat_entry_list__group_id___channel_type__get(
      groupId,
      "web",
    ),
  );

  const webChatEntriesList = useMemo(() => {
    const chatEntries =
      (webChatEntriesData as ChatEntryListResponseType)?.chatEntries || [];
    return chatEntries.map((entry) => ({
      chatEntryId: entry.chatEntryId,
      chatEntryName: entry.entryName,
    }));
  }, [webChatEntriesData]);

  // Webユーザー一覧取得 (バックエンドで最適化済み)
  const {
    data: webUserData,
    isLoading: isUsersLoading,
    mutate: mutateUsers,
  } = useSWR(
    groupId ? `web-users-${groupId}` : null,
    () => list_web_users_v2_user_manage_web__group_id__get(groupId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000, // 頻繁な再取得を抑制
    },
  );

  const webUsersList = useMemo(() => {
    return (webUserData as WebUserListResponseType)?.users || [];
  }, [webUserData]);

  // フィルタリングの最適化
  const filteredUsers = useMemo(() => {
    let list = webUsersList;

    // 入口が存在する場合、初期選択が確定するまでは一覧を表示しない
    if (selectedChatEntryId === null && webChatEntriesList.length > 0) {
      return [];
    }

    // エントリでフィルタ
    if (selectedChatEntryId !== null) {
      list = list.filter((user) => user.chatEntryId === selectedChatEntryId);
    }

    // 検索語でフィルタ
    if (userSearchTerm) {
      const term = userSearchTerm.toLowerCase();
      list = list.filter((u) => u.userName.toLowerCase().includes(term));
    }

    return list;
  }, [
    webUsersList,
    userSearchTerm,
    selectedChatEntryId,
    webChatEntriesList.length,
  ]);

  const chatEntryIdsWithUsers = useMemo(() => {
    return new Set(
      webUsersList
        .map((user) => user.chatEntryId)
        .filter((id): id is number => typeof id === "number"),
    );
  }, [webUsersList]);

  const selectedUser = useMemo(() => {
    if (!selectedKey) return null;
    const [userId, entryId] = selectedKey.split(":");
    return (
      webUsersList.find(
        (u) =>
          u.userId === userId &&
          (u.chatEntryId?.toString() ?? "null") === entryId,
      ) || null
    );
  }, [webUsersList, selectedKey]);
  // 初期選択エントリの設定
  useEffect(() => {
    if (selectedChatEntryId !== null || webChatEntriesList.length === 0) return;

    // ユーザーが存在するエントリを優先して初期選択する
    const entryWithUsers = webChatEntriesList.find((entry) =>
      chatEntryIdsWithUsers.has(entry.chatEntryId),
    );
    // ユーザーがいない場合でも先頭エントリを選択して初期表示の不整合を防ぐ
    setSelectedChatEntryId(
      entryWithUsers?.chatEntryId ?? webChatEntriesList[0]?.chatEntryId ?? null,
    );
  }, [webChatEntriesList, selectedChatEntryId, chatEntryIdsWithUsers]);

  useEffect(() => {
    // 現在の入口でユーザーが0件、かつ他にユーザーがいる入口がある場合は自動で切り替える
    if (selectedChatEntryId === null) return;
    if (filteredUsers.length > 0) return;
    if (chatEntryIdsWithUsers.size === 0) return;

    const fallbackEntry = webChatEntriesList.find((entry) =>
      chatEntryIdsWithUsers.has(entry.chatEntryId),
    );
    if (fallbackEntry && fallbackEntry.chatEntryId !== selectedChatEntryId) {
      setSelectedChatEntryId(fallbackEntry.chatEntryId);
    }
  }, [
    selectedChatEntryId,
    filteredUsers.length,
    chatEntryIdsWithUsers,
    webChatEntriesList,
  ]);

  useEffect(() => {
    // 初回表示時にユーザーを自動選択して履歴を表示する
    if (selectedKey) return;
    if (webChatEntriesList.length > 0 && selectedChatEntryId === null) return;
    if (filteredUsers.length === 0) return;
    const first = filteredUsers[0];
    if (!first) return;
    setSelectedKey(`${first.userId}:${first.chatEntryId ?? "null"}`);
  }, [
    selectedKey,
    filteredUsers,
    webChatEntriesList.length,
    selectedChatEntryId,
  ]);

  useEffect(() => {
    // 入口切り替え後に不整合なユーザー選択が残っていたら補正する
    if (!selectedUser) return;
    if (selectedChatEntryId === null) return;
    if (selectedUser.chatEntryId === selectedChatEntryId) return;
    if (filteredUsers.length === 0) return;

    const first = filteredUsers[0];
    if (!first) return;
    setSelectedKey(`${first.userId}:${first.chatEntryId ?? "null"}`);
  }, [selectedUser, selectedChatEntryId, filteredUsers]);

  // チャット履歴取得
  const {
    data: chatHistoryData,
    isLoading: isChatLoading,
    mutate: mutateChatHistory,
  } = useSWR(
    selectedUser && selectedUser.chatEntryId !== null
      ? `chat-history-v2-${selectedUser.userId}-${selectedUser.chatEntryId ?? "none"}`
      : null,
    () =>
      get_internal_web_user_chat_history_v2_chat_history_internal_web_user_history__group_id___external_user_id___chat_entry_id__get(
        groupId,
        selectedUser!.userId,
        String(selectedUser!.chatEntryId), // chatEntryIdが有効なときのみ呼ぶ
      ),
  );
  const chatHistory = chatHistoryData as LineUserChatHistoryResponseType;
  const sortedChatMessages = useMemo(() => {
    const messages = chatHistory?.messages ?? [];
    const sorted = [...messages].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.chatHistoryId ?? 0) - (b.chatHistoryId ?? 0);
    });

    // 管理画面では DB + Firestore の履歴を統合表示するため、
    // 送信直後に同一内容が近接時刻で二重に返るケースを吸収する。
    const deduped: typeof sorted = [];
    for (const msg of sorted) {
      const prev = deduped[deduped.length - 1];
      if (!prev) {
        deduped.push(msg);
        continue;
      }

      const prevIsUser = !!prev.isUserMessage;
      const currentIsUser = !!msg.isUserMessage;
      const prevContent =
        (prevIsUser ? prev.userQuestion : prev.botAnswer) || "";
      const currentContent =
        (currentIsUser ? msg.userQuestion : msg.botAnswer) || "";
      const prevTime = prev.createdAt ? new Date(prev.createdAt).getTime() : 0;
      const currentTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
      const isNearDuplicate =
        prevIsUser === currentIsUser &&
        prevContent.trim() !== "" &&
        prevContent.trim() === currentContent.trim() &&
        Math.abs(currentTime - prevTime) <= 5000;

      if (!isNearDuplicate) {
        deduped.push(msg);
      }
    }

    return deduped;
  }, [chatHistory?.messages]);

  // チャットステータス取得
  const { data: chatStatusData, mutate: mutateChatStatus } =
    useSWR<WebChatStatusResponseType | null>(
      selectedUser?.chatSpaceId
        ? `chat-status-v2-${selectedUser.chatSpaceId}`
        : null,
      () =>
        get_web_chat_status_v2_user_manage_web_chat_status__group_id___chat_space_id__get(
          groupId,
          String(selectedUser!.chatSpaceId),
        ),
    );
  const currentResponseMode =
    optimisticResponseMode ??
    chatStatusData?.responseMode ??
    selectedUser?.responseMode ??
    "AI";
  const currentModeUi = getHandoffUiPresentation(
    currentResponseMode,
    chatStatusData?.friendChatStatus ?? selectedUser?.friendChatStatus,
  );
  const currentChatSpaceId = selectedUser?.chatSpaceId ?? null;

  const closeHandoffOnLeave = useCallback(
    async (chatSpaceId: number) => {
      if (!groupId) return;
      const result =
        await close_web_handoff_v2_user_manage_web_handoff_close__group_id__post(
          groupId,
          { chatSpaceId },
        );
      if (
        !(
          typeof result === "object" &&
          result !== null &&
          "success" in result &&
          Boolean((result as { success?: unknown }).success)
        )
      ) {
        throw new Error("Auto reset handoff failed");
      }
    },
    [groupId],
  );

  useAutoResetHandoffOnLeave({
    isHumanMode: currentResponseMode === "FRIEND",
    chatSpaceId: currentChatSpaceId,
    closeHandoff: closeHandoffOnLeave,
  });

  const handleHandoffRealtimeChanged = useCallback(() => {
    void Promise.all([mutateChatHistory(), mutateChatStatus(), mutateUsers()]);
  }, [mutateChatHistory, mutateChatStatus, mutateUsers]);

  useHandoffFirestoreRealtime({
    chatSpaceId: currentChatSpaceId,
    onChanged: handleHandoffRealtimeChanged,
  });

  const handleToggleResponseMode = useCallback(async () => {
    if (!selectedUser?.chatSpaceId || isSwitchingResponseMode) return;

    const chatSpaceId = selectedUser.chatSpaceId;
    const transition = resolveHandoffTransition(currentResponseMode);
    setIsSwitchingResponseMode(true);
    setOptimisticResponseMode(transition.nextMode);

    // 先に画面を更新して押下直後にモードが切り替わるようにする
    await mutateChatStatus(
      (prev: WebChatStatusResponseType | null | undefined) =>
        prev
          ? applyHandoffModeState(prev, transition)
          : {
              responseMode: transition.nextMode,
              friendChatStatus: transition.nextFriendChatStatus,
              operatorName: null,
              lastMessageAt: null,
            },
      false,
    );
    await mutateUsers((prev: WebUserListResponseType | undefined) => {
      const current = prev;
      if (!current?.users) return prev;
      return {
        ...current,
        users: applyHandoffModeToList(
          current.users,
          (user) =>
            user.userId === selectedUser.userId &&
            user.chatEntryId === selectedUser.chatEntryId,
          transition,
        ),
      };
    }, false);

    try {
      await executeHandoffTransition({
        transition,
        acceptHandoff: () =>
          accept_web_handoff_v2_user_manage_web_handoff_accept__group_id__post(
            groupId,
            { chatSpaceId },
          ),
        closeHandoff: () =>
          close_web_handoff_v2_user_manage_web_handoff_close__group_id__post(
            groupId,
            { chatSpaceId },
          ),
      });
      showSuccessToast(transition.successMessage);
      await Promise.all([mutateUsers(), mutateChatStatus()]);
    } catch (err) {
      setOptimisticResponseMode(null);
      await Promise.all([mutateUsers(), mutateChatStatus()]);
      handleErrorWithUI(err, "応答モード切り替え");
    } finally {
      setOptimisticResponseMode(null);
      setIsSwitchingResponseMode(false);
    }
  }, [
    selectedUser,
    isSwitchingResponseMode,
    currentResponseMode,
    mutateUsers,
    mutateChatStatus,
    groupId,
  ]);

  const handleSendReply = useCallback(async () => {
    if (!replyMessage.trim() || !selectedUser?.chatSpaceId) return;
    setIsSendingReply(true);
    const originalMessage = replyMessage;
    setReplyMessage(""); // 入力欄を即座にクリア (UX向上)

    try {
      await send_message_to_web_user_v2_user_manage_web_send_message__group_id__post(
        groupId,
        {
          externalUserId: selectedUser.userId,
          message: originalMessage.trim(),
          chatSpaceId: selectedUser.chatSpaceId,
        },
      );
      await Promise.all([mutateChatHistory(), mutateChatStatus()]);
    } catch (err) {
      setReplyMessage(originalMessage); // エラー時は入力を戻す
      handleErrorWithUI(err, "メッセージ送信");
    } finally {
      setIsSendingReply(false);
    }
  }, [
    groupId,
    replyMessage,
    selectedUser,
    mutateChatHistory,
    mutateChatStatus,
  ]);

  const formatDateTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "yyyy/MM/dd HH:mm", { locale: ja });
    } catch {
      return "-";
    }
  };

  const userList = useMemo(() => {
    return (
      <div className="flex flex-col h-full">
        {webChatEntriesList.length > 0 && (
          <div className="px-3 py-4 border-b border-divider/30 bg-default-50/30">
            <p className="text-[10px] font-black text-default-600 uppercase tracking-widest mb-2 ml-1">
              チャットの入口を選択
            </p>
            <Select
              aria-label="チャットの入口"
              size="sm"
              variant="flat"
              color="default"
              selectedKeys={
                selectedChatEntryId !== null
                  ? [selectedChatEntryId.toString()]
                  : []
              }
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];
                if (key) setSelectedChatEntryId(Number(key));
              }}
              classNames={{
                trigger:
                  "bg-white border border-divider/50 h-9 min-h-9 shadow-sm",
                value:
                  "text-[11px] font-black text-default-800 uppercase tracking-wider",
              }}
            >
              {webChatEntriesList.map((entry) => (
                <SelectItem
                  key={entry.chatEntryId.toString()}
                  textValue={entry.chatEntryName || `入口 ${entry.chatEntryId}`}
                >
                  <span className="text-[11px] font-black text-default-700 uppercase tracking-wider">
                    {entry.chatEntryName || `入口 ${entry.chatEntryId}`}
                  </span>
                </SelectItem>
              ))}
            </Select>
          </div>
        )}
        <div className="flex-1 space-y-1 p-3">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <UserCircle2
                size={40}
                className="mx-auto text-default-100 mb-3"
              />
              <p className="text-xs font-black text-default-500 uppercase tracking-widest">
                ユーザーが見つかりません
              </p>
            </div>
          ) : (
            filteredUsers.map((user: WebUserResponseType) => {
              const key = `${user.userId}:${user.chatEntryId ?? "null"}`;
              const isSelected = selectedKey === key;
              const modeUi = getHandoffUiPresentation(
                user.responseMode,
                user.friendChatStatus,
              );
              return (
                <button
                  key={key}
                  onClick={() => setSelectedKey(key)}
                  className={cn(
                    "w-full p-2 text-left transition-all duration-300 rounded-lg group flex items-center gap-2.5 mb-0.5 relative overflow-hidden",
                    isSelected
                      ? "bg-primary text-white shadow-md shadow-primary/20 z-10"
                      : modeUi.isHumanMode
                        ? "bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                        : "hover:bg-default-50 text-default-600 active:scale-[0.98]",
                  )}
                >
                  {modeUi.shortLabel === "待機中" && !isSelected && (
                    <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-600 rounded-bl-lg" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "font-black truncate text-[11px] leading-tight mb-0.5 flex items-center gap-1.5",
                        isSelected ? "text-white" : "text-default-800",
                      )}
                    >
                      {user.userName}
                      <Chip
                        size="sm"
                        variant="flat"
                        color={modeUi.tone}
                        className="h-3 text-[7px] px-1 font-black"
                      >
                        {modeUi.shortLabel}
                      </Chip>
                    </div>
                    <div
                      className={cn(
                        "text-[8px] font-black uppercase tracking-tighter truncate opacity-70",
                        isSelected ? "text-primary-50" : "text-primary",
                      )}
                    >
                      {user.chatEntryName || "デフォルト入口"}
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 text-[7px] font-bold mt-0.5",
                        isSelected ? "text-primary-100" : "text-default-400",
                      )}
                    >
                      <Clock size={8} />
                      {formatDateTime(user.lastMessageAt)}
                    </div>
                  </div>
                  {!isSelected && (
                    <ChevronRight
                      size={10}
                      className="text-default-200 group-hover:translate-x-0.5 transition-transform"
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  }, [filteredUsers, selectedKey, webChatEntriesList, selectedChatEntryId]);

  // 予約・フォームのフェッチ (activeTabに合わせて遅延フェッチ)
  const { data: formResponsesData, isLoading: isFormsLoading } = useSWR(
    selectedUser && activeTab === "forms"
      ? `form-responses-${selectedUser.userId}`
      : null,
    () =>
      list_user_custom_form_responses_v2_custom_form_response_user__external_user_id__get(
        selectedUser!.userId,
      ),
  );
  const formResponses = formResponsesData as CustomFormResponseListSchemaType;

  const { data: customFormsData, isLoading: isCustomFormsLoading } = useSWR(
    groupId && activeTab === "forms" ? `custom-forms-${groupId}` : null,
    () => list_custom_forms_v2_custom_form_list__group_id__get(groupId),
  );
  const customForms = customFormsData as CustomFormListResponseSchemaType;

  const customFormMapById = useMemo(() => {
    const map = new Map<
      number,
      { formName: string; sections: CustomFormSection[] }
    >();
    (customForms?.formList ?? []).forEach((form) => {
      map.set(form.customFormId, {
        formName: form.formName || "フォーム",
        sections: (form.formFields ?? []) as CustomFormSection[],
      });
    });
    return map;
  }, [customForms?.formList]);

  const { data: bookingsData, isLoading: isBookingsLoading } = useSWR(
    selectedUser && activeTab === "booking"
      ? `bookings-${selectedUser.userId}`
      : null,
    () =>
      list_user_bookings_v2_booking_list_user__external_user_id__get(
        selectedUser!.userId,
      ),
  );
  const bookings = bookingsData as BookingListResponseSchemaType;

  return (
    <ChatManageLayout
      title="Webユーザー管理"
      subtitle="リアルタイム対応管理"
      headerIcon={<Globe className="w-4 h-4 text-white" />}
      searchPlaceholder="ユーザーを検索..."
      searchValue={userSearchTerm}
      onSearchChange={setUserSearchTerm}
      isListLoading={isUsersLoading || isChatEntriesLoading}
      userList={userList}
      responseMode={currentResponseMode}
      friendChatStatus={
        chatStatusData?.friendChatStatus ??
        selectedUser?.friendChatStatus ??
        null
      }
      isSwitchingResponseMode={isSwitchingResponseMode}
      onToggleResponseMode={handleToggleResponseMode}
      onRefresh={() => {
        mutateChatEntries();
        mutateUsers();
      }}
      selectedUser={selectedUser}
      userDetailHeader={
        selectedUser && (
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <h2 className="text-sm sm:text-base font-black text-default-900 tracking-tight truncate max-w-[200px] sm:max-w-none">
              {selectedUser.userName}
            </h2>
            <div className="flex items-center gap-2 sm:border-l border-divider/50 sm:pl-3 flex-wrap">
              <Chip
                size="sm"
                variant="flat"
                color="primary"
                radius="md"
                className="font-black text-[7px] uppercase tracking-widest px-1 h-3.5"
              >
                {selectedUser.chatEntryName || "デフォルト入口"}
              </Chip>
              <div className="flex items-center gap-1.5 text-[9px] text-default-400 font-bold bg-default-50 px-2 py-0.5 rounded-md">
                <Calendar size={10} className="opacity-50" />
                <span>{formatDateTime(selectedUser.createdAt)}</span>
              </div>
            </div>
          </div>
        )
      }
      tabs={
        <Tabs
          aria-label="ユーザー詳細"
          size="sm"
          variant="underlined"
          color="primary"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as string)}
          classNames={{
            tabList:
              "gap-2 sm:gap-6 border-divider/30 overflow-x-auto scrollbar-hide",
            cursor: "w-full bg-primary h-0.5",
            tab: "max-w-fit px-1 sm:px-0 h-8 font-black text-[11px] sm:text-xs",
            tabContent: "group-data-[selected=true]:text-primary",
          }}
        >
          <Tab
            key="chat"
            title={
              <div className="flex items-center gap-1.5">
                <MessageSquare size={14} />
                <span>チャット履歴</span>
              </div>
            }
          />
          <Tab
            key="booking"
            title={
              <div className="flex items-center gap-1.5">
                <Calendar size={14} />
                <span>予約状況</span>
              </div>
            }
          />
          <Tab
            key="forms"
            title={
              <div className="flex items-center gap-1.5">
                <FileText size={14} />
                <span>フォーム回答</span>
              </div>
            }
          />
        </Tabs>
      }
      content={
        <ScrollShadow className="h-full p-3 sm:p-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto pb-4 sm:pb-6">
            {activeTab === "chat" ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4">
                  {isChatLoading ? (
                    <ChatSkeleton />
                  ) : sortedChatMessages.length > 0 ? (
                    <div className="space-y-4 animate-in fade-in duration-500">
                      {sortedChatMessages.map((msg, idx) => {
                        const isHumanAgentMessage =
                          !msg.isUserMessage &&
                          isHumanOperatorChatType(msg.chatType ?? null);
                        const assistantIconSrc = getAssistantIconByChatType(
                          msg.chatType ?? null,
                        );

                        return (
                          <div
                            key={`${msg.chatHistoryId}-${msg.isUserMessage ? "user" : "bot"}-${idx}`}
                            className={cn(
                              "flex items-end gap-2",
                              msg.isUserMessage
                                ? "flex-row"
                                : "flex-row-reverse",
                            )}
                          >
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                msg.isUserMessage
                                  ? "bg-white text-primary border border-divider/50"
                                  : isHumanAgentMessage
                                    ? "bg-indigo-100 border border-indigo-200"
                                    : "bg-primary text-white",
                              )}
                            >
                              {msg.isUserMessage ? (
                                <User size={14} />
                              ) : (
                                <Avatar
                                  src={assistantIconSrc}
                                  alt={
                                    isHumanAgentMessage
                                      ? "有人対応"
                                      : "アシスタント"
                                  }
                                  size="sm"
                                  className="w-5 h-5"
                                />
                              )}
                            </div>
                            <div
                              className={cn(
                                "max-w-[92%] sm:max-w-[85%] px-3 sm:px-4 py-2.5 shadow-sm transition-all duration-300",
                                !msg.isUserMessage
                                  ? "bg-primary text-white rounded-[20px] rounded-br-none"
                                  : "bg-white border border-divider/40 text-default-800 rounded-[20px] rounded-bl-none",
                              )}
                            >
                              <div className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
                                {msg.isUserMessage
                                  ? msg.userQuestion
                                  : msg.botAnswer}
                              </div>
                              <div
                                className={cn(
                                  "text-[8px] font-black mt-1.5 uppercase tracking-tighter opacity-60",
                                  !msg.isUserMessage
                                    ? "text-primary-100"
                                    : "text-default-400",
                                )}
                              >
                                {formatDateTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-16 h-16 bg-white rounded-[24px] shadow-sm flex items-center justify-center mb-4 border border-divider/30 text-default-100">
                        <MessageSquare size={24} />
                      </div>
                      <p className="text-xs font-black text-default-300 uppercase tracking-[0.2em]">
                        チャット履歴はまだありません
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "booking" && (
                  <div className="space-y-6">
                    {isBookingsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-40 rounded-[32px]" />
                        <Skeleton className="h-40 rounded-[32px]" />
                      </div>
                    ) : (bookings?.bookingList?.length ?? 0) > 0 ? (
                      bookings?.bookingList?.map((booking) => (
                        <Card
                          key={booking.bookingId}
                          className="border-none shadow-sm rounded-[32px]"
                        >
                          <CardBody className="p-5 sm:p-8">
                            <div className="flex justify-between items-start sm:items-center gap-3 mb-5 sm:mb-6 border-b border-divider/30 pb-5 sm:pb-6 flex-wrap">
                              <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                                  <Calendar size={24} />
                                </div>
                                <div>
                                  <h4 className="text-lg font-black text-default-800 leading-none mb-1">
                                    {booking.guestName} 様
                                  </h4>
                                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                                    予約情報
                                  </p>
                                </div>
                              </div>
                              <Chip
                                size="sm"
                                variant="flat"
                                color="primary"
                                radius="full"
                                className="font-black text-[10px] uppercase h-6 px-3"
                              >
                                {formatBookingStatus(booking.bookingStatus)}
                              </Chip>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                              <div className="space-y-1.5 bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20">
                                <p className="text-[9px] font-black text-default-400 uppercase tracking-widest">
                                  予約日時
                                </p>
                                <p className="text-sm font-bold text-default-800">
                                  {formatDateTime(booking.startAt)}
                                </p>
                              </div>
                              <div className="space-y-1.5 bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20">
                                <p className="text-[9px] font-black text-default-400 uppercase tracking-widest">
                                  連絡先メール
                                </p>
                                <p className="text-sm font-bold text-default-800">
                                  {booking.guestEmail || "-"}
                                </p>
                              </div>
                              {booking.memo && (
                                <div className="sm:col-span-2 space-y-1.5 bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20">
                                  <p className="text-[9px] font-black text-default-400 uppercase tracking-widest">
                                    メモ
                                  </p>
                                  <p className="text-sm font-medium italic text-default-600">
                                    &quot;{booking.memo}&quot;
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardBody>
                        </Card>
                      ))
                    ) : (
                      <div className="py-32 text-center">
                        <p className="text-sm font-black text-default-300 uppercase tracking-[0.2em]">
                          予約情報はまだありません
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "forms" && (
                  <div className="space-y-6">
                    {isFormsLoading || isCustomFormsLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-40 rounded-[32px]" />
                        <Skeleton className="h-40 rounded-[32px]" />
                      </div>
                    ) : (formResponses?.responseList?.length ?? 0) > 0 ? (
                      formResponses?.responseList?.map((response) => (
                        <Card
                          key={response.responseId}
                          className="border-none shadow-sm rounded-[32px]"
                        >
                          <CardBody className="p-5 sm:p-8">
                            <div className="flex justify-between items-start sm:items-center gap-3 mb-5 sm:mb-6 border-b border-divider/30 pb-5 sm:pb-6 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary shadow-inner">
                                  <FileText size={20} />
                                </div>
                                <h4 className="text-base font-black text-default-800 uppercase tracking-tight">
                                  {customFormMapById.get(response.customFormId)
                                    ?.formName || "フォーム回答"}
                                </h4>
                              </div>
                              <div className="text-[10px] font-black text-default-300 uppercase tracking-widest">
                                {formatDateTime(response.createdAt)}
                              </div>
                            </div>
                            <CustomFormResponseViewer
                              responseData={
                                response.responseData as Record<string, unknown>
                              }
                              sections={
                                customFormMapById.get(response.customFormId)
                                  ?.sections || []
                              }
                              emptyMessage="このフォームに回答はありません"
                            />
                          </CardBody>
                        </Card>
                      ))
                    ) : (
                      <div className="py-32 text-center">
                        <p className="text-sm font-black text-default-300 uppercase tracking-[0.2em]">
                          フォーム回答はまだありません
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollShadow>
      }
      footer={
        activeTab === "chat" && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <div className="relative flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-200 shadow-sm p-1">
              <div className="flex-1 relative min-w-0">
                <Textarea
                  placeholder={
                    currentResponseMode === "FRIEND"
                      ? "オペレーターとして返信を入力..."
                      : "有人対応を開始して返信する..."
                  }
                  value={replyMessage}
                  onValueChange={setReplyMessage}
                  minRows={1}
                  maxRows={5}
                  variant="bordered"
                  className="flex-1"
                  size="sm"
                  classNames={{
                    base: "w-full bg-transparent",
                    input:
                      "text-sm py-2.5 sm:py-3 pr-12 resize-none bg-transparent border-0 focus:outline-none placeholder:text-gray-400 min-h-[40px]",
                    inputWrapper:
                      "bg-transparent border-0 shadow-none p-0 hover:bg-transparent focus-within:bg-transparent",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
              </div>
              <div className="pr-2 pb-1">
                <Button
                  isIconOnly
                  color="primary"
                  radius="full"
                  size="lg"
                  onPress={handleSendReply}
                  isLoading={isSendingReply}
                  disabled={!replyMessage.trim()}
                  className={cn(
                    "min-w-[40px] h-[40px] rounded-full transition-all duration-200",
                    replyMessage.trim() && !isSendingReply
                      ? "shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                      : "opacity-40",
                  )}
                  aria-label="送信"
                >
                  <Send size={18} />
                </Button>
              </div>
            </div>
            <div className="text-[10px] text-default-500 font-medium mt-1.5 ml-1 sm:ml-3 flex items-center gap-1.5">
              <div
                className={cn(
                  "w-1 h-1 rounded-full",
                  currentModeUi.isHumanMode
                    ? "bg-primary animate-pulse"
                    : "bg-success",
                )}
              />
              {currentModeUi.isHumanMode
                ? "有人対応モード - Ctrl+Enter で送信"
                : "AI自動対応モード - 必要時は有人対応に切り替えて送信"}
            </div>
          </div>
        )
      }
    />
  );
}
