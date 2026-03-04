"use client";

import { useGroupContext } from "../../layout-client";
import {
  Button,
  Input,
  Textarea,
  Tabs,
  Tab,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import {
  Edit3,
  Eye,
  Settings,
  Sparkles,
  ChevronLeft,
  FileText,
  User,
  Mail,
  Phone,
  Tag,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  create_custom_form_v2_custom_form_create__group_id__post,
  update_custom_form_v2_custom_form_update_patch,
  generate_form_from_text_v2_tenant_config_bot_template_generate_form_post,
} from "@repo/api-contracts/based_template/service";
import {
  showSuccessToast,
  handleErrorWithUI,
  showLoadingToast,
} from "@common/errorHandler";
import { CustomFormEditor } from "@common/customForm/CustomFormEditor";
import { CustomFormPreview } from "@common/customForm/CustomFormPreview";
import type {
  CustomFormFieldType,
  CustomFormSection,
} from "@common/customForm/types";
import { newSection } from "@common/customForm/types";
import { useRouter } from "next/navigation";

const normalizeSections = (sections: CustomFormSection[]) =>
  sections.map((section) => ({
    title: section.title ?? "",
    fields: (section.fields ?? []).map((field) => ({
      key: field.key ?? "",
      label: field.label ?? "",
      type: field.type ?? "string",
      required: Boolean(field.required),
      placeholder: field.placeholder ?? null,
      description: field.description ?? null,
      options:
        field.type === "select" || field.type === "multiselect"
          ? (field.options ?? [])
          : (field.options ?? null),
    })),
  }));

const hasFieldKey = (sections: CustomFormSection[], key: string) => {
  const normalizedKey = key.trim().toLowerCase();
  return sections.some((section) =>
    (section.fields ?? []).some(
      (field) => (field.key ?? "").trim().toLowerCase() === normalizedKey,
    ),
  );
};

type TagRuleMatchType = "equals" | "contains" | "exists";

type CustomFormTagRuleInput = {
  fieldKey: string;
  matchType: TagRuleMatchType;
  expectedValue: string;
  tagKey: string;
};

type AvailableRuleField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  options: string[];
};

const FIELD_TYPE_DISPLAY_LABEL: Record<CustomFormFieldType, string> = {
  string: "短い回答",
  text: "長い回答",
  url: "URL",
  select: "選択肢（1つ）",
  multiselect: "選択肢（複数）",
  boolean: "はい/いいえ",
};

const getAllowedMatchTypes = (
  fieldType?: CustomFormFieldType,
): TagRuleMatchType[] => {
  if (fieldType === "boolean" || fieldType === "select") {
    return ["equals", "exists"];
  }
  if (fieldType === "multiselect") {
    return ["equals", "contains", "exists"];
  }
  return ["equals", "contains", "exists"];
};

const getMatchTypeLabel = (
  matchType: TagRuleMatchType,
  fieldType?: CustomFormFieldType,
) => {
  if (fieldType === "boolean") {
    if (matchType === "equals") return "はい / いいえ が一致";
    if (matchType === "exists") return "回答あり";
  }
  if (fieldType === "select") {
    if (matchType === "equals") return "選択肢が一致";
    if (matchType === "exists") return "回答あり";
  }
  if (fieldType === "multiselect") {
    if (matchType === "equals") return "いずれかの選択肢が一致";
    if (matchType === "contains") return "選択肢文字列の部分一致";
    if (matchType === "exists") return "1つ以上回答あり";
  }
  if (matchType === "equals") return "完全一致";
  if (matchType === "contains") return "部分一致";
  return "回答あり";
};

const getDefaultMatchType = (
  fieldType?: CustomFormFieldType,
): TagRuleMatchType => getAllowedMatchTypes(fieldType)[0] ?? "equals";

const outsideInputClassNames = {
  base: "w-full",
  inputWrapper: "min-h-11 h-auto",
};

const outsideTextareaClassNames = {
  base: "w-full",
  inputWrapper: "min-h-11 h-auto",
};

const outsideSelectClassNames = {
  base: "w-full",
  trigger: "min-h-11 h-auto",
};

