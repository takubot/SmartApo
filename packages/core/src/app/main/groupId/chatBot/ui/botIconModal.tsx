"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { Button } from "@heroui/react";
import Cropper from "react-easy-crop";
import { useIconManagement } from "../hooks/useIconManagement";

interface BotIconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropCompleted: (file: File) => void;
}

export const BotIconModal: React.FC<BotIconModalProps> = ({
  isOpen,
  onClose,
  onCropCompleted,
}) => {
  const {
    selectedFile,
    imageSrc,
    crop,
    zoom,
    resetIconState,
    handleFileChange,
    onCropComplete,
    handleCropComplete,
    setCrop,
    setZoom,
  } = useIconManagement();

  // モーダルを開く/閉じるたびに状態をリセット
  React.useEffect(() => {
    if (isOpen) {
      resetIconState();
    }
  }, [isOpen, resetIconState]);

  // 完了ボタンの処理
  const handleComplete = async () => {
    if (!imageSrc) return;

    try {
      await handleCropComplete((croppedFile) => {
        // クロップ完了後の処理
        onCropCompleted(croppedFile);
        // モーダルを閉じる
        onClose();
      });
    } catch (error) {
      console.error("アイコンの処理に失敗しました:", error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      classNames={{
        base: "mx-2 sm:mx-4 max-h-[95vh]",
        wrapper: "overflow-hidden",
        backdrop: "backdrop-blur-sm",
      }}
      isDismissable={false}
      isKeyboardDismissDisabled={true}
    >
      <ModalContent className="h-auto max-h-[95vh] flex flex-col">
        <ModalHeader className="flex items-center justify-between px-8 py-6 border-b flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
            <h2 className="text-2xl font-bold text-foreground">
              ボットアイコン編集
            </h2>
          </div>
        </ModalHeader>

        <ModalBody className="px-8 py-8 flex-1 overflow-y-auto">
          {!imageSrc ? (
            // ファイル選択画面
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mb-8">
                <span className="text-6xl">📁</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  アイコン画像を選択
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  ボットのアイコンとして使用する画像を選択してください
                </p>
              </div>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".ico,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="icon-file-input"
                />
                <label
                  htmlFor="icon-file-input"
                  className="block w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white font-semibold rounded-xl cursor-pointer hover:from-primary-600 hover:to-secondary-600 transition-all duration-200 text-center"
                >
                  画像を選択
                </label>
                <div className="text-xs text-gray-500 text-center">
                  対応形式: .ico, .png, .jpg, .jpeg (最大5MB)
                </div>
              </div>
            </div>
          ) : (
            // クロップ画面
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-foreground mb-2">
                  アイコンを調整
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  画像をドラッグして位置を調整し、ズームでサイズを変更してください
                </p>
              </div>

              <div className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  objectFit="contain"
                  showGrid={true}
                  cropSize={{ width: 200, height: 200 }}
                />
              </div>

              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    ズーム:
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-lg">💡</span>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>ヒント:</strong>{" "}
                    アイコンは正方形で表示されるため、円形のアイコンや中央に配置された画像がおすすめです。
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="px-8 py-6 flex-shrink-0 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {!imageSrc
                  ? "画像を選択してください"
                  : "画像を調整して完了ボタンを押してください"}
              </span>
            </div>
            <div className="flex gap-4">
              <Button
                color="danger"
                variant="flat"
                onPress={onClose}
                size="lg"
                className="font-semibold min-w-[120px]"
              >
                キャンセル
              </Button>
              {imageSrc && (
                <Button
                  color="primary"
                  onPress={handleComplete}
                  size="lg"
                  className="font-semibold min-w-[140px] text-white shadow-lg hover:shadow-xl"
                >
                  完了
                </Button>
              )}
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
