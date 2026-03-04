"use client";

import React from "react";
import { Avatar } from "@heroui/react";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { gradientFrom } from "../../../../common/colorUtils";
import CompactActionMenu from "../components/shared/CompactActionMenu";

interface ChatHeaderProps {
  headerText?: string;
  headerColor?: string;
  headerTextColor?: string;
  onClose?: () => void;
  onBotSelect?: () => void;
  showBotSelect?: boolean;
  selectedBot?: BotResponseSchemaType | null;
  showBotInfo?: boolean;
  languageCodes?: string[];
  selectedLanguage?: string;
  onSelectLanguage?: (languageCode: string) => void;
  showCustomForm?: boolean;
  onCustomFormOpen?: () => void;
  isCustomFormRequired?: boolean;
  isBookingEnabled?: boolean;
  bookingButtonLabel?: string | null;
  onRequestBooking?: () => void;
  showHumanHandoffAction?: boolean;
  onRequestHumanHandoff?: () => void;
  isHandoffActive?: boolean;
  isHandoffLoading?: boolean;
}

export default function ChatHeader({
  headerText = "Chat",
  headerColor = "#ffffff",
  headerTextColor = "#111827",
  onClose,
  onBotSelect,
  showBotSelect = false,
  selectedBot,
  showBotInfo = true,
  languageCodes,
  selectedLanguage,
  onSelectLanguage,
  showCustomForm = false,
  onCustomFormOpen,
  isCustomFormRequired = false,
  isBookingEnabled = false,
  bookingButtonLabel,
  onRequestBooking,
  showHumanHandoffAction = false,
  onRequestHumanHandoff,
  isHandoffActive = false,
  isHandoffLoading = false,
}: ChatHeaderProps) {
  // embed.jsからの閉じる要求を検知
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "CLOSE_CHAT") {
        if (onClose) {
          onClose();
        } else {
          // 親ウィンドウに閉じる要求を送信
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "CLOSE_CHAT" }, "*");
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onClose]);

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0"
      style={{
        background: gradientFrom(headerColor),
        color: headerTextColor,
        // グリッド行の高さに追従させる
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            backgroundColor:
              headerTextColor === "#ffffff"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.08)",
          }}
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 24 24"
            style={{ color: headerTextColor }}
          >
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
          </svg>
        </div>
        <span
          className="font-semibold text-base"
          style={{ color: headerTextColor }}
        >
          {headerText}
        </span>

        {/* 選択中ボットの簡易表示（小画面では非表示） */}
        {showBotInfo && selectedBot ? (
          <div className="hidden sm:flex items-center gap-2 bg-white/30 rounded-full px-2 py-1">
            <Avatar
              src={selectedBot.botIconImgGcsPath || "/botIcon/default.ico"}
              size="sm"
            />
            <span className="text-xs text-gray-800 truncate max-w-[120px]">
              {selectedBot.botName}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <CompactActionMenu
          textColor={headerTextColor}
          languageCodes={languageCodes}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={onSelectLanguage}
          showCustomFormAction={showCustomForm}
          onCustomFormOpen={onCustomFormOpen}
          customFormRequired={isCustomFormRequired}
          showBookingAction={isBookingEnabled}
          bookingButtonLabel={bookingButtonLabel}
          onRequestBooking={onRequestBooking}
          showHumanHandoffAction={showHumanHandoffAction}
          onRequestHumanHandoff={onRequestHumanHandoff}
          isHandoffActive={isHandoffActive}
          isHandoffLoading={isHandoffLoading}
          showBotSelect={showBotSelect}
          onBotSelect={onBotSelect}
        />

        {/* 閉じるボタン */}
        <button
          onClick={() => {
            if (onClose) {
              onClose();
            } else {
              // 親ウィンドウに閉じる要求を送信
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "CLOSE_CHAT" }, "*");
              }
            }
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-all duration-200 group"
          style={{ color: headerTextColor }}
          aria-label="チャットを閉じる"
          title="チャットを閉じる"
        >
          <svg
            className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
