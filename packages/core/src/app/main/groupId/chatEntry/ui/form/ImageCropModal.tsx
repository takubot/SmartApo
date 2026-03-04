"use client";

import React, { useCallback, useState, useEffect } from "react";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import Cropper, { Area } from "react-easy-crop";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropCompleted: (file: File) => void;
  cropShape?: "rect" | "round";
  aspect?: number;
  title?: string;
  description?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  onCropCompleted,
  cropShape = "rect",
  aspect,
  title = "チャットボタン画像を設定",
  description = "画像をアップロードして、自由に切り取りたい部分を選択してください",
}) => {
  // CSSスタイルを動的に追加
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .crop-container .react-easy-crop__crop-area {
        border: 2px solid #3b82f6 !important;
        background-color: rgba(59, 130, 246, 0.1) !important;
      }
      .crop-container .react-easy-crop__crop-area::before {
        content: '';
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border: 2px dashed #3b82f6;
        pointer-events: none;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle {
        background-color: #3b82f6 !important;
        border: 2px solid #ffffff !important;
        width: 16px !important;
        height: 16px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        cursor: pointer !important;
        z-index: 10 !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle:hover {
        background-color: #2563eb !important;
        transform: scale(1.3) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle:active {
        background-color: #1d4ed8 !important;
        transform: scale(1.1) !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-nw {
        top: -8px !important;
        left: -8px !important;
        cursor: nw-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-ne {
        top: -8px !important;
        right: -8px !important;
        cursor: ne-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-sw {
        bottom: -8px !important;
        left: -8px !important;
        cursor: sw-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-se {
        bottom: -8px !important;
        right: -8px !important;
        cursor: se-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-n {
        top: -8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        cursor: n-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-s {
        bottom: -8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        cursor: s-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-w {
        left: -8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        cursor: w-resize !important;
      }
      .crop-container .react-easy-crop__crop-area .react-easy-crop__crop-area-handle-e {
        right: -8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        cursor: e-resize !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string>("");
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg">("png");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [hasTransparency, setHasTransparency] = useState<boolean>(false);
  const [cropSize, setCropSize] = useState<{ width: number; height: number }>({
    width: 200,
    height: 200,
  });

  // モーダルを開く/閉じるたびに状態をリセット
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setOutputFormat("png");
      setBackgroundColor("#ffffff");
      setHasTransparency(false);
      setCropSize({ width: 200, height: 200 });
    } else {
      setSelectedFile(null);
      setImageSrc("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setOutputFormat("png");
      setBackgroundColor("#ffffff");
      setHasTransparency(false);
      setCropSize({ width: 200, height: 200 });
    }
  }, [isOpen]);

  // 画像形式を自動検出する関数
  const detectImageFormat = (file: File): "png" | "jpeg" => {
    // MIMEタイプから判定
    if (
      file.type === "image/png" ||
      file.type === "image/gif" ||
      file.type === "image/svg+xml"
    ) {
      return "png";
    }

    // ファイル拡張子から判定
    const extension = file.name.toLowerCase().split(".").pop();
    if (extension === "png" || extension === "gif" || extension === "svg") {
      return "png";
    }

    // デフォルトはJPEG
    return "jpeg";
  };

  // 透明背景を検出する関数
  const detectTransparency = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // 画像の一部をサンプリングして透明ピクセルがあるかチェック
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        if (data && data.length > 0) {
          for (let i = 3; i < data.length; i += 4) {
            const alpha = data[i];
            if (alpha !== undefined && alpha < 255) {
              // アルファ値が255未満（透明または半透明）
              resolve(true);
              return;
            }
          }
        }
        resolve(false);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  };

  // ファイル選択
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0] as File;

    // 拡張子チェック
    const validExt = /\.(png|jpg|jpeg|gif|svg)$/i;
    if (!validExt.test(file.name)) {
      alert("画像ファイルを選択してください。");
      return;
    }
    // サイズチェック
    if (file.size > 5 * 1024 * 1024) {
      alert("ファイルサイズは5MB以下にしてください。");
      return;
    }

    // 透明背景を検出
    const hasTransparency = await detectTransparency(file);
    setHasTransparency(hasTransparency);

    // 画像形式を自動検出（透明背景の場合は強制的にPNG）
    const detectedFormat = hasTransparency ? "png" : detectImageFormat(file);
    setOutputFormat(detectedFormat);

    setSelectedFile(file);
    setImageSrc(URL.createObjectURL(file));
  };

  // Crop 完了
  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  // 切り取り実行
  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // 元の解像度を保持（クロップされた領域のサイズをそのまま使用）
    const outputWidth = Math.round(pixelCrop.width);
    const outputHeight = Math.round(pixelCrop.height);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // 高品質な画像描画設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // PNG形式または透明背景の場合は背景を透明に設定、JPEG形式の場合は選択された背景色を設定
    if (outputFormat === "png" || hasTransparency) {
      ctx.clearRect(0, 0, outputWidth, outputHeight);
    } else {
      // JPEG形式の場合は選択された背景色を設定
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, outputWidth, outputHeight);
    }

    // 正円クロップの場合はクリッピングパスを設定
    if (cropShape === "round") {
      const centerX = outputWidth / 2;
      const centerY = outputHeight / 2;
      const radius = Math.min(outputWidth, outputHeight) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.clip();
    }

    // 画像を描画（Canvas描画によりEXIF、GPS、その他のメタデータが自動的に除去される）
    // これにより、プライバシー保護とファイルサイズ削減を実現
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputWidth,
      outputHeight,
    );

    return new Promise<Blob>((resolve, reject) => {
      const mimeType = outputFormat === "png" ? "image/png" : "image/jpeg";
      // 高品質を維持するため、JPEG品質を0.95に設定（メタデータ削除のため）
      const quality = outputFormat === "jpeg" ? 0.95 : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty."));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality,
      );
    });
  };

  // 決定ボタン
  const handleConfirm = async () => {
    if (!imageSrc || !selectedFile || !croppedAreaPixels) {
      onClose();
      return;
    }
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      // ファイル名を生成（元のファイル名から拡張子を取得して選択された形式に変更）
      const originalName = selectedFile.name;
      const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
      const timestamp = Date.now();
      const optimizedFileName = `${nameWithoutExt}_${timestamp}.${outputFormat}`;

      // メタデータを除去し、高品質を保持した最適化ファイルを作成
      // Canvas描画によりEXIF、GPS、カラープロファイル等のメタデータが除去される
      const croppedFile = new File([croppedBlob], optimizedFileName, {
        type: outputFormat === "png" ? "image/png" : "image/jpeg",
        lastModified: Date.now(),
      });

      onCropCompleted(croppedFile);
      onClose();
    } catch (error) {
      console.error(error);
      alert("画像の切り取りに失敗しました。");
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" className="max-w-4xl">
      <ModalContent>
        <ModalHeader className="text-center">
          <div className="w-full">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {description}
              <br />
              <span className="text-xs text-blue-600">
                ※ 元の解像度を保持し、メタデータのみを削除して最適化します
              </span>
            </p>
          </div>
        </ModalHeader>
        <ModalBody className="px-6 py-4">
          <div className="space-y-6">
            {/* ファイル選択エリア */}
            {!imageSrc ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <div className="space-y-4">
                  <div className="text-gray-400">
                    <svg
                      className="mx-auto h-12 w-12"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <Button
                      as="label"
                      color="primary"
                      size="lg"
                      className="cursor-pointer"
                    >
                      画像を選択
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/gif, image/svg+xml"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      PNG, JPG, GIF, SVG形式（最大5MB）
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 選択されたファイル情報 */}
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {hasTransparency
                          ? "透明背景を検出 - PNG形式で出力"
                          : outputFormat === "png"
                            ? "PNG形式で出力"
                            : "背景色を設定"}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="light"
                    onPress={() => {
                      setSelectedFile(null);
                      setImageSrc("");
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                      setCroppedAreaPixels(null);
                    }}
                  >
                    変更
                  </Button>
                </div>

                {/* 背景色選択（JPEG形式かつ透明背景でない場合のみ） */}
                {outputFormat === "jpeg" && !hasTransparency && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-orange-800">
                        背景色:
                      </span>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-10 h-10 rounded border border-orange-300 cursor-pointer"
                      />
                      <span className="text-sm text-orange-700">
                        {backgroundColor}
                      </span>
                    </div>
                    <p className="text-xs text-orange-600 mt-2">
                      透明部分がある画像の場合、選択した色で塗りつぶされます
                    </p>
                  </div>
                )}

                {/* クロップエリア */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        クロップエリア
                      </span>
                    </div>
                    {croppedAreaPixels && (
                      <span className="text-xs text-gray-500">
                        クロップサイズ: {Math.round(croppedAreaPixels.width)} ×{" "}
                        {Math.round(croppedAreaPixels.height)}px
                      </span>
                    )}
                  </div>
                  <div
                    className="relative w-full h-[500px] rounded-lg overflow-hidden border-2 border-gray-200"
                    style={{
                      backgroundImage: `
                      linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)
                    `,
                      backgroundSize: "20px 20px",
                      backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                    }}
                  >
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      cropSize={cropSize}
                      onCropSizeChange={setCropSize}
                      aspect={aspect}
                      style={{
                        containerStyle: {
                          backgroundColor: "transparent",
                          width: "100%",
                          height: "100%",
                        },
                        cropAreaStyle: {
                          border: "2px solid #3b82f6",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                        },
                        mediaStyle: {
                          maxWidth: "100%",
                          maxHeight: "100%",
                        },
                      }}
                      cropShape={cropShape}
                      showGrid={cropShape === "rect"}
                      restrictPosition={false}
                      minZoom={0.1}
                      maxZoom={5}
                      onMediaLoaded={() => {
                        // 画像が読み込まれたときにクロップエリアを中央に配置
                        setCrop({ x: 0, y: 0 });
                      }}
                      classes={{
                        containerClassName: "crop-container",
                        cropAreaClassName: "crop-area",
                        mediaClassName: "crop-media",
                      }}
                    />
                  </div>
                </div>

                {/* クロップサイズコントロール（矩形の場合のみ表示） */}
                {cropShape === "rect" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        クロップサイズ
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.round(cropSize.width)} ×{" "}
                        {Math.round(cropSize.height)}px
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600">幅</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCropSize((prev) => ({
                                ...prev,
                                width: Math.max(50, prev.width - 10),
                              }))
                            }
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min={50}
                            max={400}
                            step={10}
                            value={cropSize.width}
                            onChange={(e) =>
                              setCropSize((prev) => ({
                                ...prev,
                                width: Number(e.target.value),
                              }))
                            }
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <button
                            onClick={() =>
                              setCropSize((prev) => ({
                                ...prev,
                                width: Math.min(400, prev.width + 10),
                              }))
                            }
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs text-gray-600">高さ</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setCropSize((prev) => ({
                                ...prev,
                                height: Math.max(50, prev.height - 10),
                              }))
                            }
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                          >
                            −
                          </button>
                          <input
                            type="range"
                            min={50}
                            max={400}
                            step={10}
                            value={cropSize.height}
                            onChange={(e) =>
                              setCropSize((prev) => ({
                                ...prev,
                                height: Number(e.target.value),
                              }))
                            }
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <button
                            onClick={() =>
                              setCropSize((prev) => ({
                                ...prev,
                                height: Math.min(400, prev.height + 10),
                              }))
                            }
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* 正円クロップの場合のサイズコントロール */}
                {cropShape === "round" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        サイズ
                      </span>
                      <span className="text-sm text-gray-500">
                        {Math.round(cropSize.width)} ×{" "}
                        {Math.round(cropSize.width)}px
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCropSize((prev) => ({
                            width: Math.max(50, prev.width - 10),
                            height: Math.max(50, prev.width - 10),
                          }))
                        }
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={50}
                        max={400}
                        step={10}
                        value={cropSize.width}
                        onChange={(e) => {
                          const size = Number(e.target.value);
                          setCropSize({ width: size, height: size });
                        }}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <button
                        onClick={() =>
                          setCropSize((prev) => ({
                            width: Math.min(400, prev.width + 10),
                            height: Math.min(400, prev.width + 10),
                          }))
                        }
                        className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* ズームコントロール */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      ズーム
                    </span>
                    <span className="text-sm text-gray-500">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={0.1}
                      max={5}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <button
                      onClick={() => setZoom(Math.min(5, zoom + 0.1))}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 操作ヒント */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">操作のヒント</p>
                      <ul className="text-xs mt-1 space-y-1">
                        <li>
                          •
                          クロップサイズコントロールで幅と高さを個別に調整（50px〜400px）
                        </li>
                        <li>
                          •
                          クロップエリアの角（四隅）をドラッグして自由にサイズを調整
                        </li>
                        <li>
                          •
                          クロップエリアの辺（上下左右）をドラッグして幅や高さを個別に調整
                        </li>
                        <li>• 画像をドラッグして位置を調整</li>
                        <li>
                          •
                          ズームボタンまたはスライダーで全体のサイズを変更（10%〜500%）
                        </li>
                        <li>• グリッド表示でクロップエリアを確認</li>
                        <li>• 透明背景は自動検出され、PNG形式で保持されます</li>
                        <li>
                          •
                          ハンドルは大きく表示され、ドラッグしやすくなっています
                        </li>
                        <li>
                          • 元の解像度を保持し、メタデータのみを削除して最適化
                        </li>
                        <li>• 高品質（JPEG: 95%、PNG: 無圧縮）で出力</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="px-6 py-4">
          <div className="flex justify-end gap-3 w-full">
            <Button color="default" variant="light" onPress={onClose}>
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handleConfirm}
              isDisabled={!imageSrc}
              className="min-w-[100px]"
            >
              設定完了
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
