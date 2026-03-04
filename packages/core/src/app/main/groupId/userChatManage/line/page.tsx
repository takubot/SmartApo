"use client";

import {
  FileText,
  MessageSquare,
  Users,
  ChevronRight,
  Calendar,
  Info,
  Send,
  Clock,
  Folder,
  UserCircle2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useGroupContext } from "../../layout-client";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";

/* ==== Common ==== */
import ChatManageLayout from "../common/ChatManageLayout";
import UserAvatar from "../common/UserAvatar";

/* ==== HeroUI ==== */
import {
  Button,
  Spinner,
  Skeleton,
  Textarea,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Card,
  CardBody,
  Chip,
  cn,
  ScrollShadow,
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

/* ==== API Contracts ==== */
import {
  get_chat_entry_list_by_channel_type_v2_chat_entry_list__group_id___channel_type__get,
  list_line_users_v2_user_manage_line__group_id__get,
  get_line_user_chat_history_v2_user_manage_line__group_id___line_user_id__history__chat_entry_id__get,
  send_message_to_line_user_v2_user_manage_line_send_message__group_id__post,
  accept_line_handoff_v2_user_manage_line_handoff_accept__group_id__post,
  close_line_handoff_v2_user_manage_line_handoff_close__group_id__post,
  list_user_custom_form_responses_v2_custom_form_response_user__external_user_id__get,
  list_custom_forms_v2_custom_form_list__group_id__get,
} from "@repo/api-contracts/based_template/service";
import type {
  ChatEntryListResponseType,
  LineUserResponseType,
  SendMessageToLineUserRequestType,
  ChatHistoryMessageResponseType,
  CustomFormResponseListSchemaType,
  CustomFormListResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";

import UserFileManagerModal from "./components/UserFileManagerModal";

type LineChatEntryItem = {
  chatEntryId: number;
  chatEntryName: string | null;
};

export default function LineUserManagePage() {
  const groupId = useGroupContext();

  const lineChatEntriesFetcher = async (
    groupId: string,
  ): Promise<{ chatEntries: LineChatEntryItem[] }> => {
    const data =
      await get_chat_entry_list_by_channel_type_v2_chat_entry_list__group_id___channel_type__get(
        groupId,
        "line",
      );
    const chatEntries =
      (data as ChatEntryListResponseType)?.chatEntries?.map((entry) => ({
        chatEntryId: entry.chatEntryId,
        chatEntryName: entry.entryName ?? null,
      })) ?? [];
    return { chatEntries };
  };

  const lineUsersFetcher = async (groupId: string) => {
    const data =
      await list_line_users_v2_user_manage_line__group_id__get(groupId);
    return data || { users: [] };
  };

  const chatHistoryFetcher = async (
    _key: string,
    groupId: string,
    lineUserId: string,
    chatEntryId: number,
  ) => {
    const data =
      await get_line_user_chat_history_v2_user_manage_line__group_id___line_user_id__history__chat_entry_id__get(
        groupId,
        lineUserId,
        String(chatEntryId),
      );
    return data || { lineUserId, userName: "", messages: [] };
  };

  const {
    data: lineChatEntriesData,
    error: lineChatEntriesError,
    isLoading: isChatEntriesLoading,
    mutate: mutateChatEntries,
  } = useSWR(groupId ? `line-chat-entries-${groupId}` : null, () =>
    lineChatEntriesFetcher(groupId!),
  );

  const lineChatEntriesList = useMemo(() => {
    return lineChatEntriesData?.chatEntries || [];
  }, [lineChatEntriesData]);

  const {
    data: lineUsersData,
    error: lineUsersError,
    isLoading: isLineUsersLoading,
    mutate: mutateUsers,
  } = useSWR(groupId ? `line-users-${groupId}` : null, () =>
    lineUsersFetcher(groupId!),
  );

  const [selectedLineUserId, setSelectedLineUserId] = useState<string | null>(
    null,
  );

  const [selectedChatEntryId, setSelectedChatEntryId] = useState<number | null>(
    null,
  );

  const {
    data: chatHistoryData,
    error: chatHistoryError,
    isLoading: isChatHistoryLoading,
    mutate: mutateChatHistory,
  } = useSWR(
    selectedLineUserId && groupId && selectedChatEntryId !== null
      ? [
          `chat-history-${selectedLineUserId}-${selectedChatEntryId}`,
          groupId,
          selectedLineUserId,
          selectedChatEntryId,
        ]
      : null,
    ([, groupId, lineUserId, chatEntryId]) =>
      chatHistoryFetcher("", groupId, lineUserId, chatEntryId),
  );
  const sortedChatMessages = useMemo(() => {
    const messages = chatHistoryData?.messages ?? [];
    return [...messages].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return (a.chatHistoryId ?? 0) - (b.chatHistoryId ?? 0);
    });
  }, [chatHistoryData?.messages]);

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<LineUserResponseType | null>(
    null,
  );
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSwitchingResponseMode, setIsSwitchingResponseMode] = useState(false);
  const [optimisticResponseMode, setOptimisticResponseMode] = useState<
    "AI" | "FRIEND" | null
  >(null);
  const [isFileManagerOpen, setIsFileManagerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
  const currentResponseMode =
    optimisticResponseMode ?? selectedUser?.responseMode ?? "AI";
  const currentModeUi = getHandoffUiPresentation(
    currentResponseMode,
    selectedUser?.friendChatStatus,
  );
  const currentChatSpaceId = selectedUser?.chatSpaceId ?? null;

  const closeHandoffOnLeave = useCallback(
    async (chatSpaceId: number) => {
      if (!groupId) return;
      const result =
        await close_line_handoff_v2_user_manage_line_handoff_close__group_id__post(
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
    void Promise.all([mutateChatHistory(), mutateUsers()]);
  }, [mutateChatHistory, mutateUsers]);

  useHandoffFirestoreRealtime({
    chatSpaceId: currentChatSpaceId,
    onChanged: handleHandoffRealtimeChanged,
  });

  useEffect(() => {
    // 以前はここで通知権限をリクエストしていましたが、Headerに移動しました
  }, []);

  const filteredUsers = useMemo((): LineUserResponseType[] => {
    if (!lineUsersData?.users) return [];
    // 入口が存在する場合、初期選択が確定するまでは一覧を表示しない
    if (selectedChatEntryId === null && lineChatEntriesList.length > 0)
      return [];
    const entryFiltered =
      selectedChatEntryId === null
        ? lineUsersData.users
        : lineUsersData.users.filter(
            (user: LineUserResponseType) =>
              user.chatEntryId === selectedChatEntryId,
          );
    if (!userSearchTerm) return entryFiltered;
    const term = userSearchTerm.toLowerCase();
    return entryFiltered.filter(
      (user: LineUserResponseType) =>
        user.userName?.toLowerCase().includes(term) ||
        user.lineUserId?.toLowerCase().includes(term) ||
        user.chatEntryName?.toLowerCase().includes(term),
    );
  }, [
    lineUsersData?.users,
    userSearchTerm,
    selectedChatEntryId,
    lineChatEntriesList.length,
  ]);

  useEffect(() => {
    if (lineUsersError) {
      handleErrorWithUI(lineUsersError, "LINEユーザー一覧取得");
    }
    if (lineChatEntriesError) {
      handleErrorWithUI(lineChatEntriesError, "LINEチャットエントリ一覧取得");
    }
    if (chatHistoryError) {
      handleErrorWithUI(chatHistoryError, "チャット履歴取得");
    }
  }, [lineUsersError, lineChatEntriesError, chatHistoryError]);

  const handleSelectUser = (user: LineUserResponseType) => {
    setSelectedUser(user);
    setSelectedLineUserId(user.lineUserId);
    setMessageText("");
  };

  const getLatestUser = (
    users: LineUserResponseType[],
  ): LineUserResponseType | undefined => {
    if (users.length === 0) return undefined;
    return [...users].sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    })[0];
  };

  useEffect(() => {
    if (!lineUsersData?.users?.length || selectedUser) return;
    const latestUser = getLatestUser(lineUsersData.users);
    if (latestUser) {
      handleSelectUser(latestUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineUsersData?.users]);

  const resolveInitialChatEntryId = useCallback(
    (preferredChatEntryId?: number | null): number | null => {
      const entries = lineChatEntriesData?.chatEntries ?? [];
      const first = entries[0];
      if (!first) return null;

      if (preferredChatEntryId != null) {
        const exists = entries.some(
          (e) => e.chatEntryId === preferredChatEntryId,
        );
        if (exists) return preferredChatEntryId;
      }

      return first.chatEntryId;
    },
    [lineChatEntriesData?.chatEntries],
  );

  useEffect(() => {
    // まずはチャットエントリを1つ選ばせる（未選択なら先頭を自動選択）
    if (selectedChatEntryId !== null) return;
    const first = lineChatEntriesData?.chatEntries?.[0];
    if (first) setSelectedChatEntryId(first.chatEntryId);
  }, [lineChatEntriesData?.chatEntries, selectedChatEntryId]);

  useEffect(() => {
    if (!selectedUser) return;
    // エントリ一覧が読み込まれた後に、未選択なら自動選択する
    if (selectedChatEntryId === null) {
      setSelectedChatEntryId(
        resolveInitialChatEntryId(selectedUser.chatEntryId),
      );
      return;
    }

    const entries = lineChatEntriesData?.chatEntries ?? [];
    if (!entries.length) return;

    const exists = entries.some((e) => e.chatEntryId === selectedChatEntryId);
    if (!exists) {
      const first = entries[0];
      setSelectedChatEntryId(first ? first.chatEntryId : null);
    }
  }, [
    lineChatEntriesData?.chatEntries,
    selectedUser,
    selectedChatEntryId,
    resolveInitialChatEntryId,
  ]);

  useEffect(() => {
    // フィルタ変更で選択中ユーザーが表示対象外になったら、フィルタ内の最新ユーザーを自動選択
    if (!lineUsersData?.users?.length) return;
    if (selectedChatEntryId === null) return;

    const inEntryUsers = lineUsersData.users.filter(
      (u: LineUserResponseType) => u.chatEntryId === selectedChatEntryId,
    );

    if (!inEntryUsers.length) {
      setSelectedUser(null);
      setSelectedLineUserId(null);
      return;
    }

    if (selectedUser?.chatEntryId !== selectedChatEntryId) {
      const latest = getLatestUser(inEntryUsers);
      if (latest) handleSelectUser(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChatEntryId, lineUsersData?.users]);

  const handleSendMessage = async () => {
    if (
      !groupId ||
      !selectedUser ||
      selectedChatEntryId === null ||
      !messageText.trim() ||
      isSending
    )
      return;

    setIsSending(true);
    try {
      const requestBody: SendMessageToLineUserRequestType = {
        lineUserId: selectedUser.lineUserId,
        message: messageText,
        chatEntryId: selectedChatEntryId,
      };

      await send_message_to_line_user_v2_user_manage_line_send_message__group_id__post(
        groupId,
        requestBody,
      );
      setMessageText("");
      mutateChatHistory();
    } catch (e: unknown) {
      handleErrorWithUI(e, "メッセージ送信");
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleResponseMode = useCallback(async () => {
    if (!groupId || !selectedUser?.chatSpaceId || isSwitchingResponseMode)
      return;

    const chatSpaceId = selectedUser.chatSpaceId;
    const transition = resolveHandoffTransition(currentResponseMode);
    setIsSwitchingResponseMode(true);
    setOptimisticResponseMode(transition.nextMode);

    // 先に画面を更新して押下直後にモードが切り替わるようにする
    setSelectedUser((prev) =>
      prev ? applyHandoffModeState(prev, transition) : prev,
    );
    await mutateUsers(
      (prev: { users?: LineUserResponseType[] } | undefined) => {
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
      },
      false,
    );

    try {
      await executeHandoffTransition({
        transition,
        acceptHandoff: () =>
          accept_line_handoff_v2_user_manage_line_handoff_accept__group_id__post(
            groupId,
            { chatSpaceId },
          ),
        closeHandoff: () =>
          close_line_handoff_v2_user_manage_line_handoff_close__group_id__post(
            groupId,
            { chatSpaceId },
          ),
      });
      showSuccessToast(transition.successMessage);
      await mutateUsers();
    } catch (e: unknown) {
      setOptimisticResponseMode(null);
      await mutateUsers();
      handleErrorWithUI(e, "応答モード切り替え");
    } finally {
      setOptimisticResponseMode(null);
      setIsSwitchingResponseMode(false);
    }
  }, [
    groupId,
    selectedUser,
    isSwitchingResponseMode,
    currentResponseMode,
    mutateUsers,
    optimisticResponseMode,
  ]);

  const formatDateTime = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "yyyy/MM/dd HH:mm", { locale: ja });
    } catch {
      return "-";
    }
  };

  const { data: formResponsesData, isLoading: isFormsLoading } = useSWR(
    selectedUser && activeTab === "forms"
      ? `line-form-responses-${selectedUser.userId}`
      : null,
    () =>
      list_user_custom_form_responses_v2_custom_form_response_user__external_user_id__get(
        selectedUser!.userId,
      ),
  );
  const formResponses = formResponsesData as CustomFormResponseListSchemaType;

  const { data: customFormsData, isLoading: isCustomFormsLoading } = useSWR(
    groupId && activeTab === "forms" ? `line-custom-forms-${groupId}` : null,
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

  const userList = useMemo(() => {
    const list = filteredUsers.map((user: LineUserResponseType) => {
      const isSelected = selectedUser?.userId === user.userId;
      const modeUi = getHandoffUiPresentation(
        user.responseMode,
        user.friendChatStatus,
      );
      return (
        <button
          key={user.userId}
          onClick={() => handleSelectUser(user)}
          className={cn(
            "w-full p-2 text-left transition-all duration-300 rounded-lg group flex items-center gap-2.5",
            isSelected
              ? "bg-primary text-white shadow-md shadow-primary/20 z-10"
              : modeUi.isHumanMode
                ? "bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-default-600"
                : "hover:bg-default-50 text-default-600",
          )}
        >
          <UserAvatar size="sm" src={user.pictureUrl} />
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "font-black truncate text-[11px] leading-tight mb-0.5",
                isSelected ? "text-white" : "text-default-800",
              )}
            >
              {user.userName || "未設定"}
            </div>
            <div
              className={cn(
                "text-[8px] font-black uppercase tracking-tighter truncate opacity-70",
                isSelected ? "text-primary-50" : "text-primary",
              )}
            >
              {user.chatEntryName || "デフォルト入口"}
            </div>
            <div className="mt-0.5">
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
    });

    return (
      <div className="flex flex-col h-full">
        {lineChatEntriesList.length > 0 && (
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
              {lineChatEntriesList.map((entry) => (
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
          {list.length === 0 ? (
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
            list
          )}
        </div>
      </div>
    );
  }, [filteredUsers, selectedUser, lineChatEntriesList, selectedChatEntryId]);

  return (
    <ChatManageLayout
      title="LINEユーザー管理"
      subtitle="統合メッセージ管理"
      headerIcon={<Users className="w-4 h-4 text-white" />}
      searchPlaceholder="名前やIDで検索..."
      searchValue={userSearchTerm}
      onSearchChange={setUserSearchTerm}
      isListLoading={isLineUsersLoading || isChatEntriesLoading}
      userList={userList}
      responseMode={currentResponseMode}
      friendChatStatus={selectedUser?.friendChatStatus ?? null}
      isSwitchingResponseMode={isSwitchingResponseMode}
      onToggleResponseMode={handleToggleResponseMode}
      onRefresh={() => {
        mutateChatEntries();
        mutateUsers();
      }}
      selectedUser={selectedUser}
      userDetailHeader={
        selectedUser && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <UserAvatar size="sm" src={selectedUser.pictureUrl} />
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-default-900 tracking-tight truncate max-w-[180px] sm:max-w-none">
                  {selectedUser.userName || "未設定"}
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
            </div>
            <Button
              size="sm"
              variant="flat"
              color="primary"
              onPress={() => setIsFileManagerOpen(true)}
              startContent={<Folder size={12} />}
              className="font-black text-[8px] uppercase h-7 px-2.5"
            >
              ファイル
            </Button>
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
            key="crm"
            title={
              <div className="flex items-center gap-1.5">
                <Info size={14} />
                <span>ユーザー情報</span>
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
                  {isChatHistoryLoading ? (
                    <div className="flex flex-col items-center justify-center p-10 gap-3">
                      <Spinner color="primary" size="sm" />
                      <p className="text-[10px] font-black text-default-300 uppercase tracking-widest">
                        履歴を読み込み中...
                      </p>
                    </div>
                  ) : sortedChatMessages.length > 0 ? (
                    <div className="space-y-4">
                      {sortedChatMessages.map(
                        (msg: ChatHistoryMessageResponseType, idx: number) => {
                          const isHumanAgentMessage =
                            !msg.isUserMessage &&
                            isHumanOperatorChatType(msg.chatType ?? null);
                          const assistantIconSrc = getAssistantIconByChatType(
                            msg.chatType ?? null,
                          );

                          return (
                            <div
                              key={`${msg.chatHistoryId}-${idx}`}
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
                                {msg.isUserMessage && selectedUser ? (
                                  <UserAvatar
                                    size="sm"
                                    src={selectedUser.pictureUrl}
                                  />
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
                        },
                      )}
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
            ) : activeTab === "crm" ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
                  <CardBody className="p-5 sm:p-10">
                    <div className="flex items-center gap-3 mb-6 sm:mb-8">
                      <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <Info size={24} />
                      </div>
                      <h3 className="text-lg font-black text-default-800">
                        基本情報
                      </h3>
                    </div>

                    {selectedUser && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-default-50/50 p-5 rounded-[24px] border border-divider/20 group hover:border-primary/30 transition-all">
                          <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-2 ml-1">
                            ユーザー名
                          </p>
                          <p className="text-base font-black text-default-800 group-hover:text-primary transition-colors">
                            {selectedUser.userName || "未設定"}
                          </p>
                        </div>
                        <div className="bg-default-50/50 p-5 rounded-[24px] border border-divider/20 group hover:border-primary/30 transition-all">
                          <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-2 ml-1">
                            登録日時
                          </p>
                          <p className="text-base font-black text-default-800 group-hover:text-primary transition-colors">
                            {formatDateTime(selectedUser.createdAt)}
                          </p>
                        </div>
                        <div className="bg-default-50/50 p-5 rounded-[24px] border border-divider/20 group hover:border-primary/30 transition-all">
                          <p className="text-[10px] font-black text-default-400 uppercase tracking-widest mb-2 ml-1">
                            最終メッセージ
                          </p>
                          <p className="text-base font-black text-default-800 group-hover:text-primary transition-colors">
                            {formatDateTime(selectedUser.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : activeTab === "booking" ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
                  <CardBody className="p-5 sm:p-8">
                    <h3 className="text-lg font-black text-default-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      予約履歴・予定
                    </h3>
                    <div className="bg-default-50 rounded-lg p-8 text-center">
                      <Calendar className="w-12 h-12 text-default-300 mx-auto mb-4" />
                      <p className="text-default-500 font-black uppercase tracking-widest">
                        予約情報はまだありません
                      </p>
                      <p className="text-xs text-default-400 mt-1 font-bold">
                        ユーザーが行った予約がここに表示されます
                      </p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isFormsLoading || isCustomFormsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40 rounded-[32px]" />
                    <Skeleton className="h-40 rounded-[32px]" />
                  </div>
                ) : (formResponses?.responseList?.length ?? 0) > 0 ? (
                  formResponses?.responseList?.map((response) => (
                    <Card
                      key={response.responseId}
                      className="border-none shadow-sm rounded-[32px] overflow-hidden"
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
                  <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
                    <CardBody className="p-5 sm:p-8">
                      <h3 className="text-lg font-black text-default-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        カスタムフォーム回答
                      </h3>
                      <div className="bg-default-50 rounded-lg p-8 text-center">
                        <FileText className="w-12 h-12 text-default-300 mx-auto mb-4" />
                        <p className="text-default-500 font-black uppercase tracking-widest">
                          フォーム回答はまだありません
                        </p>
                        <p className="text-xs text-default-400 mt-1 font-bold">
                          ユーザーが送信したフォームの内容がここに表示されます
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* 外部(LINE)ユーザーごとの個人ファイル管理 */}
          {selectedUser && (
            <UserFileManagerModal
              isOpen={isFileManagerOpen}
              onOpenChange={setIsFileManagerOpen}
              selectedUser={selectedUser}
              groupId={groupId!}
            />
          )}
        </ScrollShadow>
      }
      footer={
        activeTab === "chat" && (
          <div className="animate-in slide-in-from-bottom-2 duration-300">
            <div className="relative flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/10 transition-all duration-200 shadow-sm p-1">
              <div className="flex-1 relative min-w-0">
                <Textarea
                  placeholder="LINEユーザーに返信を入力..."
                  value={messageText}
                  onValueChange={setMessageText}
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
                      handleSendMessage();
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
                  onPress={handleSendMessage}
                  isLoading={isSending}
                  disabled={!messageText.trim()}
                  className={cn(
                    "min-w-[40px] h-[40px] rounded-full transition-all duration-200",
                    messageText.trim() && !isSending
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
