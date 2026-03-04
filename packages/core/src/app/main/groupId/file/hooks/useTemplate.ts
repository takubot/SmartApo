import {
  bulk_add_file_categories_v2_chunk_data_bulk_add_file_categories_post,
  bulk_remove_file_categories_v2_chunk_data_bulk_remove_file_categories_post,
  bulk_update_file_categories_v2_chunk_data_bulk_update_file_categories_post,
  create_chunk_v2_chunk_data_create_post,
  delete_chunk_v2_chunk_data_delete__chunk_id__post,
  // file
  delete_files_v2_file_delete__file_id__delete,
  get_category_list_by_group_v2_category_list__group_id__get,
  // chunk
  list_chunk_v2_chunk_data_list_post,
  list_files_v2_file_list__group_id__post,
  redefine_categories_v2_category_redefine_categories__file_id__post,
  update_chunk_categories_v2_chunk_data_update__chunk_id__categories_post,
  update_chunk_v2_chunk_data_update_post,
  update_file_link_display_v2_file_update_file_link_display_post,
} from "@repo/api-contracts/based_template/service";
import type {
  BulkAddFileCategoriesSchemaType,
  BulkRemoveFileCategoriesSchemaType,
  BulkUpdateFileCategoriesSchemaType,
  CategoryListResponseSchemaType,
  ChunkDataItemType,
  // chunk
  CreateChunkSchemaType,
  FileListItemType,
  GetChunkDataResponseType,
  ListFilesResponseType,
  UpdateChunkCategoriesSchemaType,
  UpdateChunkSchemaType,
  // file
  UpdateFileLinkDisplayRequestType,
} from "@repo/api-contracts/based_template/zschema";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import {
  handleErrorWithUI,
  showLoadingToast,
  showSuccessToast,
} from "@common/errorHandler";

type Debounced<T> = T;
function useDebounce<T>(value: T, delay: number): Debounced<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Pagination
function usePagination(options?: { initialPage?: number; pageSize?: number }) {
  const { initialPage = 0, pageSize = 20 } = options || {};
  const [currentPage, setCurrentPage] = useState(initialPage);
  const goToPage = useCallback((page: number) => setCurrentPage(page), []);
  const nextPage = useCallback(() => setCurrentPage((p) => p + 1), []);
  const prevPage = useCallback(
    () => setCurrentPage((p) => Math.max(0, p - 1)),
    [],
  );
  const resetPage = useCallback(() => setCurrentPage(0), []);
  const getOffset = useCallback(
    () => currentPage * pageSize,
    [currentPage, pageSize],
  );
  const getTotalPages = useCallback(
    (total: number) => Math.ceil(total / pageSize),
    [pageSize],
  );
  return {
    currentPage,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    getOffset,
    getTotalPages,
  };
}

function useMultiplePagination(options?: {
  filePageSize?: number;
  chunkPageSize?: number;
}) {
  const { filePageSize = 20, chunkPageSize = 50 } = options || {};
  const file = usePagination({ pageSize: filePageSize });
  const chunk = usePagination({ pageSize: chunkPageSize });
  return { file, chunk };
}

// UI State
type DisplayMode = "files";
type ViewMode = "card" | "list";
type SortOption = "newest" | "oldest" | "nameAsc" | "nameDesc" | "extensionAsc";
type ChunkSortOption = "chunk_id_asc" | "chunk_id_desc";
type UIState = {
  displayMode: DisplayMode;
  viewMode: ViewMode;
  searchTerm: string;
  includeChunkSearch: boolean;
  selectedCategoryIds: number[];
  sortOption: SortOption;
  chunkSortOption: ChunkSortOption;
  tableSortOption: string;
  showAdvancedFilters: boolean;
  selectedFileIds: number[];
  selectedChunkIds: number[];
  isFileSelectionMode: boolean;
  isChunkSelectionMode: boolean;
  isFileUploadModalOpen: boolean;
  isConfirmModalOpen: boolean;
  isSidePanelOpen: boolean;
  isBulkCategoryModalOpen: boolean;
  selectedFile: any | null;
  selectedChunk: any | null;
  confirmModalConfig: any | null;
};

