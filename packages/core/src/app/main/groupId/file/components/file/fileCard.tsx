"use client";

import { Spinner } from "@heroui/react";
import { Tooltip } from "@heroui/tooltip";
import { Chip } from "@heroui/react";
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/react";
import { Checkbox } from "@heroui/react";
import React, { memo, useState } from "react";
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

// zschema とサービス関数を使用してレスポンス検証と呼び出しを行う
import {
  GetFileSignedUrlResponse,
  type GetFileSignedUrlResponseType,
  FileListItemType,
} from "@repo/api-contracts/based_template/zschema";
import { get_file_v2_file_get__file_id__get } from "@repo/api-contracts/based_template/service";
import { handleErrorWithUI } from "@common/errorHandler";

// ファイルアイコン設定のインポート
import { fileIconMap } from "../../types/type";

// ローカル型定義
type FileListItem = FileListItemType & {
  categoryNames: string[];
  displayChunkCount?: number;
};

type FileCardProps = {
  file: FileListItem;
  onClick: () => void;
  isSelected: boolean;
  /**
   * 複数選択モードかどうか（これにより chunkLen=0 でも選択可にする）
   */
  isSelectable: boolean;
  /**
   * 表示バリアント（compact は縦の高さを抑えた表示）
   */
  variant?: "default" | "compact";
};

const getFileIcon = (fileExtension?: string, size: "sm" | "md" = "md") => {
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  if (!fileExtension) {
    const defaultIcon = fileIconMap["default"];
    if (!defaultIcon)
      return <FaFileAlt className={`text-gray-500 ${sizeClass}`} />;
    const IconComponent = getIconComponent(defaultIcon.icon);
    return <IconComponent className={`${defaultIcon.color} ${sizeClass}`} />;
  }

  const lower = fileExtension.toLowerCase();
  const iconConfig = fileIconMap[lower] || fileIconMap["default"];

  if (!iconConfig)
    return <FaFileAlt className={`text-gray-500 ${sizeClass}`} />;
  const IconComponent = getIconComponent(iconConfig.icon);
  return <IconComponent className={`${iconConfig.color} ${sizeClass}`} />;
};

// アイコンコンポーネントを取得するヘルパー関数
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
      return FaFileAlt;
    default:
      return FaFileAlt;
  }
};

const getTooltipContent = (fileExtension?: string) => {
  if (!fileExtension) {
    const defaultIcon = fileIconMap["default"];
    return defaultIcon?.tooltip || "ダウンロード";
  }

  const lower = fileExtension.toLowerCase();
  const iconConfig = fileIconMap[lower] || fileIconMap["default"];
  return iconConfig?.tooltip || "ダウンロード";
};

