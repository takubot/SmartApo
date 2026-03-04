"use client";

import { Input, Select, SelectItem, Tabs, Tab, Slider } from "@heroui/react";
import { Smartphone, Monitor as MonitorIcon } from "lucide-react";
import React, { memo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ChatEntryCreateRequestType } from "@repo/api-contracts/based_template/zschema";
import { FormAdditionalFields } from "../../../types";

type FormData = Partial<ChatEntryCreateRequestType> & FormAdditionalFields;

// 位置設定コンポーネント（スライダー + 数値入力）
const PositionControl = memo(
  ({
    label,
    value,
    onChange,
    error,
    min = 0,
    max = 100,
  }: {
    label: string;
    value: number | undefined;
    onChange: (value: number) => void;
    error?: string;
    min?: number;
    max?: number;
  }) => {
    const safeValue = value ?? min ?? 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <span className="text-xs text-gray-500">{safeValue}%</span>
        </div>
        <div className="flex items-center gap-4">
          <Slider
            value={safeValue}
            onChange={(val) => {
              const numVal = Array.isArray(val) ? val[0] : val;
              if (typeof numVal === "number") {
                onChange(numVal);
              }
            }}
            minValue={min}
            maxValue={max}
            step={1}
            className="flex-1"
            classNames={{
              track: "bg-gray-200",
              filler: "bg-primary-500",
            }}
          />
          <Input
            type="number"
            value={String(safeValue)}
            onChange={(e) => {
              const numValue = Number(e.target.value);
              if (
                !isNaN(numValue) &&
                numValue >= (min ?? 0) &&
                numValue <= (max ?? 100)
              ) {
                onChange(numValue);
              }
            }}
            min={min}
            max={max}
            className="w-20"
            variant="bordered"
            size="sm"
            endContent={
              <div className="pointer-events-none flex items-center">
                <span className="text-default-400 text-small">%</span>
              </div>
            }
            isInvalid={!!error}
            errorMessage={error}
          />
        </div>
      </div>
    );
  },
);

PositionControl.displayName = "PositionControl";

interface ChatWidgetSettingsProps {
  activeWidgetTab: "desktop" | "mobile";
  setActiveWidgetTab: (tab: "desktop" | "mobile") => void;
}

