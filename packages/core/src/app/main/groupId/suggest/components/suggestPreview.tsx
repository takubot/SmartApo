"use client";

import React from "react";
import type { SuggestItemResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { Button, Avatar } from "@heroui/react";
//

interface SuggestPreviewProps {
  items: SuggestItemResponseSchemaType[];
  selectedItemId?: number | null;
  onItemClick?: (item: SuggestItemResponseSchemaType) => void;
}

// ルートアイテムのみを取得
function getRootItems(
  items: SuggestItemResponseSchemaType[],
): SuggestItemResponseSchemaType[] {
  return items
    .filter((item) => item.parentItemId === null)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

// 指定されたアイテムの子アイテムを取得
function getChildItems(
  items: SuggestItemResponseSchemaType[],
  parentItemId: number,
): SuggestItemResponseSchemaType[] {
  return items
    .filter((item) => item.parentItemId === parentItemId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

// サジェストボタンコンポーネント
function SuggestButton({
  item,
  isSelected,
  onClick,
}: {
  item: SuggestItemResponseSchemaType;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getActionIcon = () => {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  };

  return (
    <Button
      size="sm"
      variant={isSelected ? "solid" : "bordered"}
      color={isSelected ? "primary" : "default"}
      className={`text-xs transition-all duration-200 bg-white hover:bg-gray-50 border-2 ${
        isSelected
          ? "shadow-md border-primary"
          : "hover:shadow-sm border-primary"
      }`}
      onClick={onClick}
      startContent={getActionIcon()}
    >
      {item.displayLabel}
    </Button>
  );
}

export default function SuggestPreview({
  items,
  selectedItemId,
  onItemClick,
}: SuggestPreviewProps) {
  const rootItems = getRootItems(items);
  const [localSelectedId, setLocalSelectedId] = React.useState<number | null>(
    selectedItemId ?? null,
  );
  const selectedItem = React.useMemo(() => {
    return items.find((item) => item.itemId === localSelectedId) ?? null;
  }, [items, localSelectedId]);

  // prop 変化に追従（外部制御を尊重）
  React.useEffect(() => {
    setLocalSelectedId(selectedItemId ?? null);
  }, [selectedItemId]);

  return (
    <div className="flex-1 min-h-0 w-full bg-gray-50 flex flex-col">
      {/* チャットヘッダー - 固定高さ */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src="/botIcon/default.ico"
            size="sm"
            className="flex-shrink-0"
          />
          <div>
            <h3 className="text-sm font-medium">サジェストプレビュー</h3>
            <p className="text-xs text-gray-500">チャットでの表示イメージ</p>
          </div>
        </div>
      </div>

      {/* チャットメッセージエリア - 残り高さを全て使用 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ユーザーメッセージ */}
        <div className="flex justify-end">
          <div className="max-w-xs lg:max-w-md">
            <div className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm">
              質問があります
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">
              ユーザー
            </div>
          </div>
        </div>

        {/* AIメッセージ */}
        <div className="flex justify-start">
          <div className="max-w-xs lg:max-w-md">
            <div className="bg-white border rounded-lg px-3 py-2 text-sm">
              どのようなご質問でしょうか？以下のサジェストから選択してください：
            </div>
            <div className="text-xs text-gray-500 mt-1">AI アシスタント</div>
          </div>
        </div>

        {/* サジェストボタンエリア（ユーザー側に表示） */}
        {rootItems.length > 0 && (
          <div className="flex justify-end">
            <div className="max-w-xs lg:max-w-md">
              <div className="flex flex-wrap gap-2">
                {rootItems.map((item) => (
                  <SuggestButton
                    key={item.itemId}
                    item={item}
                    isSelected={localSelectedId === item.itemId}
                    onClick={() => {
                      setLocalSelectedId(item.itemId);
                      onItemClick?.(item);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ユーザーがサジェストをクリックした時の表示 */}
        {localSelectedId && (
          <>
            <div className="flex justify-end">
              <div className="max-w-xs lg:max-w-md">
                <div className="bg-blue-500 text-white rounded-lg px-3 py-2 text-sm">
                  {selectedItem?.displayLabel || "選択されたサジェスト"}
                </div>
                <div className="text-xs text-gray-500 mt-1 text-right">
                  ユーザー（サジェスト選択）
                </div>
              </div>
            </div>

            {/* AIの固定回答 */}
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md">
                <div className="bg-white border rounded-lg px-3 py-2 text-sm">
                  {(selectedItem as unknown as { onClickFixedAnswer?: string })
                    ?.onClickFixedAnswer ?? ""}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  AI アシスタント
                </div>
              </div>
            </div>

            {/* 子サジェストの表示 */}
            {(() => {
              const childItems = getChildItems(items, localSelectedId);
              return childItems.length > 0 ? (
                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md">
                    <div className="flex flex-wrap gap-2">
                      {childItems.map((item) => (
                        <SuggestButton
                          key={item.itemId}
                          item={item}
                          isSelected={false}
                          onClick={() => {
                            setLocalSelectedId(item.itemId);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null;
            })()}
          </>
        )}

        {/* 空状態 */}
        {rootItems.length === 0 && (
          <div className="flex justify-center items-center h-32">
            <div className="text-center text-gray-500">
              <div className="text-sm">サジェストアイテムがありません</div>
              <div className="text-xs mt-1">
                左側でアイテムを作成してください
              </div>
            </div>
          </div>
        )}
      </div>

      {/* チャット入力エリア（プレビュー用） - 固定高さ */}
      <div className="flex-shrink-0 bg-white border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-500">
            メッセージを入力...（プレビュー）
          </div>
          <Button size="sm" color="primary" isDisabled>
            送信
          </Button>
        </div>
      </div>
    </div>
  );
}
