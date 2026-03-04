"use client";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  MusicalNoteIcon,
  TrashIcon,
  VideoCameraIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import { Card, CardBody, CardHeader } from "@heroui/react";
import { Divider } from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Spinner } from "@heroui/react";
import { Chip } from "@heroui/react";
import {
  handleErrorWithUI,
  showSuccessToast,
  showLoadingToast,
} from "@common/errorHandler";

import {
  get_upload_url_v2_file_create_upload_url__group_id__post,
  complete_upload_v2_file_create_complete_upload__file_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  GetUploadUrlRequestType,
  GetUploadUrlResponseType,
} from "@repo/api-contracts/based_template/zschema";
import * as ExcelJS from "exceljs";
import Papa from "papaparse";
import React, { DragEvent, useEffect, useRef, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  allowedExtensions,
  SUPPORTED_FILE_TYPES,
  FileTypeInfo,
  FileTypeCategory,
} from "../../../types/type";

// 型定義
type FileCreateForm = {
  files: FileList;
};

interface PerfectFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  groupId: string;
  /**
   * 個人/グループ切り替えUIを非表示にする
   */
  hidePersonalToggle?: boolean;
  /**
   * 初期値（hidePersonalToggle=true の場合は true を推奨）
   */
  defaultIsPersonalUpload?: boolean;
}

interface ParsedFileData {
  file: File;
  headers: string[];
  rows: (string | number | null)[][];
  isPreviewExpanded: boolean;
  fileType: FileTypeCategory;
  parseError?: string;
}

