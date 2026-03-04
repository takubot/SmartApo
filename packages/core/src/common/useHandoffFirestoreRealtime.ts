"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../lib/firebase";
import {
  getSessionMessagesPath,
  getTenantHandoffSessionsPath,
} from "./handoffFirestorePath";
import { emitInAppNotification } from "./notificationUtils";

type UseHandoffFirestoreRealtimeOptions = {
  chatSpaceId: number | null;
  onChanged: () => void;
};

type SyncHandoffStateInput = {
  chatSpaceId: number;
  responseMode: "AI" | "FRIEND";
  friendChatStatus: string | null;
  operatorName?: string | null;
};

const CHANGE_NOTIFY_COOLDOWN_MS = 250;

export const syncHandoffStateToFirestore = async ({
  chatSpaceId,
  responseMode,
  friendChatStatus,
  operatorName,
}: SyncHandoffStateInput): Promise<void> => {
  const nowIso = new Date().toISOString();
  const sessionRef = doc(
    db,
    getTenantHandoffSessionsPath(),
    String(chatSpaceId),
  );
  await setDoc(
    sessionRef,
    {
      chatSpaceId,
      responseMode,
      friendChatStatus,
      operatorName: operatorName ?? null,
      updatedAtIso: nowIso,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const buildSessionStateKey = (data: Record<string, unknown> | undefined) =>
  [
    String(data?.responseMode ?? ""),
    String(data?.friendChatStatus ?? ""),
    String(data?.operatorUserId ?? ""),
    String(data?.operatorName ?? ""),
  ].join("|");

export const useHandoffFirestoreRealtime = ({
  chatSpaceId,
  onChanged,
}: UseHandoffFirestoreRealtimeOptions) => {
  const onChangedRef = useRef(onChanged);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastUpdatedAtRef = useRef<string | null>(null);
  const lastStateKeyRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const isCoolingDownRef = useRef(false);
  const hasPendingNotifyRef = useRef(false);
  const notifyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    onChangedRef.current = onChanged;
  }, [onChanged]);

  useEffect(() => {
    if (!chatSpaceId) {
      initializedRef.current = false;
      lastMessageIdRef.current = null;
      lastUpdatedAtRef.current = null;
      lastStateKeyRef.current = null;
      isCoolingDownRef.current = false;
      hasPendingNotifyRef.current = false;
      if (notifyResetTimerRef.current !== null) {
        window.clearTimeout(notifyResetTimerRef.current);
        notifyResetTimerRef.current = null;
      }
      return;
    }

    const dispatchNotify = () => {
      try {
        onChangedRef.current();
        emitInAppNotification({
          title: "有人対応の更新",
          body: "チャット状態が更新されました。",
          source: "handoff_realtime",
          chatSpaceId,
        });
      } finally {
        isCoolingDownRef.current = true;
        notifyResetTimerRef.current = window.setTimeout(() => {
          if (hasPendingNotifyRef.current) {
            hasPendingNotifyRef.current = false;
            dispatchNotify();
            return;
          }
          isCoolingDownRef.current = false;
          notifyResetTimerRef.current = null;
        }, CHANGE_NOTIFY_COOLDOWN_MS);
      }
    };

    const notifyChange = () => {
      if (isCoolingDownRef.current) {
        hasPendingNotifyRef.current = true;
        return;
      }
      dispatchNotify();
    };

    const sessionRefPath = getSessionMessagesPath(chatSpaceId);
    const messagesQuery = query(
      collection(db, sessionRefPath),
      orderBy("createdAtIso", "desc"),
      limit(1),
    );

    const unsubMessages = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const latestDoc = snapshot.docs[0];
        const latestId = latestDoc?.id ?? null;
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastMessageIdRef.current = latestId;
          return;
        }
        if (latestId && latestId !== lastMessageIdRef.current) {
          lastMessageIdRef.current = latestId;
          notifyChange();
        }
      },
      (error) => {
        console.error("Firestore handoff message subscription failed:", error);
      },
    );

    const sessionDocRef = doc(
      db,
      getTenantHandoffSessionsPath(),
      String(chatSpaceId),
    );
    const unsubSession = onSnapshot(
      sessionDocRef,
      (snapshot) => {
        const data = snapshot.data();
        const updatedAtIso = (data?.updatedAtIso as string | undefined) ?? null;
        const stateKey = buildSessionStateKey(
          data as Record<string, unknown> | undefined,
        );

        if (!lastStateKeyRef.current) {
          lastStateKeyRef.current = stateKey;
        } else if (stateKey !== lastStateKeyRef.current) {
          lastStateKeyRef.current = stateKey;
          notifyChange();
        }

        if (!updatedAtIso) return;
        if (!lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = updatedAtIso;
          return;
        }
        if (updatedAtIso !== lastUpdatedAtRef.current) {
          lastUpdatedAtRef.current = updatedAtIso;
          notifyChange();
        }
      },
      (error) => {
        console.error("Firestore handoff state subscription failed:", error);
      },
    );

    return () => {
      if (notifyResetTimerRef.current !== null) {
        window.clearTimeout(notifyResetTimerRef.current);
        notifyResetTimerRef.current = null;
      }
      isCoolingDownRef.current = false;
      hasPendingNotifyRef.current = false;
      unsubMessages();
      unsubSession();
    };
  }, [chatSpaceId]);
};
