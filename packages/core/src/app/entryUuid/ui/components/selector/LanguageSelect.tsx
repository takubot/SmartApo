"use client";

import React, { useMemo, useEffect, useRef } from "react";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import "flag-icons/css/flag-icons.min.css";

type Props = {
  languageCodes: string[];
  selectedLanguage: string;
  onSelectLanguage: (languageCode: string) => void;
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

const LABEL_BY_LANGUAGE: Record<string, string> = {
  ja: "日本語",
  en: "English",
  zh: "中文",
  "zh-cn": "简体中文（中国）",
  "zh-hk": "中文（香港）",
  "zh-tw": "繁體中文（台灣）",
  ko: "한국어",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
};

const normalize = (code: string) =>
  (code || "").trim().toLowerCase().split("-")[0] || "";
const canonicalize = (code: string): string => (code || "").trim();
const canonicalizeLower = (code: string): string =>
  canonicalize(code).toLowerCase();

const getCountryCode = (code: string): string => {
  const normalized = canonicalizeLower(code);
  if (COUNTRY_CODE_BY_LANGUAGE[normalized]) {
    return COUNTRY_CODE_BY_LANGUAGE[normalized]!;
  }
  const baseCode = normalize(normalized);
  return COUNTRY_CODE_BY_LANGUAGE[baseCode] || "";
};

const getLabel = (code: string): string => {
  const normalized = canonicalizeLower(code);
  if (LABEL_BY_LANGUAGE[normalized]) {
    return LABEL_BY_LANGUAGE[normalized]!;
  }
  const baseCode = normalize(normalized);
  return LABEL_BY_LANGUAGE[baseCode] || normalized.toUpperCase();
};

export default function LanguageSelect({
  languageCodes,
  selectedLanguage,
  onSelectLanguage,
}: Props) {
  const availableItems = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of languageCodes) {
      const original = canonicalize(raw);
      if (!original) continue;
      const canon = canonicalizeLower(original);
      if (!map.has(canon)) map.set(canon, original);
    }
    return Array.from(map.entries()).map(([canon, original]) => ({
      canon,
      original,
      countryCode: getCountryCode(canon),
      label: getLabel(canon),
    }));
  }, [languageCodes]);

  const isInitialized = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined" || isInitialized.current) return;
    if (availableItems.length === 0) return;
    const selectedCanon = canonicalizeLower(selectedLanguage);
    const browserCanon = canonicalizeLower(navigator.language);
    const byCanon = new Map<string, string>(
      availableItems.map((item) => [item.canon, item.original]),
    );
    let initialLang = byCanon.get("en") ?? availableItems[0]?.original ?? "en";
    if (byCanon.has(browserCanon)) {
      initialLang = byCanon.get(browserCanon)!;
    }
    if (canonicalizeLower(initialLang) !== selectedCanon) {
      onSelectLanguage(initialLang);
    }
    isInitialized.current = true;
  }, [availableItems, onSelectLanguage, selectedLanguage]);

  const selected = canonicalizeLower(selectedLanguage);
  const currentCountryCode = getCountryCode(selected);
  if (availableItems.length <= 1) return null;

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Button
          size="sm"
          variant="flat"
          className="min-w-0 px-2 h-8 rounded-full bg-white/30 border border-white/30 text-gray-900"
        >
          {currentCountryCode && (
            <span
              className={`fi fi-${currentCountryCode}`}
              style={{ fontSize: "1em" }}
            />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="言語選択"
        selectedKeys={[selected]}
        selectionMode="single"
        onAction={(key) => {
          const canon = String(key);
          const found = availableItems.find((item) => item.canon === canon);
          onSelectLanguage(found?.original ?? canon);
        }}
      >
        {availableItems.map((item) => (
          <DropdownItem
            key={item.canon}
            textValue={item.label}
            startContent={
              item.countryCode ? (
                <span
                  className={`fi fi-${item.countryCode}`}
                  style={{ fontSize: "1.2em" }}
                />
              ) : (
                <span>🌐</span>
              )
            }
          >
            <span className="text-sm">{item.label}</span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
