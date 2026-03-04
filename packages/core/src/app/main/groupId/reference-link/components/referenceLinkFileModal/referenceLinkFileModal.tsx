"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button, Input, Spinner } from "@heroui/react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";

import {
  handleErrorWithUI,
  showSuccessToast,
  showLoadingToast,
} from "@common/errorHandler";

import {
  CheckCircleIcon,
  DocumentIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import useSWR from "swr";

// Import API functions and types
import {
  list_files_v2_file_list__group_id__post,
  list_reference_link_file_v2_reference_link_list_reference_link_file__group_id___reference_link_id__post,
  update_reference_link_file_v2_reference_link_update_reference_link_file__group_id___reference_link_id__post,
} from "@repo/api-contracts/based_template/service";

import {
  ListReferenceLinkFileResponseType,
  ListFilesResponseType,
  ListFilesRequestType,
} from "@repo/api-contracts/based_template/zschema";

// この画面で必要な最小限のファイル情報型
export type FileInfoResponse = {
  fileId: number;
  fileName: string;
  chunkLen: number;
  fileExtension: string;
  createdAt: string;
};

// SWR Configuration
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false,
  revalidateOnMount: true,
  dedupingInterval: 10000,
  errorRetryInterval: 15000,
  errorRetryCount: 3,
  shouldRetryOnError: (error: unknown) =>
    (error as { status?: number })?.status !== 401,
  onError: (error: unknown, key: string) => {
    // SWRのエラーは個別に処理するため、ここではログのみ
    console.error(`SWR Error for key ${key}:`, error);
  },
};

// SWR Keys
const SWR_KEYS = {
  REFERENCE_LINK_FILES: (groupId: string, referenceLinkId: number) =>
    `reference-link-files-${groupId}-${referenceLinkId}`,
  ALL_FILES: (groupId: string) => `all-files-${groupId}`,
} as const;

// Custom SWR Hook
function useReferenceLinkFiles(
  groupId: string | null,
  referenceLinkId: number | null,
) {
  const key =
    groupId && referenceLinkId
      ? SWR_KEYS.REFERENCE_LINK_FILES(groupId, referenceLinkId)
      : null;

  const {
    data,
    error,
    isLoading,
    mutate: mutateLocal,
  } = useSWR<ListReferenceLinkFileResponseType>(
    key,
    async () => {
      if (!groupId || !referenceLinkId) return { fileIdList: [] };
      try {
        const result =
          await list_reference_link_file_v2_reference_link_list_reference_link_file__group_id___reference_link_id__post(
            groupId,
            referenceLinkId.toString(),
            {
              referenceLinkId: referenceLinkId,
            },
          );
        return result as ListReferenceLinkFileResponseType;
      } catch (error) {
        throw error;
      }
    },
    SWR_CONFIG,
  );

  return {
    referenceLinkFileIds: data?.fileIdList || [],
    isLoading,
    error: error ? "参照リンクファイルの取得に失敗しました" : null,
    mutate: mutateLocal,
  };
}

// Custom SWR Hook for all files
function useAllFiles(groupId: string | null) {
  const key = groupId ? SWR_KEYS.ALL_FILES(groupId) : null;

  const {
    data,
    error,
    isLoading,
    mutate: mutateLocal,
  } = useSWR<ListFilesResponseType>(
    key,
    async () => {
      if (!groupId) return { files: [], total: 0 };
      try {
        const request: ListFilesRequestType = {
          search: "", // 検索はクライアント側で行うため空文字
          includeChunkSearch: false, // クライアント側検索のため不要
          categoryIds: null,
          limit: 1000,
          offset: 0,
          sort: "created_at_desc",
        };

        const result = await list_files_v2_file_list__group_id__post(
          groupId,
          request,
        );

        return result as ListFilesResponseType;
      } catch (error) {
        throw error;
      }
    },
    SWR_CONFIG,
  );

  return {
    allFiles: data?.files || [],
    isLoading,
    error: error ? "全ファイルの取得に失敗しました" : null,
    mutate: mutateLocal,
  };
}

