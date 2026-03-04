"use client";

import type { BookingMenuSlotSchemaType } from "@repo/api-contracts/based_template/zschema";

export type EvaluationType = "GOOD" | "BAD" | null;

export interface ChatFileReference {
  fileId: number;
  fileName?: string | null;
  fileUrl?: string | null;
  shortDescription?: string;
  relevantPages?: number[];
  displayFileLink?: boolean;
  chunkSummaryDescription?: string | null;
}

export interface ChatReferenceLink {
  referenceLinkId: number;
  linkName?: string | null;
  linkUrl?: string | null;
  description?: string | null;
  alwaysDisplay?: boolean;
}

export interface ChatBotInfo {
  botId: number;
  botName: string;
  botIconImgGcsPath?: string | null;
  botDescription?: string | null;
}

export type BookingSlot = BookingMenuSlotSchemaType;
