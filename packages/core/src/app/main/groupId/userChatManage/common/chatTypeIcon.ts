import type { ChatTypeEnumType } from "@repo/api-contracts/based_template/zschema";

const DEFAULT_BOT_ICON = "/botIcon/default.ico";

export const getAssistantIconByChatType = (
  chatType: ChatTypeEnumType | null | undefined,
): string => {
  switch (chatType) {
    case "HUMAN_OPERATOR":
      return "/botIcon/human_handoff.png";
    case "BOT_OPENAI":
      return "/botIcon/openai.png";
    case "BOT_ANTHROPIC":
      return "/botIcon/claude.png";
    case "BOT_GEMINI":
      return "/botIcon/gemini.png";
    case "BOT_PERPLEXITY":
      return "/botIcon/perplexity.png";
    case "BOT_NANOBANANA":
      return "/botIcon/nano-banana.png";
    case "BOT_STANDARD":
    case "BOT_AGENTIC":
    case "BOT_OTHER":
    case "SYSTEM_EVENT":
    case "USER":
    default:
      return DEFAULT_BOT_ICON;
  }
};

export const isHumanOperatorChatType = (
  chatType: ChatTypeEnumType | null | undefined,
): boolean => chatType === "HUMAN_OPERATOR";
