import { z } from "zod";
import {
  type ChatExternalChatMessageSchemaType as ChatMessageSchemaType,
  type ExternalLineConfigSchemaType,
  type CustomFormResponseSchemaType,
  type EvaluationEnumType,
  type ChatTypeEnumType,
} from "@repo/api-contracts/based_template/zschema";

// fileFormJson内のfiles配列の要素のzodスキーマ
export const FileReferenceSchema = z.object({
  fileId: z.number().int(),
  fileName: z.union([z.string(), z.null()]).optional(),
  relevantPages: z.array(z.number().int()).optional().default([]),
  displayFileLink: z.boolean().optional().default(true),
  fileUrl: z.union([z.string(), z.null()]).optional(),
  chunkSummaryDescription: z.union([z.string(), z.null()]).optional(),
});
export type FileReference = z.infer<typeof FileReferenceSchema>;

// fileReferenceLinkJson内のlinks配列の要素のzodスキーマ
export const ReferenceLinkSchema = z.object({
  referenceLinkId: z.number().int(),
  linkName: z.union([z.string(), z.null()]).optional(),
  linkUrl: z.union([z.string(), z.null()]).optional(),
  description: z.union([z.string(), z.null()]).optional(),
  alwaysDisplay: z.boolean().optional().default(false),
});
export type ReferenceLink = z.infer<typeof ReferenceLinkSchema>;

// fileReferenceLinkJsonの構造のzodスキーマ
export const FileReferenceLinkJsonSchema = z.object({
  files: z.array(FileReferenceSchema).optional().default([]),
  links: z.array(ReferenceLinkSchema).optional().default([]),
});
export type FileReferenceLinkJson = z.infer<typeof FileReferenceLinkJsonSchema>;

export interface Message extends ChatMessageSchemaType {
  botId?: number | null;
  fileReferenceLinkJson?: FileReferenceLinkJson | null;
  chatLogId?: number;
  evaluation?: EvaluationEnumType | null;
  isStreaming?: boolean;
  chatType?: ChatTypeEnumType | null;
  availableTools?: string[];
  renderMode?: "text" | "text_with_widget" | "human";
  widgetPlan?: string[];
  customFormPayload?: Record<string, unknown> | null;
}

// エントリUUID画面で使用するチャットエントリ設定の最小型
// zschema のテーマ/設定スキーマに合わせたキャメルキーで保持
export interface ChatEntryConfig {
  entryUuid: string;
  headerText?: string | null;
  headerColor?: string | null;
  headerTextColor?: string | null;
  footerColor?: string | null;
  initialGreeting?: string | null;
  isMultiLanguage?: boolean;
  initialGreetingTranslations?: Record<string, string> | null;
  isGreetingStreamingEnabled?: boolean;
  autoOpenDelaySeconds?: number | null;
  showReferenceInfo?: boolean;
  selectionType?: "BOT" | "SUGGEST";
  suggestId?: number | null;
  preChatCustomFormId?: number | null;
  onDemandCustomFormIdList?: number[];
  lineConfig?: ExternalLineConfigSchemaType | null;
  preChatCustomForm?: CustomFormResponseSchemaType | null;
  onDemandCustomFormList?: CustomFormResponseSchemaType[];
  isBookingEnabled?: boolean;
  isHumanHandoffEnabled?: boolean;
  humanHandoffAvailabilitySlots?: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
  bookingButtonLabel?: string | null;
}

// BotData, BotIcon, BotIconsResponseはバックエンドのスキーマからimportするため削除

/**
 * SSEイベントの型定義
 */
export type SSEEvent =
  | { type: "bot_selected"; data: { botId: number } }
  | {
      type: "answer_type";
      data: {
        type: "rag" | "direct" | "text" | "text_with_widget" | "human";
        availableCategories?: string[];
      };
    }
  | { type: "agent_tools"; data: { tools: string[] } }
  | {
      type: "agent_render_plan";
      data: {
        mode: "text" | "text_with_widget" | "human";
        widgets?: string[];
      };
    }
  | {
      type: "custom_form";
      data: {
        customFormId: number;
        fields?: unknown[];
        required?: boolean;
      };
    }
  | { type: "content"; data: { text: string } }
  | {
      type: "chat_complete";
      data: {
        chatId: number;
        fileReferenceLinkJson?: FileReferenceLinkJson | null;
      };
    }
  | { type: "error"; data: { message: string } };
