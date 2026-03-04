"use client";

import React, { memo, useState, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Switch } from "@heroui/react";
import { MessageSquare, Monitor as MonitorIcon } from "lucide-react";
import { ChatButtonSettings } from "./ChatButtonSettings";
import { ChatWidgetSettings } from "./ChatWidgetSettings";
import { InitialMessageSettings } from "./InitialMessageSettings";
import { ChatPreviewPanel } from "./ChatPreviewPanel";

interface DesignSettingsStepProps {
  urlType: string;
  setExistingImageFromBase64?: (
    base64Data: string | null,
    fileName?: string,
  ) => void;
}

const DesignSettingsStep = memo(
  ({ urlType, setExistingImageFromBase64 }: DesignSettingsStepProps) => {
    // タブの状態を統合管理（ボタン設定とウィジェット設定で共有）
    const [activeDeviceTab, setActiveDeviceTab] = useState<
      "desktop" | "mobile"
    >("desktop");

    const values = useWatch();
    const { control } = useFormContext();

    // プレビュー用のテーマ設定を取得
    const themeConfig = useMemo(() => {
      return values?.themeConfig || null;
    }, [values?.themeConfig]);

    const translationCount = useMemo(() => {
      const translations = themeConfig?.initialGreetingTranslations as
        | Record<string, string>
        | null
        | undefined;
      return translations ? Object.keys(translations).length : 0;
    }, [themeConfig?.initialGreetingTranslations]);

    return (
      <div className="h-full flex flex-col">
        {/* 左右分割レイアウト */}
        <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
          {/* 左側: 設定パネル（スクロール可能） */}
          <div className="flex-1 pr-2 space-y-8 max-w-4xl">
            <div className="space-y-2 mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                表示・デザイン設定
              </h3>
              <p className="text-xs text-default-500">
                {urlType === "WEB"
                  ? "Webサイトに表示されるチャットウィジェットの見た目をカスタマイズします"
                  : "LINE LIFF（ミニアプリ）内で表示されるチャット画面のデザインをカスタマイズします"}
              </p>
            </div>

            {urlType === "WEB" && (
              <ChatButtonSettings
                setExistingImageFromBase64={setExistingImageFromBase64}
                activeDeviceTab={activeDeviceTab}
                setActiveDeviceTab={setActiveDeviceTab}
              />
            )}

            <ChatWidgetSettings
              activeWidgetTab={activeDeviceTab}
              setActiveWidgetTab={setActiveDeviceTab}
            />

            <div className="bg-white rounded-xl border border-default-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">
                      初期メッセージ・多言語設定
                    </p>
                    <p className="text-xs text-default-500 mt-0.5">
                      チャット開始時の挨拶文と自動翻訳の設定
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <Controller
                  name="themeConfig.isMultiLanguage"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-5 bg-default-50 rounded-2xl border border-default-100">
                      <div className="flex-1">
                        <label className="text-sm font-bold text-gray-900">
                          自動多言語翻訳
                        </label>
                        <p className="text-xs text-default-500 mt-1 leading-relaxed">
                          有効にすると、挨拶メッセージを約80言語へ自動的に翻訳します。
                          {field.value
                            ? `（現在 ${translationCount} 言語が有効）`
                            : "多言語対応のサイトに最適です"}
                        </p>
                      </div>
                      <Switch
                        isSelected={field.value ?? false}
                        onValueChange={field.onChange}
                        color="primary"
                        size="lg"
                      />
                    </div>
                  )}
                />
              </div>
              <InitialMessageSettings />
            </div>
          </div>

          {/* 右側: プレビューパネル（固定表示、モバイルでは非表示か調整が必要だが、ここではPC前提の固定幅） */}
          <div className="lg:w-[450px] xl:w-[500px] flex-shrink-0">
            <div className="sticky top-4">
              <div className="bg-default-100/50 rounded-3xl p-6 border border-default-200">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <MonitorIcon className="w-4 h-4 text-default-400" />
                  <span className="text-xs font-bold text-default-500 uppercase tracking-widest">
                    Live Preview
                  </span>
                </div>
                <ChatPreviewPanel
                  themeConfig={themeConfig}
                  activeDeviceTab={activeDeviceTab}
                  urlType={urlType}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DesignSettingsStep.displayName = "DesignSettingsStep";

export default DesignSettingsStep;
