"use client";

import React from "react";
import { CustomFormFiller } from "@common/customForm/CustomFormFiller";
import type {
  CustomFormField,
  CustomFormSection,
} from "@common/customForm/types";
import type { CustomFormResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import { create_custom_form_response_v2_custom_form_external_response_create_post } from "@repo/api-contracts/based_template/service";

type CustomFormModalData = Pick<
  CustomFormResponseSchemaType,
  "customFormId" | "formName" | "description" | "formFields"
>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customForm: CustomFormModalData;
  externalUserId: string;
  isRequired?: boolean;
  onSuccess: () => void;
  formName?: string;
}

const toCustomFormField = (
  field: NonNullable<
    CustomFormResponseSchemaType["formFields"]
  >[number]["fields"][number],
): CustomFormField | null => {
  const key = field.key.trim();
  const label = field.label.trim();
  if (!key || !label) return null;

  return {
    key,
    label,
    type: field.type,
    required: field.required ?? false,
    placeholder: field.placeholder ?? null,
    description: field.description ?? null,
    options:
      field.type === "select" || field.type === "multiselect"
        ? (field.options ?? [])
        : null,
  };
};

const toSections = (
  formFields: CustomFormResponseSchemaType["formFields"],
): CustomFormSection[] => {
  if (!formFields) return [];

  return formFields
    .map((section) => {
      const fields = section.fields
        .map(toCustomFormField)
        .filter((field): field is CustomFormField => field !== null);

      return {
        title: section.title,
        fields,
      };
    })
    .filter((section) => section.fields.length > 0);
};

export default function CustomFormModal({
  isOpen,
  onClose,
  customForm,
  externalUserId,
  isRequired = false,
  onSuccess,
  formName,
}: Props) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      await create_custom_form_response_v2_custom_form_external_response_create_post(
        {
          customFormId: customForm.customFormId,
          externalUserId,
          responseData: data,
        },
      );
      const stableStorageKey = `custom_form_submitted_${customForm.customFormId}_${externalUserId}`;
      sessionStorage.setItem(stableStorageKey, "true");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("フォーム送信エラー:", error);
      alert("送信に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-white overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {formName || customForm.formName}
            </h2>
            {customForm.description && (
              <p className="mt-2 text-sm text-default-500">
                {customForm.description}
              </p>
            )}
          </div>
          {!isRequired ? (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              閉じる
            </button>
          ) : null}
        </div>
        <CustomFormFiller
          sections={toSections(customForm.formFields)}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitButtonText={isRequired ? "入力して開始する" : "送信する"}
        />
      </div>
    </div>
  );
}
