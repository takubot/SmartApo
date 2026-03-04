"use client";

import React, { useState, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
// Cardはサブコンポーネントに移動
import type { SuggestItemResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

// ツリー構造のアイテム型
export interface TreeItem {
  id: string;
  text: string;
  children: TreeItem[];
  data: SuggestItemResponseSchemaType;
  depth: number;
  isExpanded: boolean;
  isVisible: boolean;
}

interface DragDropTreeProps {
  items: SuggestItemResponseSchemaType[];
  onDeleteItem: (
    itemId: number,
    options?: { deleteChildren?: boolean },
  ) => Promise<void>;
  onReorderItems?: (
    items: Array<{
      itemId: number;
      parentItemId: number | null;
      orderIndex: number;
    }>,
  ) => Promise<void>;
  onEdit: (item: SuggestItemResponseSchemaType | null) => void;
  selectedItemId?: number | null;
  onSelectItem?: (item: SuggestItemResponseSchemaType) => void;
  onQuickCreate?: (payload: {
    parentItemId: number | null;
    displayLabel: string;
    onClickFixedAnswer: string;
  }) => Promise<void>;
}

// =========================
// Utility functions (pure)
// =========================
function cloneTree(nodes: TreeItem[]): TreeItem[] {
  return nodes.map((n) => ({ ...n, children: cloneTree(n.children) }));
}

function recalcDepth(nodes: TreeItem[], depth = 0): void {
  nodes.forEach((n) => {
    n.depth = depth;
    recalcDepth(n.children, depth + 1);
  });
}

function findParentIdOf(
  nodes: TreeItem[],
  targetItemId: number,
): number | null {
  let resultParentId: number | null = null;
  const dfs = (items: TreeItem[], parent: TreeItem | null): boolean => {
    for (const n of items) {
      if (n.data.itemId === targetItemId) {
        resultParentId = parent ? parent.data.itemId : null;
        return true;
      }
      if (n.children.length > 0 && dfs(n.children, n)) return true;
    }
    return false;
  };
  dfs(nodes, null);
  return resultParentId;
}

function findSiblingsOf(
  nodes: TreeItem[],
  parentId: number | null,
): TreeItem[] {
  if (parentId === null) return nodes;
  const stack = [...nodes];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur.data.itemId === parentId) return cur.children;
    if (cur.children.length) stack.push(...cur.children);
  }
  return [];
}

function isCircularReference(
  flat: TreeItem[],
  itemId: number,
  targetParentId: number,
): boolean {
  const findInChildren = (parentId: number): boolean => {
    const parent = flat.find((item) => item.data.itemId === parentId);
    if (!parent) return false;
    if (parent.data.itemId === targetParentId) return true;
    return parent.children.some(
      (child) =>
        child.data.itemId === targetParentId ||
        findInChildren(child.data.itemId),
    );
  };
  return findInChildren(itemId);
}

// ツリー構造を構築する関数
function buildTree(items: SuggestItemResponseSchemaType[]): TreeItem[] {
  const itemMap = new Map<number, TreeItem>();
  const roots: TreeItem[] = [];

  // すべてのアイテムをマップに追加
  items.forEach((item) => {
    itemMap.set(item.itemId, {
      id: String(item.itemId),
      text: item.displayLabel,
      children: [],
      data: item,
      depth: 0,
      isExpanded: true,
      isVisible: true,
    });
  });

  // 親子関係を構築
  items.forEach((item) => {
    const treeItem = itemMap.get(item.itemId)!;
    if (item.parentItemId === null) {
      roots.push(treeItem);
    } else {
      const parent = itemMap.get(item.parentItemId!);
      if (parent) {
        parent.children.push(treeItem);
      }
    }
  });

  // 深さを再計算
  function updateDepth(items: TreeItem[], depth = 0) {
    items.forEach((item) => {
      item.depth = depth;
      updateDepth(item.children, depth + 1);
    });
  }

  updateDepth(roots);
  return roots;
}

