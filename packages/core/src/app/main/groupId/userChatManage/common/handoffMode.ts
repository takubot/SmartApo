export type HandoffMode = "AI" | "FRIEND";
type HandoffStatus = "IN_PROGRESS" | "CLOSED";
type ModeTone = "success" | "warning" | "primary";

export type HandoffUiPresentation = {
  modeLabel: string;
  detailLabel: string;
  shortLabel: string;
  tone: ModeTone;
  isHumanMode: boolean;
};

export type HandoffTransition = {
  nextMode: HandoffMode;
  nextFriendChatStatus: HandoffStatus;
  successMessage: string;
};

type HandoffModeState = {
  responseMode?: string | null;
  friendChatStatus?: string | null;
};

type ExecuteHandoffTransitionParams = {
  transition: HandoffTransition;
  acceptHandoff: () => Promise<unknown>;
  closeHandoff: () => Promise<unknown>;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? "").trim().toUpperCase();

const normalizeHandoffMode = (mode: string | null | undefined): HandoffMode =>
  normalize(mode) === "FRIEND" ? "FRIEND" : "AI";

export const getHandoffUiPresentation = (
  responseMode: string | null | undefined,
  friendChatStatus: string | null | undefined,
): HandoffUiPresentation => {
  const mode = normalize(responseMode);
  const status = normalize(friendChatStatus);

  if (mode !== "FRIEND") {
    return {
      modeLabel: "AI自動対応中",
      detailLabel: "AIが自動で返信しています",
      shortLabel: "AI",
      tone: "success",
      isHumanMode: false,
    };
  }

  if (status === "WAITING") {
    return {
      modeLabel: "有人対応: 待機中",
      detailLabel: "オペレーター接続待ち",
      shortLabel: "待機中",
      tone: "warning",
      isHumanMode: true,
    };
  }

  return {
    modeLabel: "有人対応中",
    detailLabel: "オペレーターが対応中",
    shortLabel: "対応中",
    tone: "primary",
    isHumanMode: true,
  };
};

export const resolveHandoffTransition = (
  currentMode: string | null | undefined,
): HandoffTransition => {
  const mode = normalizeHandoffMode(currentMode);
  if (mode === "FRIEND") {
    return {
      nextMode: "AI",
      nextFriendChatStatus: "CLOSED",
      successMessage: "AI自動対応に切り替えました",
    };
  }
  return {
    nextMode: "FRIEND",
    nextFriendChatStatus: "IN_PROGRESS",
    successMessage: "有人対応に切り替えました",
  };
};

export const applyHandoffModeState = <T extends HandoffModeState>(
  state: T,
  transition: HandoffTransition,
): T => ({
  ...state,
  responseMode: transition.nextMode,
  friendChatStatus: transition.nextFriendChatStatus,
});

export const applyHandoffModeToList = <T extends HandoffModeState>(
  list: T[],
  matcher: (item: T) => boolean,
  transition: HandoffTransition,
): T[] =>
  list.map((item) =>
    matcher(item) ? applyHandoffModeState(item, transition) : item,
  );

export const executeHandoffTransition = async ({
  transition,
  acceptHandoff,
  closeHandoff,
}: ExecuteHandoffTransitionParams): Promise<void> => {
  const result =
    transition.nextMode === "FRIEND"
      ? await acceptHandoff()
      : await closeHandoff();

  const apiSuccess =
    typeof result === "object" &&
    result !== null &&
    "success" in result &&
    Boolean((result as { success?: unknown }).success);
  if (!apiSuccess) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof (result as { message?: unknown }).message === "string"
        ? (result as { message: string }).message
        : "応答モードの切り替えに失敗しました";
    throw new Error(message);
  }
};
