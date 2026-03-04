// フォーム用の追加フィールド（ZodスキーマにはないUI専用フィールド）
export interface FormAdditionalFields {
  allowedIpList?: string; // accessPolicy.allowedIpListを文字列として扱うためのUI専用フィールド
}

// ============================================================
// ChatEntry kind resolution (single source of truth)
// ============================================================

export type ChatEntryKind = "LINE" | "WEB" | "UNKNOWN";

/**
 * ChatEntry が LINE / WEB のどちらとして扱うべきかを判定する唯一の関数。
 * - 既存データの混在や、camelCase / snake_case の表記ゆれを吸収する。
 * - 判定の優先度は LINE > WEB > UNKNOWN。
 */
export function resolveChatEntryKind(entry: unknown): ChatEntryKind {
  if (!entry || typeof entry !== "object") return "UNKNOWN";
  const anyEntry = entry as any;
  const lineConfig = anyEntry.lineConfig ?? anyEntry.line_config ?? null;
  const webConfig = anyEntry.webConfig ?? anyEntry.web_config ?? null;
  if (lineConfig) return "LINE";
  if (webConfig) return "WEB";
  return "UNKNOWN";
}
