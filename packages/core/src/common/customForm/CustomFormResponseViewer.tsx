"use client";

import React, { useMemo } from "react";
import { Chip, Divider } from "@heroui/react";
import type { CustomFormSection } from "./types";
import { FIELD_TYPE_LABEL } from "./types";

type Props = {
  responseData: Record<string, unknown> | null | undefined;
  sections?: CustomFormSection[] | null;
  emptyMessage?: string;
};

const isMeaningfulValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const formatAnswerValue = (value: unknown): string => {
  if (value === null || value === undefined) return "未回答";
  if (typeof value === "string") return value.trim() || "未回答";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "はい" : "いいえ";

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => formatAnswerValue(item))
      .filter((item) => item !== "未回答");
    return normalized.length > 0 ? normalized.join(" / ") : "未回答";
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if ("label" in objectValue) return formatAnswerValue(objectValue.label);
    if ("value" in objectValue) return formatAnswerValue(objectValue.value);
    const merged = Object.values(objectValue)
      .map((item) => formatAnswerValue(item))
      .filter((item) => item !== "未回答");
    return merged.length > 0 ? merged.join(" / ") : "入力あり";
  }

  return String(value);
};

export function CustomFormResponseViewer({
  responseData,
  sections,
  emptyMessage = "回答データがありません",
}: Props) {
  const safeResponseData = responseData ?? {};
  const hasSchema = !!sections && sections.length > 0;

  const unknownEntries = useMemo(() => {
    if (!hasSchema) return [];
    const schemaKeys = new Set(
      (sections ?? []).flatMap((section) =>
        (section.fields ?? []).map((field) => field.key),
      ),
    );

    return Object.entries(safeResponseData).filter(
      ([key, value]) => !schemaKeys.has(key) && isMeaningfulValue(value),
    );
  }, [hasSchema, sections, safeResponseData]);

  if (hasSchema) {
    const hasAnyValue = (sections ?? []).some((section) =>
      (section.fields ?? []).some((field) =>
        isMeaningfulValue(safeResponseData[field.key]),
      ),
    );

    if (!hasAnyValue && unknownEntries.length === 0) {
      return (
        <div className="sm:col-span-2 bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20 text-sm text-default-500">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {(sections ?? []).map((section, sectionIndex) => (
          <div key={`${section.title}-${sectionIndex}`} className="space-y-4">
            {section.title && (
              <div className="border-l-4 border-primary pl-3">
                <p className="text-sm font-bold text-default-700">
                  {section.title}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(section.fields ?? [])
                .filter((field) => field.label)
                .map((field, fieldIndex) => (
                  <div
                    key={`${field.key}-${fieldIndex}`}
                    className="bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20"
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="text-[10px] font-black text-default-600 tracking-wide">
                        {field.label}
                      </p>
                      <Chip
                        size="sm"
                        variant="flat"
                        className="h-4 text-[9px] px-1.5"
                      >
                        {FIELD_TYPE_LABEL[field.type]}
                      </Chip>
                      {field.required && (
                        <Chip
                          size="sm"
                          color="danger"
                          variant="flat"
                          className="h-4 text-[9px] px-1.5"
                        >
                          必須
                        </Chip>
                      )}
                    </div>
                    <p className="text-sm font-bold text-default-800 whitespace-pre-wrap break-words">
                      {formatAnswerValue(safeResponseData[field.key])}
                    </p>
                  </div>
                ))}
            </div>

            {sectionIndex < (sections?.length ?? 0) - 1 && (
              <Divider className="my-2" />
            )}
          </div>
        ))}

        {unknownEntries.length > 0 && (
          <div className="bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20">
            <p className="text-[10px] font-black text-default-500 tracking-wide mb-2">
              補足情報
            </p>
            <div className="space-y-2">
              {unknownEntries.map(([key, value], index) => (
                <p
                  key={`${key}-${index}`}
                  className="text-sm font-medium text-default-700 break-words"
                >
                  {formatAnswerValue(value)}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const fallbackValues =
    Object.values(safeResponseData).filter(isMeaningfulValue);
  if (fallbackValues.length === 0) {
    return (
      <div className="sm:col-span-2 bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20 text-sm text-default-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {fallbackValues.map((value, index) => (
        <div
          key={`fallback-answer-${index}`}
          className="bg-default-50/50 p-4 sm:p-5 rounded-[24px] border border-divider/20"
        >
          <p className="text-[10px] font-black text-default-500 tracking-wide mb-1.5">
            回答
          </p>
          <p className="text-sm font-bold text-default-800 whitespace-pre-wrap break-words">
            {formatAnswerValue(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export default CustomFormResponseViewer;