// API Functions
async function updateReferenceLinkFileAssociations(
  groupId: string,
  referenceLinkId: number,
  newFileIds: number[],
): Promise<void> {
  try {
    // Get current reference link files
    const currentFiles =
      await list_reference_link_file_v2_reference_link_list_reference_link_file__group_id___reference_link_id__post(
        groupId,
        referenceLinkId.toString(),
        {
          referenceLinkId: referenceLinkId,
        },
      );
    const currentFileIds = Array.isArray(
      (currentFiles as ListReferenceLinkFileResponseType)?.fileIdList,
    )
      ? ((currentFiles as ListReferenceLinkFileResponseType)
          .fileIdList as number[])
      : [];

    // Remove files that are no longer selected
    for (const fileId of currentFileIds) {
      if (!newFileIds.includes(fileId)) {
        await update_reference_link_file_v2_reference_link_update_reference_link_file__group_id___reference_link_id__post(
          groupId,
          referenceLinkId.toString(),
          {
            fileId: fileId,
            alwaysDisplay: false,
          },
        );
      }
    }

    // Add new files
    for (const fileId of newFileIds) {
      if (!currentFileIds.includes(fileId)) {
        await update_reference_link_file_v2_reference_link_update_reference_link_file__group_id___reference_link_id__post(
          groupId,
          referenceLinkId.toString(),
          {
            fileId: fileId,
            alwaysDisplay: true,
          },
        );
      }
    }
  } catch (error) {
    throw error;
  }
}

// ファイル関連付けフォームの値型
type FileAssociationValues = {
  selectedFileIds: number[];
};

// ファイル関連付け管理モーダル
interface ReferenceLinkFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceLink: {
    referenceLinkId: number;
    linkName: string;
  } | null;
  onAssociationChange: () => void;
  groupId: string;
}

