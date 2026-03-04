import React, { useState, useRef, DragEvent } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardHeader,
} from "@heroui/react";
import {
  CloudUpload,
  File as FileIcon,
  Trash2,
  FolderOpen,
} from "lucide-react";
import {
  get_external_user_upload_url_v2_user_manage_line__group_id___external_user_id__upload_url_post,
  complete_upload_v2_file_create_complete_upload__file_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  GetExternalUserUploadUrlRequestType,
  GetUploadUrlResponseType,
} from "@repo/api-contracts/based_template/zschema";
import {
  handleErrorWithUI,
  showSuccessToast,
  showLoadingToast,
} from "@common/errorHandler";
import {
  allowedExtensions,
  SUPPORTED_FILE_TYPES,
  FileTypeInfo,
} from "../../../file/types/type";

interface UserFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  groupId: string;
  externalUserId: string;
}

export const UserFileUploadModal = ({
  isOpen,
  onClose,
  onUploaded,
  groupId,
  externalUserId,
}: UserFileUploadModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFiles([]);
    setIsDragOver(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetState();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFiles = (newFiles: File[]) => {
    const supportedFiles = newFiles.filter((file) => {
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return allowedExtensions.includes(ext);
    });

    if (supportedFiles.length < newFiles.length) {
      handleErrorWithUI(
        new Error("一部のファイル形式はサポートされていません。"),
        "ファイル選択",
      );
    }

    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const filtered = supportedFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...filtered];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
    if (e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const getFileTypeInfo = (file: File): FileTypeInfo => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
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

  const handleUpload = async () => {
    if (files.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    showLoadingToast("ファイルアップロード中...");

    try {
      const uploadPromises = files.map(async (file) => {
        const contentType = file.type || "application/octet-stream";

        // 1. アップロード用URL取得
        const uploadRequest: GetExternalUserUploadUrlRequestType = {
          fileName: file.name,
          fileSizeBytes: file.size,
          contentType: contentType,
          fileId: null,
        };

        const uploadInfo =
          (await get_external_user_upload_url_v2_user_manage_line__group_id___external_user_id__upload_url_post(
            groupId,
            externalUserId,
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
      });

      await Promise.all(uploadPromises);
      showSuccessToast("アップロード完了");
      onUploaded();
      handleClose();
    } catch (error) {
      handleErrorWithUI(error, "ファイルアップロード");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
      size="3xl"
      backdrop="blur"
      classNames={{
        base: "mx-2 sm:mx-0",
        wrapper: "items-end sm:items-center",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <CloudUpload className="text-primary" />
          <span>個人ファイルアップロード</span>
        </ModalHeader>
        <ModalBody>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedExtensions.join(",")}
            className="hidden"
            onChange={handleFileSelect}
          />

          {files.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-6 sm:p-12 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-default-300 hover:border-primary hover:bg-default-50"
              }`}
            >
              <FolderOpen size={48} className="text-default-400 mb-4" />
              <p className="text-base sm:text-lg font-medium text-default-700 text-center">
                ファイルをドラッグ＆ドロップ
              </p>
              <p className="text-sm text-default-500 mt-1 text-center">
                またはクリックして選択
              </p>
              <p className="text-xs text-default-400 mt-4 text-center break-all">
                対応形式: {allowedExtensions.join(", ")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-sm font-medium">
                  選択済み ({files.length}個)
                </span>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => fileInputRef.current?.click()}
                  startContent={<CloudUpload size={16} />}
                >
                  ファイルを追加
                </Button>
              </div>
              <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto space-y-2 pr-1">
                {files.map((file, index) => {
                  const info = getFileTypeInfo(file);
                  return (
                    <Card
                      key={`${file.name}-${index}`}
                      shadow="none"
                      className="border border-default-200"
                    >
                      <CardHeader className="flex justify-between p-3 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden min-w-0">
                          <div
                            className={`p-2 rounded-lg bg-${info.color}-50 text-${info.color}-500`}
                          >
                            <FileIcon size={20} className="shrink-0" />
                          </div>
                          <div className="overflow-hidden min-w-0">
                            <p className="text-sm font-medium truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-${info.color}-100 text-${info.color}-700 uppercase`}
                              >
                                {info.displayName}
                              </span>
                              <p className="text-xs text-default-400">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          variant="light"
                          onPress={() => removeFile(index)}
                          className="hover:bg-danger-50"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            onPress={handleClose}
            isDisabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={handleUpload}
            isDisabled={files.length === 0 || isSubmitting}
            isLoading={isSubmitting}
            startContent={!isSubmitting && <CloudUpload size={18} />}
          >
            アップロード開始
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default UserFileUploadModal;
