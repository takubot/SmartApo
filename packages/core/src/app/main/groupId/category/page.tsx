"use client";

import {
  Button,
  Card,
  Input,
  Spinner,
  Tooltip,
  useDisclosure,
  Pagination,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  create_category_v2_category_create_post,
  delete_category_v2_category_delete__category_id__delete,
  get_category_list_by_group_v2_category_list__group_id__get,
  merge_categories_v2_category_merge_post,
  update_category_v2_category_update__category_id__put,
} from "@repo/api-contracts/based_template/service";
import type {
  CategoryResponseSchemaType,
  CategoryListResponseSchemaType,
  CategoryCreateRequestSchemaType,
  CategoryUpdateRequestSchemaType,
  CategoryMergeRequestSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useParams } from "next/navigation";
import { useState } from "react";

import {
  ArrowPathRoundedSquareIcon,
  CheckCircleIcon,
  FunnelIcon,
  HashtagIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Tag } from "lucide-react";
import useSWR from "swr";
import { LoadingScreen } from "../../../../common/LoadingScreen";
import CategoryList from "./component/categoryList";
import CreateModal from "./component/modal/createModal";
import EditModal from "./component/modal/editModal";
import DeleteModal from "./component/modal/delteModal";
import MultiDeleteModal from "./component/modal/multiDeleteModal";
import MultiMergeModal from "./component/modal/multiMergeModal";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";

// SWR fetcher function
const fetcher = async (
  url: string,
): Promise<CategoryListResponseSchemaType> => {
  const groupId = url.split("/").pop();
  if (!groupId) throw new Error("Group ID is required");
  return await get_category_list_by_group_v2_category_list__group_id__get(
    groupId,
  );
};

// Custom hook for category list by group
function useCategoryListByGroup(groupId: string | undefined) {
  const { data, error, isLoading, mutate } =
    useSWR<CategoryListResponseSchemaType>(
      groupId ? `/list/category/${groupId}` : null,
      fetcher,
    );

  return {
    categoryList: data?.categoryList ?? [],
    totalCount: data?.totalCount ?? data?.categoryList?.length ?? 0,
    totalPages: data?.totalPages ?? 1,
    isLoading,
    isError: !!error,
    mutate,
  };
}

