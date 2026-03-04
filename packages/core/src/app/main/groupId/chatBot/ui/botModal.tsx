"use client";

import { Button } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Input } from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Switch,
  Textarea,
} from "@heroui/react";
import React, { useCallback, useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";

// import { useGroupContext } from "../../layout-client"; // 未使用のため削除
import { BotIconModal } from "./botIconModal";
import { FileAssociationTab } from "./FileAssociationTab";
import { ChunkTableAssociationTab } from "./chunkTableAssociationTab";
import { useBotManagement } from "../hooks/useBotManagement";
import { useFile } from "../hooks/useFile";
import { useChunkTemplate } from "../hooks/useChunkTemplate";
import { PERMISSION_LEVEL_MODAL_LABELS, type PermissionLevel } from "../types";

import type {
  BotCreateRequestSchemaType,
  BotUpdateRequestSchemaType,
  BotResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";

/** モーダル用のProps */
interface BotModalProps {
  isOpen: boolean;
  bot?: BotResponseSchemaType | null; // botがnullまたは未定義の場合は作成モード
  onClose: () => void;
  userPermissionLevel?: PermissionLevel; // ユーザーの権限レベル
  refreshBotList?: () => Promise<void>; // refreshBotListを追加
}

export const BotModal: React.FC<BotModalProps> = ({
  isOpen,
  bot = null,
  onClose,
  // userPermissionLevel = "GROUP_MEMBER", // 未使用のため削除
  refreshBotList, // refreshBotListを追加
}) => {
  // const groupId = useGroupContext(); // 未使用のため削除
  const {
    iconPreviewUrl,
    handleIconModalComplete,
    resetIconState,
    setIconPreviewFromBot,
    handleBotSubmit,
    getAvailablePermissionLevels,
  } = useBotManagement(refreshBotList); // refreshBotListを渡す

  // アイコンモーダルの状態
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  // タブ状態管理
  const [activeTab, setActiveTab] = useState<
    "basic" | "settings" | "files" | "templates"
  >("basic");
  const [isSaving, setIsSaving] = useState(false);

  // 作成モードか編集モードかを判定
  const isCreateMode = !bot;
  const modalTitle = isCreateMode ? "新規ボット作成" : "ボット編集";

  // タブ定義（共通化）
  const tabs = [
    {
      id: "basic" as const,
      label: "基本情報",
      icon: "📝",
      description: "アイコン、ボット名、権限レベル、説明文",
    },
    {
      id: "settings" as const,
      label: "動作設定",
      icon: "⚙️",
      description: "Web検索機能、ボットの目的、回答ルール、前提データ",
    },
    {
      id: "files" as const,
      label: "ファイル紐づけ",
      icon: "📄",
      description: "関連ファイルの選択と管理",
    },
    {
      id: "templates" as const,
      label: "テーブル紐づけ",
      icon: "📊",
      description: "関連テーブルの選択と管理",
    },
  ];

  // ユーザーが選択可能な権限レベルを取得
  const availablePermissionLevels = getAvailablePermissionLevels();

  // ファイルとテーブル管理フック
  const fileManagement = useFile(refreshBotList);
  const chunkTableManagement = useChunkTemplate(refreshBotList);

  const defaultFormValues = isCreateMode
    ? {
        botName: "",
        botDescription: null,
        botPurpose: null,
        botAnswerRules: null,
        botPremiseData: null,
        botIconImgGcsPath: null,
        botIconFile: null,
        botPermissionLevel: "GROUP_MEMBER" as PermissionLevel,
        isWebSearchBot: false,
        botSearchUrl: null,
        botSearchInfoPrompt: null,
      }
    : {
        botName: bot?.botName ?? "",
        botDescription: bot?.botDescription ?? null,
        botPurpose: bot?.botPurpose ?? null,
        botAnswerRules: bot?.botAnswerRules ?? null,
        botPremiseData: bot?.botPremiseData ?? null,
        botIconImgGcsPath: bot?.botIconImgGcsPath ?? null,
        botIconFile: null,
        botPermissionLevel:
          (bot?.botPermissionLevel as PermissionLevel) ?? "GROUP_MEMBER",
        isWebSearchBot:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
            }
          )?.isWebSearchBot ?? false,
        botSearchUrl:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
              botSearchUrl?: string | null;
              botSearchInfoPrompt?: string | null;
            }
          )?.botSearchUrl ?? null,
        botSearchInfoPrompt:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
              botSearchUrl?: string | null;
              botSearchInfoPrompt?: string | null;
            }
          )?.botSearchInfoPrompt ?? null,
      };

  const {
    register,
    handleSubmit,
    control,
    formState: { isValid, errors },
    reset,
  } = useForm<BotCreateRequestSchemaType | BotUpdateRequestSchemaType>({
    mode: "onChange",
    defaultValues: defaultFormValues,
  });

  // ----------------------------------------------------------
  // モーダルが開く/botが変わったときだけフォームの初期値をリセット
  // ----------------------------------------------------------
  const resetForm = React.useCallback(() => {
    if (isCreateMode) {
      // 作成モード: 空の初期値
      reset({
        botName: "",
        botDescription: null,
        botPurpose: null,
        botAnswerRules: null,
        botPremiseData: null,
        botIconImgGcsPath: null,
        botIconFile: null,
        botPermissionLevel: "GROUP_MEMBER",
        isWebSearchBot: false,
        botSearchUrl: null,
        botSearchInfoPrompt: null,
      });
      resetIconState();
    } else if (bot) {
      // 編集モード: botの値で初期化
      reset({
        botName: bot.botName,
        botDescription: bot.botDescription ?? null,
        botPurpose: bot.botPurpose ?? null,
        botAnswerRules: bot.botAnswerRules ?? null,
        botPremiseData: bot.botPremiseData ?? null,
        botIconImgGcsPath: bot.botIconImgGcsPath ?? null,
        botIconFile: null,
        botPermissionLevel:
          (bot?.botPermissionLevel as PermissionLevel) ?? "GROUP_MEMBER",
        isWebSearchBot:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
              botSearchUrl?: string | null;
              botSearchInfoPrompt?: string | null;
            }
          )?.isWebSearchBot ?? false,
        botSearchUrl:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
              botSearchUrl?: string | null;
              botSearchInfoPrompt?: string | null;
            }
          )?.botSearchUrl ?? null,
        botSearchInfoPrompt:
          (
            bot as BotResponseSchemaType & {
              isWebSearchBot?: boolean;
              botSearchUrl?: string | null;
              botSearchInfoPrompt?: string | null;
            }
          )?.botSearchInfoPrompt ?? null,
      });
      setIconPreviewFromBot(bot);
    }
  }, [isCreateMode, bot, reset, resetIconState, setIconPreviewFromBot]);

  // ファイルとテーブルデータの取得
  useEffect(() => {
    if (isOpen) {
      if (isCreateMode) {
        // 新規作成モードの場合、ファイルとテーブルデータを取得
        fileManagement.fetchFilesForCreate();
        chunkTableManagement.fetchChunkTablesForCreate();
      } else if (bot) {
        // 編集モードの場合、ファイルとテーブルデータを取得
        fileManagement.openFileEditModal(bot);
        chunkTableManagement.openChunkTableEditModal(bot);
      }
    }
  }, [isOpen, isCreateMode, bot?.botId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen) {
      resetForm();
      setActiveTab("basic"); // モーダルを開くたびに基本情報タブからスタート
    } else {
      // モーダルを閉じたときも状態をリセット
      reset();
      resetIconState();
      setIsIconModalOpen(false);
      setActiveTab("basic");
      // ファイルとテーブルモーダルも閉じる
      fileManagement.closeFileEditModal();
      chunkTableManagement.closeChunkTableEditModal();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // 選択されたファイルとテーブルのIDを取得（共通化）
  const getSelectedIds = useCallback(() => {
    const selectedFileIds = fileManagement.fileListForEdit
      .filter((file) => file.isAssociated)
      .map((file) => file.fileId);

    const selectedTemplateIds = chunkTableManagement.chunkTableListForEdit
      .filter((template) => template.isAssociated)
      .map((template) => template.templateId);

    return { selectedFileIds, selectedTemplateIds };
  }, [
    fileManagement.fileListForEdit,
    chunkTableManagement.chunkTableListForEdit,
  ]);

  // ----------------------------------------------------------
  // フォーム送信（作成・編集両対応）
  // ----------------------------------------------------------
  const onSubmit: SubmitHandler<
    BotCreateRequestSchemaType | BotUpdateRequestSchemaType
  > = async (formData) => {
    if (isSaving) return;
    setIsSaving(true);
    // ファイルやテーブルタブの場合は、それぞれの保存処理を実行
    // どのタブでも保存可能に統一（下で一括組み立て）

    // 基本情報・動作設定タブの場合は、ボット情報を保存
    if (isCreateMode) {
      // 新規作成時は、選択されたファイルとテーブルも含める
      const { selectedFileIds, selectedTemplateIds } = getSelectedIds();

      const createData: BotCreateRequestSchemaType = {
        ...formData,
        fileIdList: selectedFileIds.length > 0 ? selectedFileIds : null,
        templateIdList:
          selectedTemplateIds.length > 0 ? selectedTemplateIds : null,
        botPermissionLevel: formData.botPermissionLevel || "GROUP_MEMBER",
        isWebSearchBot: formData.isWebSearchBot ?? false,
      };

      const success = await handleBotSubmit(createData, isCreateMode, bot);
      if (success) {
        onClose();
      }
      setIsSaving(false);
    } else {
      // 編集時も、選択されたファイルとテーブルを含める
      const { selectedFileIds, selectedTemplateIds } = getSelectedIds();
      const updateData: BotUpdateRequestSchemaType = {
        ...formData,
        fileIdList: selectedFileIds.length > 0 ? selectedFileIds : null,
        templateIdList:
          selectedTemplateIds.length > 0 ? selectedTemplateIds : null,
      };
      const success = await handleBotSubmit(updateData, isCreateMode, bot);
      if (success) {
        onClose();
      }
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        scrollBehavior="inside"
        classNames={{
          base: "mx-2 sm:mx-4 w-[95vw] max-w-[1600px] h-[85vh] max-h-[85vh]",
          wrapper: "overflow-hidden flex items-center justify-center",
          backdrop: "backdrop-blur-md bg-black/30",
        }}
        isDismissable={false}
        isKeyboardDismissDisabled={true}
      >
        <ModalContent className="h-full flex flex-col overflow-hidden">
          <ModalHeader className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-primary-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-foreground">
                {modalTitle}
              </h2>
            </div>
          </ModalHeader>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <ModalBody className="px-6 py-4 flex-1 overflow-hidden">
              {/* タブ風レイアウト: 横並び3セクション */}
              <div className="h-full flex flex-col">
                {/* タブナビゲーション（共通化） */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6 flex-shrink-0 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                        activeTab === tab.id
                          ? "border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20"
                          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base">{tab.icon}</span>
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* タブコンテンツ */}
                <div className="flex-1 overflow-y-auto">
                  {/* 基本情報・説明タブ */}
                  {activeTab === "basic" && (
                    <div className="space-y-8">
                      {/* 基本設定セクション */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* アイコン選択 */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                          <h3 className="text-base font-semibold text-foreground mb-3 text-center">
                            ボットアイコン
                          </h3>
                          <div className="flex flex-col items-center gap-3">
                            <div className="relative group">
                              <img
                                src={iconPreviewUrl}
                                alt="ボットアイコン"
                                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg group-hover:shadow-xl transition-all duration-300"
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white text-xs font-bold">
                                  ✎
                                </span>
                              </div>
                            </div>
                            <Button
                              color="primary"
                              variant="flat"
                              onPress={() => setIsIconModalOpen(true)}
                              className="font-semibold text-xs"
                              size="sm"
                            >
                              変更
                            </Button>
                          </div>
                        </div>

                        {/* ボット名 */}
                        <div className="space-y-2">
                          <Input
                            label="ボット名"
                            placeholder="例: カスタマーサポートBot"
                            validationState={
                              errors.botName ? "invalid" : "valid"
                            }
                            errorMessage={
                              errors.botName && "ボット名は必須です"
                            }
                            size="lg"
                            variant="bordered"
                            {...register("botName", { required: true })}
                            classNames={{
                              label:
                                "text-sm font-semibold text-gray-700 dark:text-gray-300",
                              input:
                                "text-base font-medium focus:outline-none focus-visible:outline-none",
                              inputWrapper:
                                "border-2 hover:border-primary-300 focus-within:border-primary-500 transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                            }}
                          />
                        </div>

                        {/* 権限レベル */}
                        <div className="space-y-2">
                          <Controller
                            name="botPermissionLevel"
                            control={control}
                            render={({ field }) => (
                              <Select
                                label="権限レベル"
                                placeholder="使用できる最低権限レベル"
                                description="このボットを使用できる最低権限レベル"
                                variant="bordered"
                                selectedKeys={
                                  field.value
                                    ? new Set([field.value])
                                    : new Set()
                                }
                                onSelectionChange={(keys) => {
                                  const selected = Array.from(
                                    keys,
                                  )[0] as PermissionLevel;
                                  field.onChange(selected);
                                }}
                                isDisabled={
                                  availablePermissionLevels.length <= 1
                                }
                                size="lg"
                                classNames={{
                                  label:
                                    "text-sm font-semibold text-gray-700 dark:text-gray-300",
                                  trigger:
                                    "border-2 hover:border-primary-300 focus:border-primary-500 transition-colors",
                                }}
                              >
                                {availablePermissionLevels.map((level) => (
                                  <SelectItem key={level}>
                                    {PERMISSION_LEVEL_MODAL_LABELS[level]}
                                  </SelectItem>
                                ))}
                              </Select>
                            )}
                          />
                        </div>
                      </div>

                      {/* ボット説明セクション */}
                      <div className=" to-emerald-50  rounded-xl p-5 ">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                          <span className="text-green-500">💬</span>
                          ボットの機能と特徴
                        </h3>
                        <Textarea
                          label="説明文"
                          placeholder="このボットの機能や特徴を詳しく説明してください。\n\n例:\n• お客様からの問い合わせに24時間対応\n• 製品に関する基本的な質問にお答えします\n• 複雑な問題は専門スタッフにエスカレーション"
                          validationState={
                            errors.botDescription ? "invalid" : "valid"
                          }
                          minRows={12}
                          maxRows={20}
                          size="lg"
                          variant="bordered"
                          {...register("botDescription")}
                          classNames={{
                            label:
                              "text-sm font-semibold text-gray-700 dark:text-gray-300",
                            input:
                              "text-base resize-y leading-relaxed min-h-[300px] focus:outline-none focus-visible:outline-none",
                            inputWrapper:
                              "border-2 hover:border-green-300 focus-within:border-green-500 transition-colors min-h-[320px] outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                          }}
                        />
                        <div className="mt-3 p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-green-200/50 dark:border-green-600/50">
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-green-500 text-base">💡</span>
                            <span className="leading-relaxed">
                              <strong>ヒント:</strong>
                              ユーザーがボットの用途を理解しやすいよう、具体的な機能や利用場面を記載しましょう。
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 動作設定タブ */}
                  {activeTab === "settings" && (
                    <div className="h-full flex flex-col">
                      <div className=" rounded-xl p-4 flex-1 flex flex-col">
                        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2 flex-shrink-0">
                          <span className="text-purple-500">⚙️</span>
                          ボットの動作設定
                        </h3>

                        {/* Web検索ボット設定 */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 mb-6 border border-blue-200/50 dark:border-blue-700/50">
                          <h4 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="text-blue-500">🌐</span>
                            Web検索機能
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <Controller
                                name="isWebSearchBot"
                                control={control}
                                render={({ field }) => (
                                  <Switch
                                    isSelected={Boolean(field.value)}
                                    onValueChange={(val) => field.onChange(val)}
                                    size="lg"
                                  />
                                )}
                              />
                            </div>
                            <p className="text-xs text-default-500 ml-6">
                              有効化すると、このボットの回答時に外部Web情報を検索して回答します。
                            </p>
                          </div>
                        </div>

                        {/* URL検索設定（Web検索ボットが有効な時のみ表示） */}
                        <Controller
                          name="isWebSearchBot"
                          control={control}
                          render={({ field: webSearchField }) => (
                            <div
                              className={`transition-all duration-300 ${webSearchField.value ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0 overflow-hidden"}`}
                            >
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 mb-6 border border-green-200/50 dark:border-green-700/50">
                                <h4 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                  <span className="text-green-500">🔗</span>
                                  特定URL検索設定
                                </h4>
                                <div className="space-y-4">
                                  {/* 検索対象URL */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      検索対象URL
                                    </label>
                                    <Controller
                                      name="botSearchUrl"
                                      control={control}
                                      render={({ field }) => (
                                        <Textarea
                                          placeholder={`検索対象とするURLと説明を入力してください。

例:
https://example.com/docs - 製品ドキュメント
https://help.example.com - ヘルプページ
https://support.example.com/faq - よくある質問`}
                                          value={field.value || ""}
                                          onValueChange={field.onChange}
                                          minRows={4}
                                          maxRows={8}
                                          size="lg"
                                          variant="bordered"
                                          classNames={{
                                            input:
                                              "text-sm resize-y leading-relaxed focus:outline-none focus-visible:outline-none",
                                            inputWrapper:
                                              "border-2 hover:border-green-300 focus-within:border-green-500 transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                          }}
                                        />
                                      )}
                                    />
                                    <p className="text-xs text-default-500">
                                      指定したURLから情報を検索して回答に活用します。URLと説明を改行で区切って入力できます。空の場合は一般的なWeb検索を行います。
                                    </p>
                                  </div>

                                  {/* 検索情報取得プロンプト */}
                                  <div className="space-y-2">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                      検索情報取得プロンプト
                                    </label>
                                    <Controller
                                      name="botSearchInfoPrompt"
                                      control={control}
                                      render={({ field }) => (
                                        <Textarea
                                          placeholder="URLから取得する情報の種類や観点を指定してください。&#10;&#10;例:&#10;• 最新の製品情報や仕様&#10;• よくある質問とその回答&#10;• トラブルシューティング情報&#10;• 価格や料金に関する情報&#10;• 利用方法や手順の説明"
                                          value={field.value || ""}
                                          onValueChange={field.onChange}
                                          minRows={4}
                                          maxRows={8}
                                          size="lg"
                                          variant="bordered"
                                          classNames={{
                                            input:
                                              "text-sm resize-y leading-relaxed focus:outline-none focus-visible:outline-none",
                                            inputWrapper:
                                              "border-2 hover:border-green-300 focus-within:border-green-500 transition-colors outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                          }}
                                        />
                                      )}
                                    />
                                    <p className="text-xs text-default-500">
                                      指定した観点でURLから情報を抽出し、回答の参考情報として活用します。
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                          {/* 左列: 目的と回答ルール */}
                          <div className="flex flex-col min-h-0 h-full">
                            {/* 目的 */}
                            <div className="flex-shrink-0 mb-3">
                              <Textarea
                                label="ボットの目的"
                                placeholder="このボットが達成すべき目的を簡潔に記述してください。\n例: お客様からの基本的な問合せに24時間対応し、適切な情報を提供する"
                                validationState={
                                  errors?.botPurpose ? "invalid" : "valid"
                                }
                                variant="bordered"
                                minRows={4}
                                maxRows={6}
                                size="lg"
                                {...register("botPurpose")}
                                classNames={{
                                  label:
                                    "text-sm font-semibold text-gray-700 dark:text-gray-300",
                                  input:
                                    "text-sm resize-y leading-relaxed min-h-[100px] focus:outline-none focus-visible:outline-none",
                                  inputWrapper:
                                    "border-2 hover:border-purple-300 focus-within:border-purple-500 transition-colors min-h-[120px] outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                }}
                              />
                            </div>

                            {/* 回答ルール */}
                            <div className="flex-1 min-h-0 flex flex-col">
                              <Textarea
                                label="ボットの回答ルール"
                                placeholder="回答時のルールを箇条書きで指定してください。\n例:\n• 常に丁寧で分かりやすい表現を使う\n• 参照情報にない内容は推測しない\n• 不明点は確認事項として返す"
                                validationState={
                                  errors?.botAnswerRules ? "invalid" : "valid"
                                }
                                minRows={8}
                                maxRows={15}
                                size="lg"
                                variant="bordered"
                                {...register("botAnswerRules")}
                                classNames={{
                                  label:
                                    "text-sm font-semibold text-gray-700 dark:text-gray-300",
                                  input:
                                    "text-sm resize-y font-mono leading-relaxed min-h-[200px] focus:outline-none focus-visible:outline-none",
                                  inputWrapper:
                                    "border-2 hover:border-purple-300 focus-within:border-purple-500 transition-colors min-h-[220px] flex-1 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                }}
                              />
                            </div>
                          </div>

                          {/* 右列: 前提データ（フル高） */}
                          <div className="h-full flex flex-col">
                            <Textarea
                              label="ボット回答に使用する前提データ"
                              placeholder="回答に際して前提とするデータや知識を記載してください。\n\n例:\n• 製品の仕様一覧\n• 運用ルール\n• FAQの方針\n• 会社のポリシー\n• サービスの特徴\n• 価格情報\n• 連絡先情報"
                              validationState={
                                errors?.botPremiseData ? "invalid" : "valid"
                              }
                              minRows={12}
                              maxRows={20}
                              size="lg"
                              variant="bordered"
                              {...register("botPremiseData")}
                              classNames={{
                                label:
                                  "text-sm font-semibold text-gray-700 dark:text-gray-300",
                                input:
                                  "text-sm resize-y leading-relaxed min-h-[300px] focus:outline-none focus-visible:outline-none",
                                inputWrapper:
                                  "border-2 hover:border-purple-300 focus-within:border-purple-500 transition-colors min-h-[320px] flex-1 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 p-2 bg-white/70 dark:bg-gray-800/70 rounded-lg border border-purple-200/50 dark:border-purple-600/50 flex-shrink-0">
                          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-purple-500 text-sm">💡</span>
                            <span className="leading-relaxed">
                              <strong>ヒント:</strong>{" "}
                              目的・ルール・前提データを分けて書くと、回答の一貫性と品質が向上します。
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ファイル紐づけタブ */}
                  {activeTab === "files" && (
                    <div className="h-full">
                      <FileAssociationTab
                        fileList={fileManagement.fileListForEdit}
                        isLoading={fileManagement.isFileListLoading}
                        onChange={fileManagement.setFileListForEdit}
                      />
                    </div>
                  )}

                  {/* テーブル紐づけタブ */}
                  {activeTab === "templates" && (
                    <div className="h-full">
                      <ChunkTableAssociationTab
                        chunkTableList={
                          chunkTableManagement.chunkTableListForEdit
                        }
                        isLoading={chunkTableManagement.isChunkTableListLoading}
                        onChange={chunkTableManagement.setChunkTableListForEdit}
                      />
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>

            <Divider className="bg-gray-200 dark:bg-gray-700" />

            <ModalFooter className="px-6 py-4 flex-shrink-0 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center w-full gap-4">
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {activeTab === "files"
                      ? "ファイルの紐づけを更新します"
                      : activeTab === "templates"
                        ? "テーブルの紐づけを更新します"
                        : isCreateMode
                          ? "新しいボットを作成します"
                          : "ボット情報を更新します"}
                  </span>
                </div>
                <div className="flex gap-3 order-1 sm:order-2">
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={onClose}
                    isDisabled={isSaving}
                    size="md"
                    className="font-semibold flex-1 sm:flex-none sm:min-w-[100px]"
                  >
                    キャンセル
                  </Button>
                  <Button
                    color="primary"
                    type="submit"
                    isLoading={isSaving}
                    isDisabled={
                      activeTab === "basic" || activeTab === "settings"
                        ? !isValid || isSaving
                        : isSaving
                    }
                    size="md"
                    className="font-semibold flex-1 sm:flex-none sm:min-w-[120px] shadow-md"
                  >
                    {isSaving
                      ? activeTab === "files"
                        ? "保存中..."
                        : activeTab === "templates"
                          ? "保存中..."
                          : `${isCreateMode ? "作成" : "更新"}中...`
                      : activeTab === "files"
                        ? "保存する"
                        : activeTab === "templates"
                          ? "保存する"
                          : `${isCreateMode ? "作成" : "更新"}する`}
                  </Button>
                </div>
              </div>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* アイコン選択モーダル */}
      <BotIconModal
        isOpen={isIconModalOpen}
        onClose={() => setIsIconModalOpen(false)}
        onCropCompleted={handleIconModalComplete}
      />
    </>
  );
};
