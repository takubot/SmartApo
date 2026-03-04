"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalFooter,
  Input,
  Spinner,
  Card,
  CardBody,
} from "@heroui/react";
import { Select, SelectItem } from "@heroui/select";
import type {
  SuggestItemResponseSchemaType,
  BotResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import {
  Target,
  FileText,
  Database,
  Globe,
  Search,
  Sparkles,
  MessageSquare,
  Bot,
} from "lucide-react";

type BotOption = {
  key: string;
  label: string;
  bot?: BotResponseSchemaType;
};

type PromptFieldProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  emptyText?: string;
  highlight?: boolean;
};

const PromptField = ({
  icon,
  label,
  value,
  emptyText = "未設定",
  highlight = false,
}: PromptFieldProps) => {
  const isEmpty = !value?.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center justify-center w-5 h-5 ${
            highlight ? "text-blue-600" : "text-gray-500"
          }`}
        >
          {icon}
        </div>
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {label}
        </p>
      </div>
      <div
        className={`rounded-lg border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap transition-all ${
          highlight
            ? "border-blue-300 bg-blue-50/50 shadow-sm"
            : "border-gray-200 bg-gray-50"
        } ${isEmpty ? "text-gray-400 italic" : "text-gray-800"}`}
      >
        {isEmpty ? emptyText : value}
      </div>
    </div>
  );
};

interface ItemEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SuggestItemResponseSchemaType | null;
  botOptions: BotOption[];
  onUpdateItem: (
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
  ) => Promise<void>;
  onCreateItem?: (itemData: {
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
  }) => Promise<void>;
  loadingBots?: boolean;
}

export default function ItemEditModal({
  isOpen,
  onClose,
  item,
  botOptions,
  onUpdateItem,
  onCreateItem,
  loadingBots = false,
}: ItemEditModalProps) {
  const [editedItem, setEditedItem] =
    useState<SuggestItemResponseSchemaType | null>(null);
  const [selectedBotIds, setSelectedBotIds] = useState<Set<string>>(new Set());
  const [previewBotId, setPreviewBotId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState("original");

  // =========================
  // Local utility functions
  // =========================
  const getFieldValue = (
    it: SuggestItemResponseSchemaType | null | undefined,
    fieldName: string,
  ): string => {
    if (!it) return "";
    const record = it as Record<string, unknown>;
    const value = record[fieldName];
    if (typeof value === "string") return value;
    if (value === null) return "";
    return "";
  };

  const getFixedAnswer = (
    it: SuggestItemResponseSchemaType | null | undefined,
  ): string => {
    if (!it) return "";
    return (
      (
        it as SuggestItemResponseSchemaType & {
          onClickFixedAnswer?: string | null;
        }
      ).onClickFixedAnswer ?? ""
    );
  };

  const getBotIdsFromItem = (
    it: SuggestItemResponseSchemaType | null | undefined,
  ): number[] => {
    if (!it) return [];
    const withLists = it as SuggestItemResponseSchemaType & {
      botIds?: number[] | null;
      botIdList?: number[] | null;
    };
    return withLists.botIdList ?? withLists.botIds ?? [];
  };

  const initializeFormState = useCallback(
    (base: SuggestItemResponseSchemaType | null) => {
      if (base) {
        setEditedItem({ ...base });
        const initialIds = getBotIdsFromItem(base).map((v) => String(v));
        setSelectedBotIds(new Set(initialIds));
        setPreviewBotId(initialIds[0] ? String(initialIds[0]) : null);
        return;
      }
      // new item
      setEditedItem({
        itemId: 0,
        suggestId: 0,
        displayLabel: "",
        hasChildren: false,
        parentItemId: null,
        orderIndex: 0,
        onClickBotPurpose: null,
        onClickBotAnswerRules: null,
        onClickBotPremiseData: null,
        onClickBotSearchUrl: null,
        onClickBotSearchInfoPrompt: null,
        onClickFixedAnswer: "",
        botIds: [],
      } as SuggestItemResponseSchemaType);
      setSelectedBotIds(new Set());
      setPreviewBotId(null);
    },
    [],
  );

  // モーダルを開く度に初期化
  useEffect(() => {
    if (!isOpen) return;
    initializeFormState(item);
    setActiveTab("original");
  }, [item, isOpen, initializeFormState]);

  // 選択ボットが変わったらプレビュー対象を自動選択
  useEffect(() => {
    if (selectedBotIds.size === 0) {
      setPreviewBotId(null);
      return;
    }
    if (previewBotId && selectedBotIds.has(previewBotId)) return;
    const first = Array.from(selectedBotIds)[0] ?? null;
    setPreviewBotId(first);
  }, [selectedBotIds, previewBotId]);

  const handleSave = async () => {
    if (!editedItem) return;
    const isDisplayLabelValid =
      (editedItem.displayLabel ?? "").trim().length > 0;
    const isFixedAnswerValid =
      (getFixedAnswer(editedItem) ?? "").trim().length > 0;
    const isFormValid = isDisplayLabelValid && isFixedAnswerValid;
    if (!isFormValid) {
      setHasTriedSubmit(true);
      return;
    }

    setIsLoading(true);
    try {
      const botIdList = Array.from(selectedBotIds).map(Number);
      if (item) {
        await onUpdateItem(editedItem.itemId, {
          displayLabel: editedItem.displayLabel,
          onClickFixedAnswer: getFixedAnswer(editedItem),
          onClickBotPurpose:
            getFieldValue(editedItem, "onClickBotPurpose") || null,
          onClickBotAnswerRules:
            getFieldValue(editedItem, "onClickBotAnswerRules") || null,
          onClickBotPremiseData:
            getFieldValue(editedItem, "onClickBotPremiseData") || null,
          onClickBotSearchUrl:
            getFieldValue(editedItem, "onClickBotSearchUrl") || null,
          onClickBotSearchInfoPrompt:
            getFieldValue(editedItem, "onClickBotSearchInfoPrompt") || null,
          parentItemId: editedItem.parentItemId ?? null,
          orderIndex: editedItem.orderIndex ?? 0,
          botIdList,
        });
      } else {
        if (onCreateItem) {
          await onCreateItem({
            displayLabel: editedItem.displayLabel,
            onClickFixedAnswer: getFixedAnswer(editedItem),
            onClickBotPurpose:
              getFieldValue(editedItem, "onClickBotPurpose") || null,
            onClickBotAnswerRules:
              getFieldValue(editedItem, "onClickBotAnswerRules") || null,
            onClickBotPremiseData:
              getFieldValue(editedItem, "onClickBotPremiseData") || null,
            onClickBotSearchUrl:
              getFieldValue(editedItem, "onClickBotSearchUrl") || null,
            onClickBotSearchInfoPrompt:
              getFieldValue(editedItem, "onClickBotSearchInfoPrompt") || null,
            parentItemId: editedItem.parentItemId ?? null,
            orderIndex: editedItem.orderIndex ?? 0,
            botIdList,
          });
        }
      }
      onClose();
    } catch {
      // エラーは親側で処理
    } finally {
      setIsLoading(false);
    }
  };

  const previewBot = useMemo(() => {
    return botOptions.find((b) => b.key === previewBotId)?.bot;
  }, [botOptions, previewBotId]);

  // 選択されたボットの中にWeb検索ボットが1つでもあるかをチェック
  const hasWebSearchBot = useMemo(() => {
    return Array.from(selectedBotIds).some((botId) => {
      const bot = botOptions.find((b) => b.key === botId)?.bot;
      return bot?.isWebSearchBot === true;
    });
  }, [selectedBotIds, botOptions]);

  const appendText = (base?: string | null, extra?: string | null) => {
    const b = (base || "").trim();
    const e = (extra || "").trim();
    if (b && e) return `${b}\n\n--- サジェストで追加 ---\n${e}`;
    if (e) return e;
    return b || "";
  };

  const additionalPrompts = useMemo(() => {
    return {
      purpose: getFieldValue(editedItem, "onClickBotPurpose"),
      rules: getFieldValue(editedItem, "onClickBotAnswerRules"),
      premise: getFieldValue(editedItem, "onClickBotPremiseData"),
      searchUrl: getFieldValue(editedItem, "onClickBotSearchUrl"),
      searchPrompt: getFieldValue(editedItem, "onClickBotSearchInfoPrompt"),
    };
  }, [editedItem]);

  const mergedPreview = useMemo(() => {
    if (!previewBot) return null;
    const o = additionalPrompts;
    return {
      purpose: appendText(previewBot.botPurpose, o.purpose),
      rules: appendText(previewBot.botAnswerRules, o.rules),
      premise: appendText(previewBot.botPremiseData, o.premise),
      searchUrl: appendText(previewBot.botSearchUrl, o.searchUrl),
      searchPrompt: appendText(previewBot.botSearchInfoPrompt, o.searchPrompt),
      name: previewBot.botName,
    };
  }, [previewBot, additionalPrompts]);

  if (!editedItem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      scrollBehavior="outside"
      classNames={{
        base: "max-h-[95vh] max-w-[95vw]",
        wrapper: "overflow-hidden",
      }}
    >
      <ModalContent className="h-[90vh]">
        <ModalHeader className="flex flex-col gap-1 border-b pb-4 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {item ? "サジェスト詳細編集" : "新規サジェスト作成"}
              </h3>
              <p className="text-xs text-gray-600 font-normal mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-white rounded-full border-2 border-blue-600"></span>
                  <span className="font-semibold">左側</span>:
                  編集エリア（設定を変更できます）
                </span>
                <span className="mx-3 text-gray-400">|</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="font-semibold">右側</span>:
                  プレビューエリア（統合結果を確認できます）
                </span>
              </p>
            </div>
          </div>
        </ModalHeader>

        {/* 左右2カラムレイアウト */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden min-h-0">
          {/* 左側: 編集エリア */}
          <div className="w-1/2 flex flex-col min-h-0 bg-white rounded-xl border-2 border-gray-300 shadow-lg p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200">
              <div className="w-8 h-8 rounded-lg bg-white border-2 border-blue-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900">
                  ✏️ 編集エリア
                </h4>
                <p className="text-xs text-gray-500">設定を変更できます</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5">
              {/* 基本情報セクション */}
              <section className="space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  基本情報
                </h5>

                <Input
                  label="表示ラベル"
                  placeholder="サジェストボタンに表示されるテキスト"
                  value={editedItem.displayLabel}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      displayLabel: value,
                    } as SuggestItemResponseSchemaType)
                  }
                  isRequired
                  isInvalid={
                    hasTriedSubmit &&
                    !(editedItem.displayLabel ?? "").trim().length
                  }
                  errorMessage={
                    hasTriedSubmit &&
                    !(editedItem.displayLabel ?? "").trim().length
                      ? "必須項目です"
                      : undefined
                  }
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                />

                {loadingBots ? (
                  <Card className="bg-blue-50 border border-blue-200">
                    <CardBody className="py-3">
                      <div className="flex items-center gap-2">
                        <Spinner size="sm" color="primary" />
                        <p className="text-xs font-medium text-gray-700">
                          ボット一覧を取得中...
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    <Select
                      label={
                        <div className="flex items-center gap-2">
                          <span>許可ボット</span>
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                            複数選択可能
                          </span>
                        </div>
                      }
                      placeholder="このサジェストで使用できるボットを選択"
                      selectionMode="multiple"
                      selectedKeys={selectedBotIds}
                      onSelectionChange={(keys) =>
                        setSelectedBotIds(new Set(Array.from(keys).map(String)))
                      }
                      items={botOptions}
                      classNames={{
                        label: "font-semibold text-xs",
                      }}
                      description="このサジェスト選択時に、ユーザーが利用できるボットを選択してください"
                      size="sm"
                    >
                      {(o) => (
                        <SelectItem key={o.key} textValue={o.label}>
                          <div className="flex items-center gap-2">
                            <img
                              src={
                                o.bot?.botIconImgGcsPath ||
                                "/botIcon/default.ico"
                              }
                              alt={o.label}
                              className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/botIcon/default.ico";
                              }}
                            />
                            <span className="text-sm">{o.label}</span>
                          </div>
                        </SelectItem>
                      )}
                    </Select>
                    {selectedBotIds.size > 0 && (
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        ✓ {selectedBotIds.size}個のボットを選択中
                      </p>
                    )}
                  </div>
                )}
              </section>

              {/* プロンプト追記設定 */}
              <section className="space-y-4 p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-600 mt-1" />
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-gray-800">
                      プロンプト追記設定（オプション）
                    </h5>
                    <p className="text-xs text-amber-700 mt-1">
                      💡 ボットの元プロンプトに
                      <span className="font-bold">追記</span>
                      される内容を編集（上書きではありません）
                    </p>
                  </div>
                </div>

                <Textarea
                  label="ボットの目的に追記"
                  placeholder="例: このサジェストでは、初心者向けに分かりやすく説明する"
                  value={getFieldValue(editedItem, "onClickBotPurpose")}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickBotPurpose: value || null,
                    } as SuggestItemResponseSchemaType)
                  }
                  minRows={2}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                />

                <Textarea
                  label="ボットの回答ルールに追記"
                  placeholder="例: 簡潔に3行以内で回答する"
                  value={getFieldValue(editedItem, "onClickBotAnswerRules")}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickBotAnswerRules: value || null,
                    } as SuggestItemResponseSchemaType)
                  }
                  minRows={2}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                />

                <Textarea
                  label="ボットの前提データに追記"
                  placeholder="例: ユーザーは既に基本的な知識を持っている前提"
                  value={getFieldValue(editedItem, "onClickBotPremiseData")}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickBotPremiseData: value || null,
                    } as SuggestItemResponseSchemaType)
                  }
                  minRows={2}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                />

                <Textarea
                  label="検索対象URLに追記"
                  placeholder="例: https://example.com (改行区切りで複数可)"
                  value={getFieldValue(editedItem, "onClickBotSearchUrl")}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickBotSearchUrl: value || null,
                    } as SuggestItemResponseSchemaType)
                  }
                  isDisabled={!hasWebSearchBot}
                  minRows={2}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                  description={
                    !hasWebSearchBot
                      ? "Web検索ボットが選択されていないため、この項目は編集できません"
                      : undefined
                  }
                />

                <Textarea
                  label="検索情報取得プロンプトに追記"
                  placeholder="例: URLから料金情報と営業時間を抽出"
                  value={getFieldValue(
                    editedItem,
                    "onClickBotSearchInfoPrompt",
                  )}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickBotSearchInfoPrompt: value || null,
                    } as SuggestItemResponseSchemaType)
                  }
                  isDisabled={!hasWebSearchBot}
                  minRows={2}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                  description={
                    !hasWebSearchBot
                      ? "Web検索ボットが選択されていないため、この項目は編集できません"
                      : undefined
                  }
                />
              </section>

              {/* 固定回答 */}
              <section className="space-y-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h5 className="text-sm font-bold text-gray-800">
                    固定回答（必須）
                  </h5>
                </div>
                <Textarea
                  label="固定回答テキスト"
                  placeholder="サジェスト選択時にユーザーに表示される固定メッセージ"
                  value={getFixedAnswer(editedItem)}
                  onValueChange={(value) =>
                    setEditedItem({
                      ...editedItem,
                      onClickFixedAnswer: value,
                    } as SuggestItemResponseSchemaType)
                  }
                  isRequired
                  isInvalid={
                    hasTriedSubmit &&
                    !(getFixedAnswer(editedItem) ?? "").trim().length
                  }
                  errorMessage={
                    hasTriedSubmit &&
                    !(getFixedAnswer(editedItem) ?? "").trim().length
                      ? "必須項目です"
                      : undefined
                  }
                  minRows={3}
                  classNames={{
                    label: "font-semibold text-xs",
                  }}
                  size="sm"
                />
              </section>
            </div>
          </div>

          {/* 右側: プレビューエリア */}
          <div className="w-1/2 flex flex-col min-h-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-blue-300 shadow-xl p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-blue-300">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-900">
                  👁️ プレビューエリア
                </h4>
                <p className="text-xs text-gray-600">
                  統合後の最終結果を確認できます（読み取り専用）
                </p>
              </div>
            </div>

            {/* プレビュー対象ボット選択（右側に移動） */}
            <div className="mb-4">
              <Select
                label="プレビュー対象ボット"
                placeholder="プレビューに表示するボットを選択"
                selectedKeys={previewBotId ? [previewBotId] : []}
                onSelectionChange={(keys) => {
                  const first = Array.from(keys)[0] as string | undefined;
                  setPreviewBotId(first ?? null);
                }}
                items={botOptions.filter((o) => selectedBotIds.has(o.key))}
                selectionMode="single"
                size="sm"
                isDisabled={selectedBotIds.size === 0}
                classNames={{
                  label: "font-semibold text-xs",
                }}
                description="左側で選択した許可ボットの中から、プレビューするボットを1つ選択してください"
              >
                {(o) => (
                  <SelectItem key={o.key} textValue={o.label}>
                    <div className="flex items-center gap-2">
                      <img
                        src={o.bot?.botIconImgGcsPath || "/botIcon/default.ico"}
                        alt={o.label}
                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/botIcon/default.ico";
                        }}
                      />
                      <span className="text-sm">{o.label}</span>
                    </div>
                  </SelectItem>
                )}
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {!previewBot ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-white/50 rounded-lg border-2 border-dashed border-blue-300 p-8">
                  <Bot className="w-20 h-20 mb-4 opacity-20" />
                  <p className="text-sm font-medium text-gray-700">
                    {selectedBotIds.size === 0
                      ? "まず左側で許可ボットを選択してください"
                      : "上のプレビュー対象ボットを選択してください"}
                  </p>
                  <p className="text-xs mt-2 text-gray-500">
                    {selectedBotIds.size === 0
                      ? "許可ボットを選択すると、ここにプレビューが表示されます"
                      : "選択すると、統合後のプロンプトがここに表示されます"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* ボット名 */}
                  <div className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          previewBot.botIconImgGcsPath || "/botIcon/default.ico"
                        }
                        alt={previewBot.botName}
                        className="w-10 h-10 rounded-full object-cover border border-blue-200 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/botIcon/default.ico";
                        }}
                      />
                      <div>
                        <p className="text-xs text-gray-500">プレビュー対象</p>
                        <p className="text-sm font-bold text-gray-900">
                          {previewBot.botName}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 統合プロンプトプレビュー */}
                  <div className="space-y-3">
                    <PromptField
                      icon={<Target className="w-full h-full" />}
                      label="目的"
                      value={mergedPreview?.purpose || ""}
                      highlight
                    />
                    <PromptField
                      icon={<FileText className="w-full h-full" />}
                      label="回答ルール"
                      value={mergedPreview?.rules || ""}
                      highlight
                    />
                    <PromptField
                      icon={<Database className="w-full h-full" />}
                      label="前提データ"
                      value={mergedPreview?.premise || ""}
                      highlight
                    />
                    {hasWebSearchBot && (
                      <>
                        <PromptField
                          icon={<Globe className="w-full h-full" />}
                          label="検索対象URL"
                          value={mergedPreview?.searchUrl || ""}
                          highlight
                        />
                        <PromptField
                          icon={<Search className="w-full h-full" />}
                          label="検索情報取得プロンプト"
                          value={mergedPreview?.searchPrompt || ""}
                          highlight
                        />
                      </>
                    )}
                  </div>

                  {/* 説明 */}
                  <div className="bg-blue-100 rounded-lg p-3 mt-4">
                    <p className="text-xs text-blue-800 leading-relaxed">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      このプレビューは、ボットの元プロンプトと左側で編集した追加プロンプトを
                      <span className="font-bold">統合した最終結果</span>
                      です。実際にボットが使用するプロンプトがこの内容になります。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <ModalFooter className="border-t pt-4 flex-shrink-0">
          <div className="flex gap-3 w-full justify-end">
            <Button variant="flat" onPress={onClose} isDisabled={isLoading}>
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handleSave}
              isLoading={isLoading}
              isDisabled={
                isLoading ||
                !(editedItem.displayLabel ?? "").trim().length ||
                !(getFixedAnswer(editedItem) ?? "").trim().length
              }
              className="px-8 font-semibold"
              startContent={!isLoading && <Sparkles className="w-4 h-4" />}
            >
              {item ? "保存する" : "作成する"}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
