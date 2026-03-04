"use client";

import React, { memo } from "react";
import { Checkbox, Tooltip } from "@heroui/react";

import type { ChunkDataItemType } from "@repo/api-contracts/based_template/zschema";

type ChunkDataItem = ChunkDataItemType & {
  categoryNames: string[];
};

type ChunkListRowProps = {
  chunk: ChunkDataItem;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  searchTerm?: string;
};

const SNIPPET_RADIUS = 40;

function highlightText(text: string, searchTerm: string): React.ReactNode[] {
  if (!searchTerm) return [text];
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <span key={i} className="bg-yellow-300 font-semibold">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function getSnippet(fullText: string, searchTerm: string): React.ReactNode[] {
  if (!fullText) return [""];
  if (!searchTerm) {
    const snippet = fullText.slice(0, SNIPPET_RADIUS * 2);
    return snippet.length < fullText.length
      ? highlightText(snippet + "...", "")
      : highlightText(snippet, "");
  }
  const lowerText = fullText.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const idx = lowerText.indexOf(lowerSearch);
  if (idx === -1) {
    const snippet = fullText.slice(0, SNIPPET_RADIUS * 2);
    return snippet.length < fullText.length
      ? highlightText(snippet + "...", searchTerm)
      : highlightText(snippet, searchTerm);
  }
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(
    fullText.length,
    idx + searchTerm.length + SNIPPET_RADIUS,
  );
  let snippet = fullText.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < fullText.length) snippet = snippet + "...";
  return highlightText(snippet, searchTerm);
}

const ChunkListRow: React.FC<ChunkListRowProps> = ({
  chunk,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  searchTerm = "",
}) => {
  const title = chunk.chunkTitle ?? "";
  const text = chunk.chunkContent ?? "";
  const snippet = getSnippet(text, searchTerm);

  return (
    <div
      onClick={onClick}
      className={`w-full select-none transition-colors duration-150 px-3 py-2 text-sm 
        ${
          isSelected && isSelectionMode
            ? "bg-blue-50 ring-1 ring-blue-300"
            : "bg-white odd:bg-white even:bg-gray-50 hover:bg-gray-100 hover:ring-1 hover:ring-gray-300"
        } first:rounded-t-lg last:rounded-b-lg`}
      aria-label={`チャンク ${chunk.chunkId}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        {isSelectionMode && (
          <Checkbox
            isSelected={isSelected}
            readOnly
            aria-label="select chunk"
            size="sm"
          />
        )}

        <div className="min-w-0 flex-1">
          {title && (
            <Tooltip content={title} placement="top">
              <div className="truncate font-medium text-gray-800" title={title}>
                {highlightText(title, searchTerm)}
              </div>
            </Tooltip>
          )}
          <div className="text-gray-600 text-xs truncate">{snippet}</div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          <span className="shrink-0">
            {chunk.page !== null && chunk.page !== undefined
              ? `ページ ${chunk.page}`
              : "ページ指定なし"}
          </span>
          <span className="shrink-0">
            文字数: {typeof text === "string" ? text.length : 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(ChunkListRow);
