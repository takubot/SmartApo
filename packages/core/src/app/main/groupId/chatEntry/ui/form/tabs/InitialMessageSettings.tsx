"use client";

import { Input, Switch, Textarea } from "@heroui/react";
import React, { memo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { ChatEntryCreateRequestType } from "@repo/api-contracts/based_template/zschema";
import { FormAdditionalFields } from "../../../types";

type FormData = Partial<ChatEntryCreateRequestType> & FormAdditionalFields;

export const InitialMessageSettings = memo(() => {
  const {
    control,
    formState: { errors },
  } = useFormContext<FormData>();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-purple-600 font-semibold text-xs">C</span>
        </div>
        <h4 className="font-semibold text-lg text-gray-900">
          初期メッセージ設定
        </h4>
      </div>

      <div className="space-y-6">
        <Controller
          name="themeConfig.initialGreeting"
          control={control}
          rules={{
            maxLength: {
              value: 1000,
              message: "1000文字以内で入力",
            },
          }}
          render={({ field }) => (
            <Textarea
              {...field}
              value={field.value || ""}
              label="初回メッセージ"
              description="チャット開始時にBotから送られる最初のメッセージ（任意）"
              placeholder="ご用件をお聞かせください"
              variant="bordered"
              minRows={3}
              maxRows={6}
              isInvalid={!!errors.themeConfig?.initialGreeting}
              errorMessage={errors.themeConfig?.initialGreeting?.message}
            />
          )}
        />

        <Controller
          name="themeConfig.isGreetingStreamingEnabled"
          control={control}
          render={({ field }) => (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-900">
                  ストリーミング表示
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  挨拶メッセージを1文字ずつ表示します
                </p>
              </div>
              <Switch
                isSelected={field.value ?? false}
                onValueChange={field.onChange}
                color="primary"
              />
            </div>
          )}
        />

        <Controller
          name="themeConfig.autoOpenDelaySeconds"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              value={field.value ? String(field.value) : ""}
              type="number"
              label="自動オープン遅延時間"
              description="指定秒数後にウィジェットが自動的に開きます（空欄で無効）"
              placeholder="例: 3"
              min="0"
              max="60"
              variant="bordered"
              endContent={
                <div className="pointer-events-none flex items-center">
                  <span className="text-default-400 text-small">秒</span>
                </div>
              }
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value === "" ? null : Number(value));
              }}
            />
          )}
        />
      </div>
    </div>
  );
});

InitialMessageSettings.displayName = "InitialMessageSettings";