export const ChatWidgetSettings = memo(
  ({ activeWidgetTab, setActiveWidgetTab }: ChatWidgetSettingsProps) => {
    const {
      control,
      formState: { errors },
    } = useFormContext<FormData>();

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-semibold text-xs">B</span>
          </div>
          <h4 className="font-semibold text-lg text-gray-900">
            チャットウィジェット
          </h4>
        </div>

        {/* 共通設定（タブの上） */}
        <div className="mb-6 space-y-6 pb-6 border-b border-gray-200">
          {/* カラーテーマ（共通） */}
          <div>
            <h5 className="font-medium text-gray-800 text-sm mb-4">
              カラーテーマ
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Controller
                name="themeConfig.headerColor"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="color"
                    label="ヘッダー背景色"
                    variant="bordered"
                    className="h-14"
                    value={field.value || "#F1F1F1"}
                  />
                )}
              />
              <Controller
                name="themeConfig.headerTextColor"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="color"
                    label="ヘッダーテキスト色"
                    variant="bordered"
                    className="h-14"
                    value={field.value || "#000000"}
                  />
                )}
              />
              <Controller
                name="themeConfig.chatButtonColor"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="color"
                    label="チャットボタン色"
                    variant="bordered"
                    className="h-14"
                    value={field.value || "#00AAFF"}
                  />
                )}
              />
            </div>
          </div>

          {/* テキスト設定（共通） */}
          <div>
            <h5 className="font-medium text-gray-800 text-sm mb-4">
              テキスト設定
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Controller
                name="themeConfig.headerText"
                control={control}
                rules={{
                  maxLength: {
                    value: 30,
                    message: "30文字以内で入力",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value || ""}
                    label="ヘッダーテキスト"
                    placeholder="例: サポートチャット"
                    description="チャットウィジェットのヘッダーに表示"
                    variant="bordered"
                    isInvalid={!!errors.themeConfig?.headerText}
                    errorMessage={errors.themeConfig?.headerText?.message}
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* デバイス別設定（タブ） */}
        <div>
          <div className="mb-4">
            <h5 className="font-medium text-gray-800 text-sm">
              デバイス別設定
            </h5>
            <p className="text-xs text-gray-500 mt-1">
              デスクトップとモバイルで個別に設定できます
            </p>
          </div>
          <Tabs
            selectedKey={activeWidgetTab}
            onSelectionChange={(key) =>
              setActiveWidgetTab(key as "desktop" | "mobile")
            }
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
                {/* 基準点設定 */}
                <div>
                  <h5 className="font-medium text-gray-800 text-sm mb-4">
                    基準点
                  </h5>
                  <Controller
                    name="themeConfig.chatPositionAnchorDesktop"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Select
                          selectedKeys={
                            field.value ? [field.value] : ["bottom-right"]
                          }
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string;
                            field.onChange(selected);
                          }}
                          variant="bordered"
                          size="sm"
                          placeholder="基準点を選択"
                        >
                          <SelectItem key="bottom-right">右下</SelectItem>
                          <SelectItem key="bottom-left">左下</SelectItem>
                          <SelectItem key="top-right">右上</SelectItem>
                          <SelectItem key="top-left">左上</SelectItem>
                        </Select>
                        <p className="text-xs text-gray-500">
                          0,0の時にこの位置に配置されます
                        </p>
                      </div>
                    )}
                  />
                </div>

                {/* ボタン位置設定 */}
                <div>
                  <h5 className="font-medium text-gray-800 text-sm mb-4">
                    チャットボタンの表示位置
                  </h5>
                  <div className="space-y-4">
                    <Controller
                      name="themeConfig.chatButtonHorizontalPositionPercentageDesktop"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="横方向のオフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatButtonHorizontalPositionPercentageDesktop
                              ?.message
                          }
                        />
                      )}
                    />
                    <Controller
                      name="themeConfig.chatButtonVerticalPositionPercentageDesktop"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="縦方向のオフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatButtonVerticalPositionPercentageDesktop
                              ?.message
                          }
                        />
                      )}
                    />
                  </div>
                </div>

                {/* ウィジェット位置設定 */}
                <div>
                  <h5 className="font-medium text-gray-800 text-sm mb-4">
                    チャットウィジェットの表示位置
                  </h5>
                  <div className="space-y-4">
                    <Controller
                      name="themeConfig.chatWidgetHorizontalPositionPercentageDesktop"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="横方向のオフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatWidgetHorizontalPositionPercentageDesktop
                              ?.message
                          }
                        />
                      )}
                    />
                    <Controller
                      name="themeConfig.chatWidgetVerticalPositionPercentageDesktop"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="縦方向のオフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatWidgetVerticalPositionPercentageDesktop
                              ?.message
                          }
                        />
                      )}
                    />
                  </div>
                </div>

                {/* サイズ設定 */}
                <div>
                  <h5 className="font-medium text-gray-800 text-sm mb-4">
                    サイズ
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Controller
                      name="themeConfig.chatWidth"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={String(field.value ?? 25)}
                          type="number"
                          label="幅"
                          placeholder="25"
                          min="10"
                          max="100"
                          variant="bordered"
                          endContent={
                            <div className="pointer-events-none flex items-center">
                              <span className="text-default-400 text-small">
                                %
                              </span>
                            </div>
                          }
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                    <Controller
                      name="themeConfig.chatHeight"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          value={String(field.value ?? 80)}
                          type="number"
                          label="高さ"
                          placeholder="80"
                          min="20"
                          max="100"
                          variant="bordered"
                          endContent={
                            <div className="pointer-events-none flex items-center">
                              <span className="text-default-400 text-small">
                                %
                              </span>
                            </div>
                          }
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      )}
                    />
                  </div>
                </div>
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
                {/* 位置設定（基準点選択 + スライダー + 数値入力） */}
                <div>
                  <h5 className="font-medium text-gray-800 text-sm mb-4">
                    表示位置
                  </h5>
                  <div className="space-y-4">
                    <Controller
                      name="themeConfig.chatPositionAnchorMobile"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            基準点
                          </label>
                          <Select
                            selectedKeys={
                              field.value ? [field.value] : ["bottom-right"]
                            }
                            onSelectionChange={(keys) => {
                              const selected = Array.from(keys)[0] as string;
                              field.onChange(selected);
                            }}
                            variant="bordered"
                            size="sm"
                            placeholder="基準点を選択"
                          >
                            <SelectItem key="bottom-right">右下</SelectItem>
                            <SelectItem key="bottom-left">左下</SelectItem>
                            <SelectItem key="top-right">右上</SelectItem>
                            <SelectItem key="top-left">左上</SelectItem>
                          </Select>
                          <p className="text-xs text-gray-500">
                            0,0の時にこの位置に配置されます
                          </p>
                        </div>
                      )}
                    />
                    <Controller
                      name="themeConfig.chatButtonHorizontalPositionPercentageMobile"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="チャットボタンの横方向オフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatButtonHorizontalPositionPercentageMobile
                              ?.message
                          }
                        />
                      )}
                    />
                    <Controller
                      name="themeConfig.chatButtonVerticalPositionPercentageMobile"
                      control={control}
                      render={({ field }) => (
                        <PositionControl
                          label="チャットボタンの縦方向オフセット"
                          value={field.value ?? 0}
                          onChange={(val) => field.onChange(val)}
                          error={
                            errors.themeConfig
                              ?.chatButtonVerticalPositionPercentageMobile
                              ?.message
                          }
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    );
  },
);

ChatWidgetSettings.displayName = "ChatWidgetSettings";