export const ReferenceLinkFileModal: React.FC<ReferenceLinkFileModalProps> = ({
  isOpen,
  onClose,
  referenceLink,
  onAssociationChange,
  groupId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 30;

  // デバウンス機能を実装
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms後に検索実行

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // React Hook Form setup
  const {
    handleSubmit: hookFormSubmit,
    setValue,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<FileAssociationValues>({
    defaultValues: {
      selectedFileIds: [],
    },
  });

  const selectedFileIds = watch("selectedFileIds");

  // SWRフックを使用して参照リンクファイルを取得
  const { referenceLinkFileIds, isLoading: isLoadingFiles } =
    useReferenceLinkFiles(
      isOpen && referenceLink ? groupId : null,
      isOpen && referenceLink && referenceLink.referenceLinkId
        ? referenceLink.referenceLinkId
        : null,
    );

  // SWRフックを使用して全ファイルを取得
  const { allFiles, isLoading: isLoadingAllFiles } = useAllFiles(
    isOpen && referenceLink ? groupId : null,
  );

  // ファイル一覧は既存の最適化されたエンドポイントで取得するため、
  // ここでは参照リンクに紐づくファイルのみを表示
  const isLoadingFilesData = isLoadingAllFiles;

  // 参照リンクファイルのIDリストをメモ化
  const currentReferenceLinkFileIds = React.useMemo(() => {
    if (!referenceLinkFileIds || referenceLinkFileIds.length === 0)
      return [] as number[];
    return referenceLinkFileIds;
  }, [referenceLinkFileIds]);

  // ファイル情報の統合キャッシュをメモ化で効率的に管理
  const fileInfoCache = React.useMemo(() => {
    const cache = new Map<number, FileInfoResponse>();

    // 全ファイルから基本情報を取得
    if (allFiles) {
      allFiles.forEach((file) => {
        const fileInfo: FileInfoResponse = {
          fileId: file.fileId,
          fileName: file.fileName,
          chunkLen: file.chunkLen || 0,
          fileExtension: file.fileExtension,
          createdAt: file.createdAt,
        };
        cache.set(file.fileId, fileInfo);
      });
    }

    return cache;
  }, [allFiles]);

  // 表示用の関連付けられたファイル（現在選択されているファイル）
  const associatedFilesToShow = React.useMemo(() => {
    return selectedFileIds.map((fileId) => {
      const cachedFile = fileInfoCache.get(fileId);
      if (cachedFile) {
        return {
          fileId: cachedFile.fileId,
          fileName: cachedFile.fileName,
          fileExtension: cachedFile.fileExtension,
          chunkLen: cachedFile.chunkLen,
        };
      }

      return {
        fileId: fileId,
        fileName: isLoadingFiles
          ? `読み込み中... (ID: ${fileId})`
          : `ファイル情報取得中... (ID: ${fileId})`,
        fileExtension: isLoadingFiles ? "取得中" : "不明",
        chunkLen: 0,
      };
    });
  }, [selectedFileIds, fileInfoCache, isLoadingFiles]);

  // モーダル初期化
  React.useEffect(() => {
    if (
      isOpen &&
      referenceLink &&
      !isLoadingFiles &&
      currentReferenceLinkFileIds.length >= 0
    ) {
      setValue("selectedFileIds", currentReferenceLinkFileIds);
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setCurrentPage(1);
    }
  }, [
    isOpen,
    referenceLink,
    currentReferenceLinkFileIds,
    setValue,
    isLoadingFiles,
  ]);

  // モーダルクリーンアップ
  React.useEffect(() => {
    if (!isOpen) {
      reset({ selectedFileIds: [] });
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setCurrentPage(1);
      setIsProcessing(false);
    }
  }, [isOpen, reset]);

  // 検索処理
  const handleClearSearch = React.useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setCurrentPage(1);
  }, []);

  const handleSearchTermChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
    },
    [],
  );

  // フォーム送信処理
  const onSubmit = React.useCallback(
    async (data: FileAssociationValues) => {
      if (!referenceLink || isProcessing || !groupId) return;

      setIsProcessing(true);
      onClose();

      try {
        showLoadingToast("ファイル関連付け更新");

        if (!referenceLink.referenceLinkId) {
          throw new Error("参照リンクIDが不明です");
        }

        await updateReferenceLinkFileAssociations(
          groupId,
          referenceLink.referenceLinkId,
          data.selectedFileIds,
        );

        showSuccessToast("ファイル関連付け更新");

        onAssociationChange();
      } catch (error) {
        handleErrorWithUI(error, "ファイル関連付け更新");
      } finally {
        setIsProcessing(false);
      }
    },
    [referenceLink, isProcessing, groupId, onClose, onAssociationChange],
  );

  // 利用可能なファイル
  const unassociatedFiles = React.useMemo(() => {
    let filteredFiles = allFiles.filter(
      (file) => !selectedFileIds.includes(file.fileId),
    );

    // 検索クエリがある場合はファイル名でフィルタリング
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filteredFiles = filteredFiles.filter((file) =>
        file.fileName.toLowerCase().includes(searchLower),
      );
    }

    return filteredFiles;
  }, [allFiles, selectedFileIds, debouncedSearchTerm]);

  // 関連付けられたファイル
  const associatedFiles = associatedFilesToShow;

  // 変更があったかチェック
  const hasChanges = React.useMemo(() => {
    return (
      isDirty ||
      JSON.stringify([...currentReferenceLinkFileIds].sort()) !==
        JSON.stringify([...selectedFileIds].sort())
    );
  }, [isDirty, currentReferenceLinkFileIds, selectedFileIds]);

  // フォーム送信ハンドラー
  const handleSaveAssociations = hookFormSubmit(onSubmit);

  // ファイル操作ハンドラー
  const handleAddFile = React.useCallback(
    (fileId: number) => {
      const currentIds = selectedFileIds;
      if (!currentIds.includes(fileId)) {
        setValue("selectedFileIds", [...currentIds, fileId], {
          shouldDirty: true,
        });
      }
    },
    [selectedFileIds, setValue],
  );

  const handleRemoveFile = React.useCallback(
    (fileId: number) => {
      const currentIds = selectedFileIds;
      setValue(
        "selectedFileIds",
        currentIds.filter((id) => id !== fileId),
        { shouldDirty: true },
      );
    },
    [selectedFileIds, setValue],
  );

  const handleSelectAllFiles = React.useCallback(() => {
    if (unassociatedFiles.length > 0) {
      const unassociatedFileIds = unassociatedFiles.map((file) => file.fileId);
      const combinedIds = [
        ...new Set([...selectedFileIds, ...unassociatedFileIds]),
      ];
      setValue("selectedFileIds", combinedIds, { shouldDirty: true });
    }
  }, [unassociatedFiles, selectedFileIds, setValue]);

  const handleDeselectAllFiles = React.useCallback(() => {
    setValue("selectedFileIds", [], { shouldDirty: true });
  }, [setValue]);

  if (!isOpen || !referenceLink) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      placement="center"
      classNames={{
        wrapper: "items-center justify-center p-4",
        base: "my-0 mx-auto h-[80vh] max-w-full",
        body: "p-0 overflow-hidden",
        header: "pb-2",
        footer: "pt-2",
      }}
      isDismissable={!isProcessing}
      hideCloseButton={isProcessing}
      scrollBehavior="inside"
    >
      <ModalContent className="flex flex-col h-full">
        <ModalHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-gray-900">
              ファイル関連付け管理
            </h2>
            <p className="text-sm text-gray-500">
              「{referenceLink.linkName}」に関連付けるファイルを選択してください
            </p>
          </div>
        </ModalHeader>

        <form
          onSubmit={handleSaveAssociations}
          className="flex flex-col flex-1 min-h-0"
        >
          <ModalBody className="flex-1 min-h-0 overflow-hidden h-full">
            {/* 統計情報バー */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">
                      利用可能: {unassociatedFiles.length}件
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">
                      関連付け済み: {selectedFileIds.length}件
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-700">
                      総ファイル数: {allFiles.length}件
                    </span>
                  </div>
                </div>
                {hasChanges && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-orange-600 font-medium">
                      {Math.abs(
                        selectedFileIds.length -
                          currentReferenceLinkFileIds.length,
                      )}
                      件の変更があります
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* 左側: 利用可能なファイル */}
              <div className="w-1/2 border-r border-gray-200 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-800 flex items-center">
                      <DocumentIcon className="h-4 w-4 text-green-600 mr-2" />
                      利用可能なファイル
                    </h4>
                    <Button
                      size="sm"
                      color="success"
                      variant="flat"
                      onPress={handleSelectAllFiles}
                      isDisabled={
                        unassociatedFiles.length === 0 || isProcessing
                      }
                      startContent={<PlusIcon className="h-3 w-3" />}
                      className="text-xs px-2 py-1 h-7"
                    >
                      ページ内全追加 ({unassociatedFiles.length})
                    </Button>
                  </div>

                  {/* 検索バー */}
                  <div className="flex space-x-2 mb-2">
                    <Input
                      placeholder="ファイル名、内容で検索..."
                      value={searchTerm}
                      variant="bordered"
                      onChange={handleSearchTermChange}
                      size="sm"
                      isClearable
                      onClear={handleClearSearch}
                      startContent={
                        <MagnifyingGlassIcon className="h-3 w-3 text-gray-400" />
                      }
                      className="flex-1 text-xs"
                      classNames={{
                        input: "text-xs",
                        inputWrapper: "h-8",
                        base: "bg-white",
                      }}
                    />
                  </div>

                  {/* 検索状態表示 */}
                  {debouncedSearchTerm && (
                    <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      <MagnifyingGlassIcon className="h-3 w-3" />
                      <span>検索中: 「{debouncedSearchTerm}」</span>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onPress={handleClearSearch}
                        className="ml-1 h-4 w-4 min-w-0"
                      >
                        <XMarkIcon className="h-2 w-2" />
                      </Button>
                    </div>
                  )}

                  {/* ページ情報 */}
                  {allFiles.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      <span>
                        {debouncedSearchTerm ? (
                          <>検索結果: {unassociatedFiles.length}件</>
                        ) : (
                          <>
                            {Math.min(
                              (currentPage - 1) * filesPerPage + 1,
                              allFiles.length,
                            )}{" "}
                            -{" "}
                            {Math.min(
                              currentPage * filesPerPage,
                              allFiles.length,
                            )}{" "}
                            / {allFiles.length}件
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                  {isLoadingFilesData ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Spinner size="md" color="primary" />
                      <p className="text-gray-500 mt-2 text-sm">
                        ファイルを読み込み中...
                      </p>
                    </div>
                  ) : unassociatedFiles.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {unassociatedFiles.map((file) => (
                        <div
                          key={file.fileId}
                          className="group relative p-2 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-150 cursor-pointer"
                          onClick={() => handleAddFile(file.fileId)}
                        >
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <DocumentIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                                {file.fileName}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {file.fileExtension}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {file.chunkLen || 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Button
                                isIconOnly
                                size="sm"
                                color="success"
                                variant="flat"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 min-w-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddFile(file.fileId);
                                }}
                              >
                                <PlusIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : debouncedSearchTerm ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <MagnifyingGlassIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium">
                        「{debouncedSearchTerm}
                        」に一致するファイルが見つかりません
                      </p>
                      <p className="text-xs mt-1 text-center">
                        別のキーワードで検索してみてください
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <DocumentIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium">
                        利用可能なファイルがありません
                      </p>
                      <p className="text-xs mt-1 text-center">
                        すべてのファイルが既に選択されています
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 右側: 関連付けられたファイル */}
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-800 flex items-center">
                      <LinkIcon className="h-4 w-4 text-blue-600 mr-2" />
                      関連付けられたファイル
                    </h4>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={handleDeselectAllFiles}
                      isDisabled={selectedFileIds.length === 0 || isProcessing}
                      startContent={<TrashIcon className="h-3 w-3" />}
                      className="text-xs px-2 py-1 h-7"
                    >
                      全削除 ({selectedFileIds.length})
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                  {selectedFileIds.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1">
                      {associatedFiles.map((file) => (
                        <div
                          key={file.fileId}
                          className="group relative p-2 rounded-lg border border-blue-200 bg-blue-50 hover:border-red-300 hover:bg-red-50 transition-all duration-150"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="flex-shrink-0">
                              <DocumentIcon className="h-5 w-5 text-blue-600 group-hover:text-red-600 transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                                {file.fileName}
                              </p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded">
                                  {file.fileExtension}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {file.chunkLen}
                                </span>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <Button
                                isIconOnly
                                size="sm"
                                color="danger"
                                variant="flat"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 min-w-0"
                                onClick={() => handleRemoveFile(file.fileId)}
                              >
                                <TrashIcon className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                      <LinkIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm font-medium">
                        関連付けられたファイルがありません
                      </p>
                      <p className="text-xs mt-1 text-center">
                        左側からファイルを選択して関連付けてください
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="flex-shrink-0 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                {hasChanges ? (
                  <span className="text-orange-600 font-medium">
                    {Math.abs(
                      selectedFileIds.length -
                        currentReferenceLinkFileIds.length,
                    )}
                    件の変更があります
                  </span>
                ) : (
                  <span>変更なし</span>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={isProcessing}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  isLoading={isProcessing}
                  isDisabled={!hasChanges}
                  startContent={
                    !isProcessing && <CheckCircleIcon className="h-4 w-4" />
                  }
                >
                  {isProcessing ? "更新中..." : "保存"}
                </Button>
              </div>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};
