"use client";

import {
  Button,
  Checkbox,
  Input,
  Select,
  SelectItem,
  RadioGroup,
  Radio,
  Card,
  CardBody,
  Divider,
} from "@heroui/react";
import type {
  BotResponseSchemaType,
  BookingMenuResponseSchemaType,
  SuggestPackageResponseSchemaType,
  CustomFormResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { ChatEntryCreateRequestType } from "@repo/api-contracts/based_template/zschema";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormAdditionalFields } from "../../../types";
import {
  MessageSquare,
  Zap,
  LayoutList,
  Pencil,
  ChevronDown,
} from "lucide-react";

// フォームデータの型定義（Zodスキーマベース + UI専用フィールド）
type FormData = Partial<ChatEntryCreateRequestType> &
  FormAdditionalFields & {
    preChatCustomFormId?: number | null;
    onDemandCustomFormIdList?: number[];
    bookingMenuIdList?: number[];
    handoffBookingMenuId?: number | null;
    customFormList?: CustomFormResponseSchemaType[];
  };

interface AiConnectionStepProps {
  botList: BotResponseSchemaType[];
  isLoadingBotList?: boolean;
  suggestList?: SuggestPackageResponseSchemaType[];
  customFormList?: CustomFormResponseSchemaType[];
  bookingMenuList?: BookingMenuResponseSchemaType[];
}

