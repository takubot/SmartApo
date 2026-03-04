"use client";

import React, { useMemo, useState } from "react";
import { Button, Card, CardBody, Textarea } from "@heroui/react";
import { Plus, Sparkles, Save } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { Spinner } from "@heroui/react";
import { generate_form_from_text_v2_tenant_config_bot_template_generate_form_post } from "@repo/api-contracts/based_template/service";
import type { TenantBotTemplatePremiseSectionSchemaType } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI } from "@common/errorHandler";
import {
  CustomFormEditor,
  type ValidationError,
} from "@common/customForm/CustomFormEditor";
import type {
  CustomFormSection,
  CustomFormFieldType,
} from "@common/customForm/types";
import { newSection } from "@common/customForm/types";

type Props = {
  value: CustomFormSection[];
  onChange: (next: CustomFormSection[]) => void;
  onSave?: () => void;
  isSaving?: boolean;
  canSave?: boolean;
  onAddSection?: () => void;
  showFloatingButtons?: boolean;
  onAIGenerateOpen?: () => void;
  validationErrors?: ValidationError[];
};

export function PremiseSchemaEditor({
  value,
  onChange,
  onSave,
  isSaving = false,
  canSave = true,
  onAddSection: externalAddSection,
  showFloatingButtons = true,
  onAIGenerateOpen,
  validationErrors = [],
}: Props) {
  const sections = useMemo(() => value ?? [], [value]);
  const [isAIGenerateModalOpen, setIsAIGenerateModalOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(
    new Set(sections.map((_, i) => i)),
  );

  const addSection = (afterIndex?: number) => {
    if (afterIndex === undefined) {
      const newSections = [...(sections ?? []), newSection()];
      onChange(newSections);
      setExpandedSections(
        new Set([...expandedSections, newSections.length - 1]),
      );
    } else {
      const newSections = [...sections];
      newSections.splice(afterIndex + 1, 0, newSection());
      onChange(newSections);
      setExpandedSections(new Set([...expandedSections, afterIndex + 1]));
    }
  };

  const openAIGenerate = () => {
    if (onAIGenerateOpen) {
      onAIGenerateOpen();
      return;
    }
    setIsAIGenerateModalOpen(true);
  };

  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) {
      handleErrorWithUI(
        new Error("フォームの説明を入力してください"),
        "AI生成",
      );
      return;
    }

    setIsAIGenerating(true);
    try {
      const response =
        await generate_form_from_text_v2_tenant_config_bot_template_generate_form_post(
          {
            description: aiDescription.trim(),
          },
        );

      if (response?.premiseSchema && response.premiseSchema.length > 0) {
        const existingSections = sections.length > 0;
        const newSections: CustomFormSection[] = (
          response.premiseSchema || []
        ).map((s: TenantBotTemplatePremiseSectionSchemaType) => ({
          title: s.title || "",
          fields: (s.fields || []).map((f) => ({
            key: f.key || "",
            label: f.label || "",
            type: (f.type as CustomFormFieldType) || "string",
            required: Boolean(f.required),
            placeholder: f.placeholder || null,
            description: f.description || null,
            options: f.options || null,
          })),
        }));

        if (existingSections) {
          onChange([...sections, ...newSections]);
        } else {
          onChange(newSections);
        }
        setIsAIGenerateModalOpen(false);
        setAiDescription("");
        setExpandedSections(
          new Set(
            Array.from({ length: newSections.length }, (_, i) =>
              existingSections ? sections.length + i : i,
            ),
          ),
        );
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

  if (sections.length === 0) {
    return (
      <div className="space-y-3">
        <Card
          shadow="sm"
          className="border-2 border-dashed border-default-300 bg-default-50/50"
        >
          <CardBody className="p-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-primary" />
            </div>
            <h4 className="text-base font-bold mb-1.5">
              フォームを始めましょう
            </h4>
            <p className="text-xs text-default-500 mb-4 max-w-md mx-auto">
              セクションを追加して、店舗側のユーザーが入力するフォームを作成します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                color="primary"
                size="sm"
                startContent={<Plus className="h-4 w-4" />}
                onPress={() => addSection()}
                className="shadow-md text-sm"
              >
                セクションを追加
              </Button>
              <Button
                variant="flat"
                size="sm"
                startContent={<Sparkles className="h-4 w-4" />}
                onPress={openAIGenerate}
                className="text-sm"
              >
                AIで自動生成
              </Button>
            </div>
          </CardBody>
        </Card>

        {!onAIGenerateOpen && (
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
                    !isAIGenerating ? (
                      <Sparkles className="h-4 w-4" />
                    ) : undefined
                  }
                >
                  生成する
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CustomFormEditor
        sections={sections}
        expandedSections={expandedSections}
        onSectionsChange={onChange}
        onExpandedSectionsChange={setExpandedSections}
        onAddSection={addSection}
        validationErrors={validationErrors}
      />

      {showFloatingButtons && (
        <div className="fixed bottom-6 right-6 z-10 flex flex-col gap-3">
          {onSave && (
            <Button
              color="primary"
              size="lg"
              startContent={<Save className="h-5 w-5" />}
              onPress={onSave}
              isLoading={isSaving}
              isDisabled={!canSave}
              className="shadow-lg hover:shadow-xl transition-shadow"
              radius="full"
            >
              保存
            </Button>
          )}
          <Button
            color="primary"
            size="lg"
            startContent={<Plus className="h-5 w-5" />}
            onPress={() => {
              if (externalAddSection) {
                externalAddSection();
              } else {
                addSection();
              }
              setTimeout(() => {
                window.scrollTo({
                  top: document.documentElement.scrollHeight,
                  behavior: "smooth",
                });
              }, 100);
            }}
            className="shadow-lg hover:shadow-xl transition-shadow"
            radius="full"
            variant={onSave ? "flat" : "solid"}
          >
            セクション追加
          </Button>
          <Button
            color="secondary"
            size="lg"
            startContent={<Sparkles className="h-5 w-5" />}
            onPress={() => setIsAIGenerateModalOpen(true)}
            className="shadow-lg hover:shadow-xl transition-shadow"
            radius="full"
            variant="flat"
          >
            AI生成
          </Button>
        </div>
      )}

      {!onAIGenerateOpen && (
        <Modal
          isOpen={isAIGenerateModalOpen}
          onClose={() => {
            setIsAIGenerateModalOpen(false);
            setAiDescription("");
          }}
          size="2xl"
          isDismissable={!isAIGenerating}
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">
                  AIでフォームを自動生成
                </h3>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="text-sm text-default-600">
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
                  size="lg"
                  minRows={5}
                  isDisabled={isAIGenerating}
                  description="作成したいフォームの内容を詳しく説明してください"
                  classNames={{
                    input: "focus:outline-none focus-visible:outline-none",
                    inputWrapper:
                      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                  }}
                />
                {isAIGenerating && (
                  <div className="flex items-center gap-3 p-4 bg-default-50 rounded-lg">
                    <Spinner size="sm" color="primary" />
                    <p className="text-sm text-default-600">
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
      )}
    </div>
  );
}
