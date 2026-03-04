"use client";

import React from "react";
import { CalendarDays, FileText, Headset } from "lucide-react";

type ChatQuickActionsProps = {
  showCustomFormAction: boolean;
  customFormRequired: boolean;
  onOpenCustomForm?: () => void;
  showBookingAction: boolean;
  bookingLabel?: string | null;
  onRequestBooking?: () => void;
  showHumanHandoffAction: boolean;
  isHandoffActive: boolean;
  isHandoffLoading?: boolean;
  onRequestHumanHandoff?: () => void;
};

export default function ChatQuickActions({
  showCustomFormAction,
  customFormRequired,
  onOpenCustomForm,
  showBookingAction,
  bookingLabel,
  onRequestBooking,
  showHumanHandoffAction,
  isHandoffActive,
  isHandoffLoading = false,
  onRequestHumanHandoff,
}: ChatQuickActionsProps) {
  if (!showCustomFormAction && !showBookingAction && !showHumanHandoffAction) {
    return null;
  }

  return (
    <div className="mb-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
      {showCustomFormAction ? (
        <button
          type="button"
          onClick={onOpenCustomForm}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
            customFormRequired
              ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
          title="フォーム入力"
        >
          <FileText className="h-3 w-3" />
          <span>{customFormRequired ? "フォーム*" : "フォーム"}</span>
        </button>
      ) : null}

      {showBookingAction ? (
        <button
          type="button"
          onClick={onRequestBooking}
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
          title="予約導線"
        >
          <CalendarDays className="h-3 w-3" />
          <span>{bookingLabel?.trim() || "予約"}</span>
        </button>
      ) : null}

      {showHumanHandoffAction ? (
        <button
          type="button"
          onClick={onRequestHumanHandoff}
          disabled={isHandoffActive || isHandoffLoading}
          className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          title="有人対応"
        >
          <Headset className="h-3 w-3" />
          <span>
            {isHandoffActive
              ? "有人対応中"
              : isHandoffLoading
                ? "接続中..."
                : "有人対応"}
          </span>
        </button>
      ) : null}
    </div>
  );
}
