"use client";

import React from "react";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  FileText,
  Headset,
  Menu,
} from "lucide-react";
import LanguageSelect from "../selector/LanguageSelect";
import "flag-icons/css/flag-icons.min.css";

type CompactActionMenuProps = {
  textColor?: string;
  languageCodes?: string[];
  selectedLanguage?: string;
  onSelectLanguage?: (languageCode: string) => void;
  showCustomFormAction?: boolean;
  onCustomFormOpen?: () => void;
  customFormRequired?: boolean;
  showBookingAction?: boolean;
  bookingButtonLabel?: string | null;
  onRequestBooking?: () => void;
  showHumanHandoffAction?: boolean;
  onRequestHumanHandoff?: () => void;
  isHandoffActive?: boolean;
  isHandoffLoading?: boolean;
  showBotSelect?: boolean;
  onBotSelect?: () => void;
};

const COUNTRY_CODE_BY_LANGUAGE: Record<string, string> = {
  ja: "jp",
  en: "us",
  zh: "cn",
  "zh-cn": "cn",
  "zh-hk": "hk",
  "zh-hans": "cn",
  "zh-tw": "tw",
  "zh-hant": "tw",
  ko: "kr",
  es: "es",
  fr: "fr",
  de: "de",
  it: "it",
  pt: "pt",
  ru: "ru",
};

const normalizeLanguageCode = (code: string) =>
  (code || "").trim().toLowerCase().split("-")[0] || "";

const getCountryCode = (code: string): string => {
  const normalized = (code || "").trim().toLowerCase();
  if (COUNTRY_CODE_BY_LANGUAGE[normalized]) {
    return COUNTRY_CODE_BY_LANGUAGE[normalized]!;
  }
  const base = normalizeLanguageCode(normalized);
  return COUNTRY_CODE_BY_LANGUAGE[base] || "";
};