// ツリー構造をフラット化する関数（ドラッグ&ドロップ用）
function flattenTreeForDnd(treeItems: TreeItem[]): TreeItem[] {
  const result: TreeItem[] = [];

  function traverse(items: TreeItem[]) {
    items.forEach((item) => {
      result.push(item);
      if (item.isExpanded && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }

  traverse(treeItems);
  return result;
}

// 分離コンポーネント
import SuggestCard from "./suggestCard";

// =========================
// Internal UI components
// =========================
function ConfirmDeleteDialog({
  open,
  itemLabel,
  hasChildren,
  onCancel,
  onDelete,
}: {
  open: boolean;
  itemLabel: string;
  hasChildren: boolean;
  onCancel: () => void;
  onDelete: (options: { deleteChildren: boolean }) => Promise<void> | void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[480px] max-w-[92vw] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <div className="text-xl font-bold text-white">削除の確認</div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="text-base text-gray-700 bg-gray-50 border-l-4 border-red-500 p-4 rounded">
            「<span className="font-semibold text-gray-900">{itemLabel}</span>
            」を削除します。よろしいですか？
          </div>
          {hasChildren && (
            <div className="text-sm text-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-4 flex items-start gap-3">
              <div className="flex-shrink-0 text-2xl">⚠️</div>
              <div>
                <div className="font-semibold mb-1">子要素が存在します</div>
                <div className="text-xs text-amber-700">
                  削除方法を選択してください。
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 pb-5 flex gap-3 justify-end">
          <Button variant="flat" size="lg" onPress={onCancel}>
            キャンセル
          </Button>
          {hasChildren && (
            <Button
              color="danger"
              variant="bordered"
              size="lg"
              onPress={() => onDelete({ deleteChildren: true })}
            >
              子も削除
            </Button>
          )}
          <Button
            color="danger"
            variant="shadow"
            size="lg"
            onPress={() => onDelete({ deleteChildren: false })}
          >
            {hasChildren ? "子を繰り上げて削除" : "削除する"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DragDropTree({
  items,
  onDeleteItem,
  onReorderItems,
  onEdit,
  selectedItemId = null,
  onSelectItem,
  onQuickCreate,
}: DragDropTreeProps) {
  const [treeItems, setTreeItems] = useState<TreeItem[]>(() =>
    buildTree(items),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{
    itemId: number;
    itemLabel: string;
    hasChildren: boolean;
  } | null>(null);
  const [hoverExpandTargetId, setHoverExpandTargetId] = useState<string | null>(
    null,
  );
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dragOverType, setDragOverType] = useState<"child" | "sibling" | null>(
    null,
  );
  const [quickCreate, setQuickCreate] = useState<{
    anchorId: string;
    parentItemId: number | null;
  } | null>(null);
  const [quickCreateForm, setQuickCreateForm] = useState<{
    displayLabel: string;
    onClickFixedAnswer: string;
    isSubmitting: boolean;
  }>({ displayLabel: "", onClickFixedAnswer: "", isSubmitting: false });

  // ツリー構造を更新
  React.useEffect(() => {
    setTreeItems(buildTree(items));
  }, [items]);

  // アイテムの展開/折りたたみ
  const toggleExpand = useCallback((itemId: string) => {
    setTreeItems((prev) => {
      const updateItem = (items: TreeItem[]): TreeItem[] => {
        return items.map((item) => {
          if (item.id === itemId) {
            return { ...item, isExpanded: !item.isExpanded };
          }
          if (item.children.length > 0) {
            return { ...item, children: updateItem(item.children) };
          }
          return item;
        });
      };
      return updateItem(prev);
    });
  }, []);

  // 明示的に展開状態をtrueにする（アコーディオンの自動展開用）
  const expandItem = useCallback((itemId: string) => {
    setTreeItems((prev) => {
      const updateItem = (items: TreeItem[]): TreeItem[] => {
        return items.map((item) => {
          if (item.id === itemId) {
            return { ...item, isExpanded: true };
          }
          if (item.children.length > 0) {
            return { ...item, children: updateItem(item.children) };
          }
          return item;
        });
      };
      return updateItem(prev);
    });
  }, []);

  // ドラッグ開始処理
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setDragOverItemId(null);
    setDragOverType(null);
  }, []);

  // ドラッグ更新処理（ビジュアルフィードバック）
  const handleDragUpdate = useCallback(
    (update: {
      destination?: { droppableId: string; index: number } | null;
      combine?: { draggableId: string } | null;
    }) => {
      if (update.combine) {
        // 要素の上にホバー中 → 子要素として追加
        setDragOverItemId(update.combine.draggableId);
        setDragOverType("child");
      } else if (update.destination) {
        // 位置にホバー中 → 兄弟要素として追加
        const flatItems = flattenTreeForDnd(treeItems);
        const targetItem = flatItems[update.destination.index];
        if (targetItem) {
          setDragOverItemId(targetItem.id);
          setDragOverType("sibling");
        }
      } else {
        setDragOverItemId(null);
        setDragOverType(null);
      }
    },
    [treeItems],
  );

  // ドラッグ&ドロップ処理
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      setIsDragging(false);
      setHoverExpandTargetId(null);
      setDragOverItemId(null);
      setDragOverType(null);
      const { destination, source, draggableId } = result;
      const anyResult = result as unknown as {
        combine?: { draggableId: string };
      };

      const hasCombine = Boolean(anyResult && anyResult.combine);
      if (!destination && !hasCombine) return;

      // 同じ位置にドロップ（かつ結合でない）は何もしない
      if (
        destination &&
        destination.droppableId === source.droppableId &&
        destination.index === source.index &&
        !hasCombine
      ) {
        return;
      }

      const flatItems = flattenTreeForDnd(treeItems);
      const draggedItem = flatItems.find((item) => item.id === draggableId);
      if (!draggedItem) return;

      // 新しい親と順序を決定（直前の可視アイテムの親を採用）
      let newParentId: number | null = null;
      let newOrderIndex = 0;

      // combine ドロップ（要素に重ねてドロップ）なら子要素化
      const dropAsChildIntent = hasCombine;

      // 1) 子としてのドロップが意図され、かつホバー中のアイテムがある場合は、ホバー項目を親に採用
      let decided = false;
      if (dropAsChildIntent && anyResult && anyResult.combine) {
        const combineObj = anyResult.combine as { draggableId: string };
        const target = flatItems.find(
          (it) => it.id === String(combineObj.draggableId),
        );
        if (target) {
          newParentId = target.data.itemId;
          newOrderIndex = target.children.length;
          decided = true;
        }
      }

      // 2) まだ決まっていない場合は従来ロジックで決定
      if (!decided) {
        if (destination && destination.index === 0) {
          // 2の回答: 先頭行へ重なりドロップ時は常に先頭要素を親にする
          if (dropAsChildIntent) {
            const curr = flatItems[0];
            if (curr) {
              newParentId = curr.data.itemId;
              newOrderIndex = curr.children.length;
            } else {
              newParentId = null;
              newOrderIndex = 0;
            }
          } else {
            newParentId = null;
            newOrderIndex = 0;
          }
        } else {
          const targetFlatItem = destination
            ? flatItems[destination.index - 1]
            : undefined;
          if (targetFlatItem) {
            if (dropAsChildIntent) {
              // 子として移動: 直前アイテムの子末尾
              newParentId = targetFlatItem.data.itemId;
              newOrderIndex = targetFlatItem.children.length;
            } else {
              // 直前の可視アイテムの親配下に、直前の次の順で配置
              const parentId = findParentIdOf(
                treeItems,
                targetFlatItem.data.itemId,
              );
              const siblings = findSiblingsOf(treeItems, parentId);
              const prevIndex = siblings.findIndex(
                (s) => s.data.itemId === targetFlatItem.data.itemId,
              );
              newParentId = parentId;
              newOrderIndex = prevIndex >= 0 ? prevIndex + 1 : siblings.length;
            }
          } else {
            // prev が無い場合は curr を親候補（子意図時）にフォールバック
            if (dropAsChildIntent && destination) {
              const curr = flatItems[destination.index] ?? null;
              if (curr) {
                newParentId = curr.data.itemId;
                newOrderIndex = curr.children.length;
              } else {
                // 念のためルート末尾
                newParentId = null;
                newOrderIndex = flatItems.filter((it) => it.depth === 0).length;
              }
            } else {
              // 念のためルート末尾
              newParentId = null;
              newOrderIndex = flatItems.filter((it) => it.depth === 0).length;
            }
          }
        }
      }

      // 自分自身を親にすることはできない
      if (newParentId === draggedItem.data.itemId) {
        handleErrorWithUI(
          { message: "自分自身を親にすることはできません" },
          "アイテム移動",
        );
        return;
      }

      if (
        newParentId !== null &&
        isCircularReference(flatItems, draggedItem.data.itemId, newParentId)
      ) {
        handleErrorWithUI(
          { message: "循環参照を防ぐため、子要素を親にすることはできません" },
          "アイテム移動",
        );
        return;
      }

      // 楽観的更新：ローカルツリーを先に更新してUIを即時反映
      setTreeItems((prev) => {
        const tree = cloneTree(prev);

        // ノードの削除と対象ノードの参照取得
        let movingNode: TreeItem | null = null;
        const removeNode = (nodes: TreeItem[]): TreeItem[] => {
          return nodes
            .map((n) => ({ ...n, children: removeNode(n.children) }))
            .filter((n) => {
              if (n.data.itemId === draggedItem.data.itemId) {
                movingNode = n;
                return false;
              }
              return true;
            });
        };

        const treeWithout = removeNode(tree);

        if (!movingNode) return prev; // 念のため

        // 目的の親のchildrenへ挿入
        const insertToParent = (
          nodes: TreeItem[],
          parentId: number | null,
          atIndex: number,
        ): TreeItem[] => {
          if (parentId === null) {
            const rootNodes = [...nodes];
            rootNodes.splice(atIndex, 0, movingNode!);
            return rootNodes;
          }
          return nodes.map((n) => {
            if (n.data.itemId === parentId) {
              const newChildren = [...n.children];
              newChildren.splice(atIndex, 0, movingNode!);
              return { ...n, children: newChildren };
            }
            if (n.children.length > 0) {
              return {
                ...n,
                children: insertToParent(n.children, parentId, atIndex),
              };
            }
            return n;
          });
        };

        const updated = insertToParent(treeWithout, newParentId, newOrderIndex);

        // 深さ再計算
        recalcDepth(updated);

        return updated;
      });

      // 非同期処理を別スレッドで実行してUIをブロックしない
      const performReorder = async () => {
        try {
          if (onReorderItems) {
            // 一括更新でorder_indexを自動計算
            const reorderData = [
              {
                itemId: draggedItem.data.itemId,
                parentItemId: newParentId,
                orderIndex: newOrderIndex,
              },
            ];

            await onReorderItems(reorderData);
          }

          showSuccessToast("アイテム移動");
        } catch (error) {
          handleErrorWithUI(error, "アイテム移動");
        }
      };

      performReorder();
    },
    [treeItems, onReorderItems],
  );

  // ドラッグ中にホバーした要素を一定時間で自動展開（アコーディオン体験）
  React.useEffect(() => {
    if (!isDragging || !hoverExpandTargetId) return;
    const timer = setTimeout(() => {
      expandItem(hoverExpandTargetId);
    }, 350);
    return () => clearTimeout(timer);
  }, [isDragging, hoverExpandTargetId, expandItem]);

  const openQuickCreate = useCallback(
    (anchorId: string, parentItemId: number | null) => {
      setQuickCreate({ anchorId, parentItemId });
      setQuickCreateForm({
        displayLabel: "",
        onClickFixedAnswer: "",
        isSubmitting: false,
      });
    },
    [],
  );

  const closeQuickCreate = useCallback(() => {
    setQuickCreate(null);
    setQuickCreateForm({
      displayLabel: "",
      onClickFixedAnswer: "",
      isSubmitting: false,
    });
  }, []);

  const submitQuickCreate = useCallback(async () => {
    if (!quickCreate || !onQuickCreate) return;
    const label = quickCreateForm.displayLabel.trim();
    const ans = quickCreateForm.onClickFixedAnswer.trim();
    if (!label || !ans) return;
    setQuickCreateForm((p) => ({ ...p, isSubmitting: true }));
    try {
      await onQuickCreate({
        parentItemId: quickCreate.parentItemId,
        displayLabel: label,
        onClickFixedAnswer: ans,
      });
      closeQuickCreate();
    } finally {
      setQuickCreateForm((p) => ({ ...p, isSubmitting: false }));
    }
  }, [
    quickCreate,
    quickCreateForm.displayLabel,
    quickCreateForm.onClickFixedAnswer,
    onQuickCreate,
    closeQuickCreate,
  ]);

  const flatItems = useMemo(() => flattenTreeForDnd(treeItems), [treeItems]);

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col">
      {/* ドラッグ&ドロップエリア - 残り高さを全て使用 */}
      <div className="flex-1 overflow-hidden">
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
        >
          <Droppable droppableId="tree-root" isCombineEnabled>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`h-full w-full overflow-y-auto p-2 rounded-lg transition-all duration-200 ${
                  snapshot.isDraggingOver
                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 shadow-inner border-2 border-dashed border-blue-300"
                    : isDragging
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-orange-200"
                      : "bg-gray-50/30"
                }`}
                onMouseMove={() => {}}
              >
                {flatItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-gray-400"
                      >
                        <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-gray-600 mb-2">
                      アイテムがありません
                    </p>
                    <p className="text-sm text-gray-500">
                      下の「ルートにサジェストを追加」ボタンから作成できます
                    </p>
                  </div>
                ) : (
                  <div>
                    {flatItems.map((item, index) => (
                      <div key={item.id}>
                        <SuggestCard
                          item={item}
                          index={index}
                          onEdit={(it) => onEdit(it)}
                          onRequestDelete={(ti) =>
                            setConfirmDelete({
                              itemId: ti.data.itemId,
                              itemLabel: ti.data.displayLabel,
                              hasChildren: ti.children.length > 0,
                            })
                          }
                          onToggleExpand={toggleExpand}
                          setHovered={() => {}}
                          isSelected={selectedItemId === item.data.itemId}
                          onSelect={(ti) => onSelectItem?.(ti.data)}
                          onQuickCreateChild={(parentId) =>
                            openQuickCreate(item.id, parentId)
                          }
                          onHoverItem={(id) => {
                            if (!isDragging) return;
                            setHoverExpandTargetId(id);
                          }}
                          isDraggingOverAsChild={
                            isDragging &&
                            dragOverItemId === item.id &&
                            dragOverType === "child"
                          }
                          isDraggingOverAsSibling={
                            isDragging &&
                            dragOverItemId === item.id &&
                            dragOverType === "sibling"
                          }
                        />
                        {quickCreate?.anchorId === item.id && (
                          <div
                            className="mt-2 mb-3"
                            style={{ paddingLeft: `${item.depth * 24 + 24}px` }}
                          >
                            <div className="rounded-xl border border-indigo-200 bg-white shadow-sm p-3">
                              <div className="text-sm font-semibold text-gray-800 mb-2">
                                子サジェストを追加
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-600">
                                    表示ラベル
                                  </div>
                                  <input
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={quickCreateForm.displayLabel}
                                    onChange={(e) =>
                                      setQuickCreateForm((p) => ({
                                        ...p,
                                        displayLabel: e.target.value,
                                      }))
                                    }
                                    placeholder="例: よくある質問"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-600">
                                    固定回答
                                  </div>
                                  <input
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                    value={quickCreateForm.onClickFixedAnswer}
                                    onChange={(e) =>
                                      setQuickCreateForm((p) => ({
                                        ...p,
                                        onClickFixedAnswer: e.target.value,
                                      }))
                                    }
                                    placeholder="例: こちらをご確認ください…"
                                  />
                                </div>
                              </div>
                              <div className="mt-3 flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  onPress={closeQuickCreate}
                                  isDisabled={quickCreateForm.isSubmitting}
                                >
                                  キャンセル
                                </Button>
                                <Button
                                  size="sm"
                                  color="primary"
                                  variant="shadow"
                                  onPress={submitQuickCreate}
                                  isDisabled={
                                    quickCreateForm.isSubmitting ||
                                    !quickCreateForm.displayLabel.trim() ||
                                    !quickCreateForm.onClickFixedAnswer.trim()
                                  }
                                  isLoading={quickCreateForm.isSubmitting}
                                >
                                  作成
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* ルート追加（最下部の＋カード） */}
                <div className="mt-3">
                  <button
                    type="button"
                    className="w-full rounded-xl border-2 border-dashed border-indigo-300 bg-white/70 hover:bg-white px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors"
                    onClick={() => openQuickCreate("__root_add__", null)}
                  >
                    ＋ ルートにサジェストを追加
                  </button>
                  {quickCreate?.anchorId === "__root_add__" && (
                    <div className="mt-2">
                      <div className="rounded-xl border border-indigo-200 bg-white shadow-sm p-3">
                        <div className="text-sm font-semibold text-gray-800 mb-2">
                          ルートにサジェストを追加
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">
                              表示ラベル
                            </div>
                            <input
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                              value={quickCreateForm.displayLabel}
                              onChange={(e) =>
                                setQuickCreateForm((p) => ({
                                  ...p,
                                  displayLabel: e.target.value,
                                }))
                              }
                              placeholder="例: はじめに"
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-gray-600">
                              固定回答
                            </div>
                            <input
                              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                              value={quickCreateForm.onClickFixedAnswer}
                              onChange={(e) =>
                                setQuickCreateForm((p) => ({
                                  ...p,
                                  onClickFixedAnswer: e.target.value,
                                }))
                              }
                              placeholder="例: まずはこちらから…"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={closeQuickCreate}
                            isDisabled={quickCreateForm.isSubmitting}
                          >
                            キャンセル
                          </Button>
                          <Button
                            size="sm"
                            color="primary"
                            variant="shadow"
                            onPress={submitQuickCreate}
                            isDisabled={
                              quickCreateForm.isSubmitting ||
                              !quickCreateForm.displayLabel.trim() ||
                              !quickCreateForm.onClickFixedAnswer.trim()
                            }
                            isLoading={quickCreateForm.isSubmitting}
                          >
                            作成
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {confirmDelete && (
        <ConfirmDeleteDialog
          open={!!confirmDelete}
          itemLabel={confirmDelete.itemLabel}
          hasChildren={confirmDelete.hasChildren}
          onCancel={() => setConfirmDelete(null)}
          onDelete={async ({ deleteChildren }) => {
            const t = confirmDelete;
            setConfirmDelete(null);
            await onDeleteItem(t.itemId, { deleteChildren });
          }}
        />
      )}
    </div>
  );
}