const PerfectFileUploadModal: React.FC<PerfectFileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
  groupId,
  hidePersonalToggle = false,
  defaultIsPersonalUpload = false,
}) => {
  // 状態管理
  const [isDragOver, setIsDragOver] = useState(false);
  const [filesData, setFilesData] = useState<ParsedFileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPersonalUpload, setIsPersonalUpload] = useState(
    defaultIsPersonalUpload,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Hook Form
  const {
    handleSubmit,
    setValue,

    formState: { isSubmitting },
    reset,
  } = useForm<FileCreateForm>({
    mode: "onChange",
    defaultValues: {
      files: {} as FileList,
    },
  });

  // モーダルが開くたびに初期化
  useEffect(() => {
    if (isOpen) {
      reset();
      setFilesData([]);
      setIsProcessing(false);
      setIsPersonalUpload(defaultIsPersonalUpload);
    }
  }, [isOpen, reset, defaultIsPersonalUpload]);

  // ヘルパー関数
  const getFileExtension = (fileName: string): string => {
    return fileName.split(".").pop()?.toLowerCase() || "";
  };

  const isSupportedFile = (file: File): boolean => {
    const extension = getFileExtension(file.name);
    const allowed = new Set(
      allowedExtensions.map((ext) => ext.replace(/^\./, "").toLowerCase()),
    );
    return allowed.has(extension);
  };

  const getFileTypeInfo = (file: File): FileTypeInfo => {
    const extension = getFileExtension(file.name);
    return (
      SUPPORTED_FILE_TYPES[extension] || {
        extension: "other",
        displayName: "OTHER",
        color: "default",
        icon: "DocumentTextIcon",
        previewable: false,
        category: "other",
      }
    );
  };

  // アイコンコンポーネントを取得するヘルパー関数
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "DocumentTextIcon":
        return <DocumentTextIcon className="h-5 w-5" />;
      case "MusicalNoteIcon":
        return <MusicalNoteIcon className="h-5 w-5" />;
      case "VideoCameraIcon":
        return <VideoCameraIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes > 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  // CSV解析（FilePreview.tsxから引用・改良）
  const parseCSV = (
    file: File,
  ): Promise<{ headers: string[]; rows: (string | number | null)[][] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              reject(
                new Error(
                  `CSV解析エラー: ${results.errors[0]?.message || "不明なエラー"}`,
                ),
              );
              return;
            }

            const data = results.data as string[][];
            if (data.length === 0) {
              reject(new Error("ファイルにデータがありません"));
              return;
            }

            const headers = data[0] || [];
            const rows = data.slice(1, 6); // ヘッダー含め6行まで

            resolve({ headers, rows });
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(new Error(`CSV読み込みエラー: ${error.message}`));
        },
      });
    });
  };

  // Excel解析（FilePreview.tsxから引用・改良）
  const parseExcel = async (
    file: File,
  ): Promise<{ headers: string[]; rows: (string | number | null)[][] }> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("ワークシートが見つかりません");
      }

      const headers: string[] = [];
      const rows: (string | number | null)[][] = [];

      let isFirstRow = true;
      let rowCount = 0;
      worksheet.eachRow((row) => {
        if (rowCount >= 6) return; // 6行まで

        const rowData: (string | number | null)[] = [];
        row.eachCell((cell, colNumber) => {
          let cellValue: string | number | null = null;

          if (cell.value === null || cell.value === undefined) {
            cellValue = null;
          } else if (typeof cell.value === "object") {
            if ("text" in cell.value) {
              cellValue = String(cell.value.text || "");
            } else if ("result" in cell.value) {
              cellValue = String(cell.value.result || "");
            } else {
              cellValue = String(cell.value);
            }
          } else {
            cellValue = String(cell.value);
          }

          rowData[colNumber - 1] = cellValue;
        });

        if (rowData.some((cell) => cell && cell.toString().trim() !== "")) {
          if (isFirstRow) {
            headers.push(
              ...rowData.map((cell, index) =>
                cell && cell.toString().trim() !== ""
                  ? cell.toString()
                  : `列${index + 1}`,
              ),
            );
            isFirstRow = false;
          } else {
            rows.push(rowData);
          }
          rowCount++;
        }
      });

      if (headers.length === 0) {
        throw new Error("ヘッダー情報が見つかりません");
      }

      return { headers, rows };
    } catch (error) {
      throw new Error(
        `Excelファイルの解析に失敗しました: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`,
      );
    }
  };

  // ファイル解析
  const parseFile = async (file: File): Promise<ParsedFileData> => {
    const extension = getFileExtension(file.name);
    const fileTypeInfo = getFileTypeInfo(file);

    let headers: string[] = [];
    let rows: (string | number | null)[][] = [];
    let parseError: string | undefined;

    try {
      if (extension === "csv") {
        const result = await parseCSV(file);
        headers = result.headers;
        rows = result.rows;
      } else if (extension === "xlsx" || extension === "xls") {
        const result = await parseExcel(file);
        headers = result.headers;
        rows = result.rows;
      } else {
        // プレビューできないファイルは基本情報のみ
        headers = ["項目", "詳細"];
        rows = [
          ["ファイル名", file.name],
          ["ファイルサイズ", formatFileSize(file.size)],
          ["ファイル形式", fileTypeInfo.displayName],
          ["プレビュー", "このファイル形式はプレビューできません"],
          ["処理方法", "アップロード後にサーバーで解析されます"],
        ];
      }
    } catch (error) {
      parseError = error instanceof Error ? error.message : "解析エラー";
      headers = ["エラー"];
      rows = [[parseError]];
    }

    return {
      file,
      headers,
      rows,
      isPreviewExpanded: false,
      fileType: fileTypeInfo.category,
      parseError,
    };
  };

  // ファイル追加処理
  const addFiles = async (newFiles: File[]) => {
    setIsProcessing(true);

    try {
      // サポートされているファイルのみフィルタリング
      const supportedFiles = newFiles.filter(isSupportedFile);
      const unsupportedFiles = newFiles.filter(
        (file) => !isSupportedFile(file),
      );

      if (unsupportedFiles.length > 0) {
        const unsupportedNames = unsupportedFiles.map((f) => f.name).join(", ");
        handleErrorWithUI(
          new Error(`対応していないファイル形式です: ${unsupportedNames}`),
          "ファイルアップロード",
        );
      }

      if (supportedFiles.length === 0) {
        setIsProcessing(false);
        return;
      }

      // 重複チェック
      const existingFileNames = new Set(filesData.map((fd) => fd.file.name));
      const filesToAdd = supportedFiles.filter(
        (file) => !existingFileNames.has(file.name),
      );

      if (filesToAdd.length !== supportedFiles.length) {
        handleErrorWithUI(
          new Error("同じ名前のファイルが既に選択されています"),
          "ファイルアップロード",
        );
      }

      if (filesToAdd.length === 0) {
        setIsProcessing(false);
        return;
      }

      // ファイル解析
      const parsedFiles: ParsedFileData[] = [];
      for (const file of filesToAdd) {
        const parsedFile = await parseFile(file);
        parsedFiles.push(parsedFile);
      }

      // 状態更新
      setFilesData((prev) => [...prev, ...parsedFiles]);

      // FormDataも更新
      const allFiles = [...filesData.map((fd) => fd.file), ...filesToAdd];
      const dt = new DataTransfer();
      allFiles.forEach((file) => dt.items.add(file));
      setValue("files", dt.files);
    } catch (error) {
      handleErrorWithUI(error, "ファイル追加");
    } finally {
      setIsProcessing(false);
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  // ファイル選択処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }

    // input要素をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ファイル削除
  const removeFile = (index: number) => {
    const newFilesData = filesData.filter((_, i) => i !== index);
    setFilesData(newFilesData);

    // FormDataも更新
    const dt = new DataTransfer();
    newFilesData.forEach((fd) => dt.items.add(fd.file));
    setValue("files", dt.files);
  };

  // プレビュー展開切り替え
  const togglePreview = (index: number) => {
    setFilesData((prev) =>
      prev.map((fd, i) =>
        i === index ? { ...fd, isPreviewExpanded: !fd.isPreviewExpanded } : fd,
      ),
    );
  };

  // ファイルアップロード処理
  const onSubmit: SubmitHandler<FileCreateForm> = async () => {
    try {
      const files: File[] = filesData.map((fd) => fd.file);

      if (files.length === 0) return;

      // 署名付きURLを使用した直接アップロードフロー
      // 並列処理でアップロードを実行
      const uploadPromises = files.map(async (file) => {
        try {
          const contentType = file.type || "application/octet-stream";

          // 1. アップロード用URLとfile_idを取得
          const uploadRequest: GetUploadUrlRequestType = {
            fileName: file.name,
            fileSizeBytes: file.size,
            contentType: contentType,
            fileId: null,
            isPersonal: isPersonalUpload,
            ownerUserId: null,
          };
          const uploadInfo =
            (await get_upload_url_v2_file_create_upload_url__group_id__post(
              groupId,
              uploadRequest,
            )) as GetUploadUrlResponseType;

          // 2. GCSへ直接アップロード (PUT)
          // 注意: APIクライアントではなく標準fetchを使用（署名付きURLは認証ヘッダ不要/競合回避のため）
          const uploadRes = await fetch(uploadInfo.signedUrl, {
            method: "PUT",
            headers: {
              "Content-Type": contentType,
            },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error(
              `GCS upload failed: ${uploadRes.status} ${uploadRes.statusText}`,
            );
          }

          // 3. 完了通知
          await complete_upload_v2_file_create_complete_upload__file_id__post(
            String(uploadInfo.fileId),
            {},
          );
        } catch (e) {
          console.error(`Failed to upload ${file.name}`, e);
          throw e;
        }
      });

      // 全ファイルの処理を待機
      await Promise.all(uploadPromises);

      showSuccessToast("ファイルアップロード");

      onUploaded();
      onClose();
    } catch (error: unknown) {
      handleErrorWithUI(error, "ファイルアップロード");
    }
  };

  const handleUploadPress = async () => {
    onClose();
    showLoadingToast("ファイルアップロード");
    await handleSubmit(onSubmit)();
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      size="5xl"
      placement="center"
      backdrop="blur"
      scrollBehavior="inside"
      classNames={{
        base: "bg-white",
        backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
        wrapper: "items-center",
      }}
    >
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                ファイルアップロード
              </h2>
              {/* <p className="text-sm text-gray-600 mt-1">
                {`${allowedExtensions
                  .map((e) => e.replace(/^\./, "").toUpperCase())
                  .join(", ")} に対応`}
              </p> */}
            </div>
          </div>
        </ModalHeader>

        <ModalBody>
          {/* 常時配置の隠しファイル入力（アイコン/ラベルから参照） */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedExtensions.join(",")}
            className="hidden"
            id="file-upload"
            onChange={handleFileSelect}
          />
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                アップロード先
              </p>
              <p className="text-xs text-gray-500">
                個人用は自分だけが閲覧・利用できます
              </p>
            </div>
            {!hidePersonalToggle ? (
              <Checkbox
                isSelected={isPersonalUpload}
                onValueChange={setIsPersonalUpload}
              >
                個人用としてアップロード
              </Checkbox>
            ) : (
              <Chip size="sm" color="secondary" variant="flat">
                {isPersonalUpload ? "個人用" : "グループ共有"}
              </Chip>
            )}
          </div>
          {/* ドラッグ&ドロップエリア（ファイル未選択時のみ表示） */}
          {filesData.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative w-full p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${
                isDragOver
                  ? "border-blue-500 bg-blue-50 scale-[1.02]"
                  : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
              } cursor-pointer`}
            >
              <label
                htmlFor="file-upload"
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
              >
                <div
                  className={`mb-4 ${isDragOver ? "scale-110" : ""} transition-transform`}
                >
                  {isDragOver ? (
                    <CloudArrowUpIcon className="h-16 w-16 text-blue-500" />
                  ) : (
                    <FolderOpenIcon className="h-16 w-16 text-gray-400" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isDragOver
                      ? "ファイルをドロップしてください"
                      : "ファイルをドラッグ&ドロップ または クリックして選択"}
                  </p>
                  <p className="text-sm text-gray-500">最大1GB</p>
                  <p className="text-xs text-blue-600 mt-2">
                    ※複数回選択すると既存のファイルに追加されます
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* 処理中表示 */}
          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Spinner size="md" color="primary" />
              <span className="ml-2 text-gray-600">ファイルを処理中...</span>
            </div>
          )}

          {/* 選択ファイル一覧 */}
          {filesData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    選択されたファイル ({filesData.length}個)
                  </h3>
                </div>
                <Button
                  variant="light"
                  isIconOnly
                  onPress={() => fileInputRef.current?.click()}
                  aria-label="追加アップロード"
                >
                  <CloudArrowUpIcon className="h-5 w-5 text-blue-600" />
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filesData.map((fileData, index) => {
                  const fileTypeInfo = getFileTypeInfo(fileData.file);
                  const canPreview =
                    fileTypeInfo.previewable && !fileData.parseError;

                  return (
                    <Card
                      key={`${fileData.file.name}-${index}`}
                      className="border"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`text-${fileTypeInfo.color}-500`}>
                              {getIconComponent(fileTypeInfo.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium text-gray-800 truncate"
                                title={fileData.file.name}
                              >
                                {fileData.file.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Chip
                                  size="sm"
                                  color={fileTypeInfo.color}
                                  variant="flat"
                                >
                                  {fileTypeInfo.displayName}
                                </Chip>
                                <span className="text-xs text-gray-500">
                                  {formatFileSize(fileData.file.size)}
                                </span>
                                {fileData.parseError && (
                                  <Chip
                                    size="sm"
                                    color="danger"
                                    variant="flat"
                                    startContent={
                                      <XCircleIcon className="h-3 w-3" />
                                    }
                                  >
                                    エラー
                                  </Chip>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {canPreview && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onPress={() => togglePreview(index)}
                                startContent={
                                  fileData.isPreviewExpanded ? (
                                    <ChevronUpIcon className="h-4 w-4" />
                                  ) : (
                                    <ChevronDownIcon className="h-4 w-4" />
                                  )
                                }
                              >
                                {fileData.isPreviewExpanded
                                  ? "閉じる"
                                  : "プレビュー"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              color="danger"
                              variant="ghost"
                              onPress={() => removeFile(index)}
                              startContent={<TrashIcon className="h-4 w-4" />}
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* プレビュー展開エリア */}
                      {fileData.isPreviewExpanded && (
                        <CardBody className="pt-0">
                          <Divider className="mb-4" />
                          {fileData.parseError ? (
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex items-center gap-2 mb-2">
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                                <span className="font-medium text-red-700">
                                  解析エラー
                                </span>
                              </div>
                              <p className="text-red-600 text-sm">
                                {fileData.parseError}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-800">
                                  データプレビュー
                                </h4>
                              </div>
                              <div className="overflow-x-auto">
                                <Table
                                  aria-label="ファイルプレビュー"
                                  classNames={{
                                    base: "max-h-64",
                                    wrapper: "bg-white rounded-lg shadow-sm",
                                  }}
                                >
                                  <TableHeader>
                                    {fileData.headers.map(
                                      (header, headerIndex) => {
                                        return (
                                          <TableColumn
                                            key={headerIndex}
                                            className="bg-gray-100"
                                          >
                                            {header || `列${headerIndex + 1}`}
                                          </TableColumn>
                                        );
                                      },
                                    )}
                                  </TableHeader>
                                  <TableBody>
                                    {fileData.rows
                                      .slice(0, 5)
                                      .map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                          {fileData.headers.map(
                                            (_, cellIndex) => {
                                              return (
                                                <TableCell
                                                  key={cellIndex}
                                                  className="text-sm"
                                                >
                                                  {row[cellIndex] || ""}
                                                </TableCell>
                                              );
                                            },
                                          )}
                                        </TableRow>
                                      ))}
                                  </TableBody>
                                </Table>
                              </div>
                              {fileData.rows.length > 5 && (
                                <p className="text-xs text-gray-500 mt-2 text-center">
                                  ... 他 {fileData.rows.length - 5}{" "}
                                  行（プレビューは最初の5行のみ）
                                </p>
                              )}
                            </div>
                          )}
                        </CardBody>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-gray-600">
              {filesData.length > 0 && (
                <span>
                  合計: {filesData.length}個のファイル (
                  {formatFileSize(
                    filesData.reduce((total, fd) => total + fd.file.size, 0),
                  )}
                  )
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                isDisabled={isSubmitting || isProcessing}
              >
                キャンセル
              </Button>
              <Button
                color="primary"
                onPress={handleUploadPress}
                isDisabled={
                  isSubmitting || isProcessing || filesData.length === 0
                }
                startContent={
                  isSubmitting ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    <CloudArrowUpIcon className="h-4 w-4" />
                  )
                }
              >
                {isSubmitting
                  ? "アップロード中..."
                  : `アップロード (${filesData.length}個)`}
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PerfectFileUploadModal;
