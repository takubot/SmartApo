"use client";

import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Checkbox } from "@heroui/react";

import type { ChunkDataItemType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type ChunkDataItem = ChunkDataItemType & {
  categoryNames: string[];
};

/**
 * スニペット長さ
 *  - 例えばマッチ箇所の前後 50 文字程度を表示
 */
const SNIPPET_RADIUS = 50;

/**
 * テキスト内の検索キーワードをハイライトした ReactNode 配列を返す。
 * 大文字小文字は区別しない。
 */
function highlightText(text: string, searchTerm: string): React.ReactNode[] {
  if (!searchTerm) {
    return [text];
  }
  // 正規表現を使用して全マッチをハイライト
  // エスケープ等は簡易的に対応
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  const parts = text.split(regex);
  return parts.map((part, i) =>
    part.toLowerCase() === searchTerm.toLowerCase() ? (
      <span key={i} className="bg-yellow-300 font-bold">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * 検索キーワードの前後を含むスニペットを切り出し、ハイライトした配列を返す
 */
function getSnippetWithHighlight(
  fullText: string,
  searchTerm: string,
): React.ReactNode[] {
  if (!searchTerm) {
    // 検索しない場合は先頭から固定長 (2*SNIPPET_RADIUS) を表示
    const snippet = fullText.slice(0, SNIPPET_RADIUS * 2);
    return snippet.length < fullText.length
      ? highlightText(snippet + "...", "")
      : highlightText(snippet, "");
  }

  // 小文字化して検索
  const lowerText = fullText.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerSearch);

  if (matchIndex === -1) {
    // 見つからなければ先頭から通常のスニペット
    const snippet = fullText.slice(0, SNIPPET_RADIUS * 2);
    return snippet.length < fullText.length
      ? highlightText(snippet + "...", searchTerm)
      : highlightText(snippet, searchTerm);
  }

  // 見つかった場合、前後を切り出す
  const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
  const end = Math.min(
    fullText.length,
    matchIndex + searchTerm.length + SNIPPET_RADIUS,
  );

  let snippet = fullText.slice(start, end);

  // 前後に省略記号を付与
  if (start > 0) {
    snippet = "..." + snippet;
  }
  if (end < fullText.length) {
    snippet = snippet + "...";
  }

  // ハイライト処理
  return highlightText(snippet, searchTerm);
}

interface ChunkCardProps {
  chunk: ChunkDataItem;
  onCardClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isListMode?: boolean; // リスト表示モード用のフラグを追加
  searchTerm?: string;
}

const ChunkCard: React.FC<ChunkCardProps> = ({
  chunk,
  onCardClick,
  isSelectionMode = false,
  isSelected = false,
  isListMode = false,
  searchTerm = "",
}) => {
  const title = chunk.chunkTitle ?? "";
  // JSONの場合はJSONとして表示
  let text = chunk.chunkContent ?? "";
  if (chunk.chunkType === "JSON") {
    try {
      const parsed =
        typeof chunk.chunkContent === "string"
          ? JSON.parse(chunk.chunkContent)
          : (chunk.chunkContent as unknown);
      if (parsed && typeof parsed === "object") {
        // JSONオブジェクトを文字列化して表示
        text = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // ignore JSON parse error
    }
  }

  // スニペットを取得（ハイライト済みの ReactNode 配列）
  const highlightedSnippet = getSnippetWithHighlight(text, searchTerm);

  // カテゴリ表示の制限（モバイル対応）
  const maxVisibleCategories = isListMode ? 2 : 3;
  const categories = chunk.categoryNames || [];
  const visibleCategories = categories.slice(0, maxVisibleCategories);
  const hiddenCount = categories.length - maxVisibleCategories;

  // 共通: 選択トグル用コントロール（重複回避）
  const selectionControl = (
    <Checkbox
      isSelected={isSelected}
      onChange={() => onCardClick()}
      onClick={(e) => e.stopPropagation()}
      aria-label="選択を切り替え"
      className="scale-110"
    />
  );

  // リスト表示モード
  if (isListMode) {
    return (
      <div
        onClick={onCardClick}
        className={`w-full p-3 sm:p-4 border rounded-lg ${
          isSelected && isSelectionMode
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 bg-white"
        } hover:border-blue-400 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 relative cursor-pointer flex touch-manipulation`}
      >
        {isSelectionMode && (
          <div className="mr-3 flex items-start pt-1 flex-shrink-0">
            <div className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2">
              {selectionControl}
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-2">
            <div className="min-w-0 flex-1">
              {title && (
                <h3 className="font-bold text-gray-800 text-base sm:text-lg leading-tight mb-1 line-clamp-2">
                  {highlightText(title, searchTerm)}
                </h3>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                <span className="whitespace-nowrap">
                  {chunk.page !== null && chunk.page !== undefined
                    ? `ページ ${chunk.page}`
                    : "ページ指定なし"}
                </span>
                <span className="whitespace-nowrap">文字数: {text.length}</span>
              </div>
            </div>
          </div>

          <div className="text-sm sm:text-base text-gray-700 mb-3 line-clamp-2 sm:line-clamp-3 leading-relaxed">
            {highlightedSnippet}
          </div>

          <div className="flex flex-wrap gap-1 sm:gap-2">
            {visibleCategories.length > 0 ? (
              <>
                {visibleCategories.map((categoryName, index) => (
                  <Chip
                    key={`${categoryName}-${index}`}
                    className="text-xs"
                    size="sm"
                    content={`カテゴリー: ${categoryName}`}
                  >
                    {categoryName}
                  </Chip>
                ))}
                {hiddenCount > 0 && (
                  <Chip
                    className="text-xs"
                    size="sm"
                    color="default"
                    variant="bordered"
                    content={`他${hiddenCount}個のカテゴリ`}
                  >
                    +{hiddenCount}
                  </Chip>
                )}
              </>
            ) : (
              <Chip content="カテゴリなし" className="text-xs" size="sm">
                カテゴリなし
              </Chip>
            )}
          </div>
        </div>
      </div>
    );
  }

  // カード表示モード
  return (
    <Card
      className={`w-full ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      } hover:border-blue-400 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 touch-manipulation relative`}
      isPressable
      onPress={onCardClick}
    >
      {isSelectionMode && (
        <div className="absolute top-2 right-2 z-20">{selectionControl}</div>
      )}

      <CardHeader className="pb-2 pt-3 px-3 sm:px-4 flex-col items-start">
        {title && (
          <h3 className="font-bold text-gray-800 text-base sm:text-lg leading-tight mb-2 line-clamp-2 w-full">
            {highlightText(title, searchTerm)}
          </h3>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 w-full">
          <span className="whitespace-nowrap">
            {chunk.page !== null && chunk.page !== undefined
              ? `ページ ${chunk.page}`
              : "ページ指定なし"}
          </span>
          <span className="whitespace-nowrap">文字数: {text.length}</span>
        </div>
      </CardHeader>

      <CardBody className="py-2 px-3 sm:px-4">
        <div className="text-sm sm:text-base text-gray-700 line-clamp-3 sm:line-clamp-4 leading-relaxed">
          {highlightedSnippet}
        </div>
      </CardBody>

      <CardFooter className="flex flex-wrap gap-1 sm:gap-2 px-3 sm:px-4 pb-3">
        {visibleCategories.length > 0 ? (
          <>
            {visibleCategories.map((categoryName, index) => (
              <Chip
                key={`${categoryName}-${index}`}
                className="text-xs"
                size="sm"
                content={`カテゴリー: ${categoryName}`}
              >
                {categoryName}
              </Chip>
            ))}
            {hiddenCount > 0 && (
              <Chip
                className="text-xs"
                size="sm"
                color="default"
                variant="bordered"
                content={`他${hiddenCount}個のカテゴリ`}
              >
                +{hiddenCount}
              </Chip>
            )}
          </>
        ) : (
          <Chip content="カテゴリなし" className="text-xs" size="sm">
            カテゴリなし
          </Chip>
        )}
      </CardFooter>
    </Card>
  );
};

export default ChunkCard;