// Delete multiple categories helper function
async function deleteMultipleCategories(categoryIds: number[]) {
  const errors: string[] = [];
  const results: unknown[] = [];

  for (const categoryId of categoryIds) {
    try {
      const result =
        await delete_category_v2_category_delete__category_id__delete(
          categoryId.toString(),
        );
      results.push(result);
    } catch (error) {
      const apiError = handleErrorWithUI(
        error,
        `カテゴリー ${categoryId} 削除`,
      );
      errors.push(apiError.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return results;
}

export default function CategoryManagePage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const { categoryList, totalCount, isLoading, isError, mutate } =
    useCategoryListByGroup(groupId);

  const [editingCategory, setEditingCategory] =
    useState<CategoryResponseSchemaType | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 複数選択の状態管理
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(
    new Set(),
  );
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Loading states for better UX
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingMultiple, setIsDeletingMultiple] = useState(false);
  const [isMergingMultiple, setIsMergingMultiple] = useState(false);
  const [selectedTargetForMultiMerge, setSelectedTargetForMultiMerge] =
    useState<number | null>(null);

  // Modal controls
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isMultiDeleteOpen,
    onOpen: onMultiDeleteOpen,
    onClose: onMultiDeleteClose,
  } = useDisclosure();
  const {
    isOpen: isMultiMergeOpen,
    onOpen: onMultiMergeOpen,
    onClose: onMultiMergeClose,
  } = useDisclosure();
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryResponseSchemaType | null>(null);

  // メインの検索でフィルタリングされたカテゴリー
  const filteredCategories = (categoryList || []).filter(
    (cat: CategoryResponseSchemaType) => {
      if (!searchQuery.trim()) return true;
      return cat.categoryName
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    },
  );

  const isSearching = !!searchQuery.trim();
  const clientTotal = filteredCategories.length;
  const effectiveTotal = isSearching ? clientTotal : totalCount || clientTotal;
  const effectiveTotalPages = isSearching
    ? 1
    : Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const pagedCategories = isSearching
    ? filteredCategories
    : filteredCategories.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      );

  // 単体マージ用の検索は削除

  // 新しいカテゴリーを作成
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      handleErrorWithUI(
        { message: "カテゴリー名を入力してください" },
        "カテゴリー作成",
      );
      return;
    }

    setIsCreating(true);
    try {
      const payload: CategoryCreateRequestSchemaType = {
        categoryName: newCategoryName,
        groupId: groupId,
      };
      await create_category_v2_category_create_post(payload);
      showSuccessToast("カテゴリーを作成しました");
      setNewCategoryName("");
      onCreateClose();
      mutate();
    } catch (error) {
      handleErrorWithUI(error, "カテゴリー作成");
    } finally {
      setIsCreating(false);
    }
  };

  // カテゴリーを更新
  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.categoryName?.trim()) {
      handleErrorWithUI(
        { message: "カテゴリー名を入力してください" },
        "カテゴリー更新",
      );
      return;
    }

    setIsUpdating(true);
    try {
      await update_category_v2_category_update__category_id__put(
        editingCategory.categoryId.toString(),
        {
          categoryName: editingCategory.categoryName,
          groupId: groupId,
        } as CategoryUpdateRequestSchemaType,
      );
      showSuccessToast("カテゴリーを更新しました");
      setEditingCategory(null);
      onEditClose();
      mutate();
    } catch (error) {
      handleErrorWithUI(error, "カテゴリー更新");
    } finally {
      setIsUpdating(false);
    }
  };

  // カテゴリーを削除
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await delete_category_v2_category_delete__category_id__delete(
        categoryToDelete.categoryId.toString(),
      );
      showSuccessToast("カテゴリーを削除しました");
      setCategoryToDelete(null);
      onDeleteClose();
      mutate();
    } catch (error) {
      handleErrorWithUI(error, "カテゴリー削除");
    } finally {
      setIsDeleting(false);
    }
  };

  // 単体行のマージボタンは廃止。複数選択時の統合のみ提供。

  const openEditModal = (category: CategoryResponseSchemaType) => {
    setEditingCategory({ ...category });
    onEditOpen();
  };

  const openDeleteModal = (category: CategoryResponseSchemaType) => {
    setCategoryToDelete(category);
    onDeleteOpen();
  };

  // Note: target category name is now displayed by modal parent as needed

  // 検索をクリア
  const handleClearSearch = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // 複数選択のハンドラー関数
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedCategoryIds(new Set());
  };

  const handleCategorySelection = (categoryId: number, checked: boolean) => {
    const newSelection = new Set(selectedCategoryIds);
    if (checked) {
      newSelection.add(categoryId);
    } else {
      newSelection.delete(categoryId);
    }
    setSelectedCategoryIds(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(
        pagedCategories.map(
          (cat: CategoryResponseSchemaType) => cat.categoryId,
        ),
      );
      setSelectedCategoryIds(allIds);
    } else {
      setSelectedCategoryIds(new Set());
    }
  };

  // 複数統合: モーダルを開く
  const handleOpenMultiMergeModal = () => {
    if (selectedCategoryIds.size < 2) {
      handleErrorWithUI(
        { message: "統合するカテゴリーを2件以上選択してください" },
        "カテゴリー統合",
      );
      return;
    }
    setSelectedTargetForMultiMerge(null);
    onMultiMergeOpen();
  };

  // 複数統合: 実行
  const handleExecuteMultiMerge = async () => {
    if (!selectedTargetForMultiMerge) {
      handleErrorWithUI(
        { message: "残すカテゴリーを選択してください" },
        "カテゴリー統合",
      );
      return;
    }

    const allIds = Array.from(selectedCategoryIds);
    const sourceIds = allIds.filter((id) => id !== selectedTargetForMultiMerge);
    if (sourceIds.length === 0) {
      handleErrorWithUI(
        { message: "統合元のカテゴリーがありません" },
        "カテゴリー統合",
      );
      return;
    }

    setIsMergingMultiple(true);
    try {
      const payload: CategoryMergeRequestSchemaType = {
        sourceCategoryIds: sourceIds,
        targetCategoryId: selectedTargetForMultiMerge,
      };
      await merge_categories_v2_category_merge_post(payload);
      showSuccessToast(`${sourceIds.length}件のカテゴリーを統合しました`);
      setSelectedCategoryIds(new Set());
      onMultiMergeClose();
      mutate();
    } catch (error) {
      handleErrorWithUI(error, "カテゴリー統合");
    } finally {
      setIsMergingMultiple(false);
    }
  };

  const handleMultiDelete = async () => {
    if (selectedCategoryIds.size === 0) {
      handleErrorWithUI(
        { message: "削除するカテゴリーを選択してください" },
        "カテゴリー削除",
      );
      return;
    }

    setIsDeletingMultiple(true);
    try {
      await deleteMultipleCategories(Array.from(selectedCategoryIds));
      showSuccessToast(
        `${selectedCategoryIds.size}個のカテゴリーが削除されました`,
      );
      setSelectedCategoryIds(new Set());
      onMultiDeleteClose();
      mutate();
    } catch (error) {
      handleErrorWithUI(error, "カテゴリー削除");
    } finally {
      setIsDeletingMultiple(false);
    }
  };

  const getSelectedCategories = () => {
    return filteredCategories.filter((cat: CategoryResponseSchemaType) =>
      selectedCategoryIds.has(cat.categoryId),
    );
  };

  const selectedCount = selectedCategoryIds.size;

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <div className="w-full h-full p-6 bg-gray-100 min-h-screen flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Card className="p-6 bg-red-50 border border-red-200 shadow-lg">
            <div className="text-center">
              <div className="text-red-600 text-xl font-semibold mb-4">
                エラーが発生しました
              </div>
              <div className="text-red-700 mb-4">
                カテゴリーの読み込みに失敗しました
              </div>

              <div className="mt-6 space-y-3">
                <Button
                  color="primary"
                  onPress={() => mutate()}
                  className="gradient-primary hover:gradient-primary-hover shadow-md"
                >
                  再試行
                </Button>
                <div className="text-sm text-gray-500">
                  問題が解決しない場合は、バックエンドサーバーが起動しているか確認してください。
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                カテゴリー管理
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {/* 検索 */}
              <div className="flex items-center gap-2">
                <Tooltip content="検索">
                  <Button
                    isIconOnly
                    variant={searchQuery ? "solid" : "light"}
                    color="primary"
                    onPress={() => {}}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <MagnifyingGlassIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>
                <Input
                  type="text"
                  placeholder="カテゴリー名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                  variant="bordered"
                  isClearable
                  onClear={handleClearSearch}
                  size="sm"
                />
              </div>

              {/* アクションボタン */}
              <div className="flex items-center gap-2">
                {/* 複数選択モード */}
                <Tooltip
                  content={
                    isMultiSelectMode ? "選択モード解除" : "複数選択モード"
                  }
                >
                  <Button
                    isIconOnly
                    variant={isMultiSelectMode ? "solid" : "flat"}
                    color="primary"
                    onPress={toggleMultiSelectMode}
                    size="sm"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>

                {/* 複数削除 */}
                {isMultiSelectMode && (
                  <Tooltip content="選択したカテゴリーを統合">
                    <Button
                      isIconOnly
                      variant="solid"
                      color="warning"
                      onPress={handleOpenMultiMergeModal}
                      size="sm"
                      isDisabled={selectedCount < 2}
                    >
                      <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}

                {isMultiSelectMode && (
                  <Tooltip content="選択したカテゴリーを削除">
                    <Button
                      isIconOnly
                      variant="solid"
                      color="danger"
                      onPress={onMultiDeleteOpen}
                      size="sm"
                      isDisabled={selectedCount === 0}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}

                {/* 新規作成 */}
                <Tooltip content="新しいカテゴリーを作成">
                  <Button
                    isIconOnly
                    color="primary"
                    variant="solid"
                    size="sm"
                    onPress={onCreateOpen}
                    isDisabled={isCreating}
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        {/* 複数選択モード時のコントロール */}
        {isMultiSelectMode && (
          <Card className="mb-4 p-3 sm:p-4  border border-primary-200 shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <span className="text-primary-800 font-medium text-sm sm:text-base">
                  {selectedCategoryIds.size} 件選択中
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="solid"
                    color="primary"
                    onPress={() => handleSelectAll(true)}
                    className="gradient-primary hover:gradient-primary-hover shadow-sm"
                  >
                    すべて選択
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="default"
                    onPress={() => handleSelectAll(false)}
                  >
                    選択解除
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  color="danger"
                  onPress={onMultiDeleteOpen}
                  startContent={<TrashIcon className="h-4 w-4" />}
                  className="w-full sm:w-auto shadow-md"
                  isDisabled={selectedCount === 0}
                >
                  <span className="hidden sm:inline">選択した項目を削除</span>
                  <span className="sm:hidden">削除</span>
                </Button>
                <Button
                  size="sm"
                  color="warning"
                  variant="solid"
                  onPress={handleOpenMultiMergeModal}
                  startContent={
                    <ArrowPathRoundedSquareIcon className="h-4 w-4" />
                  }
                  className="w-full sm:w-auto shadow-md"
                  isDisabled={selectedCount < 2}
                >
                  <span className="hidden sm:inline">選択を統合</span>
                  <span className="sm:hidden">統合</span>
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* 統計情報 */}
        {!isMultiSelectMode && (
          <Card className="mb-4 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-2">
                  <HashtagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  <span className="text-gray-600 text-sm sm:text-base">
                    全 {effectiveTotal} 件
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                  <span className="text-gray-600 text-sm sm:text-base">
                    表示中 {pagedCategories.length} 件
                    {!isSearching && (
                      <>
                        {" "}
                        (
                        {Math.min(
                          (currentPage - 1) * pageSize + 1,
                          effectiveTotal,
                        )}
                        -{Math.min(currentPage * pageSize, effectiveTotal)} /{" "}
                        {effectiveTotal})
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* メイン表示領域 */}
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner size="lg" color="primary" label="読み込み中..." />
          </div>
        ) : pagedCategories.length > 0 ? (
          <Card className="overflow-hidden shadow-lg">
            <CategoryList
              categories={pagedCategories}
              isMultiSelectMode={isMultiSelectMode}
              selectedCategoryIds={selectedCategoryIds}
              onToggleSelect={handleCategorySelection}
              onOpenEdit={openEditModal}
              onOpenDelete={openDeleteModal}
            />
            {!isSearching && effectiveTotalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>
                    {effectiveTotal}件中{" "}
                    {Math.min((currentPage - 1) * pageSize + 1, effectiveTotal)}
                    -{Math.min(currentPage * pageSize, effectiveTotal)}件を表示
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    aria-label="page size"
                    selectedKeys={[String(pageSize)]}
                    size="sm"
                    className="w-28"
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPageSize(v);
                      setCurrentPage(1);
                    }}
                  >
                    {[10, 20, 50, 100].map((v) => (
                      <SelectItem key={String(v)}>{v} / ページ</SelectItem>
                    ))}
                  </Select>
                  <Pagination
                    total={effectiveTotalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                  />
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-6 sm:p-12 text-center shadow-lg">
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full gradient-primary-light p-4 sm:p-6 shadow-md">
                <HashtagIcon className="h-8 w-8 sm:h-12 sm:w-12 text-primary-600" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-900">
                {searchQuery
                  ? "検索結果が見つかりません"
                  : "カテゴリーがありません"}
              </h3>
              <p className="text-gray-500 max-w-md text-sm sm:text-base">
                {searchQuery
                  ? `「${searchQuery}」に一致するカテゴリーが見つかりませんでした。`
                  : "まだカテゴリーが登録されていません。新規作成ボタンから最初のカテゴリーを追加してください。"}
              </p>
              {searchQuery ? (
                <Button variant="light" onPress={handleClearSearch} size="sm">
                  検索をクリア
                </Button>
              ) : (
                <Button
                  color="primary"
                  onPress={onCreateOpen}
                  startContent={<PlusIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  size="sm"
                >
                  最初のカテゴリーを作成
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* 作成モーダル */}
        <CreateModal
          isOpen={isCreateOpen}
          isCreating={isCreating}
          name={newCategoryName}
          onClose={onCreateClose}
          onChangeName={setNewCategoryName}
          onSubmit={handleCreateCategory}
        />

        {/* 編集モーダル */}
        <EditModal
          isOpen={isEditOpen}
          isUpdating={isUpdating}
          category={editingCategory}
          onClose={onEditClose}
          onChangeName={(name) =>
            setEditingCategory((prev) =>
              prev ? { ...prev, categoryName: name } : prev,
            )
          }
          onSubmit={handleUpdateCategory}
        />

        {/* 削除確認モーダル */}
        <DeleteModal
          isOpen={isDeleteOpen}
          isDeleting={isDeleting}
          category={categoryToDelete}
          onClose={onDeleteClose}
          onConfirm={handleDeleteCategory}
        />

        {/* 複数削除確認モーダル */}
        <MultiDeleteModal
          isOpen={isMultiDeleteOpen}
          isDeleting={isDeletingMultiple}
          selectedCategories={getSelectedCategories()}
          onClose={onMultiDeleteClose}
          onConfirm={handleMultiDelete}
        />

        {/* マージモーダル */}
        <MultiMergeModal
          isOpen={isMultiMergeOpen}
          isMerging={isMergingMultiple}
          selectedCategories={getSelectedCategories()}
          selectedTargetId={selectedTargetForMultiMerge}
          onChangeTargetId={(id) => setSelectedTargetForMultiMerge(id)}
          onClose={onMultiMergeClose}
          onConfirm={handleExecuteMultiMerge}
        />
      </div>
    </div>
  );
}
