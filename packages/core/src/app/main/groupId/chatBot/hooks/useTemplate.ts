import { useBotList } from "./useBotList";
import { useBotManagement } from "./useBotManagement";
import { useFile } from "./useFile";
import { useChunkTemplate } from "./useChunkTemplate";
import useSWR from "swr";
import { list_bot_templates_for_group_v2_bot_template_list_get } from "@repo/api-contracts/based_template/service";
import type { BotTemplateListItemSchemaType } from "@repo/api-contracts/based_template/zschema";

export function useTemplate() {
  const botListState = useBotList();
  const botManagement = useBotManagement(botListState.refreshBotList);
  const fileManagement = useFile(botListState.refreshBotList);
  const chunkTableManagement = useChunkTemplate(botListState.refreshBotList);

  const isAuthReady = botManagement.authChecked && !!botManagement.user;

  const botList = isAuthReady ? botListState.botList : [];
  const botListError = isAuthReady ? botListState.error : undefined;
  const isBotListLoading = !isAuthReady || botListState.isLoading;

  // テンプレート一覧を取得（一度だけ取得し、キャッシュを共有）
  const {
    data: templates,
    error: templatesError,
    isLoading: isTemplatesLoading,
  } = useSWR<BotTemplateListItemSchemaType[]>(
    isAuthReady ? ["bot-template-list"] : null,
    async () => {
      const res = await list_bot_templates_for_group_v2_bot_template_list_get();
      return res.templates ?? [];
    },
  );

  const hasTemplates = (templates?.length ?? 0) > 0;

  return {
    ...botManagement,
    ...fileManagement,
    ...chunkTableManagement,
    botList,
    botListError,
    isBotListLoading,
    refreshBotList: botListState.refreshBotList,
    mutateBotList: botListState.mutateBotList,
    templates: templates ?? [],
    templatesError,
    isTemplatesLoading,
    hasTemplates,
  } as const;
}
