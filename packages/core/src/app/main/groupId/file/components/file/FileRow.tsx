"use client";

import React, { memo } from "react";
import { Checkbox, Tooltip } from "@heroui/react";
import { Spinner } from "@heroui/react";
import {
  FaDownload,
  FaEye,
  FaFileAlt,
  FaFileAudio,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
} from "react-icons/fa";

import type { FileListItemType } from "@repo/api-contracts/based_template/zschema";
import {
  GetFileSignedUrlResponse,
  type GetFileSignedUrlResponseType,
} from "@repo/api-contracts/based_template/zschema";
import { get_file_v2_file_get__file_id__get } from "@repo/api-contracts/based_template/service";
// 署名付きURLはまだcontracts未生成のため直接叩く
import { fileIconMap } from "../../types/type";

type FileListItem = FileListItemType & {
  categoryNames: string[];
  displayChunkCount?: number;
};

type FileListRowProps = {
  file: FileListItem;
  onClick: () => void;
  isSelected: boolean;
  isSelectable: boolean;
};

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case "FaFilePdf":
      return FaFilePdf;
    case "FaFileCsv":
      return FaFileCsv;
    case "FaFileExcel":
      return FaFileExcel;
    case "FaFileWord":
      return FaFileWord;
    case "FaFilePowerpoint":
      return FaFilePowerpoint;
    case "FaFileAudio":
      return FaFileAudio;
    case "FaFileVideo":
      return FaFileVideo;
    case "FaFileAlt":
    default:
      return FaFileAlt;
  }
};

const getFileIcon = (fileExtension?: string) => {
  const sizeClass = "w-4 h-4";
  const lower = (fileExtension || "").toLowerCase();
  const iconConfig = fileIconMap[lower] || fileIconMap["default"];
  const IconComponent = getIconComponent(iconConfig?.icon || "FaFileAlt");
  return (
    <IconComponent
      className={`${iconConfig?.color || "text-gray-500"} ${sizeClass}`}
    />
  );
};

const getTooltipContent = (fileExtension?: string) => {
  const lower = (fileExtension || "").toLowerCase();
  const iconConfig = fileIconMap[lower] || fileIconMap["default"];
  return iconConfig?.tooltip || "ダウンロード";
};

const FileListRow: React.FC<FileListRowProps> = ({
  file,
  onClick,
  isSelected,
  isSelectable,
}) => {
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);

  const displayChunkCount =
    typeof file.displayChunkCount === "number"
      ? file.displayChunkCount
      : typeof file.chunkLen === "number"
        ? file.chunkLen
        : 0;

  const isDisplayed = file.displayFileLink !== false;
  const isPersonal = file.isPersonal === true;

  const fetchSignedUrl = async (
    fileId: number,
  ): Promise<GetFileSignedUrlResponseType> => {
    const json = await get_file_v2_file_get__file_id__get(fileId.toString());
    const parsed = GetFileSignedUrlResponse.safeParse(json);
    if (parsed.success) return parsed.data;
    const fallbackUrl = json?.signedUrl || json?.signed_url;
    if (fallbackUrl) {
      return {
        fileId: json?.fileId ?? fileId,
        fileName: json?.fileName || json?.file_name || "file",
        signedUrl: fallbackUrl,
        expiresAt: json?.expiresAt || json?.expires_at,
      } as unknown as GetFileSignedUrlResponseType;
    }
    throw new Error("署名付きURLレスポンスの検証に失敗しました");
  };

  const openInNewTab = (url: string) => {
    // 新規タブを1つだけ開くため、アンカー要素の click に統一
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPreviewLoading) return;
    setIsPreviewLoading(true);
    try {
      const fileExtension = file.fileExtension?.toLowerCase();
      const iconConfig = fileExtension
        ? fileIconMap[fileExtension] || fileIconMap["default"]
        : fileIconMap["default"];
      const isPreviewable = iconConfig?.isPreviewable || false;
      if (isPreviewable) {
        const { signedUrl } = await fetchSignedUrl(file.fileId);
        if (!signedUrl) throw new Error("署名付きURLが取得できませんでした");
        // 準備完了後に別タブを開く（同一タブへは遷移しない）
        openInNewTab(signedUrl);
      } else {
        const { signedUrl } = await fetchSignedUrl(file.fileId);
        if (!signedUrl) throw new Error("署名付きURLが取得できませんでした");
        triggerDownload(signedUrl, file.fileName);
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`w-full select-none transition-colors duration-150 px-3 py-2 text-sm 
        ${
          isSelected
            ? "bg-blue-50 ring-1 ring-blue-300"
            : "bg-white odd:bg-white even:bg-gray-50 hover:bg-gray-100 hover:ring-1 hover:ring-gray-300"
        } first:rounded-t-lg last:rounded-b-lg`}
      aria-label={`ファイル ${file.fileName}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isSelectable && (
          <Checkbox
            isSelected={isSelected}
            readOnly
            aria-label="select file"
            size="sm"
          />
        )}

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0">
            {getFileIcon(file.fileExtension || undefined)}
          </div>
          <Tooltip content={file.fileName} placement="top">
            <div
              className="truncate font-medium text-gray-800"
              title={file.fileName}
            >
              {file.fileName}
            </div>
          </Tooltip>
          {isPersonal && (
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-medium text-purple-700">
              個人
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          <span className="shrink-0">
            {(file.fileExtension || "N/A").toUpperCase()}
          </span>
          <span className="shrink-0">データ {displayChunkCount}</span>
          <span className="shrink-0">{isDisplayed ? "表示" : "非表示"}</span>
          <span className="shrink-0">
            {new Date(file.createdAt).toLocaleDateString("ja-JP")}
          </span>
        </div>

        <div className="ml-2 shrink-0">
          <Tooltip
            content={getTooltipContent(file.fileExtension || undefined)}
            placement="top"
          >
            <button
              onClick={handlePreviewClick}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-white hover:bg-gray-100 border text-gray-600"
              aria-label={getTooltipContent(file.fileExtension || undefined)}
            >
              {isPreviewLoading ? (
                <Spinner size="sm" />
              ) : (
                (() => {
                  const lower = (file.fileExtension || "").toLowerCase();
                  const iconConfig =
                    fileIconMap[lower] || fileIconMap["default"];
                  return iconConfig?.isPreviewable ? (
                    <FaEye className="w-3.5 h-3.5" />
                  ) : (
                    <FaDownload className="w-3.5 h-3.5" />
                  );
                })()
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default memo(FileListRow);
