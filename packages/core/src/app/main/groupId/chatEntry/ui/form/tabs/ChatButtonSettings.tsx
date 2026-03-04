"use client";

import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
} from "@heroui/react";
import { Smartphone, Upload, Monitor as MonitorIcon } from "lucide-react";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { ChatEntryCreateRequestType } from "@repo/api-contracts/based_template/zschema";
import { FormAdditionalFields } from "../../../types";
import { ImageCropModal } from "../ImageCropModal";

type FormData = Partial<ChatEntryCreateRequestType> & FormAdditionalFields;

interface ImageDisplayState {
  chatOpenImageUrl: string | null;
  isLoading: boolean;
}

interface ChatButtonSettingsProps {
  setExistingImageFromBase64?: (
    base64Data: string | null,
    fileName?: string,
  ) => void;
  activeDeviceTab: "desktop" | "mobile";
  setActiveDeviceTab: (tab: "desktop" | "mobile") => void;
}

const ImagePreview = memo(
  ({ imageState }: { imageState: ImageDisplayState }) => {
    const { isLoading, chatOpenImageUrl } = imageState;

    const displayImageUrl = useMemo(() => {
      return chatOpenImageUrl || null;
    }, [chatOpenImageUrl]);

    return (
      <div className="w-full max-w-32 h-32 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <span className="text-xs text-gray-500">取得中...</span>
          </div>
        ) : displayImageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageUrl}
              alt="preview"
              className="w-full h-full object-contain"
            />
          </>
        ) : (
          <div className="text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <span className="text-xs text-gray-500">プレビュー</span>
          </div>
        )}
      </div>
    );
  },
);

ImagePreview.displayName = "ImagePreview";