export function useTemplate(groupId: string) {
  // UI state
  const [ui, setUi] = useState<UIState>({
    displayMode: "files",
    viewMode: "card",
    searchTerm: "",
    includeChunkSearch: false,
    selectedCategoryIds: [],
    sortOption: "newest",
    chunkSortOption: "chunk_id_asc",
    tableSortOption: "row_number_asc",
    showAdvancedFilters: false,
    selectedFileIds: [],
    selectedChunkIds: [],
    isFileSelectionMode: false,
    isChunkSelectionMode: false,
    isFileUploadModalOpen: false,
    isConfirmModalOpen: false,
    isSidePanelOpen: false,
    isBulkCategoryModalOpen: false,
    selectedFile: null,
    selectedChunk: null,
    confirmModalConfig: null,
  });
  const updateState = useCallback(
    (updates: Partial<UIState>) => setUi((p) => ({ ...p, ...updates })),
    [],
  );

  const setDisplayMode = useCallback(
    (mode: DisplayMode) =>
      updateState({
        displayMode: mode,
        searchTerm: "",
        selectedCategoryIds: [],
        showAdvancedFilters: false,
      }),
    [updateState],
  );
  const setViewMode = useCallback(
    (mode: ViewMode) => updateState({ viewMode: mode }),
    [updateState],
  );
  const setSearchTerm = useCallback(
    (term: string) => updateState({ searchTerm: term }),
    [updateState],
  );
  const clearSearch = useCallback(
    () => updateState({ searchTerm: "" }),
    [updateState],
  );
  const setIncludeChunkSearch = useCallback(
    (include: boolean) => updateState({ includeChunkSearch: include }),
    [updateState],
  );
  const setCategoryFilter = useCallback(
    (categoryIds: number[]) =>
      updateState({ selectedCategoryIds: categoryIds }),
    [updateState],
  );
  const clearCategoryFilter = useCallback(
    () => updateState({ selectedCategoryIds: [] }),
    [updateState],
  );
  const removeCategory = useCallback(
    (categoryId: number) =>
      setUi((prev) => ({
        ...prev,
        selectedCategoryIds: prev.selectedCategoryIds.filter(
          (id) => id !== categoryId,
        ),
      })),
    [],
  );
  const clearAllFilters = useCallback(
    () => updateState({ searchTerm: "", selectedCategoryIds: [] }),
    [updateState],
  );
  const setSortOption = useCallback(
    (sort: SortOption) => updateState({ sortOption: sort }),
    [updateState],
  );
  const setChunkSortOption = useCallback(
    (sort: ChunkSortOption) => updateState({ chunkSortOption: sort }),
    [updateState],
  );
  const setTableSortOption = useCallback(
    (sort: string) => updateState({ tableSortOption: sort }),
    [updateState],
  );
  const toggleAdvancedFilters = useCallback(
    () => setUi((p) => ({ ...p, showAdvancedFilters: !p.showAdvancedFilters })),
    [],
  );
  const setSelectedFile = useCallback(
    (file: any) => updateState({ selectedFile: file }),
    [updateState],
  );
  const clearSelectedFile = useCallback(
    () =>
      updateState({
        selectedFile: null,
        isChunkSelectionMode: false,
        selectedChunkIds: [],
      }),
    [updateState],
  );
  const setSelectedChunk = useCallback(
    (chunk: any) => updateState({ selectedChunk: chunk }),
    [updateState],
  );
  const toggleFileSelection = useCallback(
    (fileId: number) =>
      setUi((p) => ({
        ...p,
        selectedFileIds: p.selectedFileIds.includes(fileId)
          ? p.selectedFileIds.filter((id) => id !== fileId)
          : [...p.selectedFileIds, fileId],
      })),
    [],
  );
  const clearFileSelection = useCallback(
    () => updateState({ selectedFileIds: [], isFileSelectionMode: false }),
    [updateState],
  );
  const selectAllFiles = useCallback(
    (fileList: FileListItemType[]) => {
      const allFileIds = fileList.map((f) => f.fileId);
      updateState({ selectedFileIds: allFileIds });
    },
    [updateState],
  );
  const toggleChunkSelection = useCallback(
    (chunkId: number) =>
      setUi((p) => ({
        ...p,
        selectedChunkIds: p.selectedChunkIds.includes(chunkId)
          ? p.selectedChunkIds.filter((id) => id !== chunkId)
          : [...p.selectedChunkIds, chunkId],
      })),
    [],
  );
  const clearChunkSelection = useCallback(
    () => updateState({ selectedChunkIds: [], isChunkSelectionMode: false }),
    [updateState],
  );
  const toggleFileSelectionMode = useCallback(
    () =>
      setUi((p) => ({
        ...p,
        isFileSelectionMode: !p.isFileSelectionMode,
        selectedFileIds: !p.isFileSelectionMode ? [] : p.selectedFileIds,
      })),
    [],
  );
  const toggleChunkSelectionMode = useCallback(
    () =>
      setUi((p) => ({
        ...p,
        isChunkSelectionMode: !p.isChunkSelectionMode,
        selectedChunkIds: !p.isChunkSelectionMode ? [] : p.selectedChunkIds,
      })),
    [],
  );
  const openFileUploadModal = useCallback(
    () => updateState({ isFileUploadModalOpen: true }),
    [updateState],
  );
  const closeFileUploadModal = useCallback(
    () => updateState({ isFileUploadModalOpen: false }),
    [updateState],
  );
  const openSidePanel = useCallback(
    (chunk?: any) =>
      updateState({ isSidePanelOpen: true, selectedChunk: chunk || null }),
    [updateState],
  );
  const closeSidePanel = useCallback(
    () => updateState({ isSidePanelOpen: false, selectedChunk: null }),
    [updateState],
  );
  const openBulkCategoryModal = useCallback(
    () => updateState({ isBulkCategoryModalOpen: true }),
    [updateState],
  );
  const closeBulkCategoryModal = useCallback(
    () => updateState({ isBulkCategoryModalOpen: false }),
    [updateState],
  );
  const openConfirmModal = useCallback(
    (config: any) =>
      updateState({ isConfirmModalOpen: true, confirmModalConfig: config }),
    [updateState],
  );
  const closeConfirmModal = useCallback(
    () => updateState({ isConfirmModalOpen: false, confirmModalConfig: null }),
    [updateState],
  );

  // Pagination
  const pagination = useMultiplePagination({
    filePageSize: 50,
    chunkPageSize: 50,
  });

  // Debounced search
  const debouncedSearchTerm = useDebounce(ui.searchTerm, 500);

  // File data
  const fileListKey = groupId
    ? JSON.stringify({
        endpoint: "/list/file",
        groupId,
        search: ui.searchTerm,
        includeChunkSearch: ui.includeChunkSearch,
        categoryIds: ui.selectedCategoryIds,
        limit: pagination.file.pageSize,
        offset: pagination.file.getOffset(),
        sort:
          ui.sortOption === "newest"
            ? "created_at_desc"
            : ui.sortOption === "oldest"
              ? "created_at_asc"
              : ui.sortOption === "nameAsc"
                ? "name_asc"
                : ui.sortOption === "nameDesc"
                  ? "name_desc"
                  : ui.sortOption === "extensionAsc"
                    ? "extension_asc"
                    : "created_at_desc",
      })
    : null;
  const categoryListKey = groupId ? `/list/category/${groupId}` : null;

  const {
    data: fileDataRaw,
    error: fileError,
    isLoading: isFileLoading,
    mutate: mutateFiles,
  } = useSWR<ListFilesResponseType | null>(fileListKey, async () => {
    if (!groupId) return null;
    const result = (await list_files_v2_file_list__group_id__post(groupId, {
      search: ui.searchTerm || undefined,
      includeChunkSearch: ui.includeChunkSearch,
      categoryIds:
        ui.selectedCategoryIds.length > 0 ? ui.selectedCategoryIds : undefined,
      limit: pagination.file.pageSize,
      offset: pagination.file.getOffset(),
      sort:
        ui.sortOption === "newest"
          ? "created_at_desc"
          : ui.sortOption === "oldest"
            ? "created_at_asc"
            : ui.sortOption === "nameAsc"
              ? "name_asc"
              : ui.sortOption === "nameDesc"
                ? "name_desc"
                : ui.sortOption === "extensionAsc"
                  ? "extension_asc"
                  : "created_at_desc",
    })) as ListFilesResponseType;
    return result;
  });

  const zeroCountFileIds = ((fileDataRaw?.files as FileListItemType[]) || [])
    .filter((f) => f.chunkLen === 0)
    .map((f) => f.fileId);
  const chunkTotalsKey =
    groupId && zeroCountFileIds.length > 0
      ? JSON.stringify({
          endpoint: "/list/chunk/totals",
          groupId,
          zeroIds: zeroCountFileIds,
          limit: pagination.file.pageSize,
          offset: pagination.file.getOffset(),
        })
      : null;
  const { data: chunkTotalsData } = useSWR<Record<number, number> | null>(
    chunkTotalsKey,
    async () => {
      const pairs = await Promise.all(
        zeroCountFileIds.map(async (id: number) => {
          const res = (await list_chunk_v2_chunk_data_list_post({
            fileId: [id],
            limit: 1,
            offset: 0,
            sort: "chunk_id_asc",
          })) as GetChunkDataResponseType;
          const total = res?.total ?? 0;
          return [id, total] as const;
        }),
      );
      return Object.fromEntries(pairs);
    },
  );

  const {
    data: categoryDataRaw,
    error: categoryError,
    isLoading: isCategoryLoading,
    mutate: mutateCategories,
  } = useSWR<CategoryListResponseSchemaType | null>(
    categoryListKey,
    async () => {
      if (!groupId) return null;
      const result =
        (await get_category_list_by_group_v2_category_list__group_id__get(
          groupId,
        )) as CategoryListResponseSchemaType;
      return result;
    },
  );

  const transformFileData = (
    response: ListFilesResponseType | null | undefined,
  ) => {
    const files: FileListItemType[] =
      (response?.files as FileListItemType[]) ?? [];
    return files.map((file: FileListItemType) => {
      const baseCount = file.chunkLen;
      const fallback = chunkTotalsData?.[file.fileId] ?? 0;
      return {
        ...file,
        categoryNames: file.categoryNames ?? [],
        displayChunkCount: baseCount > 0 ? baseCount : fallback,
      } as FileListItemType & {
        categoryNames: string[];
        displayChunkCount?: number;
      };
    });
  };
  const transformCategoryData = (
    response: CategoryListResponseSchemaType | null | undefined,
  ) => response?.categoryList ?? [];
  const fileData = {
    fileList: transformFileData(fileDataRaw),
    fileTotal: fileDataRaw?.total ?? 0,
    categoryList: transformCategoryData(categoryDataRaw),
    isFileLoading,
    isCategoryLoading,
    fileError,
    categoryError,
    // createFile is removed as we use direct GCS upload via signed URL
    deleteFile: async (fileId: number) => {
      try {
        showLoadingToast("ファイルを削除しています");
        const res = await delete_files_v2_file_delete__file_id__delete(
          String(fileId),
        );
        await mutateFiles();
        showSuccessToast("ファイルを削除しました");
        return res;
      } catch (error) {
        handleErrorWithUI(error, "ファイル削除");
        throw error;
      }
    },
    deleteFiles: async (fileIds: number[]) => {
      const results: any[] = [];
      for (const id of fileIds) {
        try {
          const res = await delete_files_v2_file_delete__file_id__delete(
            String(id),
          );
          results.push({ fileId: id, success: true, result: res });
        } catch (error) {
          results.push({ fileId: id, success: false, error });
        }
      }
      await mutateFiles();
      return results;
    },
    redefineCategories: async (fileId: number) => {
      try {
        showLoadingToast("カテゴリーを再定義しています");
        const res =
          await redefine_categories_v2_category_redefine_categories__file_id__post(
            String(fileId),
          );
        await mutateFiles();
        showSuccessToast("カテゴリーを再定義しました");
        return res;
      } catch (error) {
        handleErrorWithUI(error, "カテゴリー再定義");
        throw error;
      }
    },
    updateFileLinkDisplay: async (fileIds: number[], display: boolean) => {
      try {
        showLoadingToast("ファイルリンク表示設定を更新しています");
        const body: UpdateFileLinkDisplayRequestType = {
          fileIds,
          displayFileLink: display,
        };
        const res =
          await update_file_link_display_v2_file_update_file_link_display_post(
            body,
          );
        await mutateFiles();
        showSuccessToast(
          `ファイルリンクを${display ? "表示" : "非表示"}にしました`,
        );
        return res;
      } catch (error) {
        handleErrorWithUI(error, "ファイルリンク表示設定更新");
        throw error;
      }
    },
    mutateFiles,
    mutateCategories,
  };

  // Chunk data
  const isTableFile = (() => {
    const ext = ui.selectedFile?.fileExtension?.toLowerCase();
    return ext === "csv" || ext === "xlsx" || ext === "xls";
  })();

  const chunkListKey = ui.selectedFile?.fileId
    ? JSON.stringify({
        endpoint: "/list/chunk",
        file_id: [ui.selectedFile.fileId],
        search: debouncedSearchTerm || undefined,
        limit: pagination.chunk.pageSize,
        offset: pagination.chunk.getOffset(),
        sort:
          ui.viewMode === "list" || isTableFile
            ? ui.tableSortOption
            : ui.chunkSortOption,
      })
    : null;
  const {
    data: chunkDataRaw,
    error: chunkError,
    isLoading: isChunkLoading,
    mutate: mutateChunks,
  } = useSWR(chunkListKey, async () => {
    if (!ui.selectedFile?.fileId) return null;
    const body = {
      file_id: [ui.selectedFile.fileId],
      search: debouncedSearchTerm || undefined,
      limit: pagination.chunk.pageSize,
      offset: pagination.chunk.getOffset(),
      sort:
        ui.viewMode === "list" || isTableFile
          ? ui.tableSortOption
          : ui.chunkSortOption,
    };
    const result = await list_chunk_v2_chunk_data_list_post(body);
    return result;
  });
  const transformChunkData = (response: GetChunkDataResponseType | null) => {
    if (!response?.dataList)
      return [] as (ChunkDataItemType & { categoryNames: string[] })[];
    return (response.dataList as unknown as Array<Record<string, any>>).map(
      (raw) => {
        const chunkId = raw.chunkId ?? raw.chunk_id;
        const fileId = raw.fileId ?? raw.file_id;
        const chunkTitle = raw.chunkTitle ?? raw.chunk_title ?? null;
        const chunkContent = raw.chunkContent ?? raw.chunk_content ?? "";
        const page = raw.page ?? null;
        const rawType = raw.chunkType ?? raw.chunk_type ?? raw.type;
        let typeString: string | undefined;
        if (typeof rawType === "string") {
          typeString = rawType;
        } else if (
          rawType &&
          typeof rawType === "object" &&
          "value" in rawType
        ) {
          // Python Enum などの { value: "json" } 形式
          try {
            typeString = String((rawType as any).value);
          } catch {
            typeString = undefined;
          }
        } else if (rawType != null) {
          // 文字列化して "ChunkTypeEnum.JSON" のような場合に末尾を抽出
          const s = String(rawType);
          typeString = s.includes(".") ? s.split(".").pop() : s;
        }
        const chunkType = typeString ? typeString.toUpperCase() : undefined;
        const categoryList = raw.categoryList ?? raw.category_list ?? [];
        const categoryNames = (categoryList as Array<Record<string, any>>).map(
          (c) => c.categoryName ?? c.category_name ?? "",
        );

        return {
          ...(raw as any),
          chunkId,
          fileId,
          chunkTitle,
          chunkContent,
          page,
          chunkType,
          categoryNames,
        } as unknown as ChunkDataItemType & { categoryNames: string[] };
      },
    );
  };
  const allChunks = transformChunkData(
    chunkDataRaw as GetChunkDataResponseType,
  );
  // debug logs removed
  const textChunkList = allChunks.filter(
    (c) => (c as any).chunkType === "TEXT",
  );
  const jsonChunkList = allChunks.filter(
    (c) => (c as any).chunkType === "JSON",
  );
  const overallChunkType = (() => {
    if (!allChunks || allChunks.length === 0) return "EMPTY" as const;
    if (allChunks.some((c) => (c as any).chunkType === "JSON"))
      return "JSON" as const;
    return "TEXT" as const;
  })();
  const chunkData = {
    chunkList: allChunks,
    chunkTotal: (chunkDataRaw as GetChunkDataResponseType)?.total ?? 0,
    textChunkList,
    jsonChunkList,
    chunkType: overallChunkType,
    isChunkLoading,
    isChunkTypeLoading: false,
    chunkError,
    chunkTypeError: null,
    createChunk: async (payload: CreateChunkSchemaType) => {
      const res = await create_chunk_v2_chunk_data_create_post(payload);
      await mutateChunks();
      return res;
    },
    updateChunk: async (payload: UpdateChunkSchemaType) => {
      const res = await update_chunk_v2_chunk_data_update_post(payload);
      await mutateChunks();
      return res;
    },
    deleteChunk: async (chunkId: number) => {
      const res = await delete_chunk_v2_chunk_data_delete__chunk_id__post(
        String(chunkId),
      );
      await mutateChunks();
      return res;
    },
    deleteChunks: async (chunkIds: number[]) => {
      const results: any[] = [];
      for (const id of chunkIds) {
        try {
          const res = await delete_chunk_v2_chunk_data_delete__chunk_id__post(
            String(id),
          );
          results.push({ chunkId: id, success: true, result: res });
        } catch (error) {
          results.push({ chunkId: id, success: false, error });
        }
      }
      await mutateChunks();
      return results;
    },
    updateChunkCategories: async (
      chunkId: number,
      payload: UpdateChunkCategoriesSchemaType,
    ) => {
      const res =
        await update_chunk_categories_v2_chunk_data_update__chunk_id__categories_post(
          String(chunkId),
          payload,
        );
      await mutateChunks();
      return res;
    },
    bulkUpdateFileCategories: async (
      payload: BulkUpdateFileCategoriesSchemaType,
    ) => {
      const res =
        await bulk_update_file_categories_v2_chunk_data_bulk_update_file_categories_post(
          payload,
        );
      await mutateChunks();
      return res;
    },
    bulkAddFileCategories: async (payload: BulkAddFileCategoriesSchemaType) => {
      const res =
        await bulk_add_file_categories_v2_chunk_data_bulk_add_file_categories_post(
          payload,
        );
      await mutateChunks();
      return res;
    },
    bulkRemoveFileCategories: async (
      payload: BulkRemoveFileCategoriesSchemaType,
    ) => {
      const res =
        await bulk_remove_file_categories_v2_chunk_data_bulk_remove_file_categories_post(
          payload,
        );
      await mutateChunks();
      return res;
    },
    mutateChunks,
    mutateDataType: undefined as unknown,
  };

  // Derived
  const isSearching: boolean = Boolean(
    ui.searchTerm !== debouncedSearchTerm ||
      (debouncedSearchTerm &&
        (ui.displayMode === "files" ? isFileLoading : isChunkLoading)),
  );
  const hasActiveFilters: boolean = Boolean(
    debouncedSearchTerm || ui.selectedCategoryIds.length > 0,
  );
  const totalChunkItems = chunkData.chunkTotal;
  const totalChunkPages = pagination.chunk.getTotalPages(totalChunkItems);

  // Handlers similar to previous composition hook
  const handleFilePageChange = useCallback(
    (pageNumber: number) => {
      pagination.file.goToPage(pageNumber - 1);
      if (
        ui.selectedFile &&
        !(fileData.fileList as any[])?.some(
          (f: any) => f.fileId === ui.selectedFile.fileId,
        )
      ) {
        clearSelectedFile();
      }
    },
    [pagination.file, fileData.fileList, ui.selectedFile, clearSelectedFile],
  );

  const handleChunkPageChange = useCallback(
    (pageNumber: number) => {
      pagination.chunk.goToPage(pageNumber - 1);
    },
    [pagination.chunk],
  );

  const handleSearchTermChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchTerm(val);
      pagination.file.resetPage();
      pagination.chunk.resetPage();
    },
    [setSearchTerm, pagination],
  );

  const handleClearSearch = useCallback(() => {
    clearSearch();
    pagination.file.resetPage();
    pagination.chunk.resetPage();
  }, [clearSearch, pagination]);

  const handleIncludeChunkSearchChange = useCallback(
    (include: boolean) => {
      setIncludeChunkSearch(include);
      if (ui.searchTerm) {
        pagination.file.resetPage();
        pagination.chunk.resetPage();
      }
    },
    [setIncludeChunkSearch, ui.searchTerm, pagination],
  );

  const handleFileSelect = useCallback(
    (file: { fileId: number }) => {
      setSelectedFile(file);
      pagination.chunk.resetPage();
    },
    [setSelectedFile, pagination.chunk],
  );

  const handleFileUploaded = useCallback(async () => {
    await fileData.mutateFiles();
  }, [fileData]);

  const handleDeleteSelectedFiles = useCallback(async () => {
    if (ui.selectedFileIds.length === 0) return;
    try {
      const results = await fileData.deleteFiles(ui.selectedFileIds);
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      if (successCount > 0) {
        showSuccessToast(`${successCount}件のファイルを削除しました`);
      }
      if (failCount > 0) {
        handleErrorWithUI(
          { message: `${failCount}件のファイル削除に失敗しました` } as any,
          "ファイル削除",
        );
      }
      if (
        ui.selectedFile &&
        ui.selectedFileIds.includes(ui.selectedFile.fileId)
      )
        clearSelectedFile();
    } catch (err) {
      handleErrorWithUI(err, "ファイル削除");
    } finally {
      clearFileSelection();
    }
  }, [
    ui.selectedFileIds,
    ui.selectedFile,
    fileData,
    clearSelectedFile,
    clearFileSelection,
  ]);

  const handleCreateChunk = useCallback(
    async (newData: any) => {
      if (!ui.selectedFile) return;
      try {
        await chunkData.createChunk({
          fileId: ui.selectedFile.fileId,
          chunkTitle: newData.chunkTitle,
          chunkContent: newData.chunkContent,
          page: newData.page,
          categoryIds: newData.categoryIds,
          chunkType: newData.chunkType ?? "text",
        } as any);
        showSuccessToast("チャンク作成");
        closeSidePanel();
      } catch (err) {
        handleErrorWithUI(err, "チャンク作成");
      }
    },
    [ui.selectedFile, chunkData, closeSidePanel],
  );

  const handleDeleteSelectedChunks = useCallback(async () => {
    if (ui.selectedChunkIds.length === 0) return;
    showLoadingToast("チャンク削除");
    try {
      const results = await chunkData.deleteChunks(ui.selectedChunkIds);
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      if (successCount > 0) {
        showSuccessToast("チャンク削除");
      }
      if (failCount > 0) {
        handleErrorWithUI(
          { message: `${failCount}件のチャンク削除に失敗しました` } as any,
          "チャンク削除",
        );
      }
    } catch (err) {
      handleErrorWithUI(err, "チャンク削除");
    } finally {
      clearChunkSelection();
    }
  }, [ui.selectedChunkIds, chunkData, clearChunkSelection]);

  const handleRedefineCategories = useCallback(async () => {
    if (!ui.selectedFile) return;
    showLoadingToast("カテゴリー再定義");
    try {
      await fileData.redefineCategories(ui.selectedFile.fileId);
      showSuccessToast("カテゴリー再定義");
    } catch (err) {
      handleErrorWithUI(err, "カテゴリー再定義");
    }
  }, [ui.selectedFile, fileData]);

  const handleUpdateFileLinkDisplay = useCallback(
    async (fileIds: number[], display: boolean) => {
      showLoadingToast("ファイルリンク表示設定更新");
      try {
        await fileData.updateFileLinkDisplay(fileIds, display);
        showSuccessToast("ファイルリンク表示設定更新");
      } catch (err) {
        handleErrorWithUI(err, "ファイルリンク表示設定更新");
      } finally {
        clearFileSelection();
      }
    },
    [fileData, clearFileSelection],
  );

  const handleBulkUpdateFileCategories = useCallback(
    async (payload: { fileId: number; categoryIds: number[] }) =>
      chunkData.bulkUpdateFileCategories(payload as any),
    [chunkData],
  );
  const handleBulkAddFileCategories = useCallback(
    async (payload: { fileId: number; categoryIds: number[] }) =>
      chunkData.bulkAddFileCategories(payload as any),
    [chunkData],
  );
  const handleBulkRemoveFileCategories = useCallback(
    async (payload: { fileId: number; categoryIds: number[] }) =>
      chunkData.bulkRemoveFileCategories(payload as any),
    [chunkData],
  );

  return {
    // data
    fileData,
    chunkData,

    // ui
    uiState: {
      state: ui,
      updateState,
      setDisplayMode,
      setViewMode,
      setSearchTerm,
      clearSearch,
      setIncludeChunkSearch,
      setCategoryFilter,
      clearCategoryFilter,
      removeCategory,
      clearAllFilters,
      setSortOption,
      setChunkSortOption,
      setTableSortOption,
      toggleAdvancedFilters,
      setSelectedFile,
      clearSelectedFile,
      setSelectedChunk,
      toggleFileSelection,
      clearFileSelection,
      selectAllFiles,
      toggleChunkSelection,
      clearChunkSelection,
      toggleFileSelectionMode,
      toggleChunkSelectionMode,
      openFileUploadModal,
      closeFileUploadModal,
      openSidePanel,
      closeSidePanel,
      openBulkCategoryModal,
      closeBulkCategoryModal,
      openConfirmModal,
      closeConfirmModal,
    },

    // pagination
    pagination,

    // derived
    debouncedSearchTerm,
    isSearching,
    hasActiveFilters,
    totalFilePages: pagination.file.getTotalPages(fileData.fileTotal),
    totalChunkItems,
    totalChunkPages,

    // handlers
    handleFilePageChange,
    handleChunkPageChange,
    handleSearchTermChange,
    handleClearSearch,
    handleIncludeChunkSearchChange,
    handleFileSelect,
    handleFileUploaded,
    handleDeleteSelectedFiles,
    handleCreateChunk,
    handleDeleteSelectedChunks,
    handleRedefineCategories,
    handleUpdateFileLinkDisplay,
    handleBulkUpdateFileCategories,
    handleBulkAddFileCategories,
    handleBulkRemoveFileCategories,
  } as const;
}