const newTagRule = (
  fieldKey = "",
  matchType: TagRuleMatchType = "equals",
): CustomFormTagRuleInput => ({
  fieldKey,
  matchType,
  expectedValue: "",
  tagKey: "",
});

const normalizeTagRulesForApi = (rules: CustomFormTagRuleInput[]) =>
  rules.map((rule) => ({
    fieldKey: rule.fieldKey.trim(),
    matchType: rule.matchType,
    expectedValue:
      rule.matchType === "exists" ? null : (rule.expectedValue?.trim() ?? ""),
    tagKey: rule.tagKey.trim(),
  }));

interface Props {
  initialData?: any;
  isEdit?: boolean;
}

const PROFILE_SYNC_DISPLAY_NAME_KEY = "external_user_display_name";
const PROFILE_SYNC_EMAIL_KEY = "external_user_email";
const PROFILE_SYNC_PHONE_KEY = "external_user_phone";

function FieldLabel({
  children,
  isRequired = false,
}: {
  children: string;
  isRequired?: boolean;
}) {
  return (
    <p className="mb-1.5 text-xs font-semibold text-default-700 leading-snug whitespace-normal break-words">
      {children}
      {isRequired && <span className="text-danger ml-0.5">*</span>}
    </p>
  );
}

export function CustomFormEditorContainer({
  initialData,
  isEdit = false,
}: Props) {
  const groupId = useGroupContext();
  const router = useRouter();

  const [formName, setFormName] = useState(initialData?.formName || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [sections, setSections] = useState<CustomFormSection[]>(() => {
    if (initialData?.formFields) {
      return initialData.formFields;
    }
    return [newSection()];
  });
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(initialData?.formFields?.map((_: any, i: number) => i) || [0]),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [settingsTab, setSettingsTab] = useState<"form" | "rule">("form");

  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [tagRules, setTagRules] = useState<CustomFormTagRuleInput[]>(() =>
    (initialData?.tagRules ?? []).map((rule: any) => ({
      fieldKey: rule.fieldKey ?? "",
      matchType: (rule.matchType as TagRuleMatchType) ?? "equals",
      expectedValue: rule.expectedValue ?? "",
      tagKey: rule.tagKey ?? "",
    })),
  );
  const availableFieldCandidates = sections.flatMap((section) =>
    (section.fields ?? []).map((field) => ({
      key: (field.key ?? "").trim(),
      label: (field.label ?? "").trim(),
      type: field.type ?? "string",
      options: (field.options ?? [])
        .map((option) => option?.trim() ?? "")
        .filter(Boolean),
    })),
  );
  const availableFields = availableFieldCandidates.filter(
    (field): field is AvailableRuleField =>
      Boolean(field.key) && Boolean(field.label),
  );
  const availableFieldMap = new Map(
    availableFields.map((field) => [field.key, field]),
  );
  const hasNameProfileField = hasFieldKey(
    sections,
    PROFILE_SYNC_DISPLAY_NAME_KEY,
  );
  const hasEmailProfileField = hasFieldKey(sections, PROFILE_SYNC_EMAIL_KEY);
  const hasPhoneProfileField = hasFieldKey(sections, PROFILE_SYNC_PHONE_KEY);
  const profileSyncAddedCount =
    Number(hasNameProfileField) +
    Number(hasEmailProfileField) +
    Number(hasPhoneProfileField);
  const allProfileSyncFieldsAdded =
    hasNameProfileField && hasEmailProfileField && hasPhoneProfileField;

  const handleSave = async () => {
    if (!formName.trim()) {
      handleErrorWithUI(
        new Error("フォーム名を入力してください"),
        "バリデーション",
      );
      return;
    }

    setIsSubmitting(true);
    showLoadingToast(isEdit ? "更新中..." : "作成中...");

    if (!groupId) {
      handleErrorWithUI(
        new Error("グループ情報が取得できません"),
        "フォーム保存",
      );
      setIsSubmitting(false);
      return;
    }

    const normalizedSections = normalizeSections(sections);
    const normalizedTagRules = normalizeTagRulesForApi(
      tagRules.map((rule) => {
        const field = availableFieldMap.get(rule.fieldKey.trim());
        const allowedMatchTypes = getAllowedMatchTypes(field?.type);
        const safeMatchType = allowedMatchTypes.includes(rule.matchType)
          ? rule.matchType
          : getDefaultMatchType(field?.type);
        return {
          ...rule,
          matchType: safeMatchType,
          expectedValue: safeMatchType === "exists" ? "" : rule.expectedValue,
        };
      }),
    );
    const hasInvalidTagRule = normalizedTagRules.some((rule) => {
      if (!rule.fieldKey || !rule.tagKey) {
        return true;
      }
      if (rule.matchType !== "exists" && !rule.expectedValue) {
        return true;
      }
      return false;
    });
    if (hasInvalidTagRule) {
      handleErrorWithUI(
        new Error("タグ付与ルールの未入力項目を埋めてください"),
        "バリデーション",
      );
      setSettingsTab("rule");
      setActiveTab("editor");
      setIsSubmitting(false);
      return;
    }

    try {
      if (isEdit) {
        await update_custom_form_v2_custom_form_update_patch({
          customFormId: initialData.customFormId,
          formName,
          description,
          formFields: normalizedSections,
          tagRules: normalizedTagRules,
        });
        showSuccessToast("フォームを更新しました");
      } else {
        await create_custom_form_v2_custom_form_create__group_id__post(
          groupId,
          {
            formName,
            description,
            formFields: normalizedSections,
            tagRules: normalizedTagRules,
          },
        );
        showSuccessToast("フォームを作成しました");
      }
      router.push(`/main/${groupId}/customForm/manage`);
      router.refresh();
    } catch (error) {
      handleErrorWithUI(error, "フォーム保存");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      if (response?.premiseSchema) {
        const newSections: CustomFormSection[] = (
          response.premiseSchema || []
        ).map((s: any) => ({
          title: s.title || "",
          fields: (s.fields || []).map((f: any) => ({
            key: f.key || "",
            label: f.label || "",
            type: f.type || "string",
            required: Boolean(f.required),
            placeholder: f.placeholder || "",
            description: f.description || "",
            options: f.options || [],
          })),
        }));
        setSections(newSections);
        setExpandedSections(new Set(newSections.map((_, i) => i)));
        setIsAIGenerateModalOpen(false);
        setAiDescription("");
      }
    } catch (error) {
      handleErrorWithUI(error, "AI生成");
    } finally {
      setIsAIGenerating(false);
    }
  };

  const addSectionHandler = (afterIndex?: number) => {
    if (afterIndex === undefined) {
      const next = [...sections, newSection()];
      setSections(next);
      setExpandedSections(new Set([...expandedSections, next.length - 1]));
    } else {
      const next = [...sections];
      next.splice(afterIndex + 1, 0, newSection());
      setSections(next);
      setExpandedSections(new Set([...expandedSections, afterIndex + 1]));
    }
  };

  const buildProfilePresetField = (type: "name" | "email" | "phone") => ({
    key:
      type === "name"
        ? PROFILE_SYNC_DISPLAY_NAME_KEY
        : type === "email"
          ? PROFILE_SYNC_EMAIL_KEY
          : PROFILE_SYNC_PHONE_KEY,
    label:
      type === "name"
        ? "お名前"
        : type === "email"
          ? "メールアドレス"
          : "電話番号",
    type: "string" as const,
    required: true,
    placeholder:
      type === "name"
        ? "山田 太郎"
        : type === "email"
          ? "sample@example.com"
          : "090-1234-5678",
    description: "",
    options: [],
  });

  const addProfileFields = (types: Array<"name" | "email" | "phone">) => {
    const missingTypes = types.filter((type) => {
      const targetKey =
        type === "name"
          ? PROFILE_SYNC_DISPLAY_NAME_KEY
          : type === "email"
            ? PROFILE_SYNC_EMAIL_KEY
            : PROFILE_SYNC_PHONE_KEY;
      return !hasFieldKey(sections, targetKey);
    });

    if (missingTypes.length === 0) {
      handleErrorWithUI(
        new Error("追加対象のプロフィール項目はすでに作成済みです"),
        "フォーム編集",
      );
      return;
    }

    const presetFields = missingTypes.map((type) =>
      buildProfilePresetField(type),
    );
    const nextSections =
      sections.length === 0
        ? [
            {
              title: "基本情報",
              fields: presetFields,
            },
          ]
        : sections.map((section, index) =>
            index === 0
              ? {
                  ...section,
                  fields: [...(section.fields ?? []), ...presetFields],
                }
              : section,
          );

    setSections(nextSections);
    setExpandedSections(new Set([...expandedSections, 0]));
    setActiveTab("editor");

    if (missingTypes.length === 3) {
      showSuccessToast("名前・メール・電話番号を先頭セクションに追加しました");
      return;
    }

    showSuccessToast(
      `${
        missingTypes[0] === "name"
          ? "お名前"
          : missingTypes[0] === "email"
            ? "メールアドレス"
            : "電話番号"
      }項目を先頭セクションに追加しました`,
    );
  };

  const addPresetProfileField = (type: "name" | "email" | "phone") => {
    addProfileFields([type]);
  };

  const addTagRule = () => {
    const defaultField = availableFields[0];
    const defaultFieldKey = defaultField?.key ?? "";
    const defaultMatchType = getDefaultMatchType(defaultField?.type);
    setTagRules((prev) => [
      ...prev,
      newTagRule(defaultFieldKey, defaultMatchType),
    ]);
  };

  const updateTagRule = (
    index: number,
    patch: Partial<CustomFormTagRuleInput>,
  ) => {
    setTagRules((prev) =>
      prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  };

  const removeTagRule = (index: number) => {
    setTagRules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* ヘッダー */}
      <header className="px-4 py-2 border-b border-divider bg-white flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            size="sm"
            radius="full"
            onPress={() => router.back()}
            className="h-8 w-8"
          >
            <ChevronLeft size={18} />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-foreground">
              {isEdit ? "フォームを編集" : "新規フォーム作成"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            color="secondary"
            size="sm"
            radius="md"
            className="font-bold h-8 px-3"
            startContent={<Sparkles size={16} />}
            onPress={() => setIsAIGenerateModalOpen(true)}
          >
            AI生成
          </Button>
          <Button
            color="primary"
            size="sm"
            radius="md"
            className="font-bold h-8 px-6"
            onPress={handleSave}
            isLoading={isSubmitting}
          >
            {isEdit ? "更新" : "作成"}
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="flex flex-1 min-h-0 flex-col xl:flex-row overflow-hidden">
        <div className="w-full xl:w-[22rem] 2xl:w-96 shrink-0 border-b xl:border-b-0 xl:border-r overflow-y-auto bg-default-50/30">
          <Tabs
            selectedKey={settingsTab}
            onSelectionChange={(key) => setSettingsTab(key as "form" | "rule")}
            variant="underlined"
            classNames={{
              base: "bg-white sticky top-0 z-20 border-b border-divider",
              tabList: "px-3 gap-6 h-11",
              tab: "px-0 h-11 text-xs font-bold",
              cursor: "w-full bg-primary h-1 rounded-full",
              panel: "p-3 sm:p-4 pt-4 sm:pt-5",
            }}
          >
            <Tab
              key="form"
              title={
                <div className="flex items-center gap-2">
                  <Settings size={14} />
                  フォーム設定
                </div>
              }
            >
              <div className="space-y-6">
                <div className="rounded-xl border bg-white p-3 sm:p-4 space-y-4">
                  <h3 className="text-xs font-bold text-default-700">
                    基本情報
                  </h3>
                  <div>
                    <FieldLabel isRequired>フォーム名</FieldLabel>
                    <Input
                      aria-label="フォーム名"
                      placeholder="例: お問い合わせ"
                      value={formName}
                      onValueChange={setFormName}
                      variant="bordered"
                      isRequired
                      size="sm"
                      classNames={outsideInputClassNames}
                    />
                  </div>
                  <div>
                    <FieldLabel>説明</FieldLabel>
                    <Textarea
                      aria-label="説明"
                      placeholder="フォームの目的など"
                      value={description}
                      onValueChange={setDescription}
                      variant="bordered"
                      minRows={3}
                      size="sm"
                      classNames={outsideTextareaClassNames}
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold flex items-center gap-2 text-default-700">
                      <User size={14} />
                      プロフィール同期
                    </h3>
                    <Chip size="sm" color="primary" variant="flat">
                      {profileSyncAddedCount}/3
                    </Chip>
                  </div>
                  <p className="text-[11px] text-default-500">
                    回答を外部ユーザーの名前・メール・電話番号に同期します。
                  </p>
                  {!allProfileSyncFieldsAdded && (
                    <Button
                      size="sm"
                      color="primary"
                      className="w-full font-semibold"
                      onPress={() =>
                        addProfileFields(["name", "email", "phone"])
                      }
                    >
                      3項目をまとめて追加
                    </Button>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-default-600" />
                        <p className="text-xs font-semibold text-default-800">
                          お名前
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={hasNameProfileField ? "bordered" : "flat"}
                        color={hasNameProfileField ? "default" : "primary"}
                        onPress={() => addPresetProfileField("name")}
                        isDisabled={hasNameProfileField}
                      >
                        {hasNameProfileField ? "追加済み" : "追加"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-default-600" />
                        <p className="text-xs font-semibold text-default-800">
                          メールアドレス
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={hasEmailProfileField ? "bordered" : "flat"}
                        color={hasEmailProfileField ? "default" : "primary"}
                        onPress={() => addPresetProfileField("email")}
                        isDisabled={hasEmailProfileField}
                      >
                        {hasEmailProfileField ? "追加済み" : "追加"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-default-600" />
                        <p className="text-xs font-semibold text-default-800">
                          電話番号
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={hasPhoneProfileField ? "bordered" : "flat"}
                        color={hasPhoneProfileField ? "default" : "primary"}
                        onPress={() => addPresetProfileField("phone")}
                        isDisabled={hasPhoneProfileField}
                      >
                        {hasPhoneProfileField ? "追加済み" : "追加"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Tab>

            <Tab
              key="rule"
              title={
                <div className="flex items-center gap-2">
                  <Tag size={14} />
                  タグルール
                </div>
              }
            >
              <div className="space-y-3">
                <div className="rounded-xl border bg-white p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-default-700">
                      回答タグ自動付与
                    </h3>
                    <Chip size="sm" color="secondary" variant="flat">
                      {tagRules.length} ルール
                    </Chip>
                  </div>
                  <p className="text-[11px] text-default-500 leading-relaxed">
                    このフォームに登録した全ルールを、回答保存時に登録順で必ず評価します。
                  </p>
                  <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    className="w-full font-semibold"
                    startContent={<Plus size={14} />}
                    onPress={addTagRule}
                    isDisabled={availableFields.length === 0}
                  >
                    ルールを追加
                  </Button>
                  {availableFields.length === 0 && (
                    <p className="text-[11px] text-warning-600">
                      先にフォームタブで質問項目を作成してください
                    </p>
                  )}
                </div>

                {tagRules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-default-300 bg-white px-4 py-8 text-center">
                    <p className="text-sm font-semibold text-default-700 mb-1">
                      ルールが未設定です
                    </p>
                    <p className="text-xs text-default-500">
                      例: 「問い合わせ種別がクレーム」なら `complaint` を付与
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tagRules.map((rule, index) => {
                      const missingField =
                        rule.fieldKey && !availableFieldMap.get(rule.fieldKey);
                      const selectedField = availableFieldMap.get(
                        rule.fieldKey,
                      );
                      const allowedMatchTypes = getAllowedMatchTypes(
                        selectedField?.type,
                      );
                      const selectedMatchType = allowedMatchTypes.includes(
                        rule.matchType,
                      )
                        ? rule.matchType
                        : getDefaultMatchType(selectedField?.type);
                      return (
                        <div
                          key={`tag-rule-${index}`}
                          className="rounded-xl border bg-white p-3 sm:p-4 space-y-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <Chip size="sm" variant="flat" color="primary">
                              ルール {index + 1}
                            </Chip>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onPress={() => removeTagRule(index)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>

                          <div>
                            <FieldLabel>対象質問</FieldLabel>
                            <Select
                              aria-label="対象質問"
                              placeholder="対象質問を選択"
                              size="sm"
                              variant="bordered"
                              selectedKeys={
                                rule.fieldKey
                                  ? new Set([rule.fieldKey])
                                  : new Set()
                              }
                              classNames={outsideSelectClassNames}
                              onSelectionChange={(keys) => {
                                if (keys === "all") {
                                  return;
                                }
                                const selected =
                                  keys.currentKey ?? Array.from(keys)[0];
                                const fieldKey =
                                  typeof selected === "string" ? selected : "";
                                const targetField =
                                  availableFieldMap.get(fieldKey);
                                const targetMatchTypes = getAllowedMatchTypes(
                                  targetField?.type,
                                );
                                const nextMatchType = targetMatchTypes.includes(
                                  rule.matchType,
                                )
                                  ? rule.matchType
                                  : getDefaultMatchType(targetField?.type);
                                updateTagRule(index, {
                                  fieldKey,
                                  matchType: nextMatchType,
                                  expectedValue: "",
                                });
                              }}
                              renderValue={(items) => {
                                const selectedItem = items[0];
                                return (
                                  selectedItem?.textValue ?? "対象質問を選択"
                                );
                              }}
                            >
                              {availableFields.map((field) => (
                                <SelectItem
                                  key={field.key}
                                  textValue={`${field.label}（${FIELD_TYPE_DISPLAY_LABEL[field.type]}）`}
                                >
                                  {field.label}（
                                  {FIELD_TYPE_DISPLAY_LABEL[field.type]}）
                                </SelectItem>
                              ))}
                            </Select>
                          </div>

                          {missingField && (
                            <p className="text-[11px] text-danger">
                              選択中の対象項目はフォームから削除されています
                            </p>
                          )}

                          <div className="grid grid-cols-1 gap-2">
                            <div>
                              <FieldLabel>判定条件</FieldLabel>
                              <Select
                                aria-label="判定条件"
                                size="sm"
                                variant="bordered"
                                selectedKeys={new Set([selectedMatchType])}
                                classNames={outsideSelectClassNames}
                                onSelectionChange={(keys) => {
                                  const selected = Array.from(keys)[0];
                                  const nextMatchType =
                                    typeof selected === "string" &&
                                    allowedMatchTypes.includes(
                                      selected as TagRuleMatchType,
                                    )
                                      ? (selected as TagRuleMatchType)
                                      : allowedMatchTypes[0];
                                  updateTagRule(index, {
                                    matchType: nextMatchType,
                                    expectedValue:
                                      nextMatchType === "exists"
                                        ? ""
                                        : rule.expectedValue,
                                  });
                                }}
                              >
                                {allowedMatchTypes.map((matchType) => (
                                  <SelectItem key={matchType}>
                                    {getMatchTypeLabel(
                                      matchType,
                                      selectedField?.type,
                                    )}
                                  </SelectItem>
                                ))}
                              </Select>
                            </div>
                          </div>

                          {selectedMatchType !== "exists" && (
                            <div>
                              <FieldLabel>期待値</FieldLabel>
                              {selectedField?.type === "boolean" ? (
                                <Select
                                  aria-label="期待値"
                                  size="sm"
                                  variant="bordered"
                                  placeholder="はい / いいえ を選択"
                                  selectedKeys={
                                    rule.expectedValue
                                      ? new Set([rule.expectedValue])
                                      : new Set()
                                  }
                                  classNames={outsideSelectClassNames}
                                  onSelectionChange={(keys) => {
                                    const selected = Array.from(keys)[0];
                                    updateTagRule(index, {
                                      expectedValue:
                                        typeof selected === "string"
                                          ? selected
                                          : "",
                                    });
                                  }}
                                >
                                  <SelectItem key="true">はい</SelectItem>
                                  <SelectItem key="false">いいえ</SelectItem>
                                </Select>
                              ) : (selectedField?.type === "select" ||
                                  selectedField?.type === "multiselect") &&
                                selectedField.options.length > 0 ? (
                                <>
                                  <Select
                                    aria-label="期待値"
                                    size="sm"
                                    variant="bordered"
                                    placeholder="一致させる選択肢を選択"
                                    selectedKeys={
                                      rule.expectedValue
                                        ? new Set([rule.expectedValue])
                                        : new Set()
                                    }
                                    classNames={outsideSelectClassNames}
                                    onSelectionChange={(keys) => {
                                      const selected = Array.from(keys)[0];
                                      updateTagRule(index, {
                                        expectedValue:
                                          typeof selected === "string"
                                            ? selected
                                            : "",
                                      });
                                    }}
                                  >
                                    {selectedField.options.map((option) => (
                                      <SelectItem key={option}>
                                        {option}
                                      </SelectItem>
                                    ))}
                                  </Select>
                                  {selectedField.type === "multiselect" &&
                                    selectedMatchType === "equals" && (
                                      <p className="text-[11px] text-default-500 mt-1">
                                        複数回答では、選択された値のどれか1つが一致すればタグ付与されます
                                      </p>
                                    )}
                                </>
                              ) : (
                                <Input
                                  aria-label="期待値"
                                  size="sm"
                                  variant="bordered"
                                  placeholder={
                                    selectedMatchType === "contains"
                                      ? "部分一致させる文字列"
                                      : "完全一致させる値"
                                  }
                                  value={rule.expectedValue}
                                  onValueChange={(value) =>
                                    updateTagRule(index, {
                                      expectedValue: value,
                                    })
                                  }
                                  classNames={outsideInputClassNames}
                                />
                              )}
                            </div>
                          )}

                          <div>
                            <FieldLabel>付与タグキー</FieldLabel>
                            <Input
                              aria-label="付与タグキー"
                              size="sm"
                              variant="bordered"
                              placeholder="例: high_intent_lead"
                              value={rule.tagKey}
                              onValueChange={(value) =>
                                updateTagRule(index, { tagKey: value })
                              }
                              classNames={outsideInputClassNames}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </div>

        {/* 右側: エディタ/プレビュー */}
        <div className="flex-1 flex flex-col min-w-0">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(k) => setActiveTab(k as string)}
            variant="underlined"
            classNames={{
              base: "bg-white px-4 border-b border-divider",
              tabList: "gap-6 h-12",
              tab: "px-0 h-12 font-bold text-xs",
              cursor: "w-full bg-primary h-1 rounded-full",
            }}
            color="primary"
          >
            <Tab
              key="editor"
              title={
                <div className="flex items-center gap-2">
                  <Edit3 size={14} />
                  構成エディタ
                </div>
              }
            />
            <Tab
              key="preview"
              title={
                <div className="flex items-center gap-2">
                  <Eye size={14} />
                  プレビュー
                </div>
              }
            />
          </Tabs>

          <div className="flex-1 overflow-y-auto p-4 bg-default-50/50">
            {activeTab === "editor" ? (
              <CustomFormEditor
                sections={sections}
                expandedSections={expandedSections}
                onSectionsChange={setSections}
                onExpandedSectionsChange={setExpandedSections}
                onAddSection={addSectionHandler}
              />
            ) : (
              <CustomFormPreview sections={sections} />
            )}
          </div>
        </div>
      </div>

      {/* AI生成モーダル */}
      <Modal
        isOpen={isAIGenerateModalOpen}
        onClose={() => setIsAIGenerateModalOpen(false)}
        size="xl"
      >
        <ModalContent>
          <ModalHeader>AIでフォーム構成を生成</ModalHeader>
          <ModalBody>
            <div>
              <FieldLabel>どのようなフォームを作りたいですか？</FieldLabel>
              <Textarea
                aria-label="フォーム生成指示"
                placeholder="例: レストランの予約時に、人数、アレルギーの有無、記念日かどうかを詳しく聞くフォーム"
                value={aiDescription}
                onValueChange={setAiDescription}
                minRows={4}
                classNames={outsideTextareaClassNames}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsAIGenerateModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              color="secondary"
              onPress={handleAIGenerate}
              isLoading={isAIGenerating}
              startContent={<Sparkles size={16} />}
            >
              生成する
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
