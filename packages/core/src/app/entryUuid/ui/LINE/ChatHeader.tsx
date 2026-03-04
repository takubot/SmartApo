"use client";

import { Avatar } from "@heroui/react";
import React from "react";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { gradientFrom } from "../../../../common/colorUtils";
import CompactActionMenu from "../components/shared/CompactActionMenu";

interface ChatHeaderProps {
  headerText?: string;
  headerColor?: string;
  headerTextColor?: string;
  selectedBot?: BotResponseSchemaType | null;
  onBotSelect: () => void;
  showBotSelect?: boolean;
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
  headerText = "チャット",
  headerColor = "#ffffff",
  headerTextColor = "#000000",
  selectedBot,
  onBotSelect,
  showBotSelect = false,
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
  return (
    <div
      className="flex items-center justify-between py-2.5 flex-shrink-0 relative overflow-visible"
      style={{
        background: gradientFrom(headerColor),
        color: headerTextColor,
        height: "calc(52px + env(safe-area-inset-top))",
        paddingTop: "calc(10px + env(safe-area-inset-top))",
        paddingBottom: "10px",
        paddingLeft: "calc(16px + env(safe-area-inset-left))",
        paddingRight: "calc(16px + env(safe-area-inset-right))",
        boxSizing: "border-box",
        borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* 装飾的な背景要素 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)",
        }}
      />

      {/* 左側: タイトルとアイコン */}
      <div className="flex items-center gap-3 relative z-10">
        {/* チャットアイコン */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor:
              headerTextColor === "#ffffff"
                ? "rgba(255, 255, 255, 0.2)"
                : "rgba(0, 0, 0, 0.1)",
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
          className="font-bold text-lg leading-tight"
          style={{ color: headerTextColor }}
        >
          {headerText}
        </span>
      </div>

      {/* 右側: ボット情報とメニュー */}
      <div className="flex items-center gap-3 relative z-10">
        {selectedBot && (
          <div className="hidden sm:flex items-center gap-3 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
            <Avatar
              src={selectedBot.botIconImgGcsPath || "/botIcon/default.ico"}
              alt={selectedBot.botName}
              size="sm"
              className="ring-2 ring-white/50"
            />
            <span
              className="text-sm font-medium truncate max-w-[140px]"
              style={{ color: headerTextColor }}
              title={selectedBot.botName}
            >
              {selectedBot.botName}
            </span>
          </div>
        )}
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
      </div>
    </div>
  );
}