const FileCard: React.FC<FileCardProps> = ({
  file,
  onClick,
  isSelected,
  isSelectable,
  variant = "default",
}) => {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  // 表示用のデータ数はファイル項目に付与済み
  const displayChunkCount =
    typeof file.displayChunkCount === "number"
      ? file.displayChunkCount
      : typeof file.chunkLen === "number"
        ? file.chunkLen
        : 0;
  const isPersonal = file.isPersonal === true;

  /**
   * ここで「qaLen = 0」相当を chunkLen = 0 と解釈し、
   * 選択モードでなければクリック不可にする
   */
  const hasNoChunks = displayChunkCount === 0;
  const isDisplayed = file.displayFileLink !== false; // undefinedの場合もtrue扱い

  // プレビューボタンのクリックハンドラ
  const handlePreviewClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // カードのクリックイベントを無効化

    if (isPreviewLoading) return;

    setIsPreviewLoading(true);
    try {
      const fileExtension = file.fileExtension?.toLowerCase();
      const iconConfig = fileExtension
        ? fileIconMap[fileExtension] || fileIconMap["default"]
        : fileIconMap["default"];
      const isPreviewable = iconConfig?.isPreviewable || false;

      // プレビューまたはダウンロードを実行
      if (isPreviewable) {
        // URL 準備後に別タブを開く（事前の空タブは開かない）
        await previewFile(file.fileId, file.fileName, fileExtension);
      } else {
        // その他のファイルはダウンロード
        await downloadFile(file.fileId, file.fileName, fileExtension);
      }
    } catch (error) {
      handleErrorWithUI(error, "ファイル処理");
    } finally {
      setIsPreviewLoading(false);
    }
  };

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
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ファイルプレビュー（PDF、テキストファイル用）
  const previewFile = async (
    fileId: number,
    fileName: string,
    fileExtension?: string,
  ) => {
    try {
      console.log("プレビュー準備開始:", { fileId, fileName, fileExtension });
      const { signedUrl: url } = await fetchSignedUrl(fileId);
      if (!url) throw new Error("署名付きURLが取得できませんでした");

      // txtファイルの場合はエンコーディングを明示的に処理して新規タブで開く
      if (fileExtension?.toLowerCase() === "txt") {
        await openTextFile(url, fileName);
      } else {
        // PDFなどの場合は直接URLを開く
        openInNewTab(url);
      }
    } catch (error) {
      const apiError = handleErrorWithUI(error, "ファイルプレビュー");
      throw new Error(apiError.message);
    }
  };

  // ファイルダウンロード
  const downloadFile = async (
    fileId: number,
    fileName: string,
    fileExtension?: string,
  ) => {
    try {
      console.log("ダウンロード開始:", { fileId, fileName, fileExtension });
      const { signedUrl: url } = await fetchSignedUrl(fileId);
      if (!url) throw new Error("署名付きURLが取得できませんでした");

      triggerDownload(url, fileName);
      console.log("ダウンロード開始:", fileName);
    } catch (error) {
      const apiError = handleErrorWithUI(error, "ファイルダウンロード");
      throw new Error(apiError.message);
    }
  };

  // txtファイル用の新規タブで開く処理（エンコーディング対応）
  const openTextFile = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ファイルの取得に失敗しました: ${response.statusText}`);
      }

      // レスポンスをテキストとして取得（UTF-8として解釈）
      const text = await response.text();

      // UTF-8 BOM付きでBlobを作成（文字化けを防ぐ）
      const bom = "\uFEFF";
      const blob = new Blob([bom + text], { type: "text/plain;charset=utf-8" });

      // Blob URLを作成して新規タブで開く
      const blobUrl = URL.createObjectURL(blob);
      openInNewTab(blobUrl);

      // メモリリークを防ぐためにURLを解放
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("テキストファイル表示エラー:", error);
      throw error;
    }
  };

  // 選択状態か / チャンク数0かによってクラスを切り替え
  let cardClassName = "";
  if (isSelected) {
    cardClassName =
      "border-2 border-blue-500 bg-blue-50 transition-colors duration-300 shadow-lg ring-2 ring-blue-200";
  } else if (isSelectable) {
    // 複数選択モード時は選択可能であることを示す
    cardClassName =
      "border border-gray-300 bg-white hover:border-blue-400 hover:shadow-md transition-colors duration-300 shadow cursor-pointer";
  } else if (hasNoChunks) {
    // チャンク数0のファイルは灰色表示（ただしクリック可能）
    cardClassName = "border border-gray-300 bg-gray-200 text-gray-500";
  } else {
    // 通常のファイル
    cardClassName =
      "border border-gray-300 bg-gray-100 hover:border-gray-500 transition-colors duration-300 shadow text-gray-600";
  }

  // カードをラップする要素で、はみ出し部分を確実に表示するためのスペースを確保
  return (
    <div
      className={`relative group ${variant === "compact" ? "pt-2 pr-2 pb-1 pl-2" : "pt-2 pr-2 pb-2 pl-2"}`}
    >
      {/* プレビューアイコン - 複数選択モードでない時のみ表示 */}
      {!isSelectable && (
        <div className="absolute top-1 right-1 z-20">
          <Tooltip
            content={getTooltipContent(file.fileExtension || undefined)}
            placement="top"
          >
            <button
              onClick={handlePreviewClick}
              disabled={isPreviewLoading}
              className="w-8 h-8 rounded-full flex items-center justify-center 
                       transition-all duration-200 
                       hover:bg-blue-100 hover:text-blue-600 
                       text-gray-500 hover:shadow-md
                       disabled:opacity-50 disabled:cursor-not-allowed
                       bg-white/90 backdrop-blur-sm shadow-sm"
              aria-label={getTooltipContent(file.fileExtension || undefined)}
            >
              {isPreviewLoading ? (
                <Spinner size="sm" color="primary" />
              ) : file.fileExtension ? (
                (() => {
                  const lower = file.fileExtension.toLowerCase();
                  const iconConfig =
                    fileIconMap[lower] || fileIconMap["default"];
                  return iconConfig?.isPreviewable ? (
                    <FaEye className="w-4 h-4" />
                  ) : (
                    <FaDownload className="w-4 h-4" />
                  );
                })()
              ) : (
                <FaDownload className="w-4 h-4" />
              )}
            </button>
          </Tooltip>
        </div>
      )}

      <Card
        isPressable={true}
        onPress={onClick}
        className={`w-full ${cardClassName} relative overflow-hidden rounded-lg ${hasNoChunks ? "bg-gray-200" : "bg-white"} ${variant === "default" ? "h-[180px]" : ""} flex flex-col`}
        aria-label={`ファイル名 ${file.fileName}, タイプ ${file.fileExtension}, データ数 ${
          displayChunkCount
        }, 作成日 ${new Date(file.createdAt).toLocaleDateString("ja-JP")}`}
      >
        {isSelectable && (
          <div className="absolute top-2 right-2 z-20">
            <Checkbox
              isSelected={isSelected}
              onChange={() => onClick()}
              onClick={(e) => e.stopPropagation()}
              aria-label="選択を切り替え"
            />
          </div>
        )}

        {variant === "compact" ? (
          <>
            <CardHeader className="flex items-center space-x-2 py-2">
              {getFileIcon(file.fileExtension || undefined, "sm")}
              <Tooltip content={file.fileName} placement="top">
                <div
                  className="text-sm font-medium truncate"
                  title={file.fileName}
                >
                  {file.fileName}
                </div>
              </Tooltip>
              {isPersonal && (
                <Chip size="sm" color="secondary" variant="flat">
                  個人
                </Chip>
              )}
            </CardHeader>
            <CardBody className="py-1">
              <div className="text-[11px] text-gray-600 flex flex-wrap gap-x-2 gap-y-1">
                <span>
                  {file.fileExtension
                    ? file.fileExtension.toUpperCase()
                    : "N/A"}
                </span>
                <span>•</span>
                <span>データ {displayChunkCount}</span>
                <span>•</span>
                <span>{isDisplayed ? "参考資料:表示" : "参考資料:なし"}</span>
              </div>
              {file.categoryNames && file.categoryNames.length > 0 && (
                <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
                  {(() => {
                    const firstCategory = file.categoryNames[0];
                    if (!firstCategory) return null;

                    return file.categoryNames.length === 1 ? (
                      <Chip
                        className="text-xs flex-shrink-0 max-w-[calc(100%-40px)]"
                        size="sm"
                        content={`カテゴリー: ${firstCategory}`}
                      >
                        {firstCategory.length > 15
                          ? `${firstCategory.slice(0, 15)}...`
                          : firstCategory}
                      </Chip>
                    ) : (
                      <>
                        <Chip
                          className="text-xs flex-shrink-0 max-w-[calc(100%-50px)]"
                          size="sm"
                          content={`カテゴリー: ${firstCategory}`}
                        >
                          {firstCategory.length > 12
                            ? `${firstCategory.slice(0, 12)}...`
                            : firstCategory}
                        </Chip>
                        <Chip
                          className="text-xs flex-shrink-0"
                          size="sm"
                          color="default"
                          variant="bordered"
                          content={`他${file.categoryNames.length - 1}個のカテゴリ: ${file.categoryNames.slice(1).join(", ")}`}
                        >
                          +{file.categoryNames.length - 1}
                        </Chip>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardBody>
          </>
        ) : (
          <>
            <CardHeader className="flex items-center space-x-2 py-2 px-3">
              {getFileIcon(file.fileExtension || undefined, "sm")}
              <Tooltip content={file.fileName} placement="top">
                <div
                  className="text-base font-semibold truncate flex-1"
                  title={file.fileName}
                >
                  {file.fileName}
                </div>
              </Tooltip>
              {isPersonal && (
                <Chip size="sm" color="secondary" variant="flat">
                  個人
                </Chip>
              )}
            </CardHeader>
            <CardBody className="space-y-1 py-2 px-3 flex-1 overflow-hidden min-h-0">
              <p className="flex items-center text-xs">
                <span className="font-medium">タイプ:</span>&nbsp;
                <span className="text-gray-600">
                  {file.fileExtension
                    ? file.fileExtension.toUpperCase()
                    : "N/A"}
                </span>
              </p>
              <p className="flex items-center text-xs">
                <span className="font-medium">データ数:</span>&nbsp;
                <span className="text-gray-600">{displayChunkCount}</span>
              </p>
              <p className="flex items-center text-xs">
                <span className="font-medium">参考資料:</span>&nbsp;
                <span className="text-gray-500">
                  {isDisplayed ? "表示あり" : "表示なし"}
                </span>
              </p>
              {file.categoryNames && file.categoryNames.length > 0 && (
                <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
                  {(() => {
                    const firstCategory = file.categoryNames[0];
                    if (!firstCategory) return null;

                    return file.categoryNames.length === 1 ? (
                      <Chip
                        className="text-xs flex-shrink-0 max-w-[calc(100%-40px)]"
                        size="sm"
                        content={`カテゴリー: ${firstCategory}`}
                      >
                        {firstCategory.length > 18
                          ? `${firstCategory.slice(0, 18)}...`
                          : firstCategory}
                      </Chip>
                    ) : (
                      <>
                        <Chip
                          className="text-xs flex-shrink-0 max-w-[calc(100%-50px)]"
                          size="sm"
                          content={`カテゴリー: ${firstCategory}`}
                        >
                          {firstCategory.length > 15
                            ? `${firstCategory.slice(0, 15)}...`
                            : firstCategory}
                        </Chip>
                        <Chip
                          className="text-xs flex-shrink-0"
                          size="sm"
                          color="default"
                          variant="bordered"
                          content={`他${file.categoryNames.length - 1}個のカテゴリ: ${file.categoryNames.slice(1).join(", ")}`}
                        >
                          +{file.categoryNames.length - 1}
                        </Chip>
                      </>
                    );
                  })()}
                </div>
              )}
            </CardBody>
            <CardFooter className="text-xs text-gray-400 py-1.5 px-3">
              {new Date(file.createdAt).toLocaleDateString("ja-JP")}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
};

export default memo(FileCard);
