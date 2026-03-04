"use client";

import React, { useState } from "react";
import {
  Divider,
  Chip,
  Button,
  Input,
  Textarea,
  Checkbox,
  Radio,
  RadioGroup,
  CheckboxGroup,
} from "@heroui/react";
import type { CustomFormSection } from "./types";

const PROFILE_NAME_KEYS = new Set(["external_user_display_name", "name"]);
const PROFILE_EMAIL_KEYS = new Set(["external_user_email", "email"]);
const PROFILE_PHONE_KEYS = new Set(["external_user_phone", "phone"]);

type Props = {
  sections: CustomFormSection[];
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
};

export function CustomFormFiller({
  sections,
  onSubmit,
  isSubmitting = false,
  submitButtonText = "送信する",
}: Props) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (sections.length === 0) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 bg-white rounded-lg p-4 sm:p-6"
    >
      {sections.map((section, si) => (
        <div key={si} className="space-y-6">
          {section.title && (
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-bold text-default-800">
                {section.title}
              </h3>
            </div>
          )}
          <div className="space-y-6">
            {(section.fields ?? []).map((field, fi) => {
              if (!field.label || !field.key) return null;

              const isRequired = field.required;
              const value = formData[field.key];
              const normalizedKey = field.key.trim().toLowerCase();
              const isEmailField = PROFILE_EMAIL_KEYS.has(normalizedKey);
              const isNameField = PROFILE_NAME_KEYS.has(normalizedKey);
              const isPhoneField = PROFILE_PHONE_KEYS.has(normalizedKey);

              return (
                <div key={fi} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-bold text-default-700">
                      {field.label}
                    </label>
                    {isRequired && (
                      <Chip
                        size="sm"
                        color="danger"
                        variant="flat"
                        className="h-5"
                      >
                        必須
                      </Chip>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-xs text-default-500">
                      {field.description}
                    </p>
                  )}

                  {field.type === "boolean" ? (
                    <RadioGroup
                      orientation="horizontal"
                      value={value === undefined ? "" : String(value)}
                      onValueChange={(v) =>
                        handleInputChange(field.key, v === "true")
                      }
                      isRequired={isRequired}
                    >
                      <Radio value="true">はい</Radio>
                      <Radio value="false">いいえ</Radio>
                    </RadioGroup>
                  ) : field.type === "select" ? (
                    <RadioGroup
                      value={value || ""}
                      onValueChange={(v) => handleInputChange(field.key, v)}
                      isRequired={isRequired}
                    >
                      {(field.options ?? []).map((opt, oi) => (
                        <Radio key={oi} value={opt}>
                          {opt}
                        </Radio>
                      ))}
                    </RadioGroup>
                  ) : field.type === "multiselect" ? (
                    <CheckboxGroup
                      value={value || []}
                      onValueChange={(v) => handleInputChange(field.key, v)}
                      isRequired={isRequired}
                    >
                      {(field.options ?? []).map((opt, oi) => (
                        <Checkbox key={oi} value={opt}>
                          {opt}
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  ) : field.type === "text" ? (
                    <Textarea
                      placeholder={field.placeholder || ""}
                      value={value || ""}
                      onValueChange={(v) => handleInputChange(field.key, v)}
                      isRequired={isRequired}
                      variant="bordered"
                    />
                  ) : (
                    <Input
                      type={
                        field.type === "url"
                          ? "url"
                          : isEmailField
                            ? "email"
                            : isPhoneField
                              ? "tel"
                              : "text"
                      }
                      placeholder={field.placeholder || ""}
                      value={value || ""}
                      onValueChange={(v) => handleInputChange(field.key, v)}
                      isRequired={isRequired}
                      variant="bordered"
                      autoComplete={
                        isNameField
                          ? "name"
                          : isEmailField
                            ? "email"
                            : isPhoneField
                              ? "tel"
                              : "off"
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
          {si < sections.length - 1 && <Divider className="my-6" />}
        </div>
      ))}
      <div className="pt-4">
        <Button
          type="submit"
          color="primary"
          className="w-full font-bold"
          isLoading={isSubmitting}
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
}
