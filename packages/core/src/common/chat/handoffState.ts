const ACTIVE_HANDOFF_STATUSES = new Set(["WAITING", "IN_PROGRESS", "ANSWERED"]);

export const isActiveHandoffState = (
  responseMode: "AI" | "FRIEND",
  friendChatStatus: string | null | undefined,
): boolean => {
  if (responseMode !== "FRIEND") return false;
  const normalizedStatus = (friendChatStatus ?? "").trim().toUpperCase();
  return ACTIVE_HANDOFF_STATUSES.has(normalizedStatus);
};
