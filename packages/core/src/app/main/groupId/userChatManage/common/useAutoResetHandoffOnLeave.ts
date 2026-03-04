"use client";

import { useEffect, useRef } from "react";

type UseAutoResetHandoffOnLeaveParams = {
  isHumanMode: boolean;
  chatSpaceId: number | null;
  closeHandoff: (chatSpaceId: number) => Promise<unknown>;
};

const AUTO_CLOSE_GRACE_MS = 20_000;
const pendingCloseTimers = new Map<number, number>();

const cancelPendingAutoClose = (chatSpaceId: number | null) => {
  if (!chatSpaceId) return;
  const timerId = pendingCloseTimers.get(chatSpaceId);
  if (!timerId) return;
  window.clearTimeout(timerId);
  pendingCloseTimers.delete(chatSpaceId);
};

export const useAutoResetHandoffOnLeave = ({
  isHumanMode,
  chatSpaceId,
  closeHandoff,
}: UseAutoResetHandoffOnLeaveParams) => {
  const latestIsHumanModeRef = useRef(isHumanMode);
  const latestChatSpaceIdRef = useRef<number | null>(chatSpaceId);

  useEffect(() => {
    latestIsHumanModeRef.current = isHumanMode;
    latestChatSpaceIdRef.current = chatSpaceId;

    // 誤操作で一瞬離脱→すぐ戻ったケースでは保留中の自動クローズを取り消す
    if (isHumanMode && chatSpaceId) {
      cancelPendingAutoClose(chatSpaceId);
    }
  }, [isHumanMode, chatSpaceId]);

  useEffect(() => {
    return () => {
      if (!latestIsHumanModeRef.current) return;
      const leavingChatSpaceId = latestChatSpaceIdRef.current;
      if (!leavingChatSpaceId) return;

      cancelPendingAutoClose(leavingChatSpaceId);
      const timerId = window.setTimeout(() => {
        pendingCloseTimers.delete(leavingChatSpaceId);
        void closeHandoff(leavingChatSpaceId).catch((error) => {
          console.error("Failed to auto-reset handoff mode on leave:", error);
        });
      }, AUTO_CLOSE_GRACE_MS);
      pendingCloseTimers.set(leavingChatSpaceId, timerId);
    };
  }, [closeHandoff]);
};
