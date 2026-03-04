"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Radio,
  RadioGroup,
  Textarea,
} from "@heroui/react";
import { Paperclip, PencilLine, Search, Send, X } from "lucide-react";
import type { UseExternalUserManageResult } from "../hooks/useExternalUserManage";

type Props = {
  state: UseExternalUserManageResult;
};

export function TemplateTab({ state }: Props) {
  const isTemplateNameEmpty = state.templateName.trim().length === 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      <Card className="border border-default-200 xl:col-span-4">
        <CardHeader className="pb-1">
          <div className="w-full space-y-2">
            <h2 className="text-sm font-semibold">テンプレート一覧</h2>
            <Input
              size="sm"
              placeholder="テンプレート検索"
              value={state.templateSearchTerm}
              onValueChange={state.setTemplateSearchTerm}
              startContent={<Search className="w-4 h-4 text-default-400" />}
            />
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-2">
            {state.visibleTemplateList.length === 0 && (
              <div className="text-sm text-default-500 py-6 text-center">
                テンプレートがありません
              </div>
            )}
            {state.visibleTemplateList.map((template) => {
              const isFocused =
                state.selectedTemplateId === String(template.mailTemplateId);
              return (
                <button
                  key={template.mailTemplateId}
                  type="button"
                  onClick={() =>
                    state.handleSelectTemplate(String(template.mailTemplateId))
                  }
                  className={`w-full text-left rounded-lg border p-2.5 transition ${
                    isFocused
                      ? "border-primary bg-primary-50"
                      : "border-default-200 bg-white hover:bg-default-50"
                  }`}
                >
                  <p className="text-sm font-semibold truncate">
                    {template.templateName}
                  </p>
                  <p className="text-xs text-default-600 truncate mt-0.5">
                    {template.subject}
                  </p>
                  <p className="text-[11px] text-default-400 mt-1">
                    更新: {formatDateTime(template.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card className="border border-default-200 xl:col-span-8 overflow-hidden">
        <div className="bg-default-800 text-white px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <PencilLine className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold whitespace-nowrap">
              新規メッセージ（テンプレート作成）
            </span>
          </div>
          <div className="w-full max-w-md">
            <Input
              size="sm"
              variant="bordered"
              label="テンプレート名（必須）"
              labelPlacement="outside-left"
              placeholder="例: 予約者フォローアップ"
              value={state.templateName}
              onValueChange={state.setTemplateName}
              endContent={
                isTemplateNameEmpty ? (
                  <span className="text-[10px] text-danger-300">必須</span>
                ) : null
              }
              classNames={{
                base: "items-center",
                label: "text-[11px] text-default-200 min-w-[105px]",
                inputWrapper: isTemplateNameEmpty
                  ? "bg-danger-900/20 border-danger-400"
                  : "bg-default-700/70 border-default-500",
                input: "text-white placeholder:text-default-300",
              }}
            />
          </div>
        </div>
        <CardBody className="p-0">
          <div className="px-4 py-1.5 border-b border-default-200 text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-default-500 hover:text-default-700 underline underline-offset-2"
                onClick={() => state.setShowCcInput((prev) => !prev)}
              >
                Cc
              </button>
              <button
                type="button"
                className="text-xs text-default-500 hover:text-default-700 underline underline-offset-2"
                onClick={() => state.setShowBccInput((prev) => !prev)}
              >
                Bcc
              </button>
            </div>
          </div>
          {state.showCcInput && (
            <div className="px-4 py-1.5 border-b border-default-200">
              <Input
                size="sm"
                variant="underlined"
                labelPlacement="outside"
                placeholder="Cc"
                value={state.ccInput}
                onValueChange={state.setCcInput}
              />
            </div>
          )}
          {state.showBccInput && (
            <div className="px-4 py-1.5 border-b border-default-200">
              <Input
                size="sm"
                variant="underlined"
                labelPlacement="outside"
                placeholder="Bcc"
                value={state.bccInput}
                onValueChange={state.setBccInput}
              />
            </div>
          )}
          {(state.showCcInput || state.showBccInput) && (
            <div className="px-4 py-1 border-b border-default-200">
              <p className="text-[11px] text-default-500">
                カンマ / セミコロン / 改行区切りで複数指定できます。
              </p>
            </div>
          )}
          <div className="px-4 py-1.5 border-b border-default-200">
            <Input
              size="sm"
              variant="underlined"
              labelPlacement="outside"
              placeholder="件名"
              value={state.subject}
              onValueChange={state.setSubject}
            />
          </div>
          <div className="px-4 py-1.5 border-b border-default-200">
            <RadioGroup
              label="送信時に優先する本文形式"
              orientation="horizontal"
              value={state.bodyFormat}
              onValueChange={(value) =>
                state.setBodyFormat(value as "text" | "html")
              }
              classNames={{
                wrapper: "gap-6",
                label: "text-xs text-default-500",
              }}
            >
              <Radio value="text">本文（text）</Radio>
              <Radio value="html">本文（HTML）</Radio>
            </RadioGroup>
          </div>
          <div className="px-4 pt-2.5">
            <Textarea
              label={
                state.bodyFormat === "text" ? "本文（text）" : "本文（HTML）"
              }
              labelPlacement="outside"
              minRows={8}
              placeholder={
                state.bodyFormat === "text"
                  ? "本文を入力してください"
                  : "<p>HTML本文を入力してください</p>"
              }
              value={
                state.bodyFormat === "text" ? state.bodyText : state.bodyHtml
              }
              onValueChange={
                state.bodyFormat === "text"
                  ? state.setBodyText
                  : state.setBodyHtml
              }
              classNames={{
                inputWrapper: "shadow-none border border-default-200",
              }}
            />
          </div>
          {state.bodyFormat === "html" && (
            <div className="px-4 pt-2.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-default-700 font-medium">
                  HTMLプレビュー
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => state.setIsPreviewFullscreen(true)}
                  isDisabled={!state.bodyHtml.trim()}
                >
                  全画面表示
                </Button>
              </div>
              {state.bodyHtml.trim() ? (
                <iframe
                  title="mail-html-preview"
                  sandbox=""
                  srcDoc={state.bodyHtml}
                  className="w-full min-h-[280px] rounded-md border border-default-200 bg-white"
                />
              ) : (
                <div className="text-xs text-default-500 border border-dashed border-default-300 rounded-md p-3">
                  HTML本文を入力すると、ここにプレビューが表示されます。
                </div>
              )}
            </div>
          )}
          {state.isPreviewFullscreen && (
            <div className="fixed inset-0 z-50 bg-black/70 p-4">
              <div className="mx-auto h-full max-w-6xl rounded-lg bg-white shadow-lg flex flex-col">
                <div className="flex items-center justify-between border-b border-default-200 px-4 py-2">
                  <p className="text-sm font-semibold text-default-700">
                    HTMLプレビュー（全画面）
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => state.setIsPreviewFullscreen(false)}
                  >
                    閉じる
                  </Button>
                </div>
                <div className="flex-1 p-3">
                  <iframe
                    title="mail-html-preview-fullscreen"
                    sandbox=""
                    srcDoc={state.bodyHtml}
                    className="w-full h-full rounded-md border border-default-200 bg-white"
                  />
                </div>
              </div>
            </div>
          )}
          <div className="px-4 pt-2.5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm text-default-700 font-medium">
                添付ファイル
              </p>
              <Button
                size="sm"
                variant="flat"
                startContent={<Paperclip className="w-4 h-4" />}
                onPress={state.handleOpenAttachmentPicker}
                isLoading={state.isUploadingAttachment}
              >
                ファイルを追加
              </Button>
              <input
                ref={state.attachmentInputRef}
                type="file"
                className="hidden"
                multiple
                onChange={state.handleAttachmentFileSelected}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {state.selectedAttachmentFileUrlList.length === 0 && (
                <span className="text-xs text-default-400">
                  添付ファイルなし
                </span>
              )}
              {state.selectedAttachmentFileUrlList.map((attachmentFileUrl) => (
                <Chip
                  key={attachmentFileUrl}
                  size="sm"
                  variant="flat"
                  startContent={<Paperclip className="w-3 h-3" />}
                  endContent={
                    <button
                      type="button"
                      aria-label={`attachment-${attachmentFileUrl}-remove`}
                      onClick={() =>
                        state.handleRemoveAttachment(attachmentFileUrl)
                      }
                      className="ml-1 inline-flex items-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  }
                >
                  {state.attachmentMetaMap[attachmentFileUrl] ||
                    attachmentFileUrl.split("/").at(-1)}
                </Chip>
              ))}
            </div>
          </div>
          <div className="px-4 py-2.5 mt-2 border-t border-default-200 flex items-center justify-between">
            <p
              className={`text-xs ${
                isTemplateNameEmpty ? "text-danger-500" : "text-default-500"
              }`}
            >
              {isTemplateNameEmpty
                ? "テンプレート名が未入力です。入力すると保存できます。"
                : "Gmail風UIで作成した内容をテンプレートとして保存します"}
            </p>
            <Button
              color="primary"
              radius="full"
              onPress={state.handleCreateTemplate}
              isLoading={state.isCreatingTemplate}
              isDisabled={isTemplateNameEmpty}
              startContent={<Send className="w-4 h-4" />}
            >
              テンプレートを保存
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
