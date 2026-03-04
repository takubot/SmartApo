"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Divider,
  Input,
  Select,
  SelectItem,
  Switch,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/modal";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import {
  create_bot_template_v2_tenant_config_bot_template_create_post,
  update_bot_template_v2_tenant_config_bot_template_update__template_id__post,
} from "@repo/api-contracts/based_template/service";
import type {
  TenantBotTemplateCreateRequestType,
  TenantBotTemplateSchemaType,
  TenantBotTemplateUpdateRequestType,
} from "@repo/api-contracts/based_template/zschema";
import {
  PremiseSchemaEditor,
  type PremiseSection,
} from "./PremiseSchemaEditor";
import { FileText, Info } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
  template?: TenantBotTemplateSchemaType | null;
};

function normalizePremiseSchema(
  premiseSchema: TenantBotTemplateSchemaType["premiseSchema"],
): PremiseSection[] {
  if (!premiseSchema) return [];
  return premiseSchema.map((s) => ({
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
  }));
}

function validatePremiseSchema(sections: PremiseSection[]): string[] {
  const errors: string[] = [];
  const keys: string[] = [];

  sections.forEach((s, si) => {
    if (!s.title?.trim()) {
      errors.push(`セクション${si + 1}: セクション名が空です`);
    }
    (s.fields ?? []).forEach((f, fi) => {
      if (!f.key?.trim()) {
        errors.push(`セクション${si + 1} / 項目${fi + 1}: key が空です`);
      } else {
        keys.push(f.key.trim());
      }
      if (!f.label?.trim()) {
        errors.push(`セクション${si + 1} / 項目${fi + 1}: ラベルが空です`);
      }
      if (
        (f.type === "select" || f.type === "multiselect") &&
        !(f.options ?? []).length
      ) {
        errors.push(`セクション${si + 1} / 項目${fi + 1}: 選択肢が空です`);
      }
    });
  });

  const dupKeys = keys.filter((k, idx) => keys.indexOf(k) !== idx);
  if (dupKeys.length > 0) {
    errors.push(
      `key が重複しています: ${Array.from(new Set(dupKeys)).join(", ")}`,
    );
  }

  return errors;
}

