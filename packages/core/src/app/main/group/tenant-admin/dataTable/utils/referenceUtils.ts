import { z } from "zod";
import type { ChatLogItemType } from "@repo/api-contracts/based_template/zschema";

// fileFormJson内のfiles配列の要素のzodスキーマ
// より寛容なバリデーション（数値と文字列の両方を受け入れる）
const FileReferenceSchema = z.object({
  fileId: z.coerce.number().int(),
  fileName: z.string().optional(),
  relevantPages: z.array(z.coerce.number().int()).optional().default([]),
  displayFileLink: z.boolean().optional().default(true),
  fileUrl: z.union([z.string(), z.null()]).optional(),
  chunkSummaryDescription: z.string().optional(),
});
export type FileReference = z.infer<typeof FileReferenceSchema>;

// fileFormJson内のforms配列の要素のzodスキーマ
// より寛容なバリデーション（数値と文字列の両方を受け入れる）
const FormReferenceSchema = z.object({
  formId: z.coerce.number().int(),
  formName: z.string().optional(),
  formUrl: z.string().optional(),
  description: z.string().optional(),
  alwaysDisplay: z.boolean().optional().default(false),
});
export type FormReference = z.infer<typeof FormReferenceSchema>;

// fileFormJsonの構造のzodスキーマ
const FileFormJsonSchema = z.object({
  files: z.array(FileReferenceSchema).optional().default([]),
  forms: z.array(FormReferenceSchema).optional().default([]),
});
type FileFormJson = z.infer<typeof FileFormJsonSchema>;

type HasFileFormJson =
  | Pick<ChatLogItemType, "fileFormJson">
  | { fileFormJson?: unknown }
  | null
  | undefined;

const getFileFormJson = (source?: HasFileFormJson): FileFormJson | null => {
  if (!source) {
    return null;
  }
  const raw = (source as { fileFormJson?: unknown }).fileFormJson;

  // nullやundefinedの場合は空のオブジェクトとして扱う
  if (raw === null || raw === undefined) {
    return { files: [], forms: [] };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  // zodスキーマで検証
  const result = FileFormJsonSchema.safeParse(raw);
  if (!result.success) {
    // バリデーションに失敗した場合でも、可能な限りデータを抽出を試みる
    const rawDict = raw as Record<string, unknown>;
    const files = Array.isArray(rawDict.files) ? rawDict.files : [];
    const forms = Array.isArray(rawDict.forms) ? rawDict.forms : [];

    if (files.length > 0 || forms.length > 0) {
      return {
        files: files
          .filter(
            (f): f is FileReference => FileReferenceSchema.safeParse(f).success,
          )
          .map((f) => FileReferenceSchema.parse(f)),
        forms: forms
          .filter(
            (f): f is FormReference => FormReferenceSchema.safeParse(f).success,
          )
          .map((f) => FormReferenceSchema.parse(f)),
      };
    }

    return { files: [], forms: [] };
  }

  return result.data;
};

export const getFileReferences = (
  source?: HasFileFormJson,
): FileReference[] => {
  const fileFormJson = getFileFormJson(source);
  if (!fileFormJson || !Array.isArray(fileFormJson.files)) {
    return [];
  }

  return fileFormJson.files
    .map((file) => {
      const result = FileReferenceSchema.safeParse(file);
      return result.success ? result.data : null;
    })
    .filter((file): file is FileReference => Boolean(file));
};

export const getFormReferences = (
  source?: HasFileFormJson,
): FormReference[] => {
  const fileFormJson = getFileFormJson(source);
  if (!fileFormJson || !Array.isArray(fileFormJson.forms)) {
    return [];
  }

  return fileFormJson.forms
    .map((form) => {
      const result = FormReferenceSchema.safeParse(form);
      return result.success ? result.data : null;
    })
    .filter((form): form is FormReference => Boolean(form));
};

export const hasReferenceData = (source?: HasFileFormJson): boolean => {
  return (
    getFileReferences(source).length > 0 || getFormReferences(source).length > 0
  );
};
