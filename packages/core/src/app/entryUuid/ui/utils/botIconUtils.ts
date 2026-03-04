"use client";

import type { BotResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

const DEFAULT_ICON = "/botIcon/default.ico";
export const HUMAN_HANDOFF_ICON = "/botIcon/human_handoff.png";

export const getBotIconSrc = (
  bot: BotResponseSchemaType | null | undefined,
  iconMap: Record<number, string>,
  _botList?: BotResponseSchemaType[],
): string => {
  if (!bot) return DEFAULT_ICON;
  if (bot.botIconImgGcsPath) return bot.botIconImgGcsPath;
  const fromMap = iconMap[bot.botId];
  if (fromMap) return fromMap;
  return DEFAULT_ICON;
};

export const getAssistantIconSrc = ({
  bot,
  iconMap,
  botList,
  isHumanHandoff,
}: {
  bot: BotResponseSchemaType | null | undefined;
  iconMap: Record<number, string>;
  botList?: BotResponseSchemaType[];
  isHumanHandoff: boolean;
}): string => {
  if (isHumanHandoff) return HUMAN_HANDOFF_ICON;
  return getBotIconSrc(bot, iconMap, botList);
};
