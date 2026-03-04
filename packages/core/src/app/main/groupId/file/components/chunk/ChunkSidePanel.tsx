"use client";

import React, { useState } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerContent,
} from "@heroui/react";
import { Button } from "@heroui/react";
import { Spinner } from "@heroui/react";
import { Badge } from "@heroui/react";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { Chip } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Tabs, Tab } from "@heroui/react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Input, Textarea } from "@heroui/react";
import ReactMarkdown from "react-markdown";
import {
  markdownStyles,
  markdownComponents,
  reactMarkdownPlugins,
} from "../../../../../../common/reactMarkdown";

// 新しいhooks構造の型を使用
import type { ChunkDataItemType } from "@repo/api-contracts/based_template/zschema";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

// ローカル型定義
type ChunkDataItem = ChunkDataItemType & {
  categoryNames: string[];
};
// import { useGroupContext } from "../../layout-client";

interface NewChunkData {
  chunkTitle: string;
  chunkContent: string;
  page: number | null;
  categoryIds: number[];
}

// 旧来のテキストハイライト関数はMarkdown表示への移行に伴い不要

interface ChunkSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  chunk: ChunkDataItem | null; // null なら新規作成
  categoryList: CategoryResponseSchemaType[];
  isCategoryLoading: boolean;
  onCreateChunk: (data: NewChunkData) => Promise<void>;
  onUpdateChunk: (
    updateData: Partial<ChunkDataItem> & { chunkId: number },
  ) => Promise<unknown>;
  onUpdateChunkCategories: (
    chunkId: number,
    categoryIds: number[],
  ) => Promise<void>;
  onCreateCategory: (categoryName: string) => Promise<void>;
  searchTerm?: string;
}

/**
 * useEffect を使わずに「初期化」するために、コンポーネント自体を
 * `key` プロパティで再マウントするアプローチを採用
 * つまり chunk が変われば別コンポーネント扱いとなり、State も再生成
 */
