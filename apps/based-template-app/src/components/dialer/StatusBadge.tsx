// components/dialer/StatusBadge.tsx
"use client";

import { Chip, type ChipProps } from "@heroui/react";

type ColorMap = Record<string, ChipProps["color"]>;

const CAMPAIGN_STATUS_COLORS: ColorMap = {
  draft: "default",
  active: "success",
  paused: "warning",
  completed: "primary",
  archived: "default",
};

const CALL_STATUS_COLORS: ColorMap = {
  queued: "default",
  ringing: "warning",
  in_progress: "primary",
  completed: "success",
  failed: "danger",
  busy: "warning",
  no_answer: "default",
  canceled: "default",
};

const USER_STATUS_COLORS: ColorMap = {
  offline: "default",
  available: "success",
  on_call: "primary",
  wrap_up: "warning",
  break: "default",
  reserved: "secondary",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  active: "稼働中",
  paused: "一時停止",
  completed: "完了",
  archived: "アーカイブ",
  queued: "待機中",
  ringing: "呼出中",
  in_progress: "通話中",
  failed: "失敗",
  busy: "話中",
  no_answer: "応答なし",
  canceled: "キャンセル",
  offline: "オフライン",
  available: "待機中",
  on_call: "通話中",
  wrap_up: "後処理",
  break: "休憩",
  reserved: "予約済",
  pending: "未処理",
  called: "架電済",
  dnc: "架電禁止",
  skipped: "スキップ",
};

type StatusCategory = "campaign" | "call" | "user";

interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  size?: ChipProps["size"];
}

export default function StatusBadge({
  status,
  category = "campaign",
  size = "sm",
}: StatusBadgeProps) {
  const colorMap =
    category === "call"
      ? CALL_STATUS_COLORS
      : category === "user"
        ? USER_STATUS_COLORS
        : CAMPAIGN_STATUS_COLORS;

  return (
    <Chip color={colorMap[status] || "default"} size={size} variant="flat">
      {STATUS_LABELS[status] || status}
    </Chip>
  );
}