export const ChatButtonSettings = memo(
  ({
    setExistingImageFromBase64,
    activeDeviceTab,
    setActiveDeviceTab,
  }: ChatButtonSettingsProps) => {
    const {
      control,
      setValue,
      formState: { errors },
    } = useFormContext<FormData>();

    const values = useWatch();
    const [isImageCropModalOpen, setIsImageCropModalOpen] = useState(false);

    const chatOpenTypeDesktop =
      useWatch({
        control,
        name: "themeConfig.chatOpenTypeDesktop",
      }) || "BUTTON";

    const chatOpenTypeMobile =
      useWatch({
        control,
        name: "themeConfig.chatOpenTypeMobile",
      }) || "BUTTON";

    const imageStateDesktop = useMemo(() => {
      const uploadImageBase64 = values?.themeConfig?.themeImageFileDesktop;
      const existingImageUrl = values?.themeConfig?.chatOpenImageUrlDesktop;

      let displayUrl = null;
      if (uploadImageBase64) {
        displayUrl = uploadImageBase64;
      } else if (existingImageUrl) {
        displayUrl = existingImageUrl;
      }

      return {
        chatOpenImageUrl: displayUrl,
        isLoading: false,
      };
    }, [
      values?.themeConfig?.themeImageFileDesktop,
      values?.themeConfig?.chatOpenImageUrlDesktop,
    ]);

    const imageStateMobile = useMemo(() => {
      const uploadImageBase64 = values?.themeConfig?.themeImageFileMobile;
      const existingImageUrl = values?.themeConfig?.chatOpenImageUrlMobile;

      let displayUrl = null;
      if (uploadImageBase64) {
        displayUrl = uploadImageBase64;
      } else if (existingImageUrl) {
        displayUrl = existingImageUrl;
      }

      return {
        chatOpenImageUrl: displayUrl,
        isLoading: false,
      };
    }, [
      values?.themeConfig?.themeImageFileMobile,
      values?.themeConfig?.chatOpenImageUrlMobile,
    ]);

    const handleFileToBase64 = useCallback((file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Base64変換に失敗しました"));
          }
        };
        reader.onerror = (error) => {
          reject(error);
        };
      });
    }, []);

    const handleOpenImageCropModal = useCallback(() => {
      setIsImageCropModalOpen(true);
    }, []);

    // 画像のアスペクト比を計算する関数
    const getImageAspectRatio = useCallback(
      (imageDataUrl: string): Promise<number> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const aspectRatio = img.height / img.width;
            resolve(aspectRatio);
          };
          img.onerror = () => {
            reject(new Error("画像の読み込みに失敗しました"));
          };
          img.src = imageDataUrl;
        });
      },
      [],
    );

    const handleImageCropCompleted = useCallback(
      async (file: File) => {
        try {
          const imageDataUrl = await handleFileToBase64(file);
          // 画像のアスペクト比を計算
          const aspectRatio = await getImageAspectRatio(imageDataUrl);

          // アクティブなタブに応じて適切なフィールドに保存
          if (activeDeviceTab === "desktop") {
            setValue(
              "themeConfig.themeImageFileDesktop" as any,
              imageDataUrl as any,
            );
            setValue(
              "themeConfig.chatOpenImageHeightDesktop" as any,
              aspectRatio as any,
            );
          } else {
            setValue(
              "themeConfig.themeImageFileMobile" as any,
              imageDataUrl as any,
            );
          }
          setExistingImageFromBase64?.(imageDataUrl, file.name);
        } catch (error) {
          console.error("Failed to prepare image data:", error);
          alert("画像データの準備に失敗しました。");
        }
      },
      [
        setValue,
        setExistingImageFromBase64,
        handleFileToBase64,
        getImageAspectRatio,
        activeDeviceTab,
      ],
    );

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-xs">A</span>
          </div>
          <h4 className="font-semibold text-lg text-gray-900">
            チャット開始ボタン
          </h4>
        </div>

        <Tabs
          selectedKey={activeDeviceTab}
          onSelectionChange={(key) =>
            setActiveDeviceTab(key as "desktop" | "mobile")
          }
          className="mb-6"
        >
          <Tab
            key="desktop"
            title={
              <div className="flex items-center gap-2">
                <MonitorIcon size={16} />
                <span>デスクトップ</span>
              </div>
            }
          >
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Controller
                  name="themeConfig.chatOpenTypeDesktop"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="ボタンの種類"
                      description="チャット開始ボタンの表示方法を選択"
                      variant="bordered"
                      selectedKeys={new Set(field.value ? [field.value] : [])}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string | undefined;
                        field.onChange(value ?? "");
                      }}
                      isInvalid={!!errors.themeConfig?.chatOpenTypeDesktop}
                      errorMessage={
                        errors.themeConfig?.chatOpenTypeDesktop?.message
                      }
                    >
                      <SelectItem key="BUTTON">標準ボタン</SelectItem>
                      <SelectItem key="IMAGE">オリジナル画像</SelectItem>
                    </Select>
                  )}
                />

                {chatOpenTypeDesktop === "BUTTON" && (
                  <Controller
                    name="themeConfig.chatOpenLabelDesktop"
                    control={control}
                    rules={{ required: "ボタンラベルは必須です" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        label="ボタンのラベル"
                        placeholder="例: チャットで質問する"
                        variant="bordered"
                        isRequired
                        isInvalid={!!errors.themeConfig?.chatOpenLabelDesktop}
                        errorMessage={
                          errors.themeConfig?.chatOpenLabelDesktop?.message
                        }
                      />
                    )}
                  />
                )}
              </div>

              {chatOpenTypeDesktop === "BUTTON" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Controller
                    name="themeConfig.chatOpenButtonWidthDesktop"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={String(field.value ?? 25)}
                        type="number"
                        label="ボタンの幅"
                        placeholder="25"
                        min="1"
                        max="100"
                        variant="bordered"
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-default-400 text-small">
                              %
                            </span>
                          </div>
                        }
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  <Controller
                    name="themeConfig.chatOpenButtonHeightDesktop"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={String(field.value ?? 10)}
                        type="number"
                        label="ボタンの高さ"
                        placeholder="10"
                        min="1"
                        max="100"
                        variant="bordered"
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-default-400 text-small">
                              %
                            </span>
                          </div>
                        }
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ボタンにする画像
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Card
                      className={
                        (errors.themeConfig as any)?.themeImageFileDesktop
                          ? "border-2 border-red-500 bg-red-50"
                          : "border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                      }
                    >
                      <CardBody className="p-6">
                        <div className="flex items-center gap-6">
                          <ImagePreview imageState={imageStateDesktop} />

                          <div className="flex-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onPress={handleOpenImageCropModal}
                              startContent={<Upload size={18} />}
                              className="mb-3"
                            >
                              画像を選択
                            </Button>
                            <p className="text-xs text-gray-500">
                              推奨サイズ: 60x60px程度
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  <Controller
                    name="themeConfig.chatOpenImageWidthDesktop"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={String(field.value ?? 5)}
                        type="number"
                        label="画像の幅"
                        placeholder="5"
                        min="1"
                        max="100"
                        variant="bordered"
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-default-400 text-small">
                              %
                            </span>
                          </div>
                        }
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                </div>
              )}
            </div>
          </Tab>

          <Tab
            key="mobile"
            title={
              <div className="flex items-center gap-2">
                <Smartphone size={16} />
                <span>モバイル</span>
              </div>
            }
          >
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <Controller
                  name="themeConfig.chatOpenTypeMobile"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      label="ボタンの種類"
                      description="チャット開始ボタンの表示方法を選択"
                      variant="bordered"
                      selectedKeys={new Set(field.value ? [field.value] : [])}
                      onSelectionChange={(keys) => {
                        const value = Array.from(keys)[0] as string | undefined;
                        field.onChange(value ?? "");
                      }}
                    >
                      <SelectItem key="BUTTON">標準ボタン</SelectItem>
                      <SelectItem key="IMAGE">オリジナル画像</SelectItem>
                    </Select>
                  )}
                />

                {chatOpenTypeMobile === "BUTTON" && (
                  <Controller
                    name="themeConfig.chatOpenLabelMobile"
                    control={control}
                    rules={{ required: "ボタンラベルは必須です" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        label="ボタンのラベル"
                        placeholder="例: チャットで質問する"
                        variant="bordered"
                        isRequired
                        isInvalid={!!errors.themeConfig?.chatOpenLabelMobile}
                        errorMessage={
                          errors.themeConfig?.chatOpenLabelMobile?.message
                        }
                      />
                    )}
                  />
                )}
              </div>

              {chatOpenTypeMobile === "IMAGE" && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ボタンにする画像
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Card
                      className={
                        (errors.themeConfig as any)?.themeImageFileMobile
                          ? "border-2 border-red-500 bg-red-50"
                          : "border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
                      }
                    >
                      <CardBody className="p-6">
                        <div className="flex items-center gap-6">
                          <ImagePreview imageState={imageStateMobile} />

                          <div className="flex-1">
                            <Button
                              type="button"
                              variant="ghost"
                              onPress={handleOpenImageCropModal}
                              startContent={<Upload size={18} />}
                              className="mb-3"
                            >
                              画像を選択
                            </Button>
                            <p className="text-xs text-gray-500">
                              推奨サイズ: 60x60px程度
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>

                  <Controller
                    name="themeConfig.chatOpenImageWidthMobile"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={String(field.value ?? 5)}
                        type="number"
                        label="画像の幅"
                        placeholder="5"
                        min="1"
                        max="100"
                        variant="bordered"
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-default-400 text-small">
                              %
                            </span>
                          </div>
                        }
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    高さは画像の比率に合わせて自動調整されます
                  </p>
                </div>
              )}
            </div>
          </Tab>
        </Tabs>

        <ImageCropModal
          isOpen={isImageCropModalOpen}
          onClose={() => setIsImageCropModalOpen(false)}
          onCropCompleted={handleImageCropCompleted}
        />
      </div>
    );
  },
);

ChatButtonSettings.displayName = "ChatButtonSettings";
