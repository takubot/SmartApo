/**
 * ブラウザの Web Notifications API を使用するためのユーティリティ
 */

import { useEffect, useRef } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  get_push_public_key_v2_notification_push_public_key_get,
  subscribe_push_v2_notification_push_subscribe__group_id__post,
  unsubscribe_push_v2_notification_push_unsubscribe__group_id__post,
} from "@repo/api-contracts/based_template/service";

import { db } from "../lib/firebase";
import { getGroupHandoffSessionsPath } from "./handoffFirestorePath";

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") {
    return false;
  }
  if (!("Notification" in window)) {
    console.warn("このブラウザはデスクトップ通知をサポートしていません。");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

const urlBase64ToArrayBuffer = (base64String: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

export const isWebPushSupported = () => {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
};

export const registerWebPushSubscription = async (groupId: string) => {
  if (!groupId || !isWebPushSupported()) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const keyResponse = await get_push_public_key_v2_notification_push_public_key_get();
  if (!keyResponse?.enabled || !keyResponse.publicKey) {
    return false;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  const readyRegistration = await navigator.serviceWorker.ready;
  const existingSubscription = await readyRegistration.pushManager.getSubscription();

  const subscription =
    existingSubscription ??
    (await readyRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToArrayBuffer(keyResponse.publicKey),
    }));

  await subscribe_push_v2_notification_push_subscribe__group_id__post(groupId, {
    subscription: subscription.toJSON() as {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    },
  });

  return Boolean(registration);
};

export const unregisterWebPushSubscription = async (groupId: string) => {
  if (!groupId || !isWebPushSupported()) {
    return false;
  }

  const readyRegistration = await navigator.serviceWorker.ready;
  const subscription = await readyRegistration.pushManager.getSubscription();
  if (!subscription) {
    return false;
  }

  await unsubscribe_push_v2_notification_push_unsubscribe__group_id__post(groupId, {
    endpoint: subscription.endpoint,
  });
  await subscription.unsubscribe();
  return true;
};

interface SendNotificationOptions {
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  onClick?: () => void;
}

/**
 * インapp通知用のカスタムイベント名
 */
export const IN_APP_NOTIFICATION_EVENT = "doppel:in_app_notification";

export interface InAppNotificationDetail {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  onClick?: () => void;
  timestamp: number;
  notificationId?: number;
  source?: "manual" | "handoff_realtime" | "handoff_group_realtime";
  chatSpaceId?: number;
  groupId?: string;
}

interface EmitInAppNotificationOptions
  extends Omit<InAppNotificationDetail, "timestamp"> {}

type UseGroupHandoffNotificationRealtimeOptions = {
  groupId: string | null | undefined;
};

export const emitInAppNotification = (detail: EmitInAppNotificationOptions) => {
  if (typeof window === "undefined") return;
  const event = new CustomEvent<InAppNotificationDetail>(
    IN_APP_NOTIFICATION_EVENT,
    {
      detail: {
        ...detail,
        timestamp: Date.now(),
      },
    },
  );
  window.dispatchEvent(event);
};

export const sendDesktopNotification = (
  title: string,
  options: SendNotificationOptions,
): Notification | null => {
  if (typeof window === "undefined") {
    return null;
  }

  // デスクトップ通知の送信
  if (
    "Notification" in window &&
    window.Notification.permission === "granted"
  ) {
    const notification = new window.Notification(title, {
      body: options.body,
      icon: options.icon || "/favicon.ico",
      tag: options.tag,
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (options.onClick) {
        options.onClick();
      }
      notification.close();
    };
  }

  // アプリケーション内通知イベントの発行
  emitInAppNotification({
    title,
    ...options,
    source: "manual",
  });

  return null;
};

export const useGroupHandoffNotificationRealtime = ({
  groupId,
}: UseGroupHandoffNotificationRealtimeOptions) => {
  const initializedRef = useRef(false);
  const lastUpdatedAtIsoRef = useRef<string | null>(null);
  const lastChatSpaceIdRef = useRef<number | null>(null);

  useEffect(() => {
    initializedRef.current = false;
    lastUpdatedAtIsoRef.current = null;
    lastChatSpaceIdRef.current = null;

    if (!groupId) return;

    const sessionsQuery = query(
      collection(db, getGroupHandoffSessionsPath(groupId)),
      orderBy("updatedAtIso", "desc"),
      limit(1),
    );

    return onSnapshot(
      sessionsQuery,
      (snapshot) => {
        const latestDoc = snapshot.docs[0];
        const data = latestDoc?.data();
        const latestUpdatedAtIso =
          (data?.updatedAtIso as string | undefined) ??
          (data?.lastMessageAtIso as string | undefined) ??
          null;
        const latestChatSpaceId =
          typeof data?.chatSpaceId === "number" ? data.chatSpaceId : null;

        if (!initializedRef.current) {
          initializedRef.current = true;
          lastUpdatedAtIsoRef.current = latestUpdatedAtIso;
          lastChatSpaceIdRef.current = latestChatSpaceId;
          return;
        }

        if (
          latestUpdatedAtIso &&
          (latestUpdatedAtIso !== lastUpdatedAtIsoRef.current ||
            latestChatSpaceId !== lastChatSpaceIdRef.current)
        ) {
          lastUpdatedAtIsoRef.current = latestUpdatedAtIso;
          lastChatSpaceIdRef.current = latestChatSpaceId;
          emitInAppNotification({
            title: "有人対応の更新",
            body: "有人対応に関する通知が更新されました。",
            source: "handoff_group_realtime",
            groupId,
            chatSpaceId: latestChatSpaceId ?? undefined,
          });
        }
      },
      (error) => {
        console.error("Firestore group handoff subscription failed:", error);
      },
    );
  }, [groupId]);
};
