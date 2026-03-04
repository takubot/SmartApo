import { useCallback } from "react";
import useSWR from "swr";
import { list_bot_v2_bot_list__group_id__post } from "@repo/api-contracts/based_template/service";
import {
  BotListResponseSchema,
  type BotListResponseSchemaType,
  type BotResponseSchemaType,
} from "@repo/api-contracts/based_template/zschema";
import { useGroupContext, useGroupDataContext } from "../../layout-client";

type UseBotListReturn = {
  botList: BotResponseSchemaType[];
  error: unknown;
  isLoading: boolean;
  refreshBotList: () => Promise<void>;
  mutateBotList: () => Promise<BotListResponseSchemaType | undefined>;
};

export function useBotList(): UseBotListReturn {
  const groupId = useGroupContext();
  const { user, isAuthChecked } = useGroupDataContext();

  const shouldFetch = Boolean(isAuthChecked && user && groupId);

  const { data, error, mutate, isValidating } =
    useSWR<BotListResponseSchemaType>(
      shouldFetch ? ["bot-list", groupId] : null,
      async () => {
        const raw = await list_bot_v2_bot_list__group_id__post(groupId, {
          includeIcon: true,
        });
        return raw;
      },
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 0,
        revalidateIfStale: true,
      },
    );

  const botList = data?.botList ?? [];
  const isFetching = shouldFetch && (isValidating || (!data && !error));
  const isLoading = !isAuthChecked || isFetching;

  const refreshBotList = useCallback(async () => {
    if (!shouldFetch) return;
    await mutate();
  }, [mutate, shouldFetch]);

  const mutateBotList = useCallback(() => mutate(), [mutate]);

  return {
    botList,
    error,
    isLoading,
    refreshBotList,
    mutateBotList,
  };
}
