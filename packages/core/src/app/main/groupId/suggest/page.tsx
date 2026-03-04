"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import PackageDialog from "./components/editPackageModal";
import {
  type SuggestPackageResponseSchemaType,
  type BotResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import {
  list_packages_v2_suggest_list_package__group_id__get,
  list_bot_v2_bot_list__group_id__post,
} from "@repo/api-contracts/based_template/service";

/* ==== HeroUI ==== */
import { Alert } from "@heroui/alert";
import { Button, Input } from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { Card, CardBody } from "@heroui/card";
import { basedTemplateService } from "@repo/api-contracts/based_template/service";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Spinner,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  Trash2,
  Calendar,
  Package,
  Bot,
  Check,
  MoreVertical,
  Edit,
  FileText,
} from "lucide-react";
import { useDoubleClickById } from "@common/useDoubleClick";

/* ==== helper: list packages with groupId query ==== */
const listPackagesWithGroup = async (
  groupId: string,
): Promise<SuggestPackageResponseSchemaType[]> => {
  try {
    const data =
      await list_packages_v2_suggest_list_package__group_id__get(groupId);
    return (data?.packageList ?? []) as SuggestPackageResponseSchemaType[];
  } catch {
    return [];
  }
};

export default function SuggestTopPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = useMemo(() => String(params.groupId || ""), [params.groupId]);
  const router = useRouter();

  const [keyword, setKeyword] = useState("");
  // statusFilter は廃止
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] =
    useState<SuggestPackageResponseSchemaType | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // インライン編集用の状態（単一の状態に集約して保守性を上げる）
  type InlineEditState = null | {
    field: "name" | "description";
    suggestId: number;
    value: string;
    original: string;
  };
  const [inlineEdit, setInlineEdit] = useState<InlineEditState>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  // “クリック外保存”判定用（blur/stopPropagationに依存しない）
  const inlineEditorContainerRef = useRef<HTMLDivElement | null>(null);

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        [
          "button",
          "a",
          "input",
          "textarea",
          "select",
          // HeroUI/React Aria系
          "[role='button']",
          "[role='menuitem']",
          "[role='option']",
          "[role='checkbox']",
          "[role='switch']",
          "[role='combobox']",
        ].join(","),
      ),
    );
  };

  // ボット選択の一時的な状態管理（パッケージID -> 選択されたボットIDの配列）
  const [tempBotSelections, setTempBotSelections] = useState<
    Map<number, number[]>
  >(new Map());

  // どのパッケージのSelectが開いているか
  const [openSelectId, setOpenSelectId] = useState<number | null>(null);

  const {
    data: packages = [],
    error,
    isLoading,
    mutate,
  } = useSWR(groupId ? ["suggest-packages", groupId] : null, ([, gid]) =>
    listPackagesWithGroup(gid as string),
  );

  // ボット一覧を取得（キャッシュ設定を追加）
  const { data: botListData, isLoading: isLoadingBots } = useSWR(
    groupId ? ["bot-list", groupId] : null,
    async ([, gid]) => {
      try {
        const response = await list_bot_v2_bot_list__group_id__post(
          gid as string,
          { includeIcon: false },
        );
        const list = response?.botList;
        return Array.isArray(list) ? list : [];
      } catch {
        return [];
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000,
      keepPreviousData: true,
    },
  );
  const botList: BotResponseSchemaType[] = Array.isArray(botListData)
    ? botListData
    : [];

  // ダブルクリックでパッケージの中に入る
  const handleRowDoubleClick = useDoubleClickById(
    (suggestId: string | number) => {
      router.push(`/main/${encodeURIComponent(groupId)}/suggest/${suggestId}`);
    },
    { timeout: 300 },
  );

  const filtered = useMemo(() => {
    return (packages as SuggestPackageResponseSchemaType[])
      .filter((p) =>
        keyword
          ? p.suggestName.toLowerCase().includes(keyword.toLowerCase())
          : true,
      )
      .sort((a, b) => b.suggestId - a.suggestId);
  }, [packages, keyword]);

  const onDeletePackage = async (suggestId: number) => {
    try {
      await basedTemplateService.delete_package_v2_suggest_delete_package__suggest_id__delete(
        String(suggestId),
      );
      showSuccessToast("パッケージ削除");
      await mutate();
    } catch (error) {
      handleErrorWithUI(error, "パッケージ削除");
    }
  };

  // パッケージ名の編集開始
  const startEditingName = (pkg: SuggestPackageResponseSchemaType) => {
    setInlineEdit({
      field: "name",
      suggestId: pkg.suggestId,
      value: pkg.suggestName ?? "",
      original: pkg.suggestName ?? "",
    });
  };

  // 説明の編集開始
  const startEditingDescription = (pkg: SuggestPackageResponseSchemaType) => {
    const current = pkg.description ?? "";
    setInlineEdit({
      field: "description",
      suggestId: pkg.suggestId,
      value: current,
      original: current,
    });
  };

  const cancelInlineEdit = () => {
    setInlineEdit(null);
  };

  const commitInlineEdit = useCallback(async () => {
    if (!inlineEdit) return;
    if (isUpdating) return;

    const pkg = packages.find((p) => p.suggestId === inlineEdit.suggestId);
    if (!pkg) {
      setInlineEdit(null);
      return;
    }

    const next = inlineEdit.value.trim();
    const original = inlineEdit.original;

    // 名称は空を許可しない（従来互換）
    if (inlineEdit.field === "name" && !next) {
      setInlineEdit(null);
      return;
    }

    // 変更が無ければAPIは叩かずに終了
    if (next === original) {
      setInlineEdit(null);
      return;
    }

    setIsUpdating(true);
    try {
      await basedTemplateService.update_package_v2_suggest_update_package__suggest_id__put(
        String(inlineEdit.suggestId),
        {
          suggestName:
            inlineEdit.field === "name" ? next : (pkg.suggestName ?? ""),
          description:
            inlineEdit.field === "description" ? next : (pkg.description ?? ""),
          suggestBotList: pkg.suggestBotList ?? [],
        },
      );
      showSuccessToast(
        inlineEdit.field === "name"
          ? "パッケージ名を更新しました"
          : "説明を更新しました",
      );
      setInlineEdit(null);
      await mutate();
    } catch (error) {
      handleErrorWithUI(
        error,
        inlineEdit.field === "name" ? "パッケージ名更新" : "説明更新",
      );
      // 失敗時は編集状態を維持（再試行可能）
    } finally {
      setIsUpdating(false);
    }
  }, [inlineEdit, isUpdating, packages, mutate]);

  // ボット連携の更新
  const updateBotList = async (suggestId: number, newBotList: number[]) => {
    setIsUpdating(true);
    try {
      const pkg = packages.find((p) => p.suggestId === suggestId);
      if (!pkg) return;

      await basedTemplateService.update_package_v2_suggest_update_package__suggest_id__put(
        String(suggestId),
        {
          suggestName: pkg.suggestName,
          description: pkg.description ?? "",
          suggestBotList: newBotList,
        },
      );
      showSuccessToast("ボット連携を更新しました");
      await mutate();
    } catch (error) {
      handleErrorWithUI(error, "ボット連携更新");
    } finally {
      setIsUpdating(false);
    }
  };

  // 編集モード時にフォーカスと全選択
  useEffect(() => {
    if (!inlineEdit) return;

    // 少し遅延させて確実にフォーカスと全選択を行う（Dropdownクローズ後のフォーカス復帰などに対応）
    const timer = setTimeout(() => {
      if (inlineEdit.field === "name" && nameInputRef.current) {
        nameInputRef.current.focus();
        // 全選択を確実に行うため、少し遅延させてから実行
        setTimeout(() => {
          if (nameInputRef.current) {
            nameInputRef.current.select();
          }
        }, 0);
      }
      if (inlineEdit.field === "description" && descriptionInputRef.current) {
        descriptionInputRef.current.focus();
        // 全選択を確実に行うため、少し遅延させてから実行
        setTimeout(() => {
          if (descriptionInputRef.current) {
            descriptionInputRef.current.select();
          }
        }, 0);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [inlineEdit]);

  // クリック外（pointerdown capture）で保存：blur/stopPropagationに依存しない
  useEffect(() => {
    if (!inlineEdit) return;
    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (target && inlineEditorContainerRef.current?.contains(target)) return;
      void commitInlineEdit();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [inlineEdit, commitInlineEdit]);

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                サジェスト管理
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right text-xs text-default-500">
                <div>総数: {packages.length}件</div>
                <div>
                  ボット連携:{" "}
                  {
                    packages.filter(
                      (p) => p.suggestBotList && p.suggestBotList.length > 0,
                    ).length
                  }
                  件
                </div>
              </div>
              <Button
                color="primary"
                variant="solid"
                size="sm"
                onPress={() => setIsCreateOpen(true)}
                startContent={
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                }
              >
                新規作成
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツセクション */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* 検索バー */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardBody className="p-4">
              <div className="flex items-center gap-4">
                <Input
                  className="flex-1"
                  placeholder="パッケージ名で検索"
                  value={keyword}
                  onValueChange={setKeyword}
                  size="sm"
                  aria-label="パッケージ名で検索"
                  startContent={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-4 h-4 text-gray-500"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                  }
                />
              </div>
            </CardBody>
          </Card>

          {error && (
            <Alert variant="bordered" color="danger">
              <div className="font-bold mb-1">エラー</div>
              <p>パッケージ一覧の取得に失敗しました。</p>
            </Alert>
          )}

          {/* ローディング状態 */}
          {isLoading ? (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
              <CardBody className="text-center py-20">
                <div className="flex flex-col items-center gap-6 text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 border-4 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-700">
                      読み込み中...
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      サジェストパッケージ一覧を取得しています
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200 bg-gray-50">
              <CardBody className="text-center py-20">
                <div className="flex flex-col items-center gap-6 text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center shadow-lg">
                    <Package className="h-10 w-10 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-gray-700">
                      パッケージが作成されていません
                    </h3>
                    <p className="text-gray-500 max-w-md">
                      新規作成ボタンからパッケージを作成して、サジェスト機能を開始しましょう
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : (
            <>
              {/* 統計情報 */}
              <Card className="bg-blue-50 border-blue-200">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {filtered.length}
                        </div>
                        <div className="text-sm text-gray-600">
                          総パッケージ数
                        </div>
                      </div>
                      <div className="w-px h-8 bg-gray-300"></div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {
                            filtered.filter(
                              (p) =>
                                p.suggestBotList && p.suggestBotList.length > 0,
                            ).length
                          }
                        </div>
                        <div className="text-sm text-gray-600">ボット連携</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">最終更新</div>
                      <div className="text-sm font-medium text-gray-700">
                        {new Date().toLocaleDateString("ja-JP")}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* パッケージ一覧テーブル */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardBody className="p-0">
                  <Table
                    aria-label="サジェストパッケージ管理テーブル"
                    className="w-full"
                  >
                    <TableHeader>
                      <TableColumn>パッケージ名</TableColumn>
                      <TableColumn>説明</TableColumn>
                      <TableColumn>ボット連携</TableColumn>
                      <TableColumn>作成日</TableColumn>
                      <TableColumn>アクション</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => {
                        const isEditing =
                          inlineEdit?.suggestId === p.suggestId ? true : false;
                        const isEditingName =
                          inlineEdit?.field === "name" &&
                          inlineEdit?.suggestId === p.suggestId;
                        const isEditingDescription =
                          inlineEdit?.field === "description" &&
                          inlineEdit?.suggestId === p.suggestId;
                        return (
                          <TableRow
                            key={p.suggestId}
                            className={`transition-colors ${
                              isEditing
                                ? "cursor-default"
                                : "hover:bg-gray-50 cursor-pointer"
                            }`}
                            onClick={(e) => {
                              if (isEditing) return;
                              if (isInteractiveTarget(e.target)) return;
                              handleRowDoubleClick(p.suggestId);
                            }}
                          >
                            <TableCell
                              className={isEditing ? "" : "cursor-pointer"}
                            >
                              {isEditingName ? (
                                <div
                                  ref={(el) => {
                                    inlineEditorContainerRef.current = el;
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Input
                                    ref={nameInputRef}
                                    value={inlineEdit?.value ?? ""}
                                    onValueChange={(v) =>
                                      setInlineEdit((prev) =>
                                        prev &&
                                        prev.field === "name" &&
                                        prev.suggestId === p.suggestId
                                          ? { ...prev, value: v }
                                          : prev,
                                      )
                                    }
                                    onFocus={(e) => {
                                      // フォーカス時に全選択
                                      setTimeout(() => {
                                        e.target.select();
                                      }, 0);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitInlineEdit();
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelInlineEdit();
                                      }
                                    }}
                                    size="sm"
                                    className="flex-1"
                                    isDisabled={isUpdating}
                                  />
                                </div>
                              ) : (
                                <span className="font-semibold text-gray-900">
                                  {p.suggestName}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditingDescription ? (
                                <div
                                  ref={(el) => {
                                    inlineEditorContainerRef.current = el;
                                  }}
                                  className="flex items-center gap-2 max-w-xs"
                                >
                                  <Input
                                    ref={descriptionInputRef}
                                    value={inlineEdit?.value ?? ""}
                                    onValueChange={(v) =>
                                      setInlineEdit((prev) =>
                                        prev &&
                                        prev.field === "description" &&
                                        prev.suggestId === p.suggestId
                                          ? { ...prev, value: v }
                                          : prev,
                                      )
                                    }
                                    onFocus={(e) => {
                                      // フォーカス時に全選択
                                      setTimeout(() => {
                                        e.target.select();
                                      }, 0);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitInlineEdit();
                                      } else if (e.key === "Escape") {
                                        e.preventDefault();
                                        cancelInlineEdit();
                                      }
                                    }}
                                    size="sm"
                                    className="flex-1"
                                    isDisabled={isUpdating}
                                  />
                                </div>
                              ) : (
                                <div className="max-w-xs">
                                  {p.description ? (
                                    <span className="text-sm text-gray-600 line-clamp-2">
                                      {p.description}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400 italic">
                                      説明なし
                                    </span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isLoadingBots ? (
                                <div className="flex items-center gap-2 min-w-[200px]">
                                  <Spinner size="sm" color="primary" />
                                  <span className="text-sm text-gray-500">
                                    読み込み中...
                                  </span>
                                </div>
                              ) : (
                                <Select
                                  selectedKeys={(() => {
                                    // Selectが開いている場合は一時的な選択状態を表示
                                    if (openSelectId === p.suggestId) {
                                      const tempSelection =
                                        tempBotSelections.get(p.suggestId);
                                      if (tempSelection) {
                                        return new Set(
                                          tempSelection.map((id) => String(id)),
                                        );
                                      }
                                    }
                                    // それ以外は実際の選択状態を表示
                                    return p.suggestBotList
                                      ? new Set(
                                          p.suggestBotList.map((id) =>
                                            String(id),
                                          ),
                                        )
                                      : new Set();
                                  })()}
                                  onSelectionChange={(keys) => {
                                    // 一時的な選択状態を更新（まだ保存しない）
                                    const selectedIds = Array.from(keys).map(
                                      (k) => Number(k),
                                    );
                                    setTempBotSelections((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(p.suggestId, selectedIds);
                                      return newMap;
                                    });
                                  }}
                                  onOpenChange={(isOpen) => {
                                    if (isOpen) {
                                      // Selectが開かれたとき、現在の選択状態を一時状態にコピー
                                      setOpenSelectId(p.suggestId);
                                      setTempBotSelections((prev) => {
                                        const newMap = new Map(prev);
                                        newMap.set(
                                          p.suggestId,
                                          p.suggestBotList || [],
                                        );
                                        return newMap;
                                      });
                                    } else {
                                      // Selectが閉じられたとき、一時的な選択状態を保存
                                      const tempSelection =
                                        tempBotSelections.get(p.suggestId);
                                      if (tempSelection !== undefined) {
                                        // 元の選択状態と異なる場合のみ保存
                                        const currentList =
                                          p.suggestBotList || [];
                                        const hasChanged =
                                          tempSelection.length !==
                                            currentList.length ||
                                          !tempSelection.every((id) =>
                                            currentList.includes(id),
                                          ) ||
                                          !currentList.every((id) =>
                                            tempSelection.includes(id),
                                          );

                                        if (hasChanged) {
                                          updateBotList(
                                            p.suggestId,
                                            tempSelection,
                                          );
                                        }
                                        // 一時状態をクリア
                                        setTempBotSelections((prev) => {
                                          const newMap = new Map(prev);
                                          newMap.delete(p.suggestId);
                                          return newMap;
                                        });
                                      }
                                      setOpenSelectId(null);
                                    }
                                  }}
                                  selectionMode="multiple"
                                  placeholder={
                                    p.suggestBotList &&
                                    p.suggestBotList.length > 0
                                      ? `${p.suggestBotList.length}件`
                                      : "ボットを選択"
                                  }
                                  size="sm"
                                  isDisabled={isUpdating}
                                  className="min-w-[200px]"
                                  startContent={<Bot className="h-4 w-4" />}
                                  renderValue={(items) => {
                                    // 常に件数のみを表示（プルダウンが閉じている時の表示）
                                    const count = items.length;
                                    return (
                                      <span>
                                        {count > 0 ? `${count}件` : "未選択"}
                                      </span>
                                    );
                                  }}
                                >
                                  {botList.length === 0 ? (
                                    <SelectItem key="no-bots" isDisabled>
                                      利用可能なボットがありません
                                    </SelectItem>
                                  ) : (
                                    botList.map((bot) => {
                                      const isSelected = (() => {
                                        if (openSelectId === p.suggestId) {
                                          const tempSelection =
                                            tempBotSelections.get(p.suggestId);
                                          if (tempSelection) {
                                            return tempSelection.includes(
                                              bot.botId,
                                            );
                                          }
                                        }
                                        return (
                                          p.suggestBotList?.includes(
                                            bot.botId,
                                          ) ?? false
                                        );
                                      })();
                                      return (
                                        <SelectItem
                                          key={String(bot.botId)}
                                          textValue={bot.botName}
                                        >
                                          <div className="flex items-center gap-2">
                                            {isSelected && (
                                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                            )}
                                            <span>{bot.botName}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-gray-900">
                                  {new Date().toLocaleDateString("ja-JP")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Dropdown>
                                <DropdownTrigger>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    className="min-w-0 w-8 h-8"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                  aria-label="パッケージアクション"
                                  onAction={(key) => {
                                    if (key === "edit-name") {
                                      startEditingName(p);
                                    } else if (key === "edit-description") {
                                      startEditingDescription(p);
                                    } else if (key === "delete") {
                                      setConfirmTarget({
                                        id: p.suggestId,
                                        name: p.suggestName,
                                      });
                                    }
                                  }}
                                >
                                  <DropdownItem
                                    key="edit-name"
                                    startContent={<Edit className="h-4 w-4" />}
                                  >
                                    パッケージ名を編集
                                  </DropdownItem>
                                  <DropdownItem
                                    key="edit-description"
                                    startContent={
                                      <FileText className="h-4 w-4" />
                                    }
                                  >
                                    説明を編集
                                  </DropdownItem>
                                  <DropdownItem
                                    key="delete"
                                    className="text-danger"
                                    color="danger"
                                    startContent={
                                      <Trash2 className="h-4 w-4" />
                                    }
                                  >
                                    削除
                                  </DropdownItem>
                                </DropdownMenu>
                              </Dropdown>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* モーダル管理 */}
      {confirmTarget && (
        <Modal isOpen onClose={() => setConfirmTarget(null)}>
          <ModalContent>
            <ModalHeader>削除の確認</ModalHeader>
            <ModalBody>
              <p>「{confirmTarget.name}」を削除します。よろしいですか？</p>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={() => setConfirmTarget(null)}>
                キャンセル
              </Button>
              <Button
                color="danger"
                variant="solid"
                onPress={async () => {
                  const t = confirmTarget;
                  setConfirmTarget(null);
                  await onDeletePackage(t.id);
                }}
              >
                削除する
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {isCreateOpen && (
        <PackageDialog
          mode="create"
          groupId={groupId}
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmitted={async () => {
            setIsCreateOpen(false);
            await mutate();
          }}
        />
      )}

      {isEditOpen && editTarget && (
        <PackageDialog
          mode="edit"
          groupId={groupId}
          suggestId={editTarget.suggestId}
          defaultName={editTarget.suggestName}
          defaultDescription={editTarget.description ?? null}
          defaultBotIdList={editTarget.suggestBotList ?? []}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmitted={async () => {
            setIsEditOpen(false);
            setEditTarget(null);
            await mutate();
          }}
        />
      )}
    </div>
  );
}
