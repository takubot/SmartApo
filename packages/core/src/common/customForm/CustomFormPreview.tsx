"use client";

import React from "react";
import { Divider, Chip } from "@heroui/react";
import type { CustomFormSection } from "./types";

type Props = {
  sections: CustomFormSection[];
};

export function CustomFormPreview({ sections }: Props) {
  if (sections.length === 0) {
    return (
      <div className="p-8 text-center text-default-500">
        <p>フォームを定義すると、ここにプレビューが表示されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white rounded-lg p-6 border border-default-200">
      {sections.map((section, si) => (
        <div key={si} className="space-y-4">
          {section.title && (
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-bold text-default-800">
                {section.title}
              </h3>
            </div>
          )}
          <div className="space-y-4 pl-4">
            {(section.fields ?? []).map((field, fi) => {
              if (!field.label) return null;
              return (
                <div key={fi} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-base font-medium">
                      {field.label}
                    </label>
                    {field.required && (
                      <Chip size="sm" color="danger" variant="flat">
                        必須
                      </Chip>
                    )}
                  </div>
                  {field.description && (
                    <p className="text-sm text-default-500">
                      {field.description}
                    </p>
                  )}
                  {field.type === "boolean" ? (
                    <div className="flex items-center gap-4 p-3 border border-default-200 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`preview-${si}-${fi}`}
                          className="w-4 h-4"
                        />
                        <span>はい</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`preview-${si}-${fi}`}
                          className="w-4 h-4"
                        />
                        <span>いいえ</span>
                      </label>
                    </div>
                  ) : field.type === "select" ||
                    field.type === "multiselect" ? (
                    <div className="space-y-2">
                      {(field.options ?? []).map((opt, oi) => (
                        <label
                          key={oi}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type={
                              field.type === "select" ? "radio" : "checkbox"
                            }
                            name={`preview-${si}-${fi}`}
                            className="w-4 h-4"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === "text" ? (
                    <textarea
                      className="w-full p-2 border border-default-200 rounded-lg min-h-[100px]"
                      placeholder={field.placeholder || ""}
                      disabled
                    />
                  ) : (
                    <input
                      type={field.type === "url" ? "url" : "text"}
                      className="w-full p-2 border border-default-200 rounded-lg"
                      placeholder={field.placeholder || ""}
                      disabled
                    />
                  )}
                </div>
              );
            })}
          </div>
          {si < sections.length - 1 && <Divider className="my-4" />}
        </div>
      ))}
    </div>
  );
}
