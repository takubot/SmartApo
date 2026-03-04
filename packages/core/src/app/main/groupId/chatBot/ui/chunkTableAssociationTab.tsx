"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { Chip } from "@heroui/react";
import { Input } from "@heroui/react";
import { Select } from "@heroui/react";
import { SelectItem } from "@heroui/react";
import { Spinner } from "@heroui/react";
import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ChunkTableItem } from "../types";
import type { Selection } from "@heroui/react";
import { Checkbox } from "@heroui/react";

type ChunkTableSortOption =
  | "nameAsc"
  | "nameDesc"
  | "associatedFirst"
  | "associatedLast";

interface ChunkTableAssociationTabProps {
  chunkTableList: ChunkTableItem[];
  isLoading?: boolean;
  onChange?: (updated: ChunkTableItem[]) => void;
}

export const ChunkTableAssociationTab: React.FC<
  ChunkTableAssociationTabProps
> = ({ chunkTableList, isLoading = false, onChange }) => {
  const [localChunkTableList, setLocalChunkTableList] =
    useState<ChunkTableItem[]>(chunkTableList);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<ChunkTableSortOption>("nameAsc");
  const collatorRef = useRef(
    new Intl.Collator("ja", { sensitivity: "base", numeric: true }),
  );
  const segmenterRef = useRef(
    typeof Intl.Segmenter !== "undefined"
      ? new Intl.Segmenter("ja", { granularity: "grapheme" })
      : null,
  );

  useEffect(() => {
    setLocalChunkTableList(chunkTableList);
  }, [chunkTableList]);

  const filteredChunkTables = useMemo(() => {
    if (!searchTerm.trim()) return localChunkTableList;
    const loweredTerm = searchTerm.toLowerCase();
    return localChunkTableList.filter((chunkTable) =>
      chunkTable.templateName.toLowerCase().includes(loweredTerm),
    );
  }, [localChunkTableList, searchTerm]);

  const sortedChunkTables = useMemo(() => {
    const collator = collatorRef.current;
    const cloned = [...filteredChunkTables];
    return cloned.sort((a, b) => {
      switch (sortOption) {
        case "nameDesc":
          return collator.compare(b.templateName, a.templateName);
        case "associatedFirst": {
          if (a.isAssociated === b.isAssociated) {
            return collator.compare(a.templateName, b.templateName);
          }
          return a.isAssociated ? -1 : 1;
        }
        case "associatedLast": {
          if (a.isAssociated === b.isAssociated) {
            return collator.compare(a.templateName, b.templateName);
          }
          return a.isAssociated ? 1 : -1;
        }
        case "nameAsc":
        default:
          return collator.compare(a.templateName, b.templateName);
      }
    });
  }, [filteredChunkTables, sortOption]);

  const groupedChunkTables = useMemo(() => {
    const segmenter = segmenterRef.current;
    const groups = new Map<string, ChunkTableItem[]>();
    const groupOrder: string[] = [];

    const pickGroupKey = (label: string) => {
      if (!label.trim()) return "#";
      const trimmed = label.trim();
      if (segmenter) {
        for (const { segment } of segmenter.segment(trimmed)) {
          return segment.toUpperCase();
        }
      }
      const [firstChar] = Array.from(trimmed);
      return firstChar ? firstChar.toUpperCase() : "#";
    };

    sortedChunkTables.forEach((chunkTable) => {
      const groupKey = pickGroupKey(chunkTable.templateName);
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
        groupOrder.push(groupKey);
      }
      groups.get(groupKey)?.push(chunkTable);
    });

    return groupOrder.map((groupKey) => ({
      groupKey,
      items: groups.get(groupKey) ?? [],
    }));
  }, [sortedChunkTables]);

  const totalChunkTables = localChunkTableList.length;
  const filteredChunkTableCount = filteredChunkTables.length;
  const selectedCount = localChunkTableList.filter(
    (t) => t.isAssociated,
  ).length;

  const emitChange = useCallback(
    (next: ChunkTableItem[]) => {
      setLocalChunkTableList(next);
      onChange?.(next);
    },
    [onChange],
  );

  const handleToggleChunkTable = useCallback(
    (templateId: number) => {
      const next = localChunkTableList.map((t) =>
        t.templateId === templateId
          ? { ...t, isAssociated: !t.isAssociated }
          : t,
      );
      emitChange(next);
    },
    [localChunkTableList, emitChange],
  );

  const handleSelectAll = useCallback(
    (selectAll: boolean) => {
      const next = localChunkTableList.map((t) => ({
        ...t,
        isAssociated: selectAll,
      }));
      emitChange(next);
    },
    [localChunkTableList, emitChange],
  );

  // 保存はモーダルフッターで一括実行するため、タブ内では行わない

  return (
    <div className="h-full flex flex-col">
      {/* 検索・フィルターセクション */}
      <div className="mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h3 className="text-base font-bold text-foreground">テーブル検索</h3>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              placeholder="テーブル名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="flat"
              isDisabled={isLoading}
              startContent={
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
              }
              classNames={{
                input: "text-sm focus:outline-none focus-visible:outline-none",
                inputWrapper:
                  "border-2 hover:border-purple-300 focus-within:border-purple-500 transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
              }}
            />
          </div>
          <div className="flex flex-col gap-1 w-full md:w-64">
            <Select
              disallowEmptySelection
              label="並び替え"
              labelPlacement="outside"
              size="sm"
              selectedKeys={new Set([sortOption])}
              onSelectionChange={(selection: Selection) => {
                if (selection === "all" || selection.size === 0) return;
                const [next] = Array.from(selection);
                setSortOption(next as ChunkTableSortOption);
              }}
              isDisabled={isLoading}
              classNames={{
                base: "max-w-full",
                trigger:
                  "border-2 border-gray-200/70 hover:border-purple-300 focus-visible:border-purple-500 dark:border-gray-700/70 dark:hover:border-purple-400 dark:focus-visible:border-purple-400",
                label: "text-xs font-semibold text-gray-600 dark:text-gray-300",
                value: "text-xs font-medium",
              }}
            >
              <SelectItem key="nameAsc">名前 (あ→ん / A→Z)</SelectItem>
              <SelectItem key="nameDesc">名前 (ん→あ / Z→A)</SelectItem>
              <SelectItem key="associatedFirst">関連済みを優先</SelectItem>
              <SelectItem key="associatedLast">未関連を優先</SelectItem>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              color="primary"
              variant="flat"
              size="sm"
              onPress={() => handleSelectAll(true)}
              isDisabled={isLoading}
              className="font-semibold text-xs"
            >
              すべて選択
            </Button>
            <Button
              color="danger"
              variant="flat"
              size="sm"
              onPress={() => handleSelectAll(false)}
              isDisabled={isLoading}
              className="font-semibold text-xs"
            >
              すべて解除
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400/80"></span>
            全件: <span className="font-semibold">{totalChunkTables}</span> 件
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400/80"></span>
            選択中: <span className="font-semibold">{selectedCount}</span> 件
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-400/80"></span>
            表示中:{" "}
            <span className="font-semibold">{filteredChunkTableCount}</span> 件
          </span>
        </div>
      </div>

      {/* テーブルリスト */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8">
            <Spinner size="lg" color="primary" />
            <div className="text-gray-500 dark:text-gray-400 text-sm mt-3">
              テーブル一覧を取得中...
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {groupedChunkTables.map(({ groupKey, items }) => (
                <div key={groupKey} className="space-y-2">
                  {/* グループヘッダー */}
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                    <span className="text-xs font-semibold text-foreground">
                      {groupKey}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent dark:from-gray-600"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {items.length}件
                    </span>
                  </div>

                  {/* グループ内のテーブル一覧 */}
                  <div className="space-y-1 ml-3">
                    {items.map((chunkTable) => (
                      <div
                        key={chunkTable.templateId}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200/50 dark:border-gray-600/50 hover:border-purple-300 dark:hover:border-purple-600 transition-colors"
                        onClick={() =>
                          handleToggleChunkTable(chunkTable.templateId)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            handleToggleChunkTable(chunkTable.templateId);
                          }
                        }}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Checkbox
                            isSelected={chunkTable.isAssociated}
                            onValueChange={() =>
                              handleToggleChunkTable(chunkTable.templateId)
                            }
                            size="sm"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {chunkTable.templateName}
                            </span>
                            {chunkTable.isAssociated && (
                              <Chip
                                color="success"
                                variant="flat"
                                size="sm"
                                className="flex-shrink-0 text-xs"
                              >
                                関連済み
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredChunkTables.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {searchTerm.trim()
                    ? "検索条件に一致するテーブルがありません"
                    : "テーブルがありません"}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 保存ボタンは表示しない（モーダルフッターで統一） */}
    </div>
  );
};
