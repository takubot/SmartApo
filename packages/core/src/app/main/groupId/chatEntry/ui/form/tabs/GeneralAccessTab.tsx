"use client";

import {
  Input,
  Textarea,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Switch,
  Card,
  CardBody,
} from "@heroui/react";
import {
  Upload,
  ShieldCheck,
  MessageCircle,
  Smartphone,
  KeyRound,
  Lock,
} from "lucide-react";
import {
  ChatEntryCreateRequestType,
  CustomFormResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import React, { memo, useCallback, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { FormAdditionalFields } from "../../../types";
import { ImageCropModal } from "../ImageCropModal";
import { resolveChatEntryKind } from "../../../types";

// フォームデータの型定義（Zodスキーマベース + UI専用フィールド）
type FormData = Partial<ChatEntryCreateRequestType> &
  FormAdditionalFields & {
    customFormList?: CustomFormResponseSchemaType[];
  };

interface GeneralAccessStepProps {
  mode: "create" | "edit";
  showOnly?: "general" | "line";
}

const ImagePreview = memo(({ imageUrl }: { imageUrl: string | null }) => {
  return (
    <div className="w-full max-w-32 h-32 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
      {imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
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
});

ImagePreview.displayName = "ImagePreview";

const GeneralAccessStep = memo(({ mode, showOnly }: GeneralAccessStepProps) => {
  const {
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<FormData>();

  // useWatchで効率的にフォーム値を監視
  const values = useWatch();
  const [isImageCropModalOpen, setIsImageCropModalOpen] = useState(false);
  const webSyncEnabled = !!values.webConfig?.isEmbedUserSyncEnabled;

  // URLタイプの判定：LINE優先（LINEが存在すればLINE、なければWEB）
  const urlType = React.useMemo(
    () => (resolveChatEntryKind(values) === "LINE" ? "LINE" : "WEB"),
    [values],
  );

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

  const handleImageCropCompleted = useCallback(
    async (file: File) => {
      try {
        const imageDataUrl = await handleFileToBase64(file);
        setValue("themeConfig.chatEntryImageUrl", imageDataUrl);
      } catch (error) {
        console.error("Failed to prepare image data:", error);
        alert("画像データの準備に失敗しました。");
      }
    },
    [setValue, handleFileToBase64],
  );

  const lineInputClassNames = React.useMemo(
    () => ({
      base: "w-full min-w-0",
      inputWrapper: "min-w-0",
      helperWrapper: "min-w-0",
    }),
    [],
  );

  return (
    <div className="space-y-8">
      {(!showOnly || showOnly === "general") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-gray-900">基本情報</h3>
            </div>

            <Controller
              name="entryName"
              control={control}
              rules={{
                required: "管理名は必須です",
                maxLength: {
                  value: 50,
                  message: "50文字以内で入力してください",
                },
              }}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value || ""}
                  label="管理名"
                  labelPlacement="outside"
                  placeholder="例: 公式サイト用チャット"
                  variant="bordered"
                  className="max-w-full"
                  classNames={{
                    label: "text-sm font-bold text-gray-900 mb-2",
                    inputWrapper: "h-12 bg-white",
                  }}
                  isRequired
                  isInvalid={!!errors.entryName}
                  errorMessage={errors.entryName?.message}
                />
              )}
            />

            {urlType === "WEB" && (
              <div className="pt-2">
                <Controller
                  name="webConfig.isEmbedUserSyncEnabled"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      isSelected={!!field.value}
                      onValueChange={(checked: boolean) => {
                        field.onChange(checked);
                        setValue(
                          "webConfig.webMode",
                          checked
                            ? ("EXTERNAL_USER_WEB_WITH_AUTH" as any)
                            : ("EXTERNAL_USER_WEB" as any),
                        );
                        if (!checked) {
                          setValue("webConfig.embedUserPublicKey", null as any);
                          setValue("webConfig.embedUserJwtIssuer", null as any);
                          setValue(
                            "webConfig.embedUserJwtAudience",
                            null as any,
                          );
                        }
                      }}
                      classNames={{
                        label: "text-sm font-bold text-gray-700",
                      }}
                    >
                      外部アプリのユーザー情報を連携する
                    </Switch>
                  )}
                />
                <p className="text-xs text-default-400 mt-1 ml-7">
                  埋め込み先アプリのログイン情報（ID/名前/メール）と会話履歴を連動させます。
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-lg text-gray-900">アクセス制限</h3>
            </div>

            {mode === "edit" ? (
              <div className="p-4 bg-default-50 rounded-xl border border-default-200">
                <label className="block text-xs font-medium text-default-500 uppercase tracking-wider">
                  URLタイプ
                </label>
                <div className="mt-1 flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${urlType === "WEB" ? "bg-primary" : "bg-success"}`}
                  />
                  <p className="text-base font-bold text-gray-900">
                    {urlType === "WEB"
                      ? "ウェブサイト (Web)"
                      : "LINE公式アカウント"}
                  </p>
                </div>
              </div>
            ) : (
              <Controller
                name="webConfig.webMode"
                control={control}
                rules={{
                  validate: (value) => {
                    const formValues = getValues();
                    if (formValues.lineConfig) return true;
                    if (!value) return "URLタイプは必須です";
                    return true;
                  },
                }}
                render={({ field }) => (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-900">
                      URLタイプ <span className="text-red-500">*</span>
                    </label>
                    <Dropdown placement="bottom-start">
                      <DropdownTrigger>
                        <Button
                          variant="bordered"
                          className={`w-full justify-between h-12 ${errors.webConfig?.webMode ? "border-red-500 bg-red-50" : "bg-white"}`}
                          endContent={
                            <Upload className="w-4 h-4 text-default-400 rotate-180" />
                          }
                        >
                          {field.value === "WEB"
                            ? "ウェブサイト (Web)"
                            : field.value === "EXTERNAL_USER_WEB" ||
                                field.value === "EXTERNAL_USER_WEB_WITH_AUTH"
                              ? "ウェブサイト (Web)"
                              : field.value === "LINE"
                                ? "LINE公式アカウント"
                                : "選択してください"}
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label="URLタイプ"
                        variant="flat"
                        onAction={(key) => {
                          field.onChange(key);
                          if (key === "LINE") {
                            setValue("lineConfig", {
                              botChannelId: "",
                              botChannelSecret: "",
                              botBasicId: null,
                              liffId: null,
                              miniappChannelId: null,
                              aiTriggerPrefix: null,
                              externalWebhookUrl: null,
                            } as any);
                            setValue("webConfig", null as any);
                          } else if (key === "WEB") {
                            setValue("lineConfig", null as any);
                            setValue("webConfig", {
                              webMode: "EXTERNAL_USER_WEB",
                              isEmbedUserSyncEnabled: false,
                              embedUserPublicKey: null,
                              embedUserJwtAlgorithm: "RS256",
                              embedUserJwtIssuer: null,
                              embedUserJwtAudience: null,
                              embedUserIdClaim: "sub",
                              embedUserNameClaim: "name",
                              embedUserEmailClaim: "email",
                              embedUserPictureClaim: "picture",
                            } as any);
                          }
                        }}
                      >
                        <DropdownItem
                          key="WEB"
                          description="サイト内にチャットを埋め込みます"
                        >
                          ウェブサイト (Web)
                        </DropdownItem>
                        <DropdownItem
                          key="LINE"
                          description="LINE公式アカウントと連携します"
                        >
                          LINE公式アカウント
                        </DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                    {errors.webConfig?.webMode && (
                      <p className="text-xs text-red-500 ml-1">
                        {errors.webConfig.webMode.message}
                      </p>
                    )}
                  </div>
                )}
              />
            )}

            {urlType === "WEB" ? (
              <div className="space-y-6 p-6 bg-default-50 rounded-2xl border border-default-200">
                <Controller
                  name="accessPolicy.ipRestrictionMode"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        IPアドレス制限
                      </label>
                      <Dropdown placement="bottom-start">
                        <DropdownTrigger>
                          <Button
                            variant="bordered"
                            className="w-full justify-between h-12 bg-white"
                            endContent={
                              <Upload className="w-4 h-4 text-default-400 rotate-180" />
                            }
                          >
                            {field.value === "NONE"
                              ? "制限なし（すべて許可）"
                              : field.value === "JAPAN_ONLY"
                                ? "日本国内からのみ許可"
                                : field.value === "SPECIFIC_IP"
                                  ? "特定のIPアドレスのみ許可"
                                  : "選択してください"}
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu
                          aria-label="IP制限"
                          variant="flat"
                          onAction={(key) => field.onChange(key)}
                        >
                          <DropdownItem key="NONE">制限なし</DropdownItem>
                          <DropdownItem key="JAPAN_ONLY">
                            日本からのみ
                          </DropdownItem>
                          <DropdownItem key="SPECIFIC_IP">
                            特定IPのみ
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  )}
                />

                {values.accessPolicy?.ipRestrictionMode === "SPECIFIC_IP" && (
                  <Controller
                    name="allowedIpList"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (
                          values.accessPolicy?.ipRestrictionMode ===
                            "SPECIFIC_IP" &&
                          !value?.trim()
                        ) {
                          return "IPアドレスリストは必須です";
                        }
                        if (!value?.trim()) return true;

                        const ipRegex =
                          /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
                        const invalidIp = value
                          .split(",")
                          .map((ip) => ip.trim())
                          .filter((ip) => ip.length > 0)
                          .find((ip) => !ipRegex.test(ip));

                        return invalidIp ? `無効な形式: ${invalidIp}` : true;
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ""}
                        label="許可するIPアドレス"
                        labelPlacement="outside"
                        placeholder="192.168.1.1, 10.0.0.1/24"
                        description="カンマ区切りで複数指定可能です"
                        variant="bordered"
                        isRequired
                        classNames={{
                          label: "text-xs font-bold text-gray-700",
                          inputWrapper: "bg-white",
                        }}
                        isInvalid={!!errors.allowedIpList}
                        errorMessage={errors.allowedIpList?.message}
                      />
                    )}
                  />
                )}
              </div>
            ) : (
              <div className="p-8 bg-default-50 rounded-2xl border border-dashed border-default-300 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-default-200 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6 text-default-400" />
                </div>
                <p className="text-sm font-bold text-default-600">
                  LINEタイプではIP制限は使用できません
                </p>
                <p className="text-xs text-default-400 mt-1">
                  LINEのプラットフォーム側で制御されます
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(!showOnly || showOnly === "general") &&
        urlType === "WEB" &&
        webSyncEnabled && (
          <Card shadow="none" className="border border-default-200 bg-white">
            <CardBody className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <Lock className="w-4 h-4 text-warning-600" />
                <h3 className="font-bold text-lg text-gray-900">
                  ユーザー連携の詳細設定 (JWT認証)
                </h3>
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 text-sm text-warning-800">
                埋め込み先アプリ側でJWTを生成し、`externalAuthToken`
                としてフロントエンドから渡してください。
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Controller
                  name="webConfig.embedUserPublicKey"
                  control={control}
                  rules={{ required: "公開鍵は必須です" }}
                  render={({ field }) => (
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      label="公開鍵（PEM）"
                      labelPlacement="outside"
                      placeholder="-----BEGIN PUBLIC KEY-----"
                      minRows={6}
                      isRequired
                      className="md:col-span-2"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserJwtAlgorithm"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || "RS256"}
                      label="JWTアルゴリズム"
                      labelPlacement="outside"
                      placeholder="RS256"
                      startContent={
                        <KeyRound className="w-4 h-4 text-default-400" />
                      }
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserJwtIssuer"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      label="Issuer (iss)"
                      labelPlacement="outside"
                      placeholder="https://id.example.com"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserJwtAudience"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || ""}
                      label="Audience (aud)"
                      labelPlacement="outside"
                      placeholder="doppel-web-chat"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserIdClaim"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || "sub"}
                      label="user_id claim"
                      labelPlacement="outside"
                      placeholder="sub"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserNameClaim"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || "name"}
                      label="name claim"
                      labelPlacement="outside"
                      placeholder="name"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserEmailClaim"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || "email"}
                      label="email claim"
                      labelPlacement="outside"
                      placeholder="email"
                    />
                  )}
                />
                <Controller
                  name="webConfig.embedUserPictureClaim"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      value={field.value || "picture"}
                      label="picture claim"
                      labelPlacement="outside"
                      placeholder="picture"
                    />
                  )}
                />
              </div>
            </CardBody>
          </Card>
        )}

      {urlType === "LINE" && (!showOnly || showOnly === "line") && (
        <div
          className={`${showOnly ? "pt-0" : "border-t border-default-100 pt-8"}`}
        >
          {!showOnly && (
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-bold text-lg text-gray-900">
                LINE公式アカウント連携設定
              </h3>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <Card
              shadow="none"
              className="border border-default-200 bg-white h-full min-w-0"
            >
              <CardBody className="p-4 sm:p-6 space-y-6 min-w-0">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Messaging API設定
                </h4>

                <Controller
                  name={"lineConfig.botChannelId" as any}
                  control={control}
                  rules={{ required: "チャネルIDは必須です" }}
                  render={({ field }) => (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        チャネルID
                      </p>
                      <Input
                        {...field}
                        value={field.value || ""}
                        aria-label="チャネルID"
                        placeholder="1234567890"
                        variant="bordered"
                        isRequired
                        classNames={lineInputClassNames}
                        isInvalid={!!(errors.lineConfig as any)?.botChannelId}
                      />
                      {(errors.lineConfig as any)?.botChannelId?.message && (
                        <p className="text-xs text-danger leading-relaxed break-words">
                          {(errors.lineConfig as any)?.botChannelId?.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name={"lineConfig.botChannelSecret" as any}
                  control={control}
                  rules={{ required: "チャネルシークレットは必須です" }}
                  render={({ field }) => (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        チャネルシークレット
                      </p>
                      <Input
                        {...field}
                        value={field.value || ""}
                        aria-label="チャネルシークレット"
                        placeholder="abc123def456..."
                        variant="bordered"
                        isRequired
                        classNames={lineInputClassNames}
                        isInvalid={
                          !!(errors.lineConfig as any)?.botChannelSecret
                        }
                      />
                      {(errors.lineConfig as any)?.botChannelSecret
                        ?.message && (
                        <p className="text-xs text-danger leading-relaxed break-words">
                          {
                            (errors.lineConfig as any)?.botChannelSecret
                              ?.message
                          }
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name={"lineConfig.botBasicId" as any}
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Basic ID
                      </p>
                      <Input
                        {...field}
                        value={field.value || ""}
                        aria-label="Basic ID"
                        placeholder="@123abc"
                        variant="bordered"
                        classNames={lineInputClassNames}
                      />
                    </div>
                  )}
                />

                <div className="pt-4 border-t border-default-100">
                  <h4 className="text-xs font-bold text-default-500 uppercase tracking-wider mb-4">
                    高度なMessaging API設定
                  </h4>

                  <div className="space-y-4">
                    <Controller
                      name={"lineConfig.aiTriggerPrefix" as any}
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            AI応答トリガー
                          </p>
                          <Input
                            {...field}
                            value={field.value || ""}
                            aria-label="AI応答トリガー"
                            placeholder="例: @DOPPEL"
                            variant="bordered"
                            classNames={lineInputClassNames}
                          />
                          <p className="text-xs text-default-500 leading-relaxed break-words">
                            特定の文字で始まる場合のみAIが応答します
                          </p>
                        </div>
                      )}
                    />

                    <Controller
                      name={"lineConfig.externalWebhookUrl" as any}
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            外部Webhook転送URL
                          </p>
                          <Input
                            {...field}
                            value={field.value || ""}
                            aria-label="外部Webhook転送URL"
                            placeholder="https://example.com/webhook"
                            variant="bordered"
                            classNames={lineInputClassNames}
                          />
                          <p className="text-xs text-default-500 leading-relaxed break-words">
                            他のサービス（エルメ等）にメッセージを転送します
                          </p>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card
              shadow="none"
              className="border border-default-200 bg-white h-full min-w-0"
            >
              <CardBody className="p-4 sm:p-6 space-y-6 min-w-0">
                <h4 className="text-sm font-bold text-success flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  LIFF / ミニアプリ設定
                </h4>

                <Controller
                  name="lineConfig.liffId"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        LIFF ID
                      </p>
                      <Input
                        {...field}
                        value={field.value || ""}
                        aria-label="LIFF ID"
                        placeholder="12345678-AbCdEfGh"
                        variant="bordered"
                        classNames={lineInputClassNames}
                      />
                    </div>
                  )}
                />

                <Controller
                  name={"lineConfig.miniappChannelId" as any}
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        ミニアプリチャネルID
                      </p>
                      <Input
                        {...field}
                        value={field.value || ""}
                        aria-label="ミニアプリチャネルID"
                        placeholder="9876543210"
                        variant="bordered"
                        classNames={lineInputClassNames}
                      />
                    </div>
                  )}
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <ImageCropModal
        isOpen={isImageCropModalOpen}
        onClose={() => setIsImageCropModalOpen(false)}
        onCropCompleted={handleImageCropCompleted}
        cropShape="round"
        aspect={1}
        title="チャットテーマアイコンを設定"
        description="画像をアップロードして、正円で切り取りたい部分を選択してください"
      />
    </div>
  );
});

GeneralAccessStep.displayName = "GeneralAccessStep";

export default GeneralAccessStep;
