import { type Message } from "../../types";

const OWN_MESSAGE_DEDUPE_WINDOW_MS = 15_000;
const STREAMING_BOT_MESSAGE_DEDUPE_WINDOW_MS = 30_000;

const normalizeContent = (content: string | null | undefined): string =>
  (content ?? "").trim();

const parseTimestamp = (timestamp: string | null | undefined): number => {
  const ms = Date.parse(timestamp ?? "");
  return Number.isNaN(ms) ? 0 : ms;
};

const isEquivalentOwnMessage = (a: Message, b: Message): boolean => {
  if (!a.isOwnMessage || !b.isOwnMessage) return false;

  const aContent = normalizeContent(a.content);
  const bContent = normalizeContent(b.content);
  if (!aContent || aContent !== bContent) return false;

  const timeDiff = Math.abs(
    parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp),
  );
  return timeDiff <= OWN_MESSAGE_DEDUPE_WINDOW_MS;
};

const isEquivalentStreamingBotMessage = (a: Message, b: Message): boolean => {
  if (a.isOwnMessage || b.isOwnMessage) return false;
  if (!a.id.startsWith("bot_stream_")) return false;

  const aContent = normalizeContent(a.content);
  const bContent = normalizeContent(b.content);
  if (!aContent || aContent !== bContent) return false;

  const timeDiff = Math.abs(
    parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp),
  );
  return timeDiff <= STREAMING_BOT_MESSAGE_DEDUPE_WINDOW_MS;
};

const dedupeMissingOwnMessages = (
  missingMessages: Message[],
  historyMessages: Message[],
): Message[] => {
  const usedHistoryIndexes = new Set<number>();

  return missingMessages.filter((missingMessage) => {
    for (let i = 0; i < historyMessages.length; i += 1) {
      if (usedHistoryIndexes.has(i)) continue;
      const historyMessage = historyMessages[i]!;
      if (
        isEquivalentOwnMessage(missingMessage, historyMessage) ||
        isEquivalentStreamingBotMessage(missingMessage, historyMessage)
      ) {
        usedHistoryIndexes.add(i);
        return false;
      }
    }
    return true;
  });
};

type MergeMessagesWithHistoryInput = {
  previousMessages: Message[];
  historyMessages: Message[];
  isStreaming: boolean;
};

export const mergeMessagesWithHistory = ({
  previousMessages,
  historyMessages,
  isStreaming,
}: MergeMessagesWithHistoryInput): Message[] => {
  if (isStreaming) return previousMessages;

  // 履歴が一時的に空で返るケースでは既存表示を維持する
  if (historyMessages.length === 0 && previousMessages.length > 0) {
    return previousMessages;
  }

  const historyIds = new Set(historyMessages.map((message) => message.id));
  const missingMessages = previousMessages.filter(
    (message) => !historyIds.has(message.id),
  );
  const dedupedMissingMessages = dedupeMissingOwnMessages(
    missingMessages,
    historyMessages,
  );

  if (dedupedMissingMessages.length === 0) {
    return historyMessages;
  }

  const merged = [...historyMessages, ...dedupedMissingMessages];
  merged.sort(
    (a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp),
  );
  return merged;
};
