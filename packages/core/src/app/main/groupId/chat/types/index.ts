export type Message = {
  id: number;
  text: string;
  isOwnMessage: boolean;
  sessionId: string;
  timestamp?: string;
  botId?: number;
  evaluation?: "GOOD" | "BAD" | null;
  fileInfo?: Array<{
    fileId: number;
    fileName?: string;
    shortDescription: string;
    relevantPages: number[];
    displayFileLink?: boolean;
  }>;
  referenceLinkInfo?: Array<{
    referenceLinkId: number;
    linkName: string;
    linkUrl: string;
    description?: string;
  }>;
  chatHistoryId?: number;
  chatLogId?: number; // 外部チャット用
  chatSpaceId?: number;
  model?: string; // AIモデル名
  chatType?: string; // 会話種別 (BOT_OPENAI / BOT_GEMINI / BOT_PERPLEXITY など)
  citations?: string[]; // Perplexityの引用URLリスト
  generatedImageSignedUrl?: string; // 生成画像の署名付きURL
  status?: string;
};

export type BotData = {
  botId: number;
  botName: string;
};

export type ChatSpace = {
  chatSpaceId: string;
  title: string | null;
  createdAt: string;
  lastMessage: string | null;
  userId: string | null | undefined;
  externalUserId: string | null | undefined;
};

export type ChatTemplateProps = {
  groupId: string;
};

export type ChatStreamEvent = {
  type: "bot_selected" | "content" | "chat_complete";
  data: any;
};

export type FileInfo = {
  fileId: number;
  fileName?: string;
  shortDescription: string;
  relevantPages: number[];
  displayFileLink?: boolean;
};

export type ReferenceLinkInfo = {
  referenceLinkId: number;
  linkName: string;
  linkUrl: string;
  description?: string;
  alwaysDisplay: boolean;
};

import type { AIModelSchemaType } from "@repo/api-contracts/based_template/zschema";

export type AIModel = AIModelSchemaType & {
  // フロントエンドで扱いやすいエイリアス
  id: string; // api_model_name
  name: string; // display_name
};