export function BotTemplateModal({
  isOpen,
  onClose,
  onSaved,
  template,
}: Props) {
  const isEdit = Boolean(template?.templateId);
  const [activeTab, setActiveTab] = useState<"basic" | "premise">("basic");
  const [isSaving, setIsSaving] = useState(false);

  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
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

  const headerTitle = isEdit
    ? `テンプレ編集 #${template?.templateId}`
    : "テンプレ新規作成";

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("basic");

    if (template) {
      setTemplateName(template.templateName ?? "");
      setDescription(template.description ?? "");
      setIsActive(Boolean(template.isActive));
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
    } else {
      setTemplateName("");
      setDescription("");
      setIsActive(true);
      setBotNameTemplate("{storeName} 店舗FAQ");
      setBotDescriptionTemplate("");
      setBotPurposeTemplate("");
      setBotAnswerRulesTemplate("");
      setBotPermissionLevel("GROUP_MEMBER");
      setIsWebSearchBot(false);
      setBotSearchUrl("");
      setBotSearchInfoPrompt("");
      setPremiseSections([]);
    }
  }, [isOpen, template]);

  const inputClassNames = {
    input: "focus:outline-none focus-visible:outline-none",
    inputWrapper:
      "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
  };

  const canSubmit = useMemo(
    () => templateName.trim().length > 0 && !isSaving,
    [templateName, isSaving],
  );

  const handleSave = async () => {
    if (!canSubmit) return;
    const premiseErrors = validatePremiseSchema(premiseSections);
    if (premiseErrors.length > 0) {
      handleErrorWithUI({ message: premiseErrors[0] } as any, "テンプレ検証");
      return;
    }

    setIsSaving(true);
    try {
      const premiseSchemaPayload =
        premiseSections.length > 0
          ? premiseSections.map((s) => ({
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
          isActive,
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
          isActive,
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

      await onSaved();
      onClose();
    } catch (err) {
      handleErrorWithUI(err, "テンプレ保存");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      isDismissable={false}
      classNames={{ base: "max-h-[92vh]" }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{headerTitle}</h2>
              <p className="text-sm text-default-500 mt-1">
                テンプレートを作成すると、店舗側で簡単にボットを作成できるようになります
              </p>
            </div>
          </div>
        </ModalHeader>
        <ModalBody>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as any)}
            classNames={{
              tabList: "gap-2 w-full",
              tab: "flex-1",
              panel: "pt-6",
            }}
          >
            <Tab key="basic" title="基本設定">
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* 説明カード */}
                <Card
                  shadow="sm"
                  className="border border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5"
                >
                  <CardBody className="p-5">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-base font-semibold mb-1">
                          テンプレートとは？
                        </h3>
                        <p className="text-sm text-default-600">
                          テンプレートを作成すると、店舗側のユーザーが「テンプレート番号を選んでフォームに入力するだけ」でボットを作成できるようになります。
                          <br />
                          まずはテンプレート名と説明を入力してください。
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card shadow="sm" className="border border-default-200">
                  <CardBody className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Input
                          label="テンプレート名"
                          placeholder="例: 飲食店 店舗基本テンプレ"
                          value={templateName}
                          onValueChange={setTemplateName}
                          variant="bordered"
                          size="lg"
                          isRequired
                          description="店舗側で表示されるテンプレート名です"
                          classNames={{
                            input:
                              "focus:outline-none focus-visible:outline-none text-base",
                            inputWrapper:
                              "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                          }}
                        />
                      </div>
                      <Textarea
                        label="説明（任意）"
                        placeholder="このテンプレートの用途や、どのような店舗向けかを説明してください"
                        value={description}
                        onValueChange={setDescription}
                        variant="bordered"
                        size="lg"
                        minRows={3}
                        description="店舗側でテンプレートを選ぶ際の参考情報として表示されます"
                        classNames={{
                          input:
                            "focus:outline-none focus-visible:outline-none",
                          inputWrapper:
                            "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                        }}
                      />
                      <div className="flex items-center justify-between p-4 bg-default-50 rounded-lg">
                        <div>
                          <p className="text-sm font-semibold mb-1">
                            テンプレートの状態
                          </p>
                          <p className="text-xs text-default-500">
                            {isActive
                              ? "有効：店舗側でこのテンプレートを選択できます"
                              : "無効：店舗側でこのテンプレートは表示されません"}
                          </p>
                        </div>
                        <Switch
                          isSelected={isActive}
                          onValueChange={setIsActive}
                          size="lg"
                        >
                          <span className="text-sm font-medium">
                            {isActive ? "有効" : "無効"}
                          </span>
                        </Switch>
                      </div>
                    </div>

                    <Divider className="my-2" />

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                          <span>ボット名の自動生成設定</span>
                          <Chip size="sm" variant="flat" color="default">
                            オプション
                          </Chip>
                        </h3>
                        <p className="text-sm text-default-500 mb-4">
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
                        size="lg"
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

                    <Divider className="my-2" />

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-semibold mb-4">
                          ボットの初期設定
                        </h3>
                        <p className="text-sm text-default-500 mb-4">
                          このテンプレートから作成されるボットの初期設定を指定できます。
                        </p>
                      </div>
                      <Select
                        label="ボットの利用権限"
                        variant="bordered"
                        size="lg"
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
                        size="lg"
                        minRows={3}
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
                        size="lg"
                        minRows={3}
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
                        size="lg"
                        minRows={4}
                        description="ボットがどのように回答すべきかのルールを設定できます"
                        classNames={{
                          input:
                            "focus:outline-none focus-visible:outline-none",
                          inputWrapper:
                            "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none",
                        }}
                      />
                    </div>

                    <Divider className="my-2" />

                    <Card shadow="sm" className="border border-default-200">
                      <CardBody className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold mb-1">
                              Web検索機能を有効にする
                            </p>
                            <p className="text-xs text-default-500">
                              このテンプレートから作成されるボットに、Web検索機能を自動的に有効にします
                            </p>
                          </div>
                          <Switch
                            isSelected={isWebSearchBot}
                            onValueChange={setIsWebSearchBot}
                            size="lg"
                          />
                        </div>
                        {isWebSearchBot && (
                          <div className="space-y-4 pt-2 border-t border-default-200">
                            <Textarea
                              label="検索対象URL（任意）"
                              placeholder="例: https://example.com"
                              value={botSearchUrl}
                              onValueChange={setBotSearchUrl}
                              variant="bordered"
                              size="lg"
                              minRows={2}
                              description="検索対象となるWebサイトのURLを指定できます（複数行で複数指定可能）"
                              classNames={{
                                input:
                                  "focus:outline-none focus-visible:outline-none font-mono text-sm",
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
                              size="lg"
                              minRows={3}
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
                  </CardBody>
                </Card>
              </div>
            </Tab>

            <Tab key="premise" title="フォーム作成">
              <div className="max-w-5xl mx-auto">
                <PremiseSchemaEditor
                  value={premiseSections}
                  onChange={setPremiseSections}
                />
              </div>
            </Tab>
          </Tabs>
        </ModalBody>
        <ModalFooter className="border-t">
          <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
            キャンセル
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={isSaving}
            isDisabled={!canSubmit}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
