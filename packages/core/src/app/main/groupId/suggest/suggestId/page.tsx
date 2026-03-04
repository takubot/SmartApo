"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  list_items_v2_suggest_list_item__suggest_id__get,
  create_item_v2_suggest_create_item__suggest_id__post,
  update_item_v2_suggest_update_item__suggest_id___item_id__put,
  delete_item_v2_suggest_delete_item__suggest_id___item_id__delete,
  reorder_items_batch_v2_suggest_reorder_batch_item__suggest_id__patch,
  get_package_v2_suggest_get_package__suggest_id__get,
  generate_suggest_item_translations_v2_suggest_generate_translations_item__suggest_id__post,
} from "@repo/api-contracts/based_template/service";
import { list_bot_v2_bot_list__group_id__post } from "@repo/api-contracts/based_template/service";
import type {
  SuggestItemResponseSchemaType,
  SuggestItemUpsertSchemaType,
  BotListResponseSchemaType,
  SuggestPackageResponseSchemaType,
  SuggestItemTranslationsGenerateResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import useSWR from "swr";

/* ==== 共通 UI ==== */
import { LoadingScreen } from "@common/LoadingScreen";

/* ==== HeroUI ==== */
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import {
  Button,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Globe, Sparkles } from "lucide-react";

/* ==== Drag & Drop Components ==== */
import DragDropTree from "../components/dragDropTree";
import SuggestPreview from "../components/suggestPreview";
import ItemEditModal from "../components/itemEditModal";

type Item = SuggestItemResponseSchemaType;

/* ---- helper functions ---- */
async function fetchAllItems(suggestId: number): Promise<Item[]> {
  const data = await list_items_v2_suggest_list_item__suggest_id__get(
    String(suggestId),
  );
  return (data?.items ?? []) as SuggestItemResponseSchemaType[];
}

async function upsertItem(
  suggestId: number,
  payload: {
    displayLabel: string;
    onClickFixedAnswer: string;
    onClickBotPurpose?: string | null;
    onClickBotAnswerRules?: string | null;
    onClickBotPremiseData?: string | null;
    onClickBotSearchUrl?: string | null;
    onClickBotSearchInfoPrompt?: string | null;
    parentItemId?: number | null;
    orderIndex?: number;
    botIdList?: number[];
  },
): Promise<number> {
  const body: SuggestItemUpsertSchemaType = {
    parentItemId: payload.parentItemId ?? null,
    displayLabel: payload.displayLabel,
    orderIndex: payload.orderIndex ?? 0,
    onClickBotPurpose: payload.onClickBotPurpose ?? null,
    onClickBotAnswerRules: payload.onClickBotAnswerRules ?? null,
    onClickBotPremiseData: payload.onClickBotPremiseData ?? null,
    onClickBotSearchUrl: payload.onClickBotSearchUrl ?? null,
    onClickBotSearchInfoPrompt: payload.onClickBotSearchInfoPrompt ?? null,
    onClickFixedAnswer: payload.onClickFixedAnswer,
    botIdList: payload.botIdList,
  };
  const data = await create_item_v2_suggest_create_item__suggest_id__post(
    String(suggestId),
    body,
  );
  return (data?.itemId ?? 0) as number;
}

async function updateItem(
  suggestId: number,
  itemId: number,
  currentItem: Item,
  payload: {
    displayLabel?: string;
    onClickFixedAnswer?: string;
    onClickBotPurpose?: string | null;
    onClickBotAnswerRules?: string | null;
    onClickBotPremiseData?: string | null;
    onClickBotSearchUrl?: string | null;
    onClickBotSearchInfoPrompt?: string | null;
    parentItemId?: number | null;
    orderIndex?: number;
    botIdList?: number[];
  },
): Promise<void> {
  // safe accessors to reduce assertions
  const safeGetFixedAnswer = (it: Item): string =>
    (it as Item & { onClickFixedAnswer?: string | null }).onClickFixedAnswer ??
    "";
  const safeGetFieldValue = (it: Item, fieldName: string): string | null => {
    const record = it as unknown as Record<string, string | null | undefined>;
    return record[fieldName] ?? null;
  };
  const safeGetBotIdList = (it: Item): number[] | undefined =>
    (it as Item & { botIdList?: number[] }).botIdList;

  const body: SuggestItemUpsertSchemaType = {
    displayLabel: payload.displayLabel ?? currentItem.displayLabel,
    onClickFixedAnswer:
      payload.onClickFixedAnswer ?? safeGetFixedAnswer(currentItem),
    parentItemId:
      payload.parentItemId !== undefined
        ? payload.parentItemId
        : currentItem.parentItemId,
    orderIndex:
      payload.orderIndex !== undefined
        ? payload.orderIndex
        : currentItem.orderIndex,
    onClickBotPurpose:
      payload.onClickBotPurpose !== undefined
        ? payload.onClickBotPurpose
        : safeGetFieldValue(currentItem, "onClickBotPurpose"),
    onClickBotAnswerRules:
      payload.onClickBotAnswerRules !== undefined
        ? payload.onClickBotAnswerRules
        : safeGetFieldValue(currentItem, "onClickBotAnswerRules"),
    onClickBotPremiseData:
      payload.onClickBotPremiseData !== undefined
        ? payload.onClickBotPremiseData
        : safeGetFieldValue(currentItem, "onClickBotPremiseData"),
    onClickBotSearchUrl:
      payload.onClickBotSearchUrl !== undefined
        ? payload.onClickBotSearchUrl
        : safeGetFieldValue(currentItem, "onClickBotSearchUrl"),
    onClickBotSearchInfoPrompt:
      payload.onClickBotSearchInfoPrompt !== undefined
        ? payload.onClickBotSearchInfoPrompt
        : safeGetFieldValue(currentItem, "onClickBotSearchInfoPrompt"),
    botIdList:
      payload.botIdList !== undefined
        ? payload.botIdList
        : safeGetBotIdList(currentItem),
  };

  await update_item_v2_suggest_update_item__suggest_id___item_id__put(
    String(suggestId),
    String(itemId),
    body,
  );
}

async function deleteItem(suggestId: number, itemId: number): Promise<void> {
  await delete_item_v2_suggest_delete_item__suggest_id___item_id__delete(
    String(suggestId),
    String(itemId),
  );
}

export default function SuggestDetailPage() {
  const params = useParams<{ groupId: string; suggestId: string }>();
  const suggestId = useMemo(() => Number(params.suggestId), [params.suggestId]);
  const groupId = useMemo(() => String(params.groupId || ""), [params.groupId]);

  const [activeTreeItemId, setActiveTreeItemId] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [botOptions, setBotOptions] = useState<
    Array<{
      key: string;
      label: string;
      bot?: NonNullable<BotListResponseSchemaType["botList"]>[number];
    }>
  >([]);

  const {
    data: allItems = [],
    isLoading,
    error,
    mutate,
  } = useSWR(["suggest-items-all", suggestId], () => fetchAllItems(suggestId));

  // =========================
  // Multi Language generation
  // =========================
  const [isGeneratingTranslations, setIsGeneratingTranslations] =
    useState(false);
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [lastGenerateResult, setLastGenerateResult] =
    useState<SuggestItemTranslationsGenerateResponseSchemaType | null>(null);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [lastGenerateAt, setLastGenerateAt] = useState<string | null>(null);

  const storageKey = useMemo(
    () => `based-template:suggestTranslations:lastRun:${suggestId}`,
    [suggestId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        at?: string;
        result?: SuggestItemTranslationsGenerateResponseSchemaType;
      };
      if (parsed?.at) setLastGenerateAt(String(parsed.at));
      if (parsed?.result) setLastGenerateResult(parsed.result);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const persistLastRun = useCallback(
    (payload: {
      at: string;
      result: SuggestItemTranslationsGenerateResponseSchemaType;
    }) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [storageKey],
  );

  // サジェストパッケージ（ここに紐づくボットのみを候補に出す）
  const { data: suggestPackage, isLoading: isLoadingPackage } = useSWR(
    suggestId ? ["suggest-package", suggestId] : null,
    async () => {
      const data = await get_package_v2_suggest_get_package__suggest_id__get(
        String(suggestId),
      );
      return data as SuggestPackageResponseSchemaType;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const allowedBotIdSet = useMemo(() => {
    const list = suggestPackage?.suggestBotList ?? [];
    return new Set(Array.isArray(list) ? list.map(Number) : []);
  }, [suggestPackage?.suggestBotList]);

  const allowedBotIdKey = useMemo(() => {
    const list = suggestPackage?.suggestBotList ?? [];
    return Array.isArray(list) ? list.join(",") : "";
  }, [suggestPackage?.suggestBotList]);

  // ボット一覧
  const { isLoading: isLoadingBots } = useSWR(
    groupId ? ["bot-list", groupId, allowedBotIdKey] : null,
    async () => {
      const data = await list_bot_v2_bot_list__group_id__post(groupId, {
        includeIcon: false,
      });
      const botList = data?.botList ?? [];
      const optionsAll = Array.isArray(botList)
        ? botList.map((b) => ({
            key: String(b.botId),
            label: b.botName,
            bot: b,
          }))
        : [];
      const options = optionsAll.filter((o) =>
        allowedBotIdSet.has(Number(o.key)),
      );
      setBotOptions(options);
      return options;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const onUpdateItem = async (
    itemId: number,
    updates: {
      displayLabel?: string;
      onClickFixedAnswer?: string;
      onClickBotPurpose?: string | null;
      onClickBotAnswerRules?: string | null;
      onClickBotPremiseData?: string | null;
      onClickBotSearchUrl?: string | null;
      onClickBotSearchInfoPrompt?: string | null;
      parentItemId?: number | null;
      orderIndex?: number;
      botIdList?: number[];
    },
  ) => {
    try {
      const current = allItems.find((it) => it.itemId === itemId);
      if (!current) throw new Error("対象アイテムが見つかりません");
      await updateItem(suggestId, itemId, current, updates);
      await mutate();
      showSuccessToast("アイテム更新");
    } catch (error) {
      handleErrorWithUI(error, "アイテム更新");
    }
  };

  const onDeleteItem = async (
    itemId: number,
    options?: { deleteChildren?: boolean },
  ) => {
    try {
      const target = allItems.find((it) => it.itemId === itemId);
      if (!target) throw new Error("対象アイテムが見つかりません");

      const children = allItems.filter((it) => it.parentItemId === itemId);
      const deleteChildren = options?.deleteChildren ?? false;

      if (!deleteChildren && children.length > 0) {
        const payload = children.map((c, idx) => ({
          itemId: c.itemId,
          parentItemId: target.parentItemId ?? null,
          orderIndex: idx,
        }));
        await reorder_items_batch_v2_suggest_reorder_batch_item__suggest_id__patch(
          String(suggestId),
          { items: payload },
        );
      }

      await deleteItem(suggestId, itemId);
      await mutate();
      showSuccessToast("アイテム削除");
    } catch (error) {
      handleErrorWithUI(error, "アイテム削除");
    }
  };

  const onCreateItem = async (itemData: {
    displayLabel: string;
    onClickFixedAnswer: string;
    onClickBotPurpose?: string | null;
    onClickBotAnswerRules?: string | null;
    onClickBotPremiseData?: string | null;
    onClickBotSearchUrl?: string | null;
    onClickBotSearchInfoPrompt?: string | null;
    parentItemId?: number | null;
    orderIndex?: number;
    botIdList?: number[];
  }) => {
    try {
      await upsertItem(suggestId, {
        displayLabel: itemData.displayLabel,
        onClickFixedAnswer: itemData.onClickFixedAnswer,
        parentItemId: itemData.parentItemId ?? null, // 既定はルート
        onClickBotPurpose: itemData.onClickBotPurpose ?? null,
        onClickBotAnswerRules: itemData.onClickBotAnswerRules ?? null,
        onClickBotPremiseData: itemData.onClickBotPremiseData ?? null,
        onClickBotSearchUrl: itemData.onClickBotSearchUrl ?? null,
        onClickBotSearchInfoPrompt: itemData.onClickBotSearchInfoPrompt ?? null,
        orderIndex: itemData.orderIndex ?? 0,
        botIdList: itemData.botIdList,
      });
      await mutate();
    } catch {
      throw new Error("アイテムの作成に失敗しました");
    }
  };

  const onQuickCreate = async (payload: {
    parentItemId: number | null;
    displayLabel: string;
    onClickFixedAnswer: string;
  }) => {
    try {
      const siblings = allItems.filter(
        (it) => (it.parentItemId ?? null) === (payload.parentItemId ?? null),
      );
      const nextOrderIndex =
        siblings.length === 0
          ? 0
          : Math.max(...siblings.map((s) => s.orderIndex ?? 0)) + 1;

      // パッケージに紐づいている全ボットをデフォルトで紐づける
      const botIdList = suggestPackage?.suggestBotList ?? undefined;

      const newId = await upsertItem(suggestId, {
        displayLabel: payload.displayLabel,
        onClickFixedAnswer: payload.onClickFixedAnswer,
        parentItemId: payload.parentItemId ?? null,
        orderIndex: nextOrderIndex,
        botIdList,
      });

      await mutate();
      setActiveTreeItemId(newId);
      showSuccessToast("サジェストを追加しました");
    } catch (error) {
      handleErrorWithUI(error, "サジェスト追加");
    }
  };

  const onReorderItems = async (
    items: Array<{
      itemId: number;
      parentItemId: number | null;
      orderIndex: number;
    }>,
  ) => {
    try {
      await reorder_items_batch_v2_suggest_reorder_batch_item__suggest_id__patch(
        String(suggestId),
        { items },
      );
      await mutate();
    } catch (error) {
      handleErrorWithUI(error, "アイテム並び替え");
      throw error;
    }
  };

  // ボット更新APIは統合により不要

  if (isLoading)
    return <LoadingScreen message="サジェストデータを読み込んでいます..." />;
  if (error)
    return <div className="p-6 text-red-500">エラーが発生しました</div>;

  return (
    <div className="h-full w-full overflow-hidden flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ページタイトル */}
      <div className="flex-shrink-0 p-6 border-b bg-gradient-to-r from-white to-gray-50 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                サジェスト管理
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                階層構造でサジェストアイテムを管理・編集します
              </p>
            </div>
          </div>

          {/* 右上：多言語操作（ヘッダーを広げず、必要なときにだけ詳しいUIを出す） */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:flex flex-col items-end">
              <span
                className={`text-xs font-medium ${
                  lastGenerateAt ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {lastGenerateAt ? "翻訳: 生成済み" : "翻訳: 未生成"}
              </span>
              <span className="text-[11px] text-gray-500">
                {lastGenerateAt
                  ? `最終: ${new Date(lastGenerateAt).toLocaleString()}`
                  : "多言語で表示する場合は公開前に実行"}
              </span>
            </div>
            <Button
              size="sm"
              variant="flat"
              startContent={<Globe size={16} />}
              onPress={() => setIsTranslationModalOpen(true)}
            >
              多言語
            </Button>
          </div>
        </div>
      </div>

      {/* 左右分割レイアウト - 利用可能な高さを全て使用 */}
      <div className="flex-1 min-h-0 w-full flex gap-4 p-4">
        {/* 左側: ドラッグ&ドロップ管理 */}
        <div className="w-1/2 flex flex-col min-h-0 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
              階層構造エディター
            </h2>
          </div>
          <DragDropTree
            items={allItems}
            onDeleteItem={onDeleteItem}
            onReorderItems={onReorderItems}
            onEdit={(it: Item | null) => {
              setSelectedItem(it);
              if (it) setActiveTreeItemId(it.itemId);
              setIsEditModalOpen(true);
            }}
            selectedItemId={activeTreeItemId}
            onSelectItem={(it) => setActiveTreeItemId(it.itemId)}
            onQuickCreate={onQuickCreate}
          />
        </div>

        {/* 右側: チャットプレビュー */}
        <div className="w-1/2 flex flex-col min-h-0 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="mb-3 pb-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              プレビュー
            </h2>
          </div>
          <SuggestPreview
            items={allItems}
            selectedItemId={activeTreeItemId ?? undefined}
            onItemClick={() => {
              // プレビューではモーダルを開かない
            }}
          />
        </div>
      </div>

      {/* アイテム編集モーダル */}
      <ItemEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        botOptions={botOptions}
        loadingBots={isLoadingBots || isLoadingPackage}
        onUpdateItem={onUpdateItem}
        onCreateItem={onCreateItem}
      />

      {/* 多言語一括生成モーダル（説明 + 実行 + 結果） */}
      <Modal
        isOpen={isTranslationModalOpen}
        onOpenChange={setIsTranslationModalOpen}
        size="lg"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Sparkles size={18} />
                サジェストの多言語（ラベル/固定回答）一括生成
              </ModalHeader>
              <ModalBody>
                <div className="space-y-3">
                  <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
                    <p className="text-sm font-semibold text-gray-900">
                      いつ実行すべき？
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-gray-700 list-disc list-inside">
                      <li>
                        <span className="font-medium">
                          多言語表示（言語切替）でサジェストを使う場合
                        </span>
                        ：公開前に実行してください。
                      </li>
                      <li>
                        <span className="font-medium">
                          日本語だけで運用する場合
                        </span>
                        ：実行は不要です（日本語は常に表示できます）。
                      </li>
                    </ul>
                    <p className="mt-2 text-xs text-gray-500">
                      初回は翻訳APIを利用しますが、2回目以降は既に生成済みの言語を自動でスキップします。
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        生成対象
                      </p>
                      <p className="text-xs text-gray-600">
                        表示ラベル / 固定回答（この2つのみ）
                      </p>
                    </div>
                    <Switch
                      size="sm"
                      isSelected={forceRegenerate}
                      onValueChange={setForceRegenerate}
                    >
                      強制上書き
                    </Switch>
                  </div>

                  {lastGenerateResult ? (
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-sm font-semibold text-gray-900">
                        前回の結果
                      </p>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                          <p className="text-[11px] text-gray-500">対象</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lastGenerateResult.totalItems}件
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                          <p className="text-[11px] text-gray-500">更新</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lastGenerateResult.updatedItems}件
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                          <p className="text-[11px] text-gray-500">スキップ</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lastGenerateResult.skippedItems}件
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                          <p className="text-[11px] text-gray-500">
                            ラベル更新
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lastGenerateResult.updatedDisplayLabelItems}件
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                          <p className="text-[11px] text-gray-500">回答更新</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {lastGenerateResult.updatedFixedAnswerItems}件
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  閉じる
                </Button>
                <Button
                  color="primary"
                  isLoading={isGeneratingTranslations}
                  onPress={async () => {
                    if (isGeneratingTranslations) return;
                    setIsGeneratingTranslations(true);
                    try {
                      const res =
                        (await generate_suggest_item_translations_v2_suggest_generate_translations_item__suggest_id__post(
                          String(suggestId),
                          { force: forceRegenerate },
                        )) as SuggestItemTranslationsGenerateResponseSchemaType;
                      const at = new Date().toISOString();
                      setLastGenerateResult(res);
                      setLastGenerateAt(at);
                      persistLastRun({ at, result: res });
                      showSuccessToast("多言語生成が完了しました");
                    } catch (e) {
                      handleErrorWithUI(e, "多言語生成");
                    } finally {
                      setIsGeneratingTranslations(false);
                    }
                  }}
                >
                  翻訳を一括生成
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
