"use client";

import { Button } from "@heroui/react";
import type {
  ExternalSuggestItemResponseSchemaType,
  ExternalSuggestResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useState } from "react";

export default function Suggest({
  currentItems,
  selectSuggest,
  isLoadingSuggest,
  suggestError,
  suggestData,
  onSelect,
  headerColor,
  selectedLanguage,
}: {
  currentItems: ExternalSuggestItemResponseSchemaType[];
  selectSuggest: (
    suggest: ExternalSuggestItemResponseSchemaType | null,
  ) => Promise<void>;
  isLoadingSuggest: boolean;
  suggestError: string | null;
  suggestData: ExternalSuggestResponseSchemaType | null;
  onSelect?: (item: ExternalSuggestItemResponseSchemaType) => void;
  headerColor?: string;
  headerTextColor?: string;
  selectedLanguage?: string;
}) {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  if (suggestError) {
    return (
      <div className="flex items-center justify-center h-24 animate-fade-in">
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg border border-red-200">
          サジェストの取得に失敗しました
        </div>
      </div>
    );
  }
  if (isLoadingSuggest || !suggestData) {
    return (
      <div className="flex items-center justify-center h-24 animate-fade-in">
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
          <span>サジェストを読み込み中...</span>
        </div>
      </div>
    );
  }

  const getLocalized = (
    item: ExternalSuggestItemResponseSchemaType,
    kind: "label" | "answer",
  ): string => {
    const anyItem = item as unknown as Record<string, unknown>;
    const lang = (selectedLanguage || "ja").trim();
    const translationsKey =
      kind === "label"
        ? "displayLabelTranslations"
        : "onClickFixedAnswerTranslations";
    const baseKey = kind === "label" ? "displayLabel" : "onClickFixedAnswer";
    const base =
      typeof anyItem[baseKey] === "string" ? (anyItem[baseKey] as string) : "";
    const translations = anyItem[translationsKey];
    if (!translations || typeof translations !== "object") return base;
    const map = translations as Record<string, string>;
    if (lang && typeof map[lang] === "string" && map[lang]!.trim())
      return map[lang]!;
    if (typeof map.ja === "string" && map.ja.trim()) return map.ja;
    if (typeof map.en === "string" && map.en.trim()) return map.en;
    return base;
  };

  const handleItemClick = async (
    item: ExternalSuggestItemResponseSchemaType,
  ) => {
    const localizedItem = {
      ...(item as any),
      displayLabel: getLocalized(item, "label"),
      onClickFixedAnswer: getLocalized(item, "answer"),
    } as ExternalSuggestItemResponseSchemaType;
    setSelectedItemId(item.itemId);
    onSelect?.(localizedItem);
    await selectSuggest(localizedItem);
    setTimeout(() => setSelectedItemId(null), 300);
  };

  return (
    <div className="w-full">
      {currentItems.length > 0 ? (
        <div className="flex gap-3 px-2 sm:px-4 py-3 flex-row-reverse animate-slide-up">
          <div className="ml-auto max-w-[90%] sm:max-w-[75%] md:max-w-[65%]">
            <div className="flex flex-wrap gap-3">
              {currentItems.map((item) => (
                <Button
                  key={item.itemId}
                  size="sm"
                  variant="bordered"
                  className={`text-sm font-medium transition-all duration-300 ${
                    selectedItemId === item.itemId ? "scale-105 shadow-lg" : ""
                  }`}
                  style={{
                    color: "#6b7280",
                    backgroundColor: "white",
                    borderColor: "#d1d5db",
                  }}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      headerColor || "#3b82f6";
                    e.currentTarget.style.color = "white";
                    e.currentTarget.style.borderColor =
                      headerColor || "#3b82f6";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedItemId !== item.itemId) {
                      e.currentTarget.style.backgroundColor = "white";
                      e.currentTarget.style.color = "#6b7280";
                      e.currentTarget.style.borderColor = "#d1d5db";
                    }
                  }}
                >
                  {getLocalized(item, "label")}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