const AiConnectionStep = memo(
  ({
    botList,
    isLoadingBotList,
    suggestList = [],
    customFormList = [],
    bookingMenuList = [],
  }: AiConnectionStepProps) => {
    const {
      control,
      setValue,
      trigger,
      formState: { errors },
    } = useFormContext<FormData>();

    const values = useWatch<FormData>();
    const selectionType = values.selectionType || "BOT";
    const onDemandCustomFormIdList = useMemo(
      () =>
        Array.isArray(values.onDemandCustomFormIdList)
          ? values.onDemandCustomFormIdList
          : [],
      [values.onDemandCustomFormIdList],
    );
    const preChatCustomFormId = values.preChatCustomFormId ?? null;
    const [isChatBehaviorEditorOpen, setIsChatBehaviorEditorOpen] =
      useState(false);

    const botSelectionMethodLabel = useMemo(() => {
      if (values.botSelectionMethod === "DESCRIPTION_BASED") {
        return "説明ベース";
      }
      return "チャンクベース";
    }, [values.botSelectionMethod]);

    const chatFlowTypeLabel = useMemo(() => {
      if (values.chatFlowType === "CATEGORY_BASED") {
        return "カテゴリーベース";
      }
      return "チャンク検索";
    }, [values.chatFlowType]);

    useEffect(() => {
      if (
        preChatCustomFormId &&
        onDemandCustomFormIdList.includes(preChatCustomFormId)
      ) {
        setValue(
          "onDemandCustomFormIdList",
          onDemandCustomFormIdList.filter((id) => id !== preChatCustomFormId),
        );
      }
    }, [preChatCustomFormId, onDemandCustomFormIdList, setValue]);

    const renderBotCheckList = useCallback(
      (selectedBotIds: unknown, onChange: (value: number[]) => void) => {
        const normalizedSelectedBotIds = Array.isArray(selectedBotIds)
          ? selectedBotIds
              .map((id) => Number(id))
              .filter((id) => Number.isInteger(id) && id > 0)
          : [];
        const selectedBotIdSet = new Set(normalizedSelectedBotIds);

        if (isLoadingBotList) {
          return (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Botリストを取得中...</span>
              </div>
            </div>
          );
        }

        if (!botList?.length) {
          return (
            <div className="text-center py-12 bg-default-50 rounded-xl border border-dashed border-default-200">
              <p className="text-gray-500 font-medium">
                利用可能なBotがありません
              </p>
              <p className="text-xs text-gray-400 mt-1">
                先にチャットボットを作成してください
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {botList.map((bot) => {
              const isSelected = selectedBotIdSet.has(bot.botId);
              return (
                <div
                  key={bot.botId}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary-50 shadow-sm"
                      : "border-default-100 bg-white hover:border-default-300"
                  }`}
                  onClick={() => {
                    onChange(
                      isSelected
                        ? normalizedSelectedBotIds.filter(
                            (id) => id !== bot.botId,
                          )
                        : [...normalizedSelectedBotIds, bot.botId],
                    );
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-default-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <Zap className="w-3 h-3 text-white fill-current" />
                        )}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-default-100 border border-default-200">
                      <img
                        src={bot.botIconImgGcsPath || "/botIcon/default.ico"}
                        alt={bot.botName || "bot"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {bot.botName || "未命名のBot"}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {bot.botDescription || "説明なし"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      },
      [botList, isLoadingBotList],
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg text-gray-900">AI接続設定</h3>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          <div className="min-w-0">
            <Card
              shadow="none"
              className="border border-default-200 bg-white rounded-xl"
            >
              <CardBody className="p-6 space-y-6">
                <Controller
                  name="selectionType"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-900">
                        AI接続先（いずれか1つ）
                      </label>
                      <RadioGroup
                        orientation="horizontal"
                        value={field.value || "BOT"}
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === "BOT") {
                            setValue("suggestId", null);
                          } else if (value === "SUGGEST") {
                            setValue("botIdList", []);
                          }
                        }}
                        classNames={{
                          wrapper: "gap-6",
                        }}
                      >
                        <Radio value="BOT">チャットボット</Radio>
                        <Radio value="SUGGEST">サジェスト</Radio>
                      </RadioGroup>
                    </div>
                  )}
                />

                {selectionType === "BOT" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                        ボットを選択（複数可）
                      </label>
                      <span className="text-xs text-default-400">
                        {botList?.length || 0}個の利用可能なBot
                      </span>
                    </div>
                    <Controller
                      name="botIdList"
                      control={control}
                      rules={{
                        validate: (value) =>
                          !value || value.length === 0
                            ? "Botを1つ以上選択してください"
                            : true,
                      }}
                      render={({ field }) => (
                        <div className="space-y-2">
                          {renderBotCheckList(
                            field.value || [],
                            field.onChange,
                          )}
                          {errors.botIdList && (
                            <p className="text-red-500 text-xs mt-1 font-medium">
                              {errors.botIdList.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-default-500 uppercase tracking-wider">
                      サジェストパッケージを選択
                    </label>
                    <Controller
                      name="suggestId"
                      control={control}
                      rules={{
                        validate: (value) =>
                          value == null ? "パッケージを選択してください" : true,
                      }}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Select
                            label="パッケージ名"
                            variant="bordered"
                            isDisabled={isLoadingBotList}
                            selectedKeys={
                              field.value == null
                                ? new Set([])
                                : new Set([String(field.value)])
                            }
                            onSelectionChange={(keys) => {
                              const [key] = Array.from(keys as Set<string>);
                              field.onChange(key ? Number(key) : null);
                            }}
                          >
                            {suggestList.map((s) => (
                              <SelectItem key={String(s.suggestId)}>
                                {s.suggestName}
                              </SelectItem>
                            ))}
                          </Select>
                          {isLoadingBotList ? (
                            <p className="text-xs text-default-400">
                              サジェスト一覧を読み込み中...
                            </p>
                          ) : null}
                        </div>
                      )}
                    />
                  </div>
                )}

                <Divider />

                <Controller
                  name="showReferenceInfo"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-4 bg-default-50 rounded-xl border border-default-100">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          参照情報の表示
                        </p>
                        <p className="text-xs text-default-500 mt-0.5">
                          回答の根拠となったチャンク情報を表示します
                        </p>
                      </div>
                      <Checkbox
                        isSelected={field.value ?? false}
                        onValueChange={field.onChange}
                      />
                    </div>
                  )}
                />
              </CardBody>
            </Card>
          </div>

          <div className="space-y-3">
            <Card
              shadow="none"
              className="border border-default-200 bg-white rounded-xl"
            >
              <CardBody className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutList className="w-4 h-4 text-default-400" />
                  <h4 className="text-sm font-bold text-gray-900">
                    事前入力フォーム
                  </h4>
                </div>
                <Controller
                  name="preChatCustomFormId"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">
                        開始直後に表示するフォーム（1つ）
                      </label>
                      <Select
                        variant="bordered"
                        placeholder="選択しない"
                        selectedKeys={
                          field.value
                            ? new Set([String(field.value)])
                            : new Set([])
                        }
                        onSelectionChange={(keys) => {
                          const key = Array.from(keys as Set<string>)[0];
                          field.onChange(key ? Number(key) : null);
                        }}
                      >
                        {customFormList.map(
                          (form: CustomFormResponseSchemaType) => (
                            <SelectItem key={String(form.customFormId)}>
                              {form.formName}
                            </SelectItem>
                          ),
                        )}
                      </Select>
                    </div>
                  )}
                />

                <Controller
                  name="onDemandCustomFormIdList"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">
                        任意ボタン表示フォーム（複数選択）
                      </label>
                      <Select
                        selectionMode="multiple"
                        variant="bordered"
                        placeholder="使用しない"
                        isDisabled={isLoadingBotList}
                        selectedKeys={
                          new Set(
                            (field.value || []).map((id: number) => String(id)),
                          )
                        }
                        onSelectionChange={(keys) => {
                          const next = Array.from(keys as Set<string>)
                            .map((key) => Number(key))
                            .filter((id) => Number.isInteger(id) && id > 0);
                          field.onChange(next);
                        }}
                      >
                        {customFormList.map(
                          (form: CustomFormResponseSchemaType) => (
                            <SelectItem key={String(form.customFormId)}>
                              {form.formName}
                            </SelectItem>
                          ),
                        )}
                      </Select>
                      {isLoadingBotList ? (
                        <p className="text-xs text-default-400">
                          フォーム一覧を読み込み中...
                        </p>
                      ) : null}
                    </div>
                  )}
                />
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="border border-default-200 bg-white rounded-xl"
            >
              <CardBody className="p-4 space-y-3">
                <h4 className="text-sm font-bold text-gray-900">予約設定</h4>
                <Controller
                  name="isBookingEnabled"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-4 bg-default-50 rounded-xl border border-default-100">
                      <p className="text-sm font-bold text-gray-900">
                        予約導線を表示する
                      </p>
                      <Checkbox
                        isSelected={!!field.value}
                        onValueChange={field.onChange}
                      />
                    </div>
                  )}
                />
                <Controller
                  name="bookingMenuIdList"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-900">
                        予約メニュー（複数選択）
                      </label>
                      <Select
                        selectionMode="multiple"
                        variant="bordered"
                        placeholder="予約メニューを選択"
                        isDisabled={!values.isBookingEnabled}
                        selectedKeys={
                          new Set(
                            ((field.value as number[] | undefined) || []).map(
                              (id) => String(id),
                            ),
                          )
                        }
                        onSelectionChange={(keys) => {
                          const next = Array.from(keys as Set<string>)
                            .map((key) => Number(key))
                            .filter((id) => Number.isInteger(id) && id > 0);
                          field.onChange(next);
                        }}
                      >
                        {bookingMenuList.map((menu) => (
                          <SelectItem key={String(menu.menuId)}>
                            {menu.title}
                          </SelectItem>
                        ))}
                      </Select>
                      <p className="text-xs text-default-500">
                        未選択の場合はグループの全予約メニューを利用します。
                      </p>
                    </div>
                  )}
                />
                <Controller
                  name="bookingButtonLabel"
                  control={control}
                  render={({ field }) => (
                    <Input
                      label="予約ボタン文言"
                      placeholder="例: 予約はこちら"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                      variant="bordered"
                      isDisabled={!values.isBookingEnabled}
                    />
                  )}
                />
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="border border-default-200 bg-white rounded-xl"
            >
              <CardBody className="p-4">
                <h4 className="text-sm font-bold text-gray-900 mb-3">
                  有人対応
                </h4>
                <Controller
                  name="isHumanHandoffEnabled"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-default-50 rounded-xl border border-default-100">
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            有人対応を有効化する
                          </p>
                          <p className="text-xs text-default-500 mt-0.5">
                            対応可能時間は予約設定のスケジュール（JST）を参照します
                          </p>
                        </div>
                        <Checkbox
                          isSelected={!!field.value}
                          onValueChange={(isEnabled) => {
                            field.onChange(isEnabled);
                            if (isEnabled) {
                              void trigger("handoffBookingMenuId");
                            }
                          }}
                        />
                      </div>
                      <p className="text-xs text-default-500">
                        時間帯の編集は予約設定で行ってください。ここでは個別設定できません。
                      </p>
                      <Controller
                        name="handoffBookingMenuId"
                        control={control}
                        rules={{
                          validate: (value) => {
                            if (!values.isHumanHandoffEnabled) {
                              return true;
                            }
                            const selectedId = Number(value);
                            return Number.isInteger(selectedId) &&
                              selectedId > 0
                              ? true
                              : "有人対応を有効化する場合は、有人対応用の予約メニューを選択してください";
                          },
                        }}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">
                              有人対応用の予約メニュー
                            </label>
                            <Select
                              variant="bordered"
                              placeholder="有人対応用メニューを選択"
                              isDisabled={!values.isHumanHandoffEnabled}
                              selectedKeys={(() => {
                                const selectedId = Number(field.value);
                                return selectedId
                                  ? new Set([String(selectedId)])
                                  : new Set([]);
                              })()}
                              onSelectionChange={(keys) => {
                                const [key] = Array.from(keys as Set<string>);
                                const selectedId = Number(key);
                                const next =
                                  Number.isInteger(selectedId) && selectedId > 0
                                    ? selectedId
                                    : null;
                                field.onChange(next);
                                void trigger("handoffBookingMenuId");
                              }}
                            >
                              {bookingMenuList.map((menu) => (
                                <SelectItem key={String(menu.menuId)}>
                                  {menu.title}
                                </SelectItem>
                              ))}
                            </Select>
                            <p className="text-xs text-default-500">
                              ここで選んだ1つのメニューの予約スケジュールが、有人対応可能時間として利用されます。
                            </p>
                            {errors.handoffBookingMenuId?.message ? (
                              <p className="text-red-500 text-xs mt-1 font-medium">
                                {String(errors.handoffBookingMenuId.message)}
                              </p>
                            ) : null}
                          </div>
                        )}
                      />
                    </div>
                  )}
                />
              </CardBody>
            </Card>
            <Card
              shadow="none"
              className="border border-default-200 bg-default-50/70 rounded-xl"
            >
              <CardBody className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-[11px] font-bold text-default-500 uppercase tracking-wider">
                      詳細設定
                    </h4>
                    <p className="mt-1 text-xs text-default-600">
                      チャット動作: {botSelectionMethodLabel} /{" "}
                      {chatFlowTypeLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    radius="full"
                    variant="light"
                    className="h-6 min-w-0 px-2 text-[11px]"
                    startContent={<Pencil className="w-3 h-3" />}
                    onPress={() => setIsChatBehaviorEditorOpen((prev) => !prev)}
                    endContent={
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          isChatBehaviorEditorOpen ? "rotate-180" : ""
                        }`}
                      />
                    }
                  >
                    編集
                  </Button>
                </div>

                {isChatBehaviorEditorOpen && (
                  <div className="space-y-3 border-t border-default-200 pt-2">
                    <Controller
                      name="botSelectionMethod"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-900">
                            自動選択方式
                          </label>
                          <Select
                            size="sm"
                            variant="bordered"
                            selectedKeys={
                              new Set([field.value || "CHUNK_BASED"])
                            }
                            onSelectionChange={(keys) =>
                              field.onChange(Array.from(keys)[0])
                            }
                          >
                            <SelectItem key="CHUNK_BASED">
                              チャンクベース
                            </SelectItem>
                            <SelectItem key="DESCRIPTION_BASED">
                              説明ベース
                            </SelectItem>
                          </Select>
                        </div>
                      )}
                    />

                    <Controller
                      name="chatFlowType"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-900">
                            フロータイプ
                          </label>
                          <Select
                            size="sm"
                            variant="bordered"
                            selectedKeys={
                              new Set([field.value || "CHUNK_SEARCH"])
                            }
                            onSelectionChange={(keys) =>
                              field.onChange(Array.from(keys)[0])
                            }
                          >
                            <SelectItem key="CHUNK_SEARCH">
                              チャンク検索
                            </SelectItem>
                            <SelectItem key="CATEGORY_BASED">
                              カテゴリーベース
                            </SelectItem>
                          </Select>
                        </div>
                      )}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  },
);

AiConnectionStep.displayName = "AiConnectionStep";

export default AiConnectionStep;