const ChunkSidePanel: React.FC<ChunkSidePanelProps> = ({
  isOpen,
  onClose,
  chunk,
  categoryList,
  isCategoryLoading,
  onCreateChunk,
  onUpdateChunk,
  onUpdateChunkCategories,
  onCreateCategory,
  searchTerm: _searchTerm = "",
}) => {
  // const groupId = useGroupContext();
  void _searchTerm;

  /**
   * 「新規作成モード」か「編集モード」かで初期値を分ける
   * → コンポーネント自体が再マウントされるため、ここは初回レンダー時だけ実行される
   */
  const initialPage = chunk?.page != null ? String(chunk.page) : "";
  const initialTitle = chunk?.chunkTitle ?? "";
  const initialContent = chunk?.chunkContent ?? "";

  // カテゴリ初期化のデバッグログ

  const initialCategories =
    chunk?.categoryNames && categoryList && categoryList.length > 0
      ? categoryList
          .filter((cat) => {
            const isMatch = chunk.categoryNames?.includes(cat.categoryName);
            console.log(
              `Category match check: ${cat.categoryName} -> ${isMatch}`,
            );
            return isMatch;
          })
          .map((cat) => {
            console.log(
              `Mapping category: ${cat.categoryName} -> ${cat.categoryId}`,
            );
            return cat.categoryId;
          })
      : [];

  console.log("Initial categories:", initialCategories);

  const [page, setPage] = useState(initialPage);
  const [chunkTitle, setChunkTitle] = useState(initialTitle);
  const [chunkContent, setChunkContent] = useState(initialContent);
  // JSON/faq 専用編集用の状態（互換性のためfaqもJSONとして扱う）
  const parsedInitialJson: Record<string, unknown> | null = (() => {
    if (!initialContent) return null;
    if (typeof initialContent === "object")
      return initialContent as Record<string, unknown>;
    if (typeof initialContent !== "string") return null;
    try {
      const normalized = initialContent.replace(/\bNaN\b/g, "null");
      const obj = JSON.parse(normalized);
      return obj && typeof obj === "object"
        ? (obj as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  })();

  // JSON表用
  const [jsonEditorData, setJsonEditorData] = useState<Record<string, string>>(
    () => {
      const source = parsedInitialJson ?? {};
      return Object.fromEntries(
        Object.entries(source).map(([k, v]) => [k, String(v ?? "")]),
      );
    },
  );
  const [selectedCategoryIds, setSelectedCategoryIds] =
    useState<number[]>(initialCategories);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // カテゴリ検索
  const [searchKeyword, setSearchKeyword] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // フィルタ済みカテゴリ
  const filteredCategories = categoryList
    ? categoryList.filter((cat) =>
        cat.categoryName.toLowerCase().includes(searchKeyword.toLowerCase()),
      )
    : [];

  // 保存（新規 or 更新）
  const buildSerializedContent = (): string | undefined => {
    const type = chunk?.chunkType;
    if (type === "JSON") {
      try {
        return JSON.stringify(jsonEditorData);
      } catch {
        return undefined;
      }
    }
    if (typeof chunkContent === "string") return chunkContent;
    try {
      return JSON.stringify(chunkContent ?? "");
    } catch {
      return undefined;
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const serializedContent = buildSerializedContent();
      if (chunk) {
        // 編集モード
        await onUpdateChunk({
          chunkId: chunk.chunkId,
          chunkTitle: chunkTitle || undefined,
          chunkContent: (serializedContent ?? chunkContent) || undefined,
          page: page ? Number(page) : undefined,
        });
        // カテゴリ更新
        await onUpdateChunkCategories(chunk.chunkId, selectedCategoryIds);
        showSuccessToast("チャンク更新");
        onClose();
      } else {
        // 新規作成モード
        await onCreateChunk({
          chunkTitle,
          chunkContent:
            serializedContent ??
            (typeof chunkContent === "string"
              ? chunkContent
              : JSON.stringify(chunkContent ?? "")),
          page: page ? Number(page) : null,
          categoryIds: selectedCategoryIds,
        });
        onClose();
      }
    } catch (err) {
      handleErrorWithUI(err, chunk ? "チャンク更新" : "チャンク作成");
    } finally {
      setIsSaving(false);
    }
  };

  // カテゴリ選択トグル
  const handleToggleCategory = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId],
    );
  };

  // 新規カテゴリ作成
  const handleCreateNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      await onCreateCategory(trimmed);
      showSuccessToast("カテゴリ作成");
      setNewCategoryName("");
    } catch (err) {
      handleErrorWithUI(err, "カテゴリ作成");
    }
  };

  // Drawer の JSX
  return (
    <Drawer
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      placement="right"
      backdrop="opaque"
      size="5xl"
    >
      <DrawerContent>
        <DrawerHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {chunk ? "データの詳細" : "データの新規作成"}
          </h2>
        </DrawerHeader>

        <Divider />

        <DrawerBody className="p-4">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as string)}
            className="mb-4"
          >
            {/* タブ1: コンテンツ編集 */}
            <Tab key="content" title="コンテンツ">
              <div className="space-y-4 mt-4">
                <Input
                  label="ページ番号"
                  value={page}
                  onChange={(e) => setPage(e.target.value)}
                  placeholder="例: 10"
                />
                {chunk?.chunkType !== "JSON" && (
                  <Input
                    label="データタイトル"
                    value={chunkTitle}
                    onChange={(e) => setChunkTitle(e.target.value)}
                    placeholder="タイトルを入力"
                  />
                )}

                {chunk?.chunkType === "JSON" ? (
                  <div className="space-y-3">
                    {Object.keys(jsonEditorData).length === 0 ? (
                      <p className="text-sm text-gray-500">
                        編集可能なフィールドがありません。
                      </p>
                    ) : (
                      Object.entries(jsonEditorData).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium mb-1">
                            {key}
                          </label>
                          {String(value).length > 120 ? (
                            <Textarea
                              value={value}
                              onChange={(e) =>
                                setJsonEditorData((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              minRows={3}
                              placeholder={`${key} を入力`}
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={(e) =>
                                setJsonEditorData((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder={`${key} を入力`}
                            />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <Textarea
                    label="本文"
                    value={chunkContent}
                    onChange={(e) => setChunkContent(e.target.value)}
                    rows={10}
                    placeholder="本文を入力"
                  />
                )}
              </div>
            </Tab>

            {/* タブ2: カテゴリ */}
            <Tab key="categories" title="カテゴリ">
              <div className="space-y-4 mt-4">
                <Card className="shadow-none border border-gray-200">
                  <CardHeader className="pb-0">
                    <h3 className="text-lg font-medium">カテゴリ管理</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      {/* 選択中カテゴリ */}
                      <div>
                        <p className="text-sm font-medium mb-2">
                          選択中のカテゴリ
                        </p>
                        {selectedCategoryIds.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">
                            カテゴリが選択されていません
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedCategoryIds.map((catId) => {
                              const catObj = categoryList?.find(
                                (c) => c.categoryId === catId,
                              );
                              if (!catObj) {
                                return (
                                  <Badge
                                    key={catId}
                                    color="warning"
                                    variant="flat"
                                  >
                                    不明ID: {catId}
                                  </Badge>
                                );
                              }
                              return (
                                <Chip
                                  key={catId}
                                  variant="flat"
                                  color="primary"
                                  onClose={() => handleToggleCategory(catId)}
                                >
                                  {catObj.categoryName}
                                </Chip>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Divider />

                      {/* カテゴリ検索 */}
                      <div>
                        <Input
                          label="カテゴリ検索"
                          placeholder="カテゴリ名で検索..."
                          value={searchKeyword}
                          onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                      </div>

                      {/* カテゴリ一覧 */}
                      <div>
                        <p className="text-sm font-medium mb-2">
                          利用可能なカテゴリ
                        </p>
                        {isCategoryLoading ? (
                          <div className="flex items-center justify-center p-4">
                            <Spinner size="sm" color="primary" />
                            <span className="ml-2 text-gray-600">
                              読み込み中...
                            </span>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {filteredCategories.length === 0 ? (
                              <p className="text-sm text-gray-500 italic p-2">
                                該当するカテゴリがありません
                              </p>
                            ) : (
                              filteredCategories.map((cat) => {
                                const isSelected = selectedCategoryIds.includes(
                                  cat.categoryId,
                                );
                                return (
                                  <div
                                    key={cat.categoryId}
                                    className={`flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer ${
                                      isSelected
                                        ? "bg-blue-50"
                                        : "hover:bg-gray-50"
                                    }`}
                                    onClick={() =>
                                      handleToggleCategory(cat.categoryId)
                                    }
                                  >
                                    <span className="text-sm">
                                      {cat.categoryName}
                                    </span>
                                    {isSelected && <Checkbox isSelected />}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      <Divider />

                      {/* 新規カテゴリ作成 */}
                      <div>
                        <Input
                          label="新規カテゴリ名"
                          placeholder="新しいカテゴリ名"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="mb-2"
                        />
                        <Button
                          color="primary"
                          isDisabled={!newCategoryName.trim()}
                          onPress={handleCreateNewCategory}
                        >
                          作成
                        </Button>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </Tab>

            {/* タブ3: プレビュー（JSON では非表示） */}
            {chunk?.chunkType !== "JSON" && (
              <Tab key="preview" title="プレビュー">
                <div className="mt-4 p-2 border rounded-md max-h-[60vh] overflow-auto">
                  {chunkContent ? (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <style>{markdownStyles}</style>
                      <div className="markdown-content">
                        <ReactMarkdown
                          remarkPlugins={reactMarkdownPlugins}
                          components={markdownComponents}
                        >
                          {chunkContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">内容がありません。</p>
                  )}
                </div>
              </Tab>
            )}
          </Tabs>
        </DrawerBody>

        <DrawerFooter className="flex justify-end">
          <Button
            color="default"
            variant="flat"
            onPress={onClose}
            className="mr-2"
            isDisabled={isSaving}
          >
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isDisabled={isSaving || (!chunk && (!chunkTitle || !chunkContent))}
            startContent={
              isSaving ? <Spinner size="sm" color="current" /> : null
            }
          >
            {chunk ? "保存" : "作成"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ChunkSidePanel;
