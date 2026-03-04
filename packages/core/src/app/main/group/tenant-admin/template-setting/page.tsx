"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Chip,
  Divider,
  Input,
  Spinner,
  Switch,
  Tooltip,
} from "@heroui/react";
import { Bot, Plus, Search, Trash2, Edit, FileText, Users } from "lucide-react";
import { useTenantRoleContext } from "../../../../../context/role/tenantRoleContext";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import {
  delete_bot_template_v2_tenant_config_bot_template_delete__template_id__post,
  list_bot_templates_v2_tenant_config_bot_template_list_get,
  update_bot_template_v2_tenant_config_bot_template_update__template_id__post,
} from "@repo/api-contracts/based_template/service";
import type { TenantBotTemplateUpdateRequestType } from "@repo/api-contracts/based_template/zschema";
import type { TenantBotTemplateSchemaType } from "@repo/api-contracts/based_template/zschema";

export default function TenantAdminTemplateSettingPage() {
  const { tenantRole } = useTenantRoleContext();
  const router = useRouter();

  const canManage = useMemo(
    () =>
      tenantRole === "TENANT_ADMIN" || tenantRole === "TENANT_SETTING_ADMIN",
    [tenantRole],
  );

  const [search, setSearch] = useState("");
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [updatingActiveId, setUpdatingActiveId] = useState<number | null>(null);

  const {
    data,
    error,
    isLoading,
    mutate: mutateList,
  } = useSWR(["tenant-bot-templates"], async () => {
    const res =
      await list_bot_templates_v2_tenant_config_bot_template_list_get();
    return res.templates ?? [];
  });

  useEffect(() => {
    if (error) {
      handleErrorWithUI(error, "ボットテンプレ一覧取得");
    }
  }, [error]);

  const templates = useMemo(
    () => (data ?? []) as TenantBotTemplateSchemaType[],
    [data],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const text =
        `${t.templateId} ${t.templateName ?? ""} ${t.description ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [templates, search]);

  const openCreate = () => {
    router.push("/main/group/tenant-admin/template-setting/create");
  };

  const openEdit = (t: TenantBotTemplateSchemaType) => {
    router.push(`/main/group/tenant-admin/template-setting/${t.templateId}`);
  };

  const handleDelete = async (templateId: number) => {
    if (!canManage) return;
    const ok = window.confirm(
      "このテンプレを削除（論理削除）します。よろしいですか？",
    );
    if (!ok) return;
    setIsDeletingId(templateId);
    try {
      await delete_bot_template_v2_tenant_config_bot_template_delete__template_id__post(
        String(templateId),
      );
      showSuccessToast("テンプレを削除しました");
      await mutateList();
    } catch (err) {
      handleErrorWithUI(err, "テンプレ削除");
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleToggleActive = async (
    template: TenantBotTemplateSchemaType,
    newActive: boolean,
  ) => {
    if (!canManage) return;
    setUpdatingActiveId(template.templateId);
    try {
      const payload: TenantBotTemplateUpdateRequestType = {
        templateName: template.templateName ?? "",
        description: template.description,
        isActive: newActive,
        botNameTemplate: template.botNameTemplate,
        botDescriptionTemplate: template.botDescriptionTemplate,
        botPurposeTemplate: template.botPurposeTemplate,
        botAnswerRulesTemplate: template.botAnswerRulesTemplate,
        premiseSchema: template.premiseSchema as
          | TenantBotTemplateUpdateRequestType["premiseSchema"]
          | undefined,
        botPermissionLevel: template.botPermissionLevel ?? "GROUP_MEMBER",
        isWebSearchBot: Boolean(template.isWebSearchBot),
        botSearchUrl: template.botSearchUrl,
        botSearchInfoPrompt: template.botSearchInfoPrompt,
      };
      await update_bot_template_v2_tenant_config_bot_template_update__template_id__post(
        String(template.templateId),
        payload,
      );
      showSuccessToast(
        newActive
          ? "テンプレートを有効にしました"
          : "テンプレートを無効にしました",
      );
      await mutateList();
    } catch (err) {
      handleErrorWithUI(err, "テンプレート状態更新");
    } finally {
      setUpdatingActiveId(null);
    }
  };

  const activeCount = useMemo(
    () => templates.filter((t) => t.isActive).length,
    [templates],
  );
  const inactiveCount = useMemo(
    () => templates.filter((t) => !t.isActive).length,
    [templates],
  );

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                ボットテンプレ管理
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                color="default"
                variant="flat"
                size="sm"
                startContent={<Plus className="w-4 h-4" />}
                onPress={openCreate}
                isDisabled={!canManage}
              >
                新規テンプレ作成
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0 space-y-2">
        {/* 統計情報 */}
        {!isLoading && templates.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Chip
              color="default"
              variant="flat"
              size="sm"
              startContent={<FileText className="h-3 w-3" />}
            >
              全 {templates.length} 件
            </Chip>
            <Chip color="success" variant="flat" size="sm">
              有効 {activeCount} 件
            </Chip>
            {inactiveCount > 0 && (
              <Chip color="warning" variant="flat" size="sm">
                無効 {inactiveCount} 件
              </Chip>
            )}
          </div>
        )}

        {/* 検索バー */}
        <Card className="border border-default-200 shadow-sm">
          <CardBody className="p-3">
            <Input
              value={search}
              onValueChange={setSearch}
              variant="bordered"
              size="sm"
              placeholder="テンプレートID、名前、説明で検索..."
              startContent={<Search className="h-4 w-4 text-default-400" />}
              classNames={{
                input: "focus:outline-none focus-visible:outline-none text-xs",
                inputWrapper:
                  "outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 data-[focus=true]:ring-0 data-[focus=true]:outline-none bg-white h-8",
              }}
            />
          </CardBody>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <Spinner size="lg" color="primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-default-700">
                  読み込み中...
                </p>
                <p className="text-xs text-default-500 mt-1">
                  テンプレート情報を取得しています
                </p>
              </div>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card
            shadow="sm"
            className="border-2 border-dashed border-default-300 bg-gradient-to-br from-default-50 to-default-100"
          >
            <CardBody className="p-12 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Bot className="w-12 h-12 text-primary" />
              </div>
              <h3 className="text-sm font-bold mb-2">
                {search.trim()
                  ? "検索結果が見つかりませんでした"
                  : "テンプレートがありません"}
              </h3>
              <p className="text-xs text-default-600 mb-6 max-w-md mx-auto">
                {search.trim()
                  ? "別のキーワードで検索してみてください"
                  : "新しいテンプレートを作成して、店舗側で簡単にボットを作成できるようにしましょう"}
              </p>
              {!search.trim() && (
                <Button
                  color="primary"
                  size="lg"
                  startContent={<Plus className="h-5 w-5" />}
                  onPress={openCreate}
                  isDisabled={!canManage}
                  className="shadow-md"
                >
                  最初のテンプレートを作成
                </Button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {filtered.map((t) => {
              const id = t.templateId;
              const active = Boolean(t.isActive);
              const hasPremiseSchema =
                t.premiseSchema &&
                Array.isArray(t.premiseSchema) &&
                t.premiseSchema.length > 0;
              return (
                <Card
                  key={id}
                  shadow="none"
                  className={`border transition-all duration-150 hover:shadow-sm hover:border-primary/40 ${
                    active
                      ? "border-primary/40 bg-white"
                      : "border-default-200 bg-white"
                  }`}
                >
                  <CardBody className="p-2.5 space-y-2">
                    {/* ヘッダー - コンパクトに統合 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Chip
                            size="sm"
                            variant="flat"
                            color="default"
                            className="font-mono text-[9px] font-semibold h-4 px-1.5"
                          >
                            #{id}
                          </Chip>
                          <Chip
                            size="sm"
                            variant="flat"
                            color={active ? "success" : "warning"}
                            className="font-medium text-[9px] h-4 px-1.5"
                          >
                            {active ? "有効" : "無効"}
                          </Chip>
                        </div>
                        <Switch
                          isSelected={active}
                          onValueChange={(v) => handleToggleActive(t, v)}
                          size="sm"
                          isDisabled={!canManage || updatingActiveId === id}
                          color={active ? "success" : "warning"}
                          classNames={{
                            wrapper: "scale-75",
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-default-900 line-clamp-1 leading-tight">
                          {t.templateName || "（無題）"}
                        </h3>
                        {t.description && (
                          <p className="text-[10px] text-default-500 line-clamp-1 mt-0.5 leading-tight">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 詳細情報 - インライン表示でコンパクト化 */}
                    <div className="space-y-1 pt-1 border-t border-default-100">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <FileText className="h-3 w-3 text-default-400 flex-shrink-0" />
                        <span className="text-default-500">フォーム:</span>
                        <span className="text-default-700 font-medium">
                          {hasPremiseSchema
                            ? `${t.premiseSchema?.length || 0}セクション`
                            : "未定義"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <Users className="h-3 w-3 text-default-400 flex-shrink-0" />
                        <span className="text-default-500">権限:</span>
                        <span className="text-default-700 font-medium">
                          {t.botPermissionLevel === "GROUP_OWNER"
                            ? "オーナーのみ"
                            : "全員"}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                  <CardFooter className="flex justify-end gap-1 p-2">
                    <Tooltip
                      content={canManage ? "編集" : "編集権限がありません"}
                    >
                      <Button
                        color="primary"
                        variant="light"
                        isIconOnly
                        onPress={() => openEdit(t)}
                        isDisabled={!canManage}
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip
                      content={
                        canManage && isDeletingId !== id
                          ? "削除"
                          : "削除権限がありません"
                      }
                      color={
                        canManage && isDeletingId !== id ? "danger" : "default"
                      }
                    >
                      <Button
                        color="danger"
                        variant="light"
                        isIconOnly
                        onPress={() => handleDelete(id)}
                        isLoading={isDeletingId === id}
                        isDisabled={!canManage || isDeletingId !== null}
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
