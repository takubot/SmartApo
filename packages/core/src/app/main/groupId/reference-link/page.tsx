"use client";

import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Button, Input, Chip } from "@heroui/react";
import { Pagination } from "@heroui/pagination";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import useSWR, { mutate } from "swr";
import { useGroupContext } from "../layout-client";
import { ReferenceLinkFileModal } from "./components/referenceLinkFileModal";
import {
  ReferenceLinkList,
  ReferenceLinkResponse,
} from "./components/referenceLinkList";

// Import doppel_service functions and types
import {
  create_reference_link_v2_reference_link_create__group_id__post,
  delete_reference_link_v2_reference_link_delete__group_id___reference_link_id__delete,
  get_reference_links_v2_reference_link_list__group_id__get,
  update_reference_link_v2_reference_link_update__group_id___reference_link_id__put,
} from "@repo/api-contracts/based_template/service";

import {
  ReferenceLinkListResponseType,
  ReferenceLinkRequestType,
  ReferenceLinkSchemaType,
} from "@repo/api-contracts/based_template/zschema";

// SWR Keys
const SWR_KEYS = {
  REFERENCE_LINKS: (groupId: string) => `reference-links-${groupId}`,
} as const;

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

// Custom SWR Hooks
function useReferenceLinks(groupId: string | null) {
  const key = groupId ? SWR_KEYS.REFERENCE_LINKS(groupId) : null;

  const {
    data,
    error,
    isLoading,
    mutate: mutateLocal,
  } = useSWR<ReferenceLinkListResponseType>(
    key,
    async () => {
      if (!groupId) return { referenceLinks: [] };
      try {
        const result =
          await get_reference_links_v2_reference_link_list__group_id__get(
            groupId,
          );
        return result as ReferenceLinkListResponseType;
      } catch (error) {
        throw error;
      }
    },
    SWR_CONFIG,
  );

  // Transform data to match component expectations
  const referenceLinks: ReferenceLinkResponse[] = (
    data?.referenceLinks || []
  ).map((link: ReferenceLinkSchemaType) => ({
    referenceLinkId: link.referenceLinkId ?? 0,
    groupId: link.groupId,
    linkName: link.linkName,
    linkUrl: link.linkUrl,
    description: link.description ?? undefined,
    createdAt: link.createdAt ?? new Date().toISOString(),
    updatedAt: link.updatedAt ?? new Date().toISOString(),
    fileCount: link.fileIds?.length ?? 0, // バックエンドから返される実際のファイル関連付け数
    fileIds: link.fileIds ?? [],
  }));

  return {
    referenceLinks,
    isLoading,
    error: error ? "参照リンク一覧の取得に失敗しました" : null,
    mutate: mutateLocal,
  };
}

// Mutation helper functions
const referenceLinksMutate = {
  invalidateReferenceLinksOnly: (groupId: string) => {
    mutate(SWR_KEYS.REFERENCE_LINKS(groupId));
  },
};

// API Functions
async function createReferenceLink(
  groupId: string,
  linkData: ReferenceLinkRequestType,
): Promise<void> {
  try {
    await create_reference_link_v2_reference_link_create__group_id__post(
      groupId,
      linkData,
    );
  } catch (error) {
    throw error;
  }
}

async function updateReferenceLink(
  groupId: string,
  referenceLinkId: number,
  linkData: ReferenceLinkRequestType,
): Promise<void> {
  try {
    await update_reference_link_v2_reference_link_update__group_id___reference_link_id__put(
      groupId,
      referenceLinkId.toString(),
      linkData,
    );
  } catch (error) {
    throw error;
  }
}

async function deleteReferenceLink(
  groupId: string,
  referenceLinkId: number,
): Promise<void> {
  try {
    await delete_reference_link_v2_reference_link_delete__group_id___reference_link_id__delete(
      groupId,
      referenceLinkId.toString(),
    );
  } catch (error) {
    throw error;
  }
}

