"use client";
//
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import {
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSection,
  DropdownTrigger,
} from "@heroui/react";
import { Check, Menu, Plus, Users, X, Bell, ExternalLink } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useCallback } from "react";

// ★ 型定義をcomponentsから使用
import type { GroupResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

import { useGroupContext, useGroupDataContext } from "./layout-client";
import {
  IN_APP_NOTIFICATION_EVENT,
  registerWebPushSubscription,
  requestNotificationPermission,
  useGroupHandoffNotificationRealtime,
} from "@common/notificationUtils";
import {
  Badge,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import useSWR, { mutate } from "swr";
import {
  list_group_notifications_v2_notification_list__group_id__get,
  unread_count_v2_notification_unread_count__group_id__get,
  mark_read_v2_notification_read__group_id__post,
  mark_read_all_v2_notification_read_all__group_id__post,
} from "@repo/api-contracts/based_template/service";
import {
  NotificationListResponseSchemaType,
  UnreadCountResponseSchemaType,
  NotificationResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";

type DisplayGroupItem = GroupResponseSchemaType & { groupRole: string };

type HeaderProps = {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

export default function Header({
  isSidebarOpen = false,
  onToggleSidebar,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const logoUrl =
    "/themeIcon/" + (process.env.NEXT_PUBLIC_LOGO_IMG_URL || "doppel_logo.png");
  const logoAlt = "doppel_logo";

  // 現在選択中のグループID
  const groupId = useGroupContext();

  const {
    isOpen: isModalOpen,
    onOpen: onModalOpen,
    onOpenChange: onModalOpenChange,
  } = useDisclosure();
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  // 通知データの取得
  const { data: notificationData } = useSWR<NotificationListResponseSchemaType>(
    groupId ? `notifications-${groupId}` : null,
    () => list_group_notifications_v2_notification_list__group_id__get(groupId),
    {
      revalidateOnFocus: true,
    },
  );

  // 未読カウントの取得
  const { data: unreadData } = useSWR<UnreadCountResponseSchemaType>(
    groupId ? `unread-count-${groupId}` : null,
    () => unread_count_v2_notification_unread_count__group_id__get(groupId),
    {
      revalidateOnFocus: true,
    },
  );

  const notifications = notificationData?.notifications || [];
  const visibleNotifications = notifications.filter(
    (notification) => notification.notificationType !== "HUMAN_HANDOFF_ACTIVE",
  );
  const hiddenActiveUnreadCount = notifications.reduce(
    (count, notification) => {
      if (
        notification.notificationType === "HUMAN_HANDOFF_ACTIVE" &&
        !notification.isRead
      ) {
        return count + 1;
      }
      return count;
    },
    0,
  );
  const unreadCount = Math.max(
    0,
    (unreadData?.unreadCount || 0) - hiddenActiveUnreadCount,
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      alertAudioRef.current = new Audio("/sounds/alert.mp3");
      requestNotificationPermission();
    }
  }, []);

  useEffect(() => {
    if (!groupId || typeof window === "undefined") return;

    const setupWebPush = async () => {
      try {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        await registerWebPushSubscription(groupId);
      } catch (error) {
        console.error("Failed to setup web push subscription:", error);
      }
    };

    setupWebPush();
  }, [groupId]);

  // リアルタイム通知イベントのハンドリング
  useEffect(() => {
    if (!groupId) return;

    const handleNotification = () => {
      // const customEvent = event as CustomEvent<InAppNotificationDetail>;
      // const detail = customEvent.detail;

      if (alertAudioRef.current) {
        alertAudioRef.current.play().catch(() => {});
      }

      // SWRのデータを再検証して最新の通知リストを取得
      mutate(`notifications-${groupId}`);
      mutate(`unread-count-${groupId}`);
    };

    window.addEventListener(IN_APP_NOTIFICATION_EVENT, handleNotification);
    return () => {
      window.removeEventListener(IN_APP_NOTIFICATION_EVENT, handleNotification);
    };
  }, [groupId]);

  useGroupHandoffNotificationRealtime({
    groupId,
  });

  // 通知を既読にする
  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!groupId) return;
      try {
        await mark_read_v2_notification_read__group_id__post(groupId, {
          notificationId,
        });
        mutate(`notifications-${groupId}`);
        mutate(`unread-count-${groupId}`);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [groupId],
  );

  // すべて既読にする
  const handleMarkAllAsRead = useCallback(async () => {
    if (!groupId) return;
    try {
      await mark_read_all_v2_notification_read_all__group_id__post(groupId);
      mutate(`notifications-${groupId}`);
      mutate(`unread-count-${groupId}`);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [groupId]);

  // 通知クリック時のハンドリング
  const handleNotificationClick = useCallback(
    (notification: NotificationResponseSchemaType, onClose: () => void) => {
      handleMarkAsRead(notification.notificationId);

      // 通知タイプに応じた遷移先
      if (
        notification.notificationType.startsWith("HUMAN_HANDOFF") ||
        notification.notificationType === "WAITING_HANDOFF"
      ) {
        router.push(`/main/${groupId}/userChatManage/web`);
      } else if (notification.notificationType.startsWith("BOOKING")) {
        router.push(`/main/${groupId}/dashboard`); // 予約管理ページがあればそこへ
      }

      onClose();
    },
    [groupId, handleMarkAsRead, router],
  );

  // コンテキストからデータを取得 - 重複したAPI呼び出しを排除
  const {
    displayGroupList,
    currentGroup,
    isGroupDataLoading: isLoading,
    isGroupDataError: isError,
  } = useGroupDataContext();

  // パスからページ情報を取得
  const getPageInfo = () => {
    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments.includes("chat")) {
      return { title: "チャット", section: "chat" };
    }
    if (pathSegments.includes("file")) {
      return { title: "ファイル管理", section: "file" };
    }
    if (pathSegments.includes("chatBot")) {
      return { title: "チャットボット", section: "chatBot" };
    }
    if (pathSegments.includes("member")) {
      return { title: "メンバー管理", section: "member" };
    }
    if (pathSegments.includes("dashboard")) {
      return { title: "ダッシュボード", section: "dashboard" };
    }
    if (pathSegments.includes("category")) {
      return { title: "カテゴリ管理", section: "category" };
    }
    if (pathSegments.includes("urlManage")) {
      return { title: "URL管理", section: "urlManage" };
    }
    if (pathSegments.includes("form") || pathSegments.includes("customForm")) {
      return { title: "フォーム管理", section: "form" };
    }
    if (pathSegments.includes("dataTable")) {
      return { title: "データテーブル", section: "dataTable" };
    }
    if (pathSegments.includes("suggest")) {
      return { title: "サジェスト管理", section: "suggest" };
    }

    return { title: "グループ管理", section: "general" };
  };

  const pageInfo = getPageInfo();

  // ナビゲーション関数
  const handleLogoClick = () => {
    router.push("/main/group/home");
  };

  const handleHomeClick = () => {
    router.push("/main/group/home");
  };

  const handleGroupHomeClick = () => {
    router.push(`/main/${groupId}/chat`);
  };

  // リストが取れてきたら、URLパラメータの groupId が有効かチェック
  useEffect(() => {
    if (!isLoading && !isError && displayGroupList.length > 0) {
      const hasValidGroup = displayGroupList.some(
        (g: DisplayGroupItem) => g.groupId === groupId,
      );
      if (!hasValidGroup) {
        router.push(`/main/group/home`);
      }
    }
  }, [isLoading, isError, displayGroupList, groupId, router]);

  // ローディング中・エラー時の簡易表示
  if (isLoading) {
    return (
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between h-16 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              isIconOnly
              variant="light"
              className="lg:hidden w-8 h-8 sm:w-10 sm:h-10 text-gray-500"
              onPress={onToggleSidebar}
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div
              className="flex min-w-64 max-w-64 min-h-16 p-2 items-center justify-center cursor-pointer"
              onClick={handleLogoClick}
            >
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={150}
                height={50}
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="flex items-center gap-2 sm:gap-3 p-2 min-h-[48px]">
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="hidden sm:block">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-16 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  if (isError) {
    return (
      <header className="bg-white shadow-sm border-l-4 border-red-500">
        <div className="flex items-center justify-between h-16 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              isIconOnly
              variant="light"
              className="lg:hidden w-8 h-8 sm:w-10 sm:h-10 text-gray-500"
              onPress={onToggleSidebar}
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div
              className="flex min-w-64 max-w-64 min-h-16 p-2 items-center justify-center cursor-pointer"
              onClick={handleLogoClick}
            >
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={150}
                height={50}
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 text-red-600">
            <span className="text-sm font-medium hidden sm:inline">
              エラーが発生しました
            </span>
            <Button
              size="sm"
              color="danger"
              variant="light"
              onPress={() => window.location.reload()}
            >
              再読み込み
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const getGroupAvatarColor = (groupName: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-indigo-500",
      "bg-red-500",
      "bg-teal-500",
    ];
    const hash = groupName.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  const getGroupInitials = (groupName: string) => {
    return groupName
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleGroupSelect = (groupId: string) => {
    router.push(`/main/${groupId}/chat`);
  };

  return (
    <>
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between h-16 px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <Button
              isIconOnly
              variant="light"
              className={`lg:hidden transition-all duration-200 ease-in-out w-8 h-8 sm:w-10 sm:h-10 min-w-8 sm:min-w-10 rounded-md flex-shrink-0 touch-manipulation ${
                isSidebarOpen
                  ? "bg-gray-100 text-gray-600"
                  : "bg-transparent text-gray-500"
              }`}
              onPress={onToggleSidebar}
            >
              {isSidebarOpen ? (
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>

            <div
              className="flex min-w-64 max-w-64 min-h-16 p-2 items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              onClick={handleLogoClick}
            >
              <Image
                src={logoUrl}
                alt={logoAlt}
                width={150}
                height={50}
                style={{ width: "auto", height: "auto" }}
                priority
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* 通知ベル */}
            <div className="relative">
              <Badge
                content={unreadCount}
                color="danger"
                shape="circle"
                isInvisible={unreadCount === 0}
                size="sm"
              >
                <Button
                  isIconOnly
                  variant="light"
                  radius="full"
                  className="text-gray-500 hover:bg-gray-100"
                  onPress={onModalOpen}
                >
                  <Bell size={20} />
                </Button>
              </Badge>
            </div>

            {/* 通知モーダル */}
            <Modal
              isOpen={isModalOpen}
              onOpenChange={onModalOpenChange}
              scrollBehavior="inside"
              size="md"
              backdrop="blur"
            >
              <ModalContent>
                {(onClose) => (
                  <>
                    <ModalHeader className="flex flex-col gap-1">
                      通知一覧
                    </ModalHeader>
                    <ModalBody>
                      {visibleNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                          <Bell size={48} className="mb-2 opacity-20" />
                          <p>新しい通知はありません</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {visibleNotifications.map((notification) => (
                            <div
                              key={notification.notificationId}
                              className={`p-4 rounded-xl border transition-colors cursor-pointer group relative ${
                                notification.isRead
                                  ? "bg-white border-divider"
                                  : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100"
                              }`}
                              onClick={() =>
                                handleNotificationClick(notification, onClose)
                              }
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-indigo-600 flex items-center gap-2">
                                  {notification.title}
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                  )}
                                  <ExternalLink
                                    size={12}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                  />
                                </h4>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(
                                    notification.createdAt,
                                  ).toLocaleString("ja-JP", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">
                                {notification.body}
                              </p>
                              {!notification.isRead && (
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsRead(
                                      notification.notificationId,
                                    );
                                  }}
                                >
                                  <Check size={14} className="text-green-600" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ModalBody>
                    <ModalFooter className="flex justify-between">
                      <Button
                        variant="light"
                        size="sm"
                        color="primary"
                        startContent={<Check size={14} />}
                        onPress={handleMarkAllAsRead}
                        isDisabled={unreadCount === 0}
                      >
                        すべて既読にする
                      </Button>
                      <Button color="primary" onPress={onClose} size="sm">
                        閉じる
                      </Button>
                    </ModalFooter>
                  </>
                )}
              </ModalContent>
            </Modal>

            {/* グループセレクター */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button
                  variant="light"
                  className="p-2 min-w-0 h-auto hover:bg-gray-50 transition-colors"
                  disableRipple
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold ${
                        currentGroup
                          ? getGroupAvatarColor(currentGroup.groupName || "")
                          : "bg-gray-400"
                      }`}
                    >
                      {currentGroup ? (
                        getGroupInitials(currentGroup.groupName || "")
                      ) : (
                        <Users size={12} />
                      )}
                    </div>
                    <div className="hidden sm:block text-left min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-32 lg:max-w-48">
                        {currentGroup?.groupName || "グループを選択"}
                      </div>
                      <div className="text-xs text-gray-500">グループ</div>
                    </div>
                    <ChevronDownIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  </div>
                </Button>
              </DropdownTrigger>

              <DropdownMenu aria-label="グループ選択" className="w-72">
                <DropdownSection title="ナビゲーション" showDivider>
                  <DropdownItem
                    key="back-to-home"
                    className="py-3"
                    onPress={handleHomeClick}
                    startContent={<ArrowLeftIcon className="w-4 h-4" />}
                  >
                    グループ一覧に戻る
                  </DropdownItem>
                </DropdownSection>

                <DropdownSection title="グループ選択">
                  {displayGroupList.map((group: DisplayGroupItem) => (
                    <DropdownItem
                      key={group.groupId}
                      className="py-3"
                      onPress={() => handleGroupSelect(group.groupId)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${getGroupAvatarColor(
                            group.groupName,
                          )}`}
                        >
                          {getGroupInitials(group.groupName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {group.groupName}
                            </span>
                            {group.groupId === groupId && (
                              <Check size={16} className="text-green-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </DropdownItem>
                  ))}
                </DropdownSection>

                <DropdownSection title="アクション">
                  <DropdownItem
                    key="create-new"
                    className="py-3"
                    onPress={() => router.push("/main/group/new")}
                    startContent={<Plus size={16} />}
                  >
                    新しいグループを作成
                  </DropdownItem>
                </DropdownSection>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        <div className="border-t border-gray-200 px-3 sm:px-6 py-2 bg-gray-50">
          <Breadcrumbs
            size="sm"
            className="text-gray-600"
            separator={<ChevronRightIcon className="w-3 h-3 text-gray-400" />}
          >
            <BreadcrumbItem onPress={handleHomeClick}>
              <div className="flex items-center space-x-1">
                <HomeIcon className="w-3 h-3" />
                <span>グループ一覧</span>
              </div>
            </BreadcrumbItem>
            <BreadcrumbItem onPress={handleGroupHomeClick}>
              <div className="flex items-center space-x-1">
                <BuildingStorefrontIcon className="w-3 h-3" />
                <span>{currentGroup?.groupName || "グループ"}</span>
              </div>
            </BreadcrumbItem>
            <BreadcrumbItem className="text-gray-900 font-medium">
              {pageInfo.title}
            </BreadcrumbItem>
          </Breadcrumbs>
        </div>
      </header>
    </>
  );
}
