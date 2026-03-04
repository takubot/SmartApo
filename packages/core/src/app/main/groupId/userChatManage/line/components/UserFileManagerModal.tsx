import { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
} from "@heroui/react";
import { Search, RefreshCcw, Upload, FileText, Trash2, X } from "lucide-react";
import {
  list_external_user_files_v2_user_manage_line__group_id___external_user_id__files_post,
  delete_external_user_file_v2_user_manage_line__group_id___external_user_id__files__file_id__delete,
} from "@repo/api-contracts/based_template/service";
import type {
  LineUserResponseType,
  ListFilesResponseType,
  FileListItemType,
} from "@repo/api-contracts/based_template/zschema";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";
import { SUPPORTED_FILE_TYPES } from "../../../file/types/type";
import UserFileUploadModal from "./UserFileUploadModal";

interface UserFileManagerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedUser: LineUserResponseType;
  groupId: string;
}

export const UserFileManagerModal = ({
  isOpen,
  onOpenChange,
  selectedUser,
  groupId,
}: UserFileManagerModalProps) => {
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileListKey =
    groupId && selectedUser && isOpen
      ? JSON.stringify({
          endpoint: "line-user-personal-files",
          groupId,
          ownerExternalUserId: selectedUser.userId,
          search: fileSearchTerm,
        })
      : null;

  const {
    data: fileListDataRaw,
    error: fileListError,
    isLoading: isFileListLoading,
    mutate: mutateFileList,
  } = useSWR<ListFilesResponseType | null>(fileListKey, async () => {
    if (!groupId || !selectedUser) return null;
    const res =
      (await list_external_user_files_v2_user_manage_line__group_id___external_user_id__files_post(
        groupId,
        selectedUser.userId,
        {
          search: fileSearchTerm || undefined,
          limit: 50,
          offset: 0,
          sort: "created_at_desc",
        },
      )) as ListFilesResponseType;
    return res;
  });

  const personalFileList = useMemo((): FileListItemType[] => {
    return (fileListDataRaw?.files as FileListItemType[]) ?? [];
  }, [fileListDataRaw?.files]);

  useEffect(() => {
    if (fileListError) {
      handleErrorWithUI(fileListError, "個人ファイル一覧取得", setError);
    }
  }, [fileListError]);

  const handleDeleteFile = async (fileId: number) => {
    if (!groupId || !selectedUser) return;
    const ok = window.confirm("このファイルを削除しますか？");
    if (!ok) return;
    try {
      await delete_external_user_file_v2_user_manage_line__group_id___external_user_id__files__file_id__delete(
        groupId,
        selectedUser.userId,
        String(fileId),
      );
      showSuccessToast("ファイルを削除しました");
      await mutateFileList();
    } catch (e: unknown) {
      handleErrorWithUI(e, "ファイル削除", setError);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        size="5xl"
        placement="center"
        backdrop="blur"
        scrollBehavior="inside"
        classNames={{
          base: "bg-white mx-2 sm:mx-0",
          backdrop: "bg-[#292f46]/50 backdrop-opacity-40",
          wrapper: "items-end sm:items-center",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="pb-2">
                <div className="flex items-center justify-between w-full gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-gray-900 truncate">
                      個人ファイル管理（{selectedUser.userName || "未設定"}）
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      LINE: {selectedUser.lineUserId}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => mutateFileList()}
                      startContent={<RefreshCcw size={16} />}
                      isDisabled={isFileListLoading}
                    >
                      更新
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={() => setIsFileUploadOpen(true)}
                      startContent={<Upload size={16} />}
                    >
                      追加
                    </Button>
                  </div>
                </div>
              </ModalHeader>

              <ModalBody>
                {error && (
                  <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg relative text-danger text-sm">
                    {error}
                    <button
                      onClick={() => setError(null)}
                      className="absolute top-2 right-2"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <Input
                    size="sm"
                    variant="bordered"
                    placeholder="ファイル名で検索..."
                    value={fileSearchTerm}
                    onValueChange={setFileSearchTerm}
                    startContent={<Search size={16} />}
                    className="w-full sm:w-96"
                  />
                  <div className="text-xs text-gray-500">
                    この一覧は「個人」ファイルのみ表示します
                  </div>
                </div>

                {isFileListLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Spinner size="lg" />
                  </div>
                ) : personalFileList.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    <FileText
                      size={48}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <div className="font-medium">個人ファイルがありません</div>
                    <div className="text-sm mt-1">
                      「追加」からアップロードしてください
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {personalFileList.map((f) => {
                      const ext = (f.fileExtension || "other").toLowerCase();
                      const info = SUPPORTED_FILE_TYPES[ext] || {
                        color: "default",
                        displayName: "OTHER",
                      };
                      return (
                        <div
                          key={f.fileId}
                          className="bg-white border border-gray-200 rounded-lg px-3 sm:px-4 py-3 flex items-start sm:items-center justify-between gap-3 hover:shadow-sm transition-shadow flex-wrap"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-2 rounded-lg bg-${info.color}-50 text-${info.color}-500`}
                            >
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {f.fileName}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
                                <span
                                  className={`font-bold px-1.5 py-0.5 rounded bg-${info.color}-100 text-${info.color}-700 uppercase`}
                                >
                                  {info.displayName}
                                </span>
                                <span>データ {f.chunkLen ?? 0}件</span>
                                <span>
                                  {new Date(f.createdAt).toLocaleDateString(
                                    "ja-JP",
                                    {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <Button
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => handleDeleteFile(f.fileId)}
                              startContent={<Trash2 size={16} />}
                              className="hover:bg-danger-50"
                            >
                              削除
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ModalBody>

              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  閉じる
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <UserFileUploadModal
        isOpen={isFileUploadOpen}
        onClose={() => setIsFileUploadOpen(false)}
        onUploaded={async () => {
          await mutateFileList();
        }}
        groupId={groupId}
        externalUserId={selectedUser.userId}
      />
    </>
  );
};

export default UserFileManagerModal;