export default function CompactActionMenu({
  textColor = "#111827",
  languageCodes,
  selectedLanguage,
  onSelectLanguage,
  showCustomFormAction = false,
  onCustomFormOpen,
  customFormRequired = false,
  showBookingAction = false,
  bookingButtonLabel,
  onRequestBooking,
  showHumanHandoffAction = false,
  onRequestHumanHandoff,
  isHandoffActive = false,
  isHandoffLoading = false,
  showBotSelect = false,
  onBotSelect,
}: CompactActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const normalizedLanguageCodes = React.useMemo(() => {
    const map = new Map<string, string>();
    (languageCodes || []).forEach((raw) => {
      const original = (raw || "").trim();
      if (!original) return;
      const key = original.toLowerCase();
      if (!map.has(key)) map.set(key, original);
    });
    return Array.from(map.values());
  }, [languageCodes]);

  const hasLanguageAction =
    normalizedLanguageCodes.length > 1 &&
    !!selectedLanguage &&
    !!onSelectLanguage;

  const actionItems = React.useMemo(
    () =>
      [
        showCustomFormAction
          ? {
              key: "custom_form",
              icon: <FileText className="h-3.5 w-3.5" />,
              label: customFormRequired
                ? "フォーム入力（必須）"
                : "フォーム入力",
              onClick: onCustomFormOpen,
              highlight: customFormRequired,
              disabled: false,
            }
          : null,
        showBookingAction
          ? {
              key: "booking",
              icon: <CalendarDays className="h-3.5 w-3.5" />,
              label: bookingButtonLabel?.trim() || "予約",
              onClick: onRequestBooking,
              highlight: false,
              disabled: false,
            }
          : null,
        showHumanHandoffAction
          ? {
              key: "handoff",
              icon: <Headset className="h-3.5 w-3.5" />,
              label: isHandoffActive
                ? "有人対応中"
                : isHandoffLoading
                  ? "接続中..."
                  : "有人対応",
              onClick: onRequestHumanHandoff,
              highlight: false,
              disabled: isHandoffActive || isHandoffLoading,
            }
          : null,
        showBotSelect
          ? {
              key: "bot_select",
              icon: <Bot className="h-3.5 w-3.5" />,
              label: "ボット選択",
              onClick: onBotSelect,
              highlight: false,
              disabled: false,
            }
          : null,
      ].filter(
        (
          item,
        ): item is {
          key: string;
          icon: React.ReactNode;
          label: string;
          onClick?: () => void;
          highlight: boolean;
          disabled: boolean;
        } => item !== null,
      ),
    [
      bookingButtonLabel,
      customFormRequired,
      isHandoffActive,
      isHandoffLoading,
      onBotSelect,
      onCustomFormOpen,
      onRequestBooking,
      onRequestHumanHandoff,
      showBookingAction,
      showBotSelect,
      showCustomFormAction,
      showHumanHandoffAction,
    ],
  );

  const totalActionCount = actionItems.length + (hasLanguageAction ? 1 : 0);

  if (totalActionCount === 0) return null;

  // 1項目だけなら、メニューを使わず直接アイコンを表示
  if (totalActionCount === 1) {
    if (hasLanguageAction && selectedLanguage && onSelectLanguage) {
      return (
        <LanguageSelect
          languageCodes={normalizedLanguageCodes}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={onSelectLanguage}
        />
      );
    }

    const single = actionItems[0];
    if (!single) return null;
    return (
      <button
        type="button"
        onClick={single.onClick}
        disabled={single.disabled}
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border transition ${
          single.highlight
            ? "border-red-300 bg-red-500/20"
            : "border-white/30 bg-white/20 hover:bg-white/30"
        } disabled:cursor-not-allowed disabled:opacity-50`}
        title={single.label}
        aria-label={single.label}
      >
        <span style={{ color: single.highlight ? "#ef4444" : textColor }}>
          {single.icon}
        </span>
        {single.highlight ? (
          <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-white" />
        ) : null}
      </button>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/20 transition hover:bg-white/30"
        title="メニュー"
        aria-label="メニュー"
      >
        <Menu size={16} style={{ color: textColor }} />
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-[90] w-64 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-sm">
          <details open className="group rounded-lg">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <span className="inline-flex items-center gap-1">
                <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                チャット操作
              </span>
            </summary>
            <div className="mt-1 flex flex-col gap-1 px-1">
              {showCustomFormAction ? (
                <button
                  type="button"
                  onClick={() => {
                    onCustomFormOpen?.();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {customFormRequired ? "フォーム入力（必須）" : "フォーム入力"}
                </button>
              ) : null}

              {showBookingAction ? (
                <button
                  type="button"
                  onClick={() => {
                    onRequestBooking?.();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {bookingButtonLabel?.trim() || "予約"}
                </button>
              ) : null}

              {showHumanHandoffAction ? (
                <button
                  type="button"
                  disabled={isHandoffActive || isHandoffLoading}
                  onClick={() => {
                    onRequestHumanHandoff?.();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Headset className="h-3.5 w-3.5" />
                  {isHandoffActive
                    ? "有人対応中"
                    : isHandoffLoading
                      ? "接続中..."
                      : "有人対応"}
                </button>
              ) : null}

              {showBotSelect ? (
                <button
                  type="button"
                  onClick={() => {
                    onBotSelect?.();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  <Bot className="h-3.5 w-3.5" />
                  ボット選択
                </button>
              ) : null}
            </div>
          </details>

          {hasLanguageAction ? (
            <details className="group mt-2 rounded-lg">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <span className="inline-flex items-center gap-1">
                  <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                  言語
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  {getCountryCode(selectedLanguage || "") ? (
                    <span
                      className={`fi fi-${getCountryCode(selectedLanguage || "")}`}
                      style={{ fontSize: "1em" }}
                    />
                  ) : (
                    <span>🌐</span>
                  )}
                  {(selectedLanguage || "").toUpperCase()}
                </span>
              </summary>
              <div className="mt-1 grid max-h-32 grid-cols-2 gap-1 overflow-y-auto px-1">
                {normalizedLanguageCodes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      onSelectLanguage?.(code);
                      setOpen(false);
                    }}
                    className={`rounded-md px-2 py-1 text-xs ${
                      code === selectedLanguage
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      {getCountryCode(code) ? (
                        <span
                          className={`fi fi-${getCountryCode(code)}`}
                          style={{ fontSize: "1em" }}
                        />
                      ) : (
                        <span>🌐</span>
                      )}
                      {code.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
