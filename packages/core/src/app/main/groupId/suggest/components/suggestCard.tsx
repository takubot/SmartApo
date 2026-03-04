"use client";

import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@heroui/react";
import { Card, CardBody } from "@heroui/card";
import type { SuggestItemResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import type { TreeItem } from "./dragDropTree";

interface SuggestCardProps {
  item: TreeItem;
  index: number;
  onEdit: (item: SuggestItemResponseSchemaType) => void;
  onRequestDelete: (item: TreeItem) => void;
  onToggleExpand: (itemId: string) => void;
  setHovered: (id: string | null) => void;
  registerRef?: (id: string, el: HTMLElement | null) => void;
  onHoverItem?: (id: string) => void;
  isDraggingOverAsChild?: boolean;
  isDraggingOverAsSibling?: boolean;
  isSelected?: boolean;
  onSelect?: (item: TreeItem) => void;
  onQuickCreateChild?: (parentItemId: number) => void;
}

export default function SuggestCard({
  item,
  index,
  onEdit,
  onRequestDelete,
  onToggleExpand,
  setHovered,
  registerRef,
  onHoverItem,
  isDraggingOverAsChild = false,
  isDraggingOverAsSibling = false,
  isSelected = false,
  onSelect,
  onQuickCreateChild,
}: SuggestCardProps) {
  const getDepthColor = (depth: number) => {
    const colors = {
      border: "",
      bg: "",
      hover: "",
      accent: "",
    };

    switch (depth) {
      case 0:
        colors.border = "border-l-2 border-l-emerald-500";
        colors.bg = "bg-white";
        colors.hover = "hover:bg-emerald-50/50";
        colors.accent = "text-emerald-600";
        break;
      case 1:
        colors.border = "border-l-2 border-l-blue-500";
        colors.bg = "bg-white";
        colors.hover = "hover:bg-blue-50/50";
        colors.accent = "text-blue-600";
        break;
      case 2:
        colors.border = "border-l-2 border-l-purple-500";
        colors.bg = "bg-white";
        colors.hover = "hover:bg-purple-50/50";
        colors.accent = "text-purple-600";
        break;
      case 3:
        colors.border = "border-l-2 border-l-orange-500";
        colors.bg = "bg-white";
        colors.hover = "hover:bg-orange-50/50";
        colors.accent = "text-orange-600";
        break;
      default:
        colors.border = "border-l-2 border-l-gray-400";
        colors.bg = "bg-white";
        colors.hover = "hover:bg-gray-50/50";
        colors.accent = "text-gray-600";
    }

    return `${colors.border} ${colors.bg} ${colors.hover} transition-all duration-200`;
  };

  const getDepthAccentColor = (depth: number): string => {
    switch (depth) {
      case 0:
        return "text-emerald-600";
      case 1:
        return "text-blue-600";
      case 2:
        return "text-purple-600";
      case 3:
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={(el) => {
            provided.innerRef(el);
            if (registerRef) registerRef(item.id, el);
          }}
          {...provided.draggableProps}
          className={`relative mb-1.5 transition-all duration-200 ${
            snapshot.isDragging ? "opacity-70 scale-105" : ""
          }`}
          style={{
            ...provided.draggableProps.style,
            paddingLeft: `${item.depth * 24}px`,
            ...(snapshot.isDragging && {
              zIndex: 9999,
            }),
          }}
          onMouseEnter={() => {
            setHovered(item.id);
            onHoverItem?.(item.id);
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {/* 階層接続線 */}
          {item.depth > 0 && (
            <>
              {/* 縦線 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-300"
                style={{ left: `${(item.depth - 1) * 24 + 12}px` }}
              />
              {/* 横線 */}
              <div
                className="absolute top-1/2 h-0.5 bg-gray-300"
                style={{
                  left: `${(item.depth - 1) * 24 + 12}px`,
                  width: "12px",
                }}
              />
            </>
          )}

          {/* 子要素としてドロップされる時のガイド */}
          {isDraggingOverAsChild && (
            <div
              className="absolute inset-0 rounded-lg border-2 border-dashed border-blue-500 bg-blue-100/30 animate-pulse z-10 pointer-events-none"
              style={{ marginLeft: `-${item.depth * 24}px` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-bold whitespace-nowrap">
                ⤵ この要素の子として追加
              </div>
            </div>
          )}

          {/* 兄弟要素としてドロップされる時のガイド */}
          {isDraggingOverAsSibling && (
            <div
              className="absolute -top-1 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg z-10 pointer-events-none"
              style={{ marginLeft: `-${item.depth * 24}px` }}
            >
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-600 text-white px-3 py-1 rounded-full shadow-lg text-xs font-bold whitespace-nowrap">
                ↓ この位置に追加
              </div>
            </div>
          )}

          <Card
            className={`${getDepthColor(item.depth)} ${
              snapshot.isDragging
                ? "shadow-xl ring-2 ring-blue-400 ring-opacity-50"
                : "shadow-sm hover:shadow-md"
            } ${
              isSelected
                ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white"
                : ""
            } relative overflow-visible`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(item)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(item);
              }
            }}
          >
            <CardBody className="py-2 px-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* ドラッグハンドル */}
                  <div
                    {...provided.dragHandleProps}
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/80 rounded flex-shrink-0 transition-all duration-200 group"
                    style={{
                      touchAction: "none",
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      msUserSelect: "none",
                    }}
                    title="ドラッグして移動"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-gray-400 group-hover:text-gray-600 transition-colors"
                    >
                      <circle cx="9" cy="5" r="1" fill="currentColor" />
                      <circle cx="9" cy="12" r="1" fill="currentColor" />
                      <circle cx="9" cy="19" r="1" fill="currentColor" />
                      <circle cx="15" cy="5" r="1" fill="currentColor" />
                      <circle cx="15" cy="12" r="1" fill="currentColor" />
                      <circle cx="15" cy="19" r="1" fill="currentColor" />
                    </svg>
                  </div>

                  {/* 深さインジケーター */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getDepthAccentColor(
                      item.depth,
                    )} bg-white shadow-sm`}
                    title={`階層: ${item.depth + 1}`}
                  >
                    {item.depth + 1}
                  </div>

                  {/* 展開/折りたたみボタン */}
                  {item.children.length > 0 && (
                    <Button
                      size="sm"
                      variant="flat"
                      isIconOnly
                      onPress={() => onToggleExpand(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="min-w-6 w-6 h-6 hover:scale-110 transition-transform duration-200 font-bold text-xs"
                      title={item.isExpanded ? "折りたたむ" : "展開する"}
                    >
                      <span className="text-sm">
                        {item.isExpanded ? "−" : "+"}
                      </span>
                    </Button>
                  )}

                  {/* アイテムテキスト */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate text-sm">
                      {item.text}
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="light"
                    color="secondary"
                    onPress={() => onQuickCreateChild?.(item.data.itemId)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-7 h-7 px-2 hover:scale-105 transition-transform duration-200"
                    title="子サジェストを追加"
                    isIconOnly
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="primary"
                    onPress={() => onEdit(item.data)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-7 h-7 px-2 hover:scale-105 transition-transform duration-200"
                    title="編集"
                    isIconOnly
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => onRequestDelete(item)}
                    onClick={(e) => e.stopPropagation()}
                    className="min-w-7 h-7 px-2 hover:scale-105 transition-transform duration-200"
                    title="削除"
                    isIconOnly
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
