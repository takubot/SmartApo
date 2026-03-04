export type EntrySelectionType = "BOT" | "SUGGEST";
export type ChatChannelType = "web" | "line";
export type ConversationScopeType = "external" | "internal";
export type SuggestRouteTargetType = "CHAT";
export type ChatEndpointKind = "chat" | "line";

export type ResolveChatRouteParams = {
  entryUuid: string;
  selectionType?: EntrySelectionType;
  channel: ChatChannelType;
  isHandoffActive: boolean;
  conversationScope?: ConversationScopeType;
  suggestRouteTarget?: SuggestRouteTargetType;
};

export type ResolvedChatRoute = {
  endpointKind: ChatEndpointKind;
  ssePath: string;
  isAgentMode: boolean;
};

const resolveFallbackEndpoint = (
  entryUuid: string,
  channel: ChatChannelType,
) => (channel === "line" ? `/api/${entryUuid}/line` : `/api/${entryUuid}/chat`);

export const resolveChatRoute = ({
  entryUuid,
  selectionType,
  channel,
  isHandoffActive,
  conversationScope = "external",
  suggestRouteTarget = "CHAT",
}: ResolveChatRouteParams): ResolvedChatRoute => {
  if (!entryUuid) {
    return {
      endpointKind: channel === "line" ? "line" : "chat",
      ssePath: "",
      isAgentMode: false,
    };
  }

  // 内部チャットはAgent未使用。常に chat 経路へ固定する。
  if (conversationScope === "internal") {
    return {
      endpointKind: "chat",
      ssePath: `/api/${entryUuid}/chat`,
      isAgentMode: false,
    };
  }

  // 有人対応中は外部チャット経路に固定する。
  if (isHandoffActive) {
    return {
      endpointKind: channel === "line" ? "line" : "chat",
      ssePath: resolveFallbackEndpoint(entryUuid, channel),
      isAgentMode: false,
    };
  }

  return {
    endpointKind: channel === "line" ? "line" : "chat",
    ssePath: resolveFallbackEndpoint(entryUuid, channel),
    isAgentMode: false,
  };
};
