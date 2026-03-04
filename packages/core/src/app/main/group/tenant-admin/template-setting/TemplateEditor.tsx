"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Textarea,
} from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import {
  FileText,
  Sparkles,
  ArrowLeft,
  Save,
  Plus,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import {
  create_bot_template_v2_tenant_config_bot_template_create_post,
  generate_form_from_text_v2_tenant_config_bot_template_generate_form_post,
  get_bot_template_v2_tenant_config_bot_template_get__template_id__get,
  update_bot_template_v2_tenant_config_bot_template_update__template_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  TenantBotTemplateCreateRequestType,
  TenantBotTemplatePremiseSectionSchemaType,
  TenantBotTemplateSchemaType,
  TenantBotTemplateUpdateRequestType,
} from "@repo/api-contracts/based_template/zschema";
import { useTenantRoleContext } from "../../../../../context/role/tenantRoleContext";
import {
  PremiseSchemaEditor,
  type PremiseSection,
  type ValidationError,
} from "./PremiseSchemaEditor";
import {
  generateKeyFromLabel,
  newSection,
  type PremiseFieldType,
} from "./premiseSchemaTypes";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  templateId?: number;
};

type StepKey = "basic" | "bot" | "form";

function fillKeysAndDedupe(sections: PremiseSection[]): PremiseSection[] {
  const used = new Set<string>();

  const uniq = (baseKey: string): string => {
    const base = baseKey.trim();
    if (!base) return "";
    const base50 = base.substring(0, 50);
    if (!used.has(base50)) {
      used.add(base50);
      return base50;
    }
    for (let n = 2; n < 10000; n++) {
      const suffix = `_${n}`;
      const maxBaseLen = Math.max(0, 50 - suffix.length);
      const candidate = `${base.substring(0, maxBaseLen)}${suffix}`;
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    used.add(base50);
    return base50;
  };

  return (sections ?? []).map((s) => ({
    ...s,
    fields: (s.fields ?? []).map((f) => {
      const base =
        (f.key ?? "").trim() || generateKeyFromLabel((f.label ?? "").trim());
      return { ...f, key: uniq(base) };
    }),
  }));
}

function normalizePremiseSchema(
  premiseSchema: TenantBotTemplateSchemaType["premiseSchema"],
): PremiseSection[] {
  if (!premiseSchema) return [];
  return fillKeysAndDedupe(
    premiseSchema.map((s) => ({
      title: s.title ?? "",
      fields: (s.fields ?? []).map((f) => ({
        key: f.key ?? "",
        label: f.label ?? "",
        type: (f.type as any) ?? "string",
        required: Boolean(f.required),
        placeholder: f.placeholder ?? "",
        description: f.description ?? "",
        options: f.options ?? [],
      })),
    })),
  );
}

function validatePremiseSchema(sections: PremiseSection[]): ValidationError[] {
  const errors: ValidationError[] = [];

  sections.forEach((s, si) => {
    if (!s.title?.trim()) {
      errors.push({
        sectionIdx: si,
        message: `セクション${si + 1}: セクション名が空です`,
      });
    }
    (s.fields ?? []).forEach((f, fi) => {
      if (!f.label?.trim()) {
        errors.push({
          sectionIdx: si,
          fieldIdx: fi,
          message: `セクション${si + 1} / 項目${fi + 1}: ラベルが空です`,
        });
      }
      if (
        (f.type === "select" || f.type === "multiselect") &&
        !(f.options ?? []).length
      ) {
        errors.push({
          sectionIdx: si,
          fieldIdx: fi,
          message: `セクション${si + 1} / 項目${fi + 1}: 選択肢が空です`,
        });
      }
    });
  });

  return errors;
}

export function TemplateEditor({ mode, templateId }: Props) {
  const { tenantRole } = useTenantRoleContext();
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const canManage =
    tenantRole === "TENANT_ADMIN" || tenantRole === "TENANT_SETTING_ADMIN";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isEdit = mode === "edit";
  const isFormPage = searchParams.get("step") === "form";

  const {
    data: template,
    error,
    isLoading,
  } = useSWR(
    isEdit && templateId ? ["tenant-bot-template", templateId] : null,
    async () =>
      get_bot_template_v2_tenant_config_bot_template_get__template_id__get(
        String(templateId),
      ),
  );

  const [isSaving, setIsSaving] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [botNameTemplate, setBotNameTemplate] = useState("");
  const [botDescriptionTemplate, setBotDescriptionTemplate] = useState("");
  const [botPurposeTemplate, setBotPurposeTemplate] = useState("");
  const [botAnswerRulesTemplate, setBotAnswerRulesTemplate] = useState("");

  const [botPermissionLevel, setBotPermissionLevel] = useState<
    "GROUP_MEMBER" | "GROUP_OWNER"
  >("GROUP_MEMBER");
  const [isWebSearchBot, setIsWebSearchBot] = useState(false);
  const [botSearchUrl, setBotSearchUrl] = useState("");
  const [botSearchInfoPrompt, setBotSearchInfoPrompt] = useState("");

  const [premiseSections, setPremiseSections] = useState<PremiseSection[]>([]);
  const [premiseValidationErrors, setPremiseValidationErrors] = useState<
    ValidationError[]
  >([]);
  const [openSteps, setOpenSteps] = useState<Set<StepKey>>(
    () =>
      new Set<StepKey>(
        mode === "create" ? ["basic"] : ["basic", "bot", "form"],
      ),
  );
  const isFormFocused = openSteps.has("form") || isFormPage;

  const toggleStep = (k: StepKey) => {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  useEffect(() => {
    if (error) {
      handleErrorWithUI(error, "テンプレ取得");
    }
  }, [error]);

  useEffect(() => {
    if (isFormPage) {
      setOpenSteps(new Set<StepKey>(["form"]));
      return;
    }
    setOpenSteps(
      new Set<StepKey>(mode === "create" ? ["basic"] : ["basic", "bot"]),
    );
  }, [isFormPage, mode]);

  useEffect(() => {
    if (isEdit) {
      if (!template) return;
      setTemplateName(template.templateName ?? "");
      setDescription(template.description ?? "");
      setBotNameTemplate(template.botNameTemplate ?? "");
      setBotDescriptionTemplate(template.botDescriptionTemplate ?? "");
      setBotPurposeTemplate(template.botPurposeTemplate ?? "");
      setBotAnswerRulesTemplate(template.botAnswerRulesTemplate ?? "");
      setBotPermissionLevel(
        (template.botPermissionLevel as any) ?? "GROUP_MEMBER",
      );
      setIsWebSearchBot(Boolean(template.isWebSearchBot));
      setBotSearchUrl(template.botSearchUrl ?? "");
      setBotSearchInfoPrompt(template.botSearchInfoPrompt ?? "");
      setPremiseSections(normalizePremiseSchema(template.premiseSchema));
      return;
    }

    setTemplateName("");
    setDescription("");
    setBotNameTemplate("{storeName} 店舗FAQ");
    setBotDescriptionTemplate("");
    setBotPurposeTemplate("");
    setBotAnswerRulesTemplate("");
    setBotPermissionLevel("GROUP_MEMBER");
    setIsWebSearchBot(false);
    setBotSearchUrl("");
    setBotSearchInfoPrompt("");
    setPremiseSections([]);
  }, [isEdit, template]);

  const canSubmit = useMemo(
    () => templateName.trim().length > 0 && !isSaving && canManage,
    [templateName, isSaving, canManage],
  );

  const handleSave = async () => {
    if (!canSubmit) return;
    const sectionsForSave = fillKeysAndDedupe(premiseSections);
    const errors = validatePremiseSchema(sectionsForSave);
    if (errors.length > 0) {
      setPremiseValidationErrors(errors);
      const firstError = errors[0];
      if (firstError) {
        handleErrorWithUI(
          { message: firstError.message } as any,
          "テンプレ検証",
        );
      }
      // フォーム作成ページに切り替えて、エラーが見えるようにする
      if (!isFormPage) {
        router.push(`${pathname}?step=form`);
      }
      // エラーがあるセクションを展開する
      setOpenSteps((prev) => {
        const next = new Set(prev);
        next.add("form");
        return next;
      });
      return;
    }
    setPremiseValidationErrors([]);

    setIsSaving(true);
    try {
      const premiseSchemaPayload =
        sectionsForSave.length > 0
          ? sectionsForSave.map((s) => ({
              title: s.title,
              fields: s.fields.map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: Boolean(f.required),
                placeholder: f.placeholder ?? "",
                description: f.description ?? "",
                options:
                  f.type === "select" || f.type === "multiselect"
                    ? (f.options ?? [])
                    : [],
              })),
            }))
          : null;

      if (isEdit && template?.templateId) {
        const payload: TenantBotTemplateUpdateRequestType = {
          templateName: templateName,
          description: description || null,
          isActive: Boolean(template.isActive),
          botNameTemplate: botNameTemplate || null,
          botDescriptionTemplate: botDescriptionTemplate || null,
          botPurposeTemplate: botPurposeTemplate || null,
          botAnswerRulesTemplate: botAnswerRulesTemplate || null,
          premiseSchema: premiseSchemaPayload as any,
          botPermissionLevel,
          isWebSearchBot,
          botSearchUrl: botSearchUrl || null,
          botSearchInfoPrompt: botSearchInfoPrompt || null,
          // fileIdList / chunkTableTemplateIdList は今回は画面外（将来追加）
        };
        await update_bot_template_v2_tenant_config_bot_template_update__template_id__post(
          String(template.templateId),
          payload,
        );
        showSuccessToast("テンプレを更新しました");
      } else {
        const payload: TenantBotTemplateCreateRequestType = {
          templateName: templateName,
          description: description || null,
          isActive: true,
          botNameTemplate: botNameTemplate || null,
          botDescriptionTemplate: botDescriptionTemplate || null,
          botPurposeTemplate: botPurposeTemplate || null,
          botAnswerRulesTemplate: botAnswerRulesTemplate || null,
          premiseSchema: premiseSchemaPayload as any,
          botPermissionLevel,
          isWebSearchBot,
          botSearchUrl: botSearchUrl || null,
          botSearchInfoPrompt: botSearchInfoPrompt || null,
          fileIdList: [],
          chunkTableTemplateIdList: [],
        };
        await create_bot_template_v2_tenant_config_bot_template_create_post(
          payload,
        );
        showSuccessToast("テンプレを作成しました");
      }

      router.push("/main/group/tenant-admin/template-setting");
    } catch (err) {
      handleErrorWithUI(err, "テンプレ保存");
    } finally {
      setIsSaving(false);
    }
  };

  const headerTitle = isEdit
    ? `テンプレ編集${template?.templateId ? ` #${template.templateId}` : ""}`
    : "テンプレ新規作成";

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) return;
    setIsAIGenerating(true);
    try {
      const response =
        await generate_form_from_text_v2_tenant_config_bot_template_generate_form_post(
          {
            description: aiDescription.trim(),
          },
        );

      if (response?.premiseSchema && response.premiseSchema.length > 0) {
        const existingSections = premiseSections.length > 0;
        const newSections: PremiseSection[] = (
          response.premiseSchema || []
        ).map((s: TenantBotTemplatePremiseSectionSchemaType) => ({
          title: s.title || "",
          fields: (s.fields || []).map((f) => ({
            key: (f.key ?? "").trim() || generateKeyFromLabel(f.label || ""),
            label: f.label || "",
            type: (f.type as PremiseFieldType) || "string",
            required: Boolean(f.required),
            placeholder: f.placeholder || null,
            description: f.description || null,
            options: f.options || null,
          })),
        }));

        if (existingSections) {
          setPremiseSections(
            fillKeysAndDedupe([...premiseSections, ...newSections]),
          );
        } else {
          setPremiseSections(fillKeysAndDedupe(newSections));
        }
        setIsAIGenerateModalOpen(false);
        setAiDescription("");
      } else {
        handleErrorWithUI(
          new Error("フォームが生成されませんでした"),
          "AI生成",
        );
      }
    } catch (error) {
      handleErrorWithUI(error, "AI生成");
    } finally {
      setIsAIGenerating(false);
    }
  };

  if (isEdit && !templateId) {
    return (
      <Card shadow="sm" className="border border-danger-200">
        <CardBody className="p-6 text-danger-500 text-sm">
          編集対象のテンプレIDが指定されていません。
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="flex-1 min-w-0 h-full">
      {/* 一覧に戻るボタン（コンテンツエリア左上） */}
      <div className="mb-3">
        <Button
          variant="flat"
          size="sm"
          startContent={<ArrowLeft className="h-4 w-4" />}
          onPress={() =>
            router.push("/main/group/tenant-admin/template-setting")
          }
          isDisabled={isSaving}
          className="shadow-sm hover:shadow transition-shadow"
          radius="md"
        >
          一覧に戻る
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold">{headerTitle}</h1>
              <p className="text-xs text-default-500">
                テンプレートを作成すると、店舗側で簡単にボットを作成できるようになります。
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isFormPage ? "flat" : "solid"}
            color={isFormPage ? "default" : "primary"}
            onPress={() => router.push(pathname)}
          >
            基本情報・ボット設定
          </Button>
          <Button
            size="sm"
            variant={isFormPage ? "solid" : "flat"}
            color={isFormPage ? "primary" : "default"}
            onPress={() => router.push(`${pathname}?step=form`)}
          >
            フォーム作成
          </Button>
        </div>
      </div>

      {isEdit && isLoading ? (
        <Card shadow="sm" className="border border-default-200">
          <CardBody className="p-10 text-center text-sm text-default-500">
            テンプレートを読み込み中...
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pb-8">
          <div
            className={
              isFormFocused
                ? "xl:col-span-12 space-y-3"
                : "xl:col-span-9 2xl:col-span-10 space-y-3"
            }
          >
            {!isFormPage && (
              <>
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-2 space-y-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 text-left"
                      onClick={() => toggleStep("basic")}
                    >
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color="primary" variant="flat">
                          1
                        </Chip>
                        <h2 className="text-sm font-semibold">基本情報</h2>
                      </div>
                      <span className="text-default-500">
                        {openSteps.has("basic") ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                    {openSteps.has("basic") && (
                      <>
                        <Divider />
                        <div className="space-y-2">
                          <Input
                            label="テンプレート名"
                            placeholder="例: 飲食店 店舗基本テンプレ"
                            value={templateName}
                            onValueChange={setTemplateName}
                            variant="bordered"
                            size="sm"
                            isRequired
                            description="店舗側で表示されるテンプレート名です"
                            classNames={{
                              input:
                                "focus:outline-none focus-visible:outline-none text-sm",
                              inputWrapper:
                                "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                            }}
                          />
                          <Textarea
                            label="説明（任意）"
                            placeholder="このテンプレートの用途や、どのような店舗向けかを説明してください"
                            value={description}
                            onValueChange={setDescription}
                            variant="bordered"
                            size="sm"
                            minRows={2}
                            description="店舗側でテンプレートを選ぶ際の参考情報として表示されます"
                            classNames={{
                              input:
                                "focus:outline-none focus-visible:outline-none",
                              inputWrapper:
                                "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                            }}
                          />
                          <div className="p-2 bg-primary/5 border border-primary/20 rounded-lg">
                            <p className="text-xs text-default-600">
                              <strong>テンプレートの状態について</strong>
                              <br />
                              有効/無効の設定は一覧ページから変更できます。
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>

                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-2 space-y-2">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 text-left"
                      onClick={() => toggleStep("bot")}
                    >
                      <div className="flex items-center gap-2">
                        <Chip size="sm" color="primary" variant="flat">
                          2
                        </Chip>
                        <h2 className="text-sm font-semibold">ボット設定</h2>
                      </div>
                      <span className="text-default-500">
                        {openSteps.has("bot") ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </span>
                    </button>
                    {openSteps.has("bot") && (
                      <>
                        <Divider />
                        <div className="space-y-3">
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-sm font-semibold mb-1">
                                ボット名の自動生成
                              </h3>
                              <p className="text-xs text-default-500">
                                フォームに入力された値を組み合わせて、ボット名を自動生成できます。
                                <br />
                                例：
                                <code className="text-xs bg-default-100 px-1 py-0.5 rounded">
                                  {"{storeName}"}
                                </code>{" "}
                                と入力すると、フォームの「storeName」という項目の値がボット名に使われます。
                              </p>
                            </div>
                            <Input
                              label="ボット名のテンプレート"
                              placeholder="{storeName} 店舗FAQ"
                              value={botNameTemplate}
                              onValueChange={setBotNameTemplate}
                              variant="bordered"
                              size="sm"
                              description={
                                <span>
                                  <code className="text-xs bg-default-100 px-1 py-0.5 rounded">
                                    {"{storeName}"}
                                  </code>{" "}
                                  のように{" "}
                                  <code className="text-xs bg-default-100 px-1 py-0.5 rounded">
                                    {"{...}"}
                                  </code>{" "}
                                  を埋め込めます（使わなくてもOK）
                                </span>
                              }
                              classNames={{
                                input:
                                  "focus:outline-none focus-visible:outline-none font-mono",
                                inputWrapper:
                                  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                              }}
                            />
                          </div>

                          <Divider className="my-1" />

                          <div className="space-y-3">
                            <h3 className="text-sm font-semibold">
                              ボットの初期設定
                            </h3>
                            <Select
                              label="ボットの利用権限"
                              variant="bordered"
                              size="sm"
                              selectedKeys={new Set([botPermissionLevel])}
                              onSelectionChange={(keys) => {
                                const v = Array.from(keys)[0] as
                                  | "GROUP_MEMBER"
                                  | "GROUP_OWNER";
                                if (v) setBotPermissionLevel(v);
                              }}
                              description="誰がこのボットを利用できるかを設定します"
                            >
                              <SelectItem key="GROUP_MEMBER">
                                誰でも利用可能
                              </SelectItem>
                              <SelectItem key="GROUP_OWNER">
                                オーナーのみ利用可能
                              </SelectItem>
                            </Select>
                            <Textarea
                              label="ボットの説明（任意）"
                              placeholder="このボットの用途や特徴を説明してください"
                              value={botDescriptionTemplate}
                              onValueChange={setBotDescriptionTemplate}
                              variant="bordered"
                              size="sm"
                              minRows={2}
                              description="ボット作成時に自動的に設定される説明文です"
                              classNames={{
                                input:
                                  "focus:outline-none focus-visible:outline-none",
                                inputWrapper:
                                  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                              }}
                            />
                            <Textarea
                              label="ボットの目的（任意）"
                              placeholder="このボットが何を目的としているかを記述してください"
                              value={botPurposeTemplate}
                              onValueChange={setBotPurposeTemplate}
                              variant="bordered"
                              size="sm"
                              minRows={2}
                              description="ボットの目的を明確にすることで、より適切な回答が得られます"
                              classNames={{
                                input:
                                  "focus:outline-none focus-visible:outline-none",
                                inputWrapper:
                                  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                              }}
                            />
                            <Textarea
                              label="回答ルール（任意）"
                              placeholder="ボットが回答する際のルールや制約を記述してください"
                              value={botAnswerRulesTemplate}
                              onValueChange={setBotAnswerRulesTemplate}
                              variant="bordered"
                              size="sm"
                              minRows={2}
                              description="ボットがどのように回答すべきかのルールを設定できます"
                              classNames={{
                                input:
                                  "focus:outline-none focus-visible:outline-none",
                                inputWrapper:
                                  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                              }}
                            />
                          </div>

                          <Divider className="my-1" />

                          <Card
                            shadow="sm"
                            className="border border-default-200"
                          >
                            <CardBody className="p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-semibold mb-0.5">
                                    Web検索機能を有効にする
                                  </p>
                                  <p className="text-xs text-default-500">
                                    このテンプレートから作成されるボットに、Web検索機能を自動的に有効にします
                                  </p>
                                </div>
                                <Switch
                                  isSelected={isWebSearchBot}
                                  onValueChange={setIsWebSearchBot}
                                  size="md"
                                />
                              </div>
                              {isWebSearchBot && (
                                <div className="space-y-3 pt-2 border-t border-default-200">
                                  <Textarea
                                    label="検索対象URL（任意）"
                                    placeholder="例: https://example.com"
                                    value={botSearchUrl}
                                    onValueChange={setBotSearchUrl}
                                    variant="bordered"
                                    size="sm"
                                    minRows={2}
                                    description="検索対象となるWebサイトのURLを指定できます（複数行で複数指定可能）"
                                    classNames={{
                                      input:
                                        "focus:outline-none focus-visible:outline-none font-mono text-xs",
                                      inputWrapper:
                                        "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                    }}
                                  />
                                  <Textarea
                                    label="検索情報取得プロンプト（任意）"
                                    placeholder="例: このWebサイトから最新の情報を取得してください"
                                    value={botSearchInfoPrompt}
                                    onValueChange={setBotSearchInfoPrompt}
                                    variant="bordered"
                                    size="sm"
                                    minRows={2}
                                    description="Web検索時にどのような情報を取得すべきかを指示するプロンプトです"
                                    classNames={{
                                      input:
                                        "focus:outline-none focus-visible:outline-none",
                                      inputWrapper:
                                        "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                                    }}
                                  />
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        </div>
                      </>
                    )}
                  </CardBody>
                </Card>
              </>
            )}

            {isFormPage && (
              <Card shadow="sm" className="border border-default-200">
                <CardBody className="p-2 space-y-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 text-left"
                    onClick={() => toggleStep("form")}
                  >
                    <div className="flex items-center gap-2">
                      <Chip size="sm" color="primary" variant="flat">
                        3
                      </Chip>
                      <h2 className="text-sm font-semibold">フォーム作成</h2>
                    </div>
                    <span className="text-default-500">
                      {openSteps.has("form") ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  {openSteps.has("form") && (
                    <>
                      <Divider />
                      <div className="text-sm bg-default-50/60 border border-default-200 rounded-lg p-3 max-w-5xl mx-auto w-full">
                        <PremiseSchemaEditor
                          value={premiseSections}
                          onChange={setPremiseSections}
                          showFloatingButtons={false}
                          onAIGenerateOpen={() =>
                            setIsAIGenerateModalOpen(true)
                          }
                          validationErrors={premiseValidationErrors}
                        />
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            )}
          </div>

          {!canManage && (
            <div className="xl:col-span-12">
              <Card shadow="sm" className="border border-warning-200">
                <CardBody className="p-3 text-xs text-warning-600">
                  現在の権限ではテンプレートを保存できません。
                </CardBody>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* フローティングアクションボタン */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 flex flex-col gap-2 max-sm:flex-row max-sm:flex-wrap max-sm:justify-end">
        {isFormPage ? (
          <>
            <Button
              color="primary"
              size="sm"
              startContent={<Save className="h-4 w-4" />}
              onPress={handleSave}
              isLoading={isSaving}
              isDisabled={!canSubmit}
              className="shadow-lg hover:shadow-xl transition-shadow"
              radius="md"
            >
              保存
            </Button>
            <Button
              color="primary"
              size="sm"
              startContent={<Plus className="h-4 w-4" />}
              onPress={() => {
                const section = newSection();
                setPremiseSections([...premiseSections, section]);
                // スクロールして新しいセクションが見えるように
                setTimeout(() => {
                  window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: "smooth",
                  });
                }, 100);
              }}
              className="shadow-lg hover:shadow-xl transition-shadow"
              radius="md"
              variant="flat"
            >
              セクション追加
            </Button>
            <Button
              color="secondary"
              size="sm"
              startContent={<Sparkles className="h-4 w-4" />}
              onPress={() => setIsAIGenerateModalOpen(true)}
              className="shadow-lg hover:shadow-xl transition-shadow"
              radius="md"
              variant="flat"
            >
              AI生成
            </Button>
          </>
        ) : (
          <Button
            color="primary"
            size="sm"
            onPress={() => router.push(`${pathname}?step=form`)}
            className="shadow-lg hover:shadow-xl transition-shadow"
            radius="md"
          >
            つぎへ
          </Button>
        )}
      </div>

      {/* AI生成モーダル */}
      <Modal
        isOpen={isAIGenerateModalOpen}
        onClose={() => {
          setIsAIGenerateModalOpen(false);
          setAiDescription("");
        }}
        size="xl"
        isDismissable={!isAIGenerating}
      >
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold">
                AIでフォームを自動生成
              </h3>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-3">
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-default-600">
                  <strong>AI生成機能について</strong>
                  <br />
                  作成したいフォームの説明を入力すると、AIが自動的にセクション名、質問文、回答形式などを生成します。
                  <br />
                  例：「飲食店の店舗情報を集めるフォーム」「美容院の顧客情報を収集するフォーム」など
                </p>
              </div>
              <Textarea
                label="フォームの説明"
                placeholder="例: 飲食店の店舗情報を集めるフォーム。店舗名、住所、電話番号、営業時間、メニューなどを収集したい"
                value={aiDescription}
                onValueChange={setAiDescription}
                variant="bordered"
                size="md"
                minRows={4}
                isDisabled={isAIGenerating}
                description="作成したいフォームの内容を詳しく説明してください"
                classNames={{
                  input: "focus:outline-none focus-visible:outline-none",
                  inputWrapper:
                    "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                }}
              />
              {isAIGenerating && (
                <div className="flex items-center gap-3 p-3 bg-default-50 rounded-lg">
                  <Spinner size="sm" color="primary" />
                  <p className="text-xs text-default-600">
                    AIがフォームを生成中です。しばらくお待ちください...
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => {
                setIsAIGenerateModalOpen(false);
                setAiDescription("");
              }}
              isDisabled={isAIGenerating}
            >
              キャンセル
            </Button>
            <Button
              color="primary"
              onPress={handleAIGenerate}
              isLoading={isAIGenerating}
              isDisabled={!aiDescription.trim() || isAIGenerating}
              startContent={
                !isAIGenerating ? <Sparkles className="h-4 w-4" /> : undefined
              }
            >
              生成する
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