// 確認モーダル
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-25 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="px-6 py-4">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500">{message}</p>
        </div>
        <div className="px-6 py-3 border-t flex justify-end space-x-3">
          <Button color="default" variant="light" onPress={onClose}>
            キャンセル
          </Button>
          <Button
            color="danger"
            onPress={() => {
              onConfirm();
              onClose();
            }}
          >
            実行
          </Button>
        </div>
      </div>
    </div>
  );
};

// 参照リンクの詳細モーダル
interface ReferenceLinkDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceLink: ReferenceLinkResponse | null;
}

const ReferenceLinkDetailsModal: React.FC<ReferenceLinkDetailsModalProps> = ({
  isOpen,
  onClose,
  referenceLink,
}) => {
  if (!isOpen || !referenceLink) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-25 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
            <h3 className="text-xl font-semibold text-gray-900">
              {referenceLink.linkName || "名前なし"} - 詳細
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-700 mb-2">基本情報</h4>
            <div className="bg-gray-50 p-3 rounded">
              <p>
                <span className="font-medium">参照リンクID:</span>{" "}
                {referenceLink.referenceLinkId ?? "不明"}
              </p>
              <p>
                <span className="font-medium">リンク名:</span>{" "}
                {referenceLink.linkName || "名前なし"}
              </p>
              <p>
                <span className="font-medium">URL:</span>{" "}
                <a
                  href={referenceLink.linkUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {referenceLink.linkUrl || "URLなし"}
                </a>
              </p>
              <p>
                <span className="font-medium">説明:</span>{" "}
                {referenceLink.description || "設定なし"}
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <div>
                  作成日:{" "}
                  {referenceLink.createdAt
                    ? new Date(referenceLink.createdAt).toLocaleDateString()
                    : "不明"}
                </div>
                <div>
                  更新日:{" "}
                  {referenceLink.updatedAt
                    ? new Date(referenceLink.updatedAt).toLocaleDateString()
                    : "不明"}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-lg font-medium text-gray-700 mb-2">
              関連ファイル
            </h4>
            <div className="text-gray-500 text-center py-4">
              ファイル関連付けは専用のモーダルで管理してください
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <div className="flex justify-end">
            <Button color="default" variant="light" onPress={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 参照リンク編集モーダル
interface ReferenceLinkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceLink: ReferenceLinkResponse | null;
  isCreate: boolean;
  onSave: (linkData: ReferenceLinkRequestType) => Promise<void>;
  groupId: string;
}

// 参照リンクデータのReact Hook Form型定義
type ReferenceLinkValues = {
  linkName: string;
  linkUrl: string;
  description: string;
};

const ReferenceLinkEditModal: React.FC<ReferenceLinkEditModalProps> = ({
  isOpen,
  onClose,
  referenceLink,
  isCreate,
  onSave,
  groupId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // React Hook Form setup
  const {
    control,
    handleSubmit: hookFormSubmit,
    formState: { errors, isValid },
    reset,
    trigger,
  } = useForm<ReferenceLinkValues>({
    defaultValues: {
      linkName: "",
      linkUrl: "",
      description: "",
    },
    mode: "onChange",
  });

  // データの初期化
  React.useEffect(() => {
    if (isOpen) {
      if (referenceLink && !isCreate) {
        reset({
          linkName: referenceLink.linkName || "",
          linkUrl: referenceLink.linkUrl || "",
          description: referenceLink.description || "",
        });
      } else {
        reset({
          linkName: "",
          linkUrl: "",
          description: "",
        });
      }

      // モーダルが開いた時に強制的にバリデーションを実行
      setTimeout(() => {
        trigger();
      }, 100);
    } else {
      // モーダルが閉じられたときにリセット
      setIsSubmitting(false);
    }
  }, [referenceLink, isOpen, isCreate, reset, trigger]);

  // URLのバリデーション
  const validateUrl = (url: string) => {
    if (!url || !url.trim()) return "URLは必須です";

    try {
      new URL(url.trim());
      return true;
    } catch {
      return "有効なURLを入力してください";
    }
  };

  // フォーム送信
  const onSubmit = async (data: ReferenceLinkValues) => {
    if (isSubmitting || !groupId) return;

    setIsSubmitting(true);

    try {
      // データの作成
      const linkData: ReferenceLinkRequestType = {
        linkName: data.linkName.trim(),
        linkUrl: data.linkUrl.trim(),
        description: data.description.trim() || undefined,
        groupId: groupId,
      };

      // 保存処理を実行
      await onSave(linkData);

      // 成功時にモーダルを閉じる
      onClose();
    } catch (error) {
      handleErrorWithUI(error, isCreate ? "参照リンク作成" : "参照リンク更新");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-25 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-xl font-semibold text-gray-900">
            {isCreate ? "参照リンクを作成" : "参照リンクを編集"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={hookFormSubmit(onSubmit)}>
          <div className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="linkName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  リンク名 <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="linkName"
                  control={control}
                  rules={{
                    required: "リンク名は必須です",
                    minLength: {
                      value: 1,
                      message: "リンク名を入力してください",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="linkName"
                      placeholder="例: お問い合わせフォーム"
                      variant="bordered"
                      isRequired
                      isInvalid={!!errors.linkName}
                      errorMessage={errors.linkName?.message}
                      isDisabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="linkUrl"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  リンクURL <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="linkUrl"
                  control={control}
                  rules={{
                    required: "URLは必須です",
                    validate: validateUrl,
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="linkUrl"
                      placeholder="例: https://forms.example.com/contact"
                      variant="bordered"
                      isRequired
                      isInvalid={!!errors.linkUrl}
                      errorMessage={errors.linkUrl?.message}
                      startContent={
                        <LinkIcon className="h-4 w-4 text-gray-400" />
                      }
                      isDisabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  説明
                </label>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="description"
                      placeholder="参照リンクの説明（任意）"
                      variant="bordered"
                      isDisabled={isSubmitting}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t flex justify-end space-x-3">
            <Button
              color="default"
              variant="light"
              onPress={onClose}
              type="button"
              isDisabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              color="primary"
              variant="solid"
              type="submit"
              isDisabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
              className="shadow-md"
            >
              {isCreate ? "作成" : "保存"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 複数参照リンクへの一括ファイル関連付けモーダル
interface BulkFileAssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReferenceLinkIds: number[];
  selectedReferenceLinks: ReferenceLinkResponse[];
  groupId: string;
}

type BulkFileAssociationValues = {
  selectedFileIds: number[];
};

const BulkFileAssociationModal: React.FC<BulkFileAssociationModalProps> = ({
  isOpen,
  onClose,
  selectedReferenceLinkIds,
  selectedReferenceLinks,
}) => {
  const [bulkSearchTerm, setBulkSearchTerm] = useState("");
  const [bulkActiveSearchTerm, setBulkActiveSearchTerm] = useState("");
  const [bulkCurrentPage, setBulkCurrentPage] = useState(1);
  const [isSubmitting] = useState(false);
  const bulkFilesPerPage = 10;

  const { handleSubmit, reset, watch, setValue } =
    useForm<BulkFileAssociationValues>({
      defaultValues: {
        selectedFileIds: [],
      },
    });

  // ファイル一覧は既存の最適化されたエンドポイントで取得するため、
  // ここでは簡素化された実装を使用
  const referenceLinkFileList = React.useMemo(() => [], []);
  const bulkTotalFiles = 0;

  const selectedFileIds = React.useMemo(
    () => watch("selectedFileIds") || [],
    [watch],
  );

  // 総ページ数計算
  const bulkTotalPages = React.useMemo(() => {
    return Math.ceil(bulkTotalFiles / bulkFilesPerPage);
  }, [bulkTotalFiles, bulkFilesPerPage]);

  // モーダルが開いた時にフォームをリセット
  React.useEffect(() => {
    if (isOpen) {
      reset({ selectedFileIds: [] });
      setBulkSearchTerm("");
      setBulkActiveSearchTerm("");
      setBulkCurrentPage(1);
    }
  }, [isOpen, reset]);

  // 検索処理
  const handleSearch = React.useCallback(() => {
    if (bulkSearchTerm.trim()) {
      setBulkActiveSearchTerm(bulkSearchTerm.trim());
      setBulkCurrentPage(1);
    }
  }, [bulkSearchTerm]);

  const handleClearSearch = React.useCallback(() => {
    setBulkSearchTerm("");
    setBulkActiveSearchTerm("");
    setBulkCurrentPage(1);
  }, []);

  const handleSearchTermChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBulkSearchTerm(e.target.value);
      if (!e.target.value.trim()) {
        setBulkActiveSearchTerm("");
      }
    },
    [],
  );

  const handleSearchKeyPress = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const onSubmit = async () => {
    handleErrorWithUI(
      {
        message:
          "一括ファイル関連付け機能は簡素化されました。個別の参照リンクでファイル関連付けを行ってください。",
      } as any,
      "一括ファイル関連付け",
    );
    onClose();
  };

  const handleSelectAllFiles = React.useCallback(() => {
    // ファイル一覧が空のため、何もしない
  }, []);

  const handleDeselectAllFiles = React.useCallback(() => {
    setValue("selectedFileIds", [], { shouldDirty: true });
  }, [setValue]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      placement="center"
      classNames={{
        wrapper: "items-center justify-center p-4",
        base: "my-0 mx-auto max-h-[95vh] max-w-full",
        body: "p-0 overflow-hidden",
        header: "pb-2",
        footer: "pt-2",
      }}
      isDismissable={!isSubmitting}
      hideCloseButton={isSubmitting}
      scrollBehavior="inside"
    >
      <ModalContent className="flex flex-col max-h-[95vh]">
        <ModalHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-gray-900">
              複数参照リンクへファイル関連付け
            </h2>
            <p className="text-sm text-gray-500">
              選択した参照リンクに同じファイルを一括で関連付けできます
            </p>
          </div>
        </ModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 min-h-0"
        >
          <ModalBody className="flex-1 min-h-0 overflow-hidden">
            {/* 対象参照リンク表示 */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-base font-medium text-gray-800 mb-3">
                対象参照リンク ({selectedReferenceLinkIds.length}件)
              </h3>
              <div className="bg-white p-3 rounded-lg border max-h-24 overflow-y-auto shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {selectedReferenceLinks.map((link) => (
                    <Chip
                      key={link.referenceLinkId}
                      color="primary"
                      variant="flat"
                      size="sm"
                      className="text-xs"
                    >
                      {link.linkName || `参照リンク${link.referenceLinkId}`}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* ファイル選択エリア */}
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-800 flex items-center">
                      <DocumentIcon className="h-4 w-4 text-green-600 mr-2" />
                      ファイル選択 ({selectedFileIds.length}件選択中)
                    </h4>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        color="success"
                        variant="flat"
                        onPress={handleSelectAllFiles}
                        isDisabled={
                          !referenceLinkFileList ||
                          referenceLinkFileList.length === 0 ||
                          isSubmitting
                        }
                        startContent={<PlusIcon className="h-3 w-3" />}
                        className="text-xs px-2 py-1 h-7"
                      >
                        すべて選択
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={handleDeselectAllFiles}
                        isDisabled={
                          selectedFileIds.length === 0 || isSubmitting
                        }
                        startContent={<TrashIcon className="h-3 w-3" />}
                        className="text-xs px-2 py-1 h-7"
                      >
                        選択解除
                      </Button>
                    </div>
                  </div>

                  {/* 検索バー */}
                  <div className="flex space-x-2 mb-2">
                    <Input
                      placeholder="ファイル名、内容で検索..."
                      value={bulkSearchTerm}
                      onChange={handleSearchTermChange}
                      onKeyPress={handleSearchKeyPress}
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
                      }}
                    />
                    <Button
                      size="sm"
                      color="primary"
                      onPress={handleSearch}
                      isDisabled={!bulkSearchTerm.trim()}
                      startContent={<MagnifyingGlassIcon className="h-3 w-3" />}
                      className="text-xs px-2 py-1 h-8 min-w-12"
                    >
                      検索
                    </Button>
                  </div>

                  {/* 検索状態表示 */}
                  {bulkActiveSearchTerm && (
                    <div className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      <MagnifyingGlassIcon className="h-3 w-3" />
                      <span>検索中: 「{bulkActiveSearchTerm}」</span>
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
                  {bulkTotalFiles > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      <span>
                        {Math.min(
                          (bulkCurrentPage - 1) * bulkFilesPerPage + 1,
                          bulkTotalFiles,
                        )}{" "}
                        -{" "}
                        {Math.min(
                          bulkCurrentPage * bulkFilesPerPage,
                          bulkTotalFiles,
                        )}{" "}
                        / {bulkTotalFiles}件
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <DocumentIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium">
                      ファイル一覧は既存の最適化されたエンドポイントで取得してください
                    </p>
                    <p className="text-xs mt-1 text-center">
                      この機能は簡素化されました
                    </p>
                  </div>
                </div>

                {/* ページネーション */}
                {bulkTotalPages > 1 && (
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
                    <Pagination
                      total={bulkTotalPages}
                      page={bulkCurrentPage}
                      onChange={setBulkCurrentPage}
                      showControls
                      color="primary"
                      size="sm"
                      className="justify-center"
                    />
                  </div>
                )}
              </div>

              {/* 右側: 選択されたファイル */}
              <div className="w-1/2 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100 flex-shrink-0">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-semibold text-gray-800 flex items-center">
                      <LinkIcon className="h-4 w-4 text-blue-600 mr-2" />
                      選択されたファイル
                    </h4>
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onPress={handleDeselectAllFiles}
                      isDisabled={selectedFileIds.length === 0 || isSubmitting}
                      startContent={<TrashIcon className="h-3 w-3" />}
                      className="text-xs px-2 py-1 h-7"
                    >
                      全削除 ({selectedFileIds.length})
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 min-h-0">
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <LinkIcon className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium">
                      ファイル選択機能は簡素化されました
                    </p>
                    <p className="text-xs mt-1 text-center">
                      個別の参照リンクでファイル関連付けを行ってください
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="flex-shrink-0 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center w-full">
              <div className="text-sm text-gray-600">
                {selectedFileIds.length > 0 ? (
                  <span className="text-primary-600 font-medium">
                    {selectedFileIds.length}件のファイルを
                    {selectedReferenceLinkIds.length}
                    件の参照リンクに関連付けます
                  </span>
                ) : (
                  <span>ファイルを選択してください</span>
                )}
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="light"
                  onPress={onClose}
                  isDisabled={isSubmitting}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  isLoading={isSubmitting}
                  isDisabled={selectedFileIds.length === 0}
                  startContent={
                    !isSubmitting && <CheckCircleIcon className="h-4 w-4" />
                  }
                >
                  {isSubmitting ? "関連付け中..." : "一括関連付け"}
                </Button>
              </div>
            </div>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

// メインページコンポーネント
export function ReferenceLinkManagementPage() {
  const groupId = useGroupContext();

  // SWRフックを使用してデータを取得
  const {
    referenceLinks,
    isLoading,
    error,
    mutate: mutateReferenceLinks,
  } = useReferenceLinks(groupId);

  // 状態管理
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearchTerm, setActiveSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [sortOption, setSortOption] = useState<
    | "newest"
    | "oldest"
    | "nameAsc"
    | "nameDesc"
    | "fileCountAsc"
    | "fileCountDesc"
  >("newest");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedReferenceLinkIds, setSelectedReferenceLinkIds] = useState<
    number[]
  >([]);

  // ページネーション
  const [page, setPage] = useState(1);
  const referenceLinksPerPage = 20; // テーブル表示用

  // モーダル状態
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isFileAssociationModalOpen, setIsFileAssociationModalOpen] =
    useState(false);
  const [isBulkFileAssociationModalOpen, setIsBulkFileAssociationModalOpen] =
    useState(false);
  const [selectedReferenceLink, setSelectedReferenceLink] =
    useState<ReferenceLinkResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 削除確認
  const [referenceLinkToDelete, setReferenceLinkToDelete] =
    useState<ReferenceLinkResponse | null>(null);

  // 検索処理
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setActiveSearchTerm(searchTerm.trim());
      setIsSearching(true);
      setPage(1);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setActiveSearchTerm("");
    setIsSearching(false);
    setPage(1);
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!e.target.value.trim()) {
      setActiveSearchTerm("");
      setIsSearching(false);
    }
  };

  // 操作
  const handleCreateReferenceLink = async (
    linkData: ReferenceLinkRequestType,
  ): Promise<void> => {
    if (!groupId) throw new Error("グループIDが見つかりません");

    setIsCreating(true);
    try {
      showLoadingToast("参照リンク作成");
      await createReferenceLink(groupId, linkData);
      // SWRのキャッシュを効率的に更新
      referenceLinksMutate.invalidateReferenceLinksOnly(groupId);
      setIsCreateModalOpen(false);
      showSuccessToast("参照リンク作成");
    } catch (error) {
      handleErrorWithUI(error, "参照リンク作成");
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateReferenceLink = async (
    linkData: ReferenceLinkRequestType,
  ): Promise<void> => {
    if (!selectedReferenceLink || !groupId)
      throw new Error("参照リンクまたはグループIDが選択されていません");

    try {
      showLoadingToast("参照リンク更新");
      await updateReferenceLink(
        groupId,
        selectedReferenceLink.referenceLinkId,
        linkData,
      );
      // SWRのキャッシュを効率的に更新
      referenceLinksMutate.invalidateReferenceLinksOnly(groupId);
      setIsEditModalOpen(false);
      setSelectedReferenceLink(null);
      showSuccessToast("参照リンク更新");
    } catch (error) {
      handleErrorWithUI(error, "参照リンク更新");
      throw error;
    }
  };

  const handleConfirmDelete = (link: ReferenceLinkResponse) => {
    setReferenceLinkToDelete(link);
  };

  const handleDelete = async () => {
    if (!referenceLinkToDelete || !groupId) return;

    try {
      showLoadingToast("参照リンク削除");
      await deleteReferenceLink(groupId, referenceLinkToDelete.referenceLinkId);
      // SWRのキャッシュを効率的に更新
      referenceLinksMutate.invalidateReferenceLinksOnly(groupId);
      setReferenceLinkToDelete(null);
      showSuccessToast("参照リンク削除");
    } catch (error) {
      handleErrorWithUI(error, "参照リンク削除");
    }
  };

  // 編集モーダルを開く
  const handleOpenEditModal = (link: ReferenceLinkResponse) => {
    setSelectedReferenceLink(link);
    setIsEditModalOpen(true);
  };

  // ファイル関連付けモーダルを開く
  const handleOpenFileAssociationModal = (link: ReferenceLinkResponse) => {
    setSelectedReferenceLink(link);
    setIsFileAssociationModalOpen(true);
  };

  // 詳細モーダルを開く
  const handleOpenDetailsModal = (link: ReferenceLinkResponse) => {
    setSelectedReferenceLink(link);
    setIsDetailsModalOpen(true);
  };

  // 複数選択処理
  const handleToggleSelection = (referenceLinkId: number) => {
    setSelectedReferenceLinkIds((prev) =>
      prev.includes(referenceLinkId)
        ? prev.filter((id) => id !== referenceLinkId)
        : [...prev, referenceLinkId],
    );
  };

  const handleSelectAll = () => {
    setSelectedReferenceLinkIds(
      referenceLinks.map((link) => link.referenceLinkId),
    );
  };

  const handleDeselectAll = () => {
    setSelectedReferenceLinkIds([]);
  };

  const handleDeleteSelected = async () => {
    if (selectedReferenceLinkIds.length === 0 || !groupId) return;

    try {
      showLoadingToast("参照リンク一括削除");
      await Promise.all(
        selectedReferenceLinkIds.map((id) => deleteReferenceLink(groupId, id)),
      );
      // SWRのキャッシュを効率的に更新
      referenceLinksMutate.invalidateReferenceLinksOnly(groupId);
      setSelectedReferenceLinkIds([]);
      setIsSelectionMode(false);
      showSuccessToast(
        `参照リンク一括削除 (${selectedReferenceLinkIds.length}件)`,
      );
    } catch (error) {
      handleErrorWithUI(error, "参照リンク一括削除");
    }
  };

  // ファイル関連付け変更時のコールバック
  const handleAssociationChange = React.useCallback(() => {
    if (groupId) {
      referenceLinksMutate.invalidateReferenceLinksOnly(groupId);
    }
  }, [groupId]);

  return (
    <>
      <ReferenceLinkList
        referenceLinks={referenceLinks}
        isLoading={isLoading}
        error={error}
        groupId={groupId}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        activeSearchTerm={activeSearchTerm}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        isSearching={isSearching}
        sortOption={sortOption}
        setSortOption={setSortOption}
        showSort={showSort}
        setShowSort={setShowSort}
        page={page}
        setPage={setPage}
        referenceLinksPerPage={referenceLinksPerPage}
        isSelectionMode={isSelectionMode}
        setIsSelectionMode={setIsSelectionMode}
        selectedReferenceLinkIds={selectedReferenceLinkIds}
        setSelectedReferenceLinkIds={setSelectedReferenceLinkIds}
        isCreateModalOpen={isCreateModalOpen}
        setIsCreateModalOpen={setIsCreateModalOpen}
        isCreating={isCreating}
        onSearch={handleSearch}
        onClearSearch={handleClearSearch}
        onSearchTermChange={handleSearchTermChange}
        onToggleSelection={handleToggleSelection}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDeleteSelected={handleDeleteSelected}
        onOpenEditModal={handleOpenEditModal}
        onOpenFileAssociationModal={handleOpenFileAssociationModal}
        onOpenDetailsModal={handleOpenDetailsModal}
        onConfirmDelete={handleConfirmDelete}
        onRetry={() => {
          if (groupId) {
            mutateReferenceLinks();
          }
        }}
        onAssociationChange={handleAssociationChange}
        onBulkFileAssociation={() => setIsBulkFileAssociationModalOpen(true)}
      />

      {/* モーダル群 */}
      <ReferenceLinkEditModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        referenceLink={null}
        isCreate={true}
        onSave={handleCreateReferenceLink}
        groupId={groupId || ""}
      />

      <ReferenceLinkEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedReferenceLink(null);
        }}
        referenceLink={selectedReferenceLink}
        isCreate={false}
        onSave={handleUpdateReferenceLink}
        groupId={groupId || ""}
      />

      <ReferenceLinkDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedReferenceLink(null);
        }}
        referenceLink={selectedReferenceLink}
      />

      <ReferenceLinkFileModal
        isOpen={isFileAssociationModalOpen}
        onClose={() => {
          setIsFileAssociationModalOpen(false);
          setSelectedReferenceLink(null);
        }}
        referenceLink={selectedReferenceLink}
        onAssociationChange={handleAssociationChange}
        groupId={groupId || ""}
      />

      <BulkFileAssociationModal
        isOpen={isBulkFileAssociationModalOpen}
        onClose={() => {
          setIsBulkFileAssociationModalOpen(false);
        }}
        selectedReferenceLinkIds={selectedReferenceLinkIds}
        selectedReferenceLinks={referenceLinks.filter((link) =>
          selectedReferenceLinkIds.includes(link.referenceLinkId),
        )}
        groupId={groupId || ""}
      />

      <ConfirmationModal
        isOpen={!!referenceLinkToDelete}
        onClose={() => setReferenceLinkToDelete(null)}
        onConfirm={handleDelete}
        title="参照リンクの削除"
        message={`「${referenceLinkToDelete?.linkName}」を削除しますか？この操作は取り消すことができません。`}
      />
    </>
  );
}
