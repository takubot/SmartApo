"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Textarea,
  Chip,
} from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import { get_bot_template_for_group_v2_bot_template_get__template_id__get } from "@repo/api-contracts/based_template/service";
import type {
  BotTemplateDetailSchemaType,
  BotTemplateListItemSchemaType,
  CreateBotFromTemplateRequestSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { FileText, CheckCircle2 } from "lucide-react";

type FieldType =
  | "string"
  | "text"
  | "url"
  | "select"
  | "multiselect"
  | "boolean";

type FieldDef = {
  key?: string;
  label?: string;
  type?: FieldType | string;
  required?: boolean;
  placeholder?: string | null;
  description?: string | null;
  options?: string[] | null;
};

type SectionDef = {
  title?: string;
  fields?: FieldDef[];
};

function normalizeSections(
  premiseSchema: BotTemplateDetailSchemaType["premiseSchema"],
): SectionDef[] {
  if (!premiseSchema || !Array.isArray(premiseSchema)) return [];
  return premiseSchema.map((s) => ({
    title: (s?.title as string | undefined) ?? "",
    fields: Array.isArray(s?.fields) ? (s.fields as FieldDef[]) : [],
  }));
}

function formatBotName(
  tpl: string | null | undefined,
  values: Record<string, unknown>,
): string {
  if (!tpl) return "";
  return tpl
    .replace(/\{([^}]+)\}/g, (_, key) => {
      const v = values[key];
      if (v === undefined || v === null) return "";
      if (Array.isArray(v)) return v.join(" ");
      return String(v);
    })
    .trim();
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    payload: CreateBotFromTemplateRequestSchemaType,
  ) => Promise<boolean>;
  refreshBotList?: () => Promise<void>;
  templates: BotTemplateListItemSchemaType[];
  isTemplatesLoading: boolean;
  templatesError?: Error;
};

