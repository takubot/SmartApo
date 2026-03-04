import { addToast } from "@heroui/react";
import { list_files_for_bot_v2_bot_get__group_id___bot_id__file_list_get } from "@repo/api-contracts/based_template/service";
import type {
  BotResponseSchemaType,
  FileResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGroupContext } from "../../layout-client";
import type { FileItem } from "../types";
import { handleErrorWithUI } from "@common/errorHandler";

export function useFile(refreshBotList?: () => Promise<void>) {
  const groupId = useGroupContext();
  const [isFileEditModalOpen, setIsFileEditModalOpen] = useState(false);
  const [fileEditBot, setFileEditBot] = useState<BotResponseSchemaType | null>(
    null,
  );
  const [fileListForEdit, setFileListForEdit] = useState<FileItem[]>([]);
  const [isFileListLoading, setIsFileListLoading] = useState(false);

  // 新規作成用ファイル一覧取得（編集用の関数を流用）
  const fetchFilesForCreate = useCallback(async () => {
    if (!groupId) {
      handleErrorWithUI(
        { message: "グループIDが不正です。" },
        "ファイル一覧取得",
      );
      return [];
    }

    setIsFileListLoading(true);
    try {
      // 新規作成時はbot_id=0で全ファイルを取得（isAssociated=false）
      const response: FileResponseSchemaType[] =
        await list_files_for_bot_v2_bot_get__group_id___bot_id__file_list_get(
          groupId,
          "0",
        );

      const fileList = response.map((file: FileResponseSchemaType) => ({
        fileId: file.fileId,
        fileName: file.fileName,
        isAssociated: false, // 新規作成時は常にfalse
      }));

      setFileListForEdit(fileList);
      return fileList;
    } catch (error) {
      handleErrorWithUI(error, "ファイル一覧取得");
      setFileListForEdit([]);
      return [];
    } finally {
      setIsFileListLoading(false);
    }
  }, [groupId]);

  // 編集モーダル用ファイル一覧取得
  const openFileEditModal = useCallback(
    async (bot: BotResponseSchemaType) => {
      if (!groupId) {
        handleErrorWithUI(
          { message: "グループIDが不正です。" },
          "ファイル一覧取得",
        );
        return;
      }

      setFileEditBot(bot);
      setIsFileEditModalOpen(true);
      setIsFileListLoading(true);

      try {
        const response: FileResponseSchemaType[] =
          await list_files_for_bot_v2_bot_get__group_id___bot_id__file_list_get(
            groupId,
            bot.botId.toString(),
          );

        const fileList = response.map((file: FileResponseSchemaType) => ({
          fileId: file.fileId,
          fileName: file.fileName,
          isAssociated: file.isAssociated,
        }));

        setFileListForEdit(fileList);
      } catch (error) {
        handleErrorWithUI(error, "ファイル一覧取得");
        setFileListForEdit([]);
      } finally {
        setIsFileListLoading(false);
      }
    },
    [groupId],
  );

  // ファイル編集モーダルを閉じる
  const closeFileEditModal = useCallback(() => {
    setIsFileEditModalOpen(false);
    setFileEditBot(null);
    setFileListForEdit([]);
  }, []);

  return {
    // 状態
    isFileEditModalOpen,
    fileEditBot,
    fileListForEdit,
    isFileListLoading,

    // 操作
    openFileEditModal,
    closeFileEditModal,
    fetchFilesForCreate,
    setFileListForEdit,
  };
}

export function useFileEditModal(fileList: FileItem[]) {
  const [localFileList, setLocalFileList] = useState<FileItem[]>(() =>
    fileList.map((file) => ({ ...file })),
  );
  const [baselineFileList, setBaselineFileList] = useState<FileItem[]>(() =>
    fileList.map((file) => ({ ...file })),
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    setLocalFileList(fileList.map((file) => ({ ...file })));
    setBaselineFileList(fileList.map((file) => ({ ...file })));
  }, [fileList]);

  const normalizedSearchTerm = useMemo(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm],
  );

  const filterPredicate = useCallback(
    (file: FileItem) => {
      if (!normalizedSearchTerm) {
        return true;
      }
      return file.fileName.toLowerCase().includes(normalizedSearchTerm);
    },
    [normalizedSearchTerm],
  );

  const filteredFiles = useMemo(
    () =>
      localFileList
        .filter(filterPredicate)
        .sort((a, b) => a.fileName.localeCompare(b.fileName, "ja")),
    [localFileList, filterPredicate],
  );

  const groupFiles = useCallback((fileName: string): string => {
    const segments = fileName
      .split(/[\\/]/)
      .filter((segment) => segment.trim().length > 0);
    if (segments.length === 0) {
      return "未分類";
    }
    if (segments.length === 1) {
      return "未分類";
    }
    return segments[0] ?? "未分類";
  }, []);

  const groupedFiles = useMemo(() => {
    const groups = filteredFiles.reduce<Record<string, FileItem[]>>(
      (accumulator, file) => {
        const groupName = groupFiles(file.fileName);
        const existingGroup = accumulator[groupName];
        if (existingGroup) {
          existingGroup.push(file);
        } else {
          accumulator[groupName] = [file];
        }
        return accumulator;
      },
      {},
    );

    const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b, "ja"),
    );

    return sortedGroupEntries.reduce<Record<string, FileItem[]>>(
      (accumulator, [groupName, files]) => {
        const sortedGroup = [...files].sort((a, b) =>
          a.fileName.localeCompare(b.fileName, "ja"),
        );
        accumulator[groupName] = sortedGroup;
        return accumulator;
      },
      {},
    );
  }, [filteredFiles, groupFiles]);

  const baselineFileAssociationMap = useMemo(() => {
    return new Map(
      baselineFileList.map((file) => [file.fileId, file.isAssociated]),
    );
  }, [baselineFileList]);

  const hasChanges = useMemo(() => {
    if (baselineFileList.length !== localFileList.length) {
      return true;
    }

    return localFileList.some((file) => {
      const baselineAssociation = baselineFileAssociationMap.get(file.fileId);
      return baselineAssociation !== file.isAssociated;
    });
  }, [baselineFileAssociationMap, baselineFileList, localFileList]);

  const totalFiles = filteredFiles.length;
  const selectedCount = useMemo(
    () => localFileList.filter((file) => file.isAssociated).length,
    [localFileList],
  );

  const handleToggleFile = useCallback((fileId: number) => {
    setLocalFileList((previousList) =>
      previousList.map((file) =>
        file.fileId === fileId
          ? { ...file, isAssociated: !file.isAssociated }
          : file,
      ),
    );
  }, []);

  const handleSelectAll = useCallback(
    (selectAll: boolean) => {
      setLocalFileList((previousList) =>
        previousList.map((file) =>
          filterPredicate(file) ? { ...file, isAssociated: selectAll } : file,
        ),
      );
    },
    [filterPredicate],
  );

  const resetState = useCallback(() => {
    setSearchTerm("");
    setLocalFileList(baselineFileList.map((file) => ({ ...file })));
  }, [baselineFileList]);

  return {
    localFileList,
    searchTerm,
    hasChanges,
    filteredFiles,
    groupedFiles,
    totalFiles,
    selectedCount,
    handleToggleFile,
    handleSelectAll,
    setSearchTerm,
    resetState,
  } as const;
}
