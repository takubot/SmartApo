"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Chip } from "@heroui/react";
import { Pagination } from "@heroui/pagination";
import { LoadingScreen } from "../../../../../../common/LoadingScreen";
import type { ChunkDataItemType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type ChunkDataItem = ChunkDataItemType & {
  categoryNames: string[];
};

interface TableViewProps {
  data: ChunkDataItem[];
  headers: string[];
  total: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  currentPage: number;
  pageSize: number;
  onRowClick?: (item: ChunkDataItem) => void;
}

const TableView: React.FC<TableViewProps> = ({
  data,
  headers,
  total,
  isLoading,
  onPageChange,
  currentPage,
  pageSize,
  onRowClick,
}) => {
  const totalPages = Math.ceil(total / pageSize);

  // debug logs removed

  // テーブルの列を動的に生成
  const effectiveHeaders = Array.isArray(headers)
    ? headers.filter((h) => h && typeof h === "string")
    : [];
  const isEmptyHeaders = effectiveHeaders.length === 0;
  const tableColumns = [
    { key: "rowNumber", label: "行" },
    ...(isEmptyHeaders
      ? [{ key: "content", label: "内容" }]
      : effectiveHeaders.map((header) => ({ key: header, label: header }))),
    { key: "categories", label: "カテゴリ" },
  ];

  // シート名がある場合は追加
  const hasSheetNames = data.some((item) => {
    const parsed = safeParseJson(item.chunkContent);
    const sheet = (parsed as Record<string, unknown> | null)?.sheetName;
    return typeof sheet === "string" && sheet.trim() !== "";
  });
  if (hasSheetNames) {
    tableColumns.splice(1, 0, { key: "sheetName", label: "シート" });
  }

  const renderCellContent = (
    item: ChunkDataItem,
    columnKey: string,
    rowIndex: number,
  ) => {
    try {
      const parsedData = safeParseJson(item.chunkContent) as Record<
        string,
        unknown
      > | null;
      switch (columnKey) {
        case "rowNumber":
          return rowIndex + 1;
        case "sheetName":
          return (parsedData?.["sheetName"] as string) || "-";
        case "categories": {
          const categoryNames = item.categoryNames || [];
          return (
            <div className="flex flex-wrap gap-1">
              {categoryNames.map((categoryName, index) => (
                <Chip
                  key={`${categoryName}-${index}`}
                  size="sm"
                  color="primary"
                  variant="flat"
                >
                  {categoryName}
                </Chip>
              ))}
            </div>
          );
        }
        case "content": {
          // ヘッダーが抽出できなかった場合のフォールバック
          const text =
            typeof item.chunkContent === "string"
              ? item.chunkContent
              : JSON.stringify(item.chunkContent ?? {}, null, 2);
          if (!text) return "-";
          return (
            <div className="max-w-xl whitespace-pre-wrap break-words">
              {text.length > 500 ? `${text.slice(0, 500)}...` : text}
            </div>
          );
        }
        default:
          // 通常のデータ列
          if (!parsedData || typeof parsedData !== "object") return "-";
          {
            const value = (parsedData as Record<string, unknown>)[columnKey];
            if (value === null || value === undefined) return "-";

            if (typeof value === "string" && value.length > 100) {
              return (
                <div className="max-w-xs truncate" title={value}>
                  {value}
                </div>
              );
            }
            return String(value);
          }
      }
    } catch (error) {
      console.error("Error rendering cell content:", error, {
        item,
        columnKey,
      });
      return "-";
    }
  };

  function safeParseJson(input: unknown): Record<string, unknown> | null {
    if (!input) return null;
    if (typeof input === "object") return input as Record<string, unknown>;
    if (typeof input !== "string") return null;
    try {
      // backend由来の NaN を null に正規化してから JSON.parse
      const normalized = input.replace(/\bNaN\b/g, "null");
      const obj = JSON.parse(normalized);
      return typeof obj === "object" && obj
        ? (obj as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (isLoading) {
    return (
      <LoadingScreen message="テーブルデータを検索中..." fullScreen={false} />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg mb-2">データがありません</div>
        <div className="text-gray-400 text-sm">
          ファイルを処理中か、データが存在しません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* データ件数表示 */}
      <div className="text-sm text-gray-600">
        {total}件中 {Math.min((currentPage - 1) * pageSize + 1, total)} -{" "}
        {Math.min(currentPage * pageSize, total)}件を表示
      </div>

      {/* テーブル */}
      <Table aria-label="テーブルデータ" className="min-h-[400px]">
        <TableHeader>
          {tableColumns.map((column) => (
            <TableColumn key={column.key}>{column.label}</TableColumn>
          ))}
        </TableHeader>
        <TableBody emptyContent="データがありません">
          {data.map((item, idx) => (
            <TableRow
              key={item.chunkId}
              className={
                onRowClick ? "cursor-pointer hover:bg-gray-50" : undefined
              }
              onClick={() => onRowClick?.(item)}
            >
              {tableColumns.map((column) => (
                <TableCell key={column.key}>
                  {renderCellContent(item, column.key, idx)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            total={totalPages}
            page={currentPage}
            onChange={onPageChange}
            showControls
            showShadow
          />
        </div>
      )}
    </div>
  );
};

export default TableView;
