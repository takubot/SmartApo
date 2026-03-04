type EntrySelectionType = "BOT" | "SUGGEST";
type ConversationScopeType = "external" | "internal";
type SuggestRouteTargetType = "CHAT";
type ChatEndpointKind = "chat" | "line";

type ResolveEntryChatRouteParams = {
  entryUuid: string;
  selectionType?: EntrySelectionType;
  channel: "web" | "line";
  isHandoffActive: boolean;
  conversationScope?: ConversationScopeType;
  suggestRouteTarget?: SuggestRouteTargetType;
};

type ResolvedChatRoute = {
  endpointKind: ChatEndpointKind;
  ssePath: string;
  isAgentMode: boolean;
};

const resolveFallbackEndpoint = (
  entryUuid: string,
  channel: ResolveEntryChatRouteParams["channel"],
) => (channel === "line" ? `/api/${entryUuid}/line` : `/api/${entryUuid}/chat`);

export const resolveEntryChatRoute = ({
  entryUuid,
  selectionType,
  channel,
  isHandoffActive,
  conversationScope = "external",
  suggestRouteTarget = "CHAT",
}: ResolveEntryChatRouteParams): ResolvedChatRoute => {
  if (!entryUuid) {
    return {
      endpointKind: channel === "line" ? "line" : "chat",
      ssePath: "",
      isAgentMode: false,
    };
  }

  if (conversationScope === "internal") {
    return {
      endpointKind: "chat",
      ssePath: `/api/${entryUuid}/chat`,
      isAgentMode: false,
    };
  }

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
