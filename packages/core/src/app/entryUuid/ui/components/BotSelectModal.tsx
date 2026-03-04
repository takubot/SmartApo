"use client";

import React from "react";
import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { getBotIconSrc } from "../utils/botIconUtils";

interface BotSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  botList: BotResponseSchemaType[];
  iconMap: Record<number, string>;
  selectedBot: BotResponseSchemaType | null;
  onSelectBot: (bot: BotResponseSchemaType | null) => void;
  headerColor?: string;
  headerTextColor?: string;
}

export default function BotSelectModal({
  isOpen,
  onClose,
  botList,
  iconMap,
  selectedBot,
  onSelectBot,
  headerColor,
  headerTextColor,
}: BotSelectModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="px-6 py-4 border-b border-gray-200"
            style={{ backgroundColor: headerColor || "#ffffff" }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-semibold"
                style={{ color: headerTextColor || "#111827" }}
              >
                ボットを選択
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {botList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  利用可能なボットがありません
                </div>
              ) : (
                botList.map((bot) => (
                  <div
                    key={bot.botId}
                    className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedBot?.botId === bot.botId
                        ? "ring-2 ring-opacity-50"
                        : "hover:bg-gray-50"
                    }`}
                    style={{
                      borderColor:
                        selectedBot?.botId === bot.botId
                          ? headerColor || "#3b82f6"
                          : "#e5e7eb",
                    }}
                    onClick={() => onSelectBot(bot)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getBotIconSrc(bot, iconMap)}
                          alt={bot.botName || "bot"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {bot.botName || `Bot ${bot.botId}`}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4">
              <button
                onClick={() => onSelectBot(null)}
                className="w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all duration-200 hover:bg-gray-50 border-gray-300"
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700">
                    選択なし（自動選択）
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