export function BotTemplateCreateModal({
  isOpen,
  onClose,
  onCreate,
  templates,
  isTemplatesLoading,
  templatesError,
}: Props) {
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [premiseValues, setPremiseValues] = useState<Record<string, unknown>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: detail,
    error: detailError,
    isLoading: isDetailLoading,
  } = useSWR<BotTemplateDetailSchemaType | undefined>(
    isOpen && templateId ? ["bot-template-detail", templateId] : null,
    async () => {
      if (!templateId) return;
      return await get_bot_template_for_group_v2_bot_template_get__template_id__get(
        String(templateId),
      );
    },
  );

  useEffect(() => {
    if (!isOpen) return;
    setTemplateId(null);
    setPremiseValues({});
  }, [isOpen]);

  useEffect(() => {
    if (templatesError) handleErrorWithUI(templatesError, "テンプレ一覧取得");
  }, [templatesError]);
  useEffect(() => {
    if (detailError) handleErrorWithUI(detailError, "テンプレ詳細取得");
  }, [detailError]);

  const sections = useMemo(
    () => normalizeSections(detail?.premiseSchema),
    [detail?.premiseSchema],
  );
  const suggestedName = useMemo(
    () => formatBotName(detail?.botNameTemplate, premiseValues),
    [detail?.botNameTemplate, premiseValues],
  );

  // 必須フィールドのバリデーション
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    for (const section of sections) {
      for (const field of section.fields ?? []) {
        if (!field.key) continue;
        if (field.required) {
          const value = premiseValues[field.key];
          if (
            value === undefined ||
            value === null ||
            (typeof value === "string" && value.trim() === "") ||
            (Array.isArray(value) && value.length === 0)
          ) {
            errors[field.key] = `${field.label || field.key}は必須です`;
          }
        }
      }
    }
    return errors;
  }, [sections, premiseValues]);

  const canSubmit = Boolean(
    templateId &&
      !isSubmitting &&
      Object.keys(validationErrors).length === 0 &&
      suggestedName,
  );

  const setValue = (key: string, v: unknown) => {
    setPremiseValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSubmit = async () => {
    if (!templateId || !canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload: CreateBotFromTemplateRequestSchemaType = {
        templateId: templateId,
        premiseValues,
        botName: null, // 自動生成される
      };
      const ok = await onCreate(payload);
      if (ok) {
        showSuccessToast("ボットを作成しました");
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassNames = {
    input: "focus:outline-none focus-visible:outline-none",
    inputWrapper:
      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="4xl"
      scrollBehavior="inside"
      isDismissable={false}
      classNames={{ base: "max-h-[95vh]" }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">テンプレートからボットを作成</h2>
          </div>
          <p className="text-sm text-default-500 mt-1">
            テンプレートを選択して、フォームに入力するだけでボットを作成できます
          </p>
        </ModalHeader>
        <ModalBody className="px-6 py-4">
          {isTemplatesLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Spinner color="primary" size="lg" />
            </div>
          ) : !templateId ? (
            <div className="space-y-4">
              <div className="text-lg font-semibold mb-4">
                テンプレートを選択
              </div>
              <Select
                label="テンプレート"
                placeholder="テンプレート番号を選択してください"
                selectedKeys={
                  templateId ? new Set([String(templateId)]) : new Set()
                }
                onSelectionChange={(keys) => {
                  const idStr = Array.from(keys)[0] as string | undefined;
                  setTemplateId(idStr ? Number(idStr) : null);
                  setPremiseValues({});
                }}
                variant="bordered"
                size="lg"
              >
                {templates.length === 0 ? (
                  <SelectItem key="none" isDisabled>
                    利用可能なテンプレートがありません
                  </SelectItem>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={String(t.templateId)}>
                      {t.templateName}
                    </SelectItem>
                  ))
                )}
              </Select>
            </div>
          ) : isDetailLoading || !detail ? (
            <div className="py-16 flex items-center justify-center">
              <Spinner color="primary" size="lg" />
            </div>
          ) : (
            <div className="space-y-8 max-w-3xl mx-auto">
              {/* テンプレート情報 */}
              <Card
                shadow="sm"
                className="border border-default-200 bg-gradient-to-r from-primary/5 to-secondary/5"
              >
                <CardBody className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">
                          {detail.templateName}
                        </h3>
                      </div>
                      {detail.description && (
                        <p className="text-sm text-default-600 mt-2">
                          {detail.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => {
                        setTemplateId(null);
                        setPremiseValues({});
                      }}
                    >
                      変更
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* ボット名（自動生成） */}
              {suggestedName && (
                <Card
                  shadow="sm"
                  className="border border-default-200 bg-success-50/50"
                >
                  <CardBody className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <label className="text-base font-semibold">
                        生成されるボット名
                      </label>
                    </div>
                    <div className="text-lg font-bold text-default-800 pl-7">
                      {suggestedName}
                    </div>
                    <p className="text-xs text-default-500 mt-2 pl-7">
                      フォームに入力した内容から自動的に生成されます
                    </p>
                  </CardBody>
                </Card>
              )}

              <Divider className="my-6" />

              {/* フォームフィールド */}
              {sections.length === 0 ? (
                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-8 text-center">
                    <p className="text-default-500">
                      このテンプレートには入力項目が定義されていません。
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="space-y-8">
                  {sections.map((section, si) => (
                    <div key={si} className="space-y-4">
                      {/* セクション見出し */}
                      <div className="border-l-4 border-primary pl-4">
                        <h3 className="text-xl font-bold text-default-800">
                          {section.title || `セクション ${si + 1}`}
                        </h3>
                      </div>

                      {/* フィールド */}
                      <div className="space-y-6 pl-4">
                        {(section.fields ?? []).map((f, fi) => {
                          const key = f.key ?? "";
                          if (!key) return null;
                          const type = (f.type ?? "string") as FieldType;
                          const label = f.label ?? key;
                          const required = Boolean(f.required);
                          const placeholder = f.placeholder ?? "";
                          const desc = f.description ?? "";
                          const options = (f.options ?? []) as string[];
                          const hasError = Boolean(validationErrors[key]);

                          if (type === "boolean") {
                            return (
                              <div
                                key={`${si}-${fi}`}
                                className="p-4 rounded-xl border border-default-200 bg-default-50/50 hover:bg-default-100/50 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <label className="text-base font-medium">
                                        {label}
                                      </label>
                                      {required && (
                                        <Chip
                                          size="sm"
                                          color="danger"
                                          variant="flat"
                                        >
                                          必須
                                        </Chip>
                                      )}
                                    </div>
                                    {desc && (
                                      <p className="text-sm text-default-500 mt-1">
                                        {desc}
                                      </p>
                                    )}
                                  </div>
                                  <Switch
                                    isSelected={Boolean(premiseValues[key])}
                                    onValueChange={(v) => setValue(key, v)}
                                    size="lg"
                                  />
                                </div>
                              </div>
                            );
                          }

                          if (type === "select" || type === "multiselect") {
                            const selected = premiseValues[key];
                            const selectedKeys = (() => {
                              if (type === "multiselect") {
                                const arr = Array.isArray(selected)
                                  ? selected
                                  : [];
                                return new Set(arr.map(String));
                              }
                              return selected
                                ? new Set([String(selected)])
                                : new Set();
                            })();
                            return (
                              <div key={`${si}-${fi}`} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-base font-medium">
                                    {label}
                                  </label>
                                  {required && (
                                    <Chip
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                    >
                                      必須
                                    </Chip>
                                  )}
                                </div>
                                {desc && (
                                  <p className="text-sm text-default-500">
                                    {desc}
                                  </p>
                                )}
                                <Select
                                  label={undefined}
                                  placeholder={
                                    placeholder || "選択してください"
                                  }
                                  selectionMode={
                                    type === "multiselect"
                                      ? "multiple"
                                      : "single"
                                  }
                                  selectedKeys={selectedKeys as Set<string>}
                                  onSelectionChange={(keys) => {
                                    const arr = Array.from(keys).map(String);
                                    setValue(
                                      key,
                                      type === "multiselect"
                                        ? arr
                                        : (arr[0] ?? ""),
                                    );
                                  }}
                                  variant="bordered"
                                  size="lg"
                                  isInvalid={hasError}
                                  errorMessage={
                                    hasError ? validationErrors[key] : undefined
                                  }
                                >
                                  {options.map((o) => (
                                    <SelectItem key={o}>{o}</SelectItem>
                                  ))}
                                </Select>
                              </div>
                            );
                          }

                          if (type === "text") {
                            return (
                              <div key={`${si}-${fi}`} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <label className="text-base font-medium">
                                    {label}
                                  </label>
                                  {required && (
                                    <Chip
                                      size="sm"
                                      color="danger"
                                      variant="flat"
                                    >
                                      必須
                                    </Chip>
                                  )}
                                </div>
                                {desc && (
                                  <p className="text-sm text-default-500">
                                    {desc}
                                  </p>
                                )}
                                <Textarea
                                  placeholder={placeholder || ""}
                                  value={(premiseValues[key] as string) ?? ""}
                                  onValueChange={(v) => setValue(key, v)}
                                  variant="bordered"
                                  size="lg"
                                  minRows={4}
                                  isInvalid={hasError}
                                  errorMessage={
                                    hasError ? validationErrors[key] : undefined
                                  }
                                  classNames={inputClassNames}
                                />
                              </div>
                            );
                          }

                          // string / url
                          return (
                            <div key={`${si}-${fi}`} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <label className="text-base font-medium">
                                  {label}
                                </label>
                                {required && (
                                  <Chip size="sm" color="danger" variant="flat">
                                    必須
                                  </Chip>
                                )}
                              </div>
                              {desc && (
                                <p className="text-sm text-default-500">
                                  {desc}
                                </p>
                              )}
                              <Input
                                type={type === "url" ? "url" : "text"}
                                placeholder={placeholder || ""}
                                value={(premiseValues[key] as string) ?? ""}
                                onValueChange={(v) => setValue(key, v)}
                                variant="bordered"
                                size="lg"
                                isInvalid={hasError}
                                errorMessage={
                                  hasError ? validationErrors[key] : undefined
                                }
                                classNames={inputClassNames}
                              />
                            </div>
                          );
                        })}
                      </div>

                      {si < sections.length - 1 && <Divider className="my-6" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ModalBody>
        <ModalFooter className="border-t px-6 py-4">
          <Button
            variant="flat"
            onPress={onClose}
            isDisabled={isSubmitting}
            size="lg"
          >
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={isSubmitting}
            isDisabled={!canSubmit}
            size="lg"
            className="min-w-32"
          >
            {isSubmitting ? "作成中..." : "ボットを作成"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
