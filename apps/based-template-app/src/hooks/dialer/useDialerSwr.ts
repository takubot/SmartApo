// hooks/dialer/useDialerSwr.ts
// Dialer API 用 SWR ラッパーフック集（生成型使用）

import useSWR, { type SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";
import apiClient, { swrFetcher } from "@/lib/apiClient";
import type {
  CampaignResponseSchemaType,
  CampaignStatsSchemaType,
  ContactResponseSchemaType,
  AgentResponseSchemaType,
  AgentPerformanceSchemaType,
  CallLogResponseSchemaType,
  CallListResponseSchemaType,
  CallbackResponseSchemaType,
  DispositionResponseSchemaType,
  DncResponseSchemaType,
  ScriptResponseSchemaType,
  DashboardOverviewSchemaType,
  HourlyStatSchemaType,
  TwilioConfigResponseSchemaType,
  GoogleIntegrationStatusSchemaType,
} from "@repo/api-contracts/based_template/zschema";

// ────────────────────────────────────────────
// 汎用型（バックエンド PaginatedResponse と一致）
// ────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface MutationArg<T = unknown> {
  arg: T;
}

// ────────────────────────────────────────────
// 汎用 SWR フック
// ────────────────────────────────────────────
export function useDialerList<T>(
  path: string | null,
  config?: SWRConfiguration,
) {
  return useSWR<PaginatedResponse<T>>(path, swrFetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

export function useDialerDetail<T>(
  path: string | null,
  config?: SWRConfiguration,
) {
  return useSWR<T>(path, swrFetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

// ────────────────────────────────────────────
// ミューテーション (POST / PUT / PATCH / DELETE)
// ────────────────────────────────────────────
export function useDialerCreate<TBody, TRes = unknown>(path: string) {
  return useSWRMutation(
    path,
    async (_key: string, { arg }: MutationArg<TBody>) => {
      const res = await apiClient.post<TRes>(path, arg);
      return res.data;
    },
  );
}

export function useDialerUpdate<TBody, TRes = unknown>(path: string | null) {
  return useSWRMutation(
    path,
    async (key: string, { arg }: MutationArg<TBody>) => {
      if (!key) return;
      const res = await apiClient.put<TRes>(key, arg);
      return res.data;
    },
  );
}

export function useDialerPatch<TBody, TRes = unknown>(path: string | null) {
  return useSWRMutation(
    path,
    async (key: string, { arg }: MutationArg<TBody>) => {
      if (!key) return;
      const res = await apiClient.patch<TRes>(key, arg);
      return res.data;
    },
  );
}

export function useDialerDelete(path: string | null) {
  return useSWRMutation(path, async (key: string) => {
    if (!key) return;
    await apiClient.delete(key);
  });
}

// ────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────
export function useDashboardOverview() {
  return useDialerDetail<DashboardOverviewSchemaType>("/dashboard/overview");
}

export function useDashboardHourly() {
  return useDialerDetail<{ stats: HourlyStatSchemaType[] }>("/dashboard/hourly");
}

export function useDashboardAgentPerformance() {
  return useDialerDetail<{ agents: AgentPerformanceSchemaType[] }>(
    "/dashboard/agent-performance",
  );
}

// ────────────────────────────────────────────
// Campaigns
// ────────────────────────────────────────────
export function useCampaigns(page = 1, size = 20) {
  return useDialerList<CampaignResponseSchemaType>(
    `/campaigns?page=${page}&size=${size}`,
  );
}

export function useCampaign(id: string | null) {
  return useDialerDetail<CampaignResponseSchemaType>(
    id ? `/campaigns/${id}` : null,
  );
}

export function useCampaignStats(id: string | null) {
  return useDialerDetail<CampaignStatsSchemaType>(
    id ? `/campaigns/${id}/stats` : null,
  );
}

// ────────────────────────────────────────────
// Contacts
// ────────────────────────────────────────────
export function useContacts(page = 1, size = 20, search = "") {
  const q = search ? `&search=${encodeURIComponent(search)}` : "";
  return useDialerList<ContactResponseSchemaType>(
    `/contacts?page=${page}&size=${size}${q}`,
  );
}

export function useContact(id: string | null) {
  return useDialerDetail<ContactResponseSchemaType>(
    id ? `/contacts/${id}` : null,
  );
}

// ────────────────────────────────────────────
// Agents
// ────────────────────────────────────────────
export function useAgents(page = 1, size = 50) {
  return useDialerList<AgentResponseSchemaType>(
    `/agents?page=${page}&size=${size}`,
  );
}

export function useAgentStatusBoard() {
  return useDialerDetail<{
    agents: (AgentResponseSchemaType & {
      callDuration?: number;
      campaignName?: string | null;
    })[];
  }>("/agents/status-board");
}

// ────────────────────────────────────────────
// Call Logs
// ────────────────────────────────────────────
export function useCallLogs(page = 1, size = 20) {
  return useDialerList<CallLogResponseSchemaType>(
    `/call-logs?page=${page}&size=${size}`,
  );
}

export function useCallLog(id: string | null) {
  return useDialerDetail<CallLogResponseSchemaType>(
    id ? `/call-logs/${id}` : null,
  );
}

// ────────────────────────────────────────────
// Call Lists
// ────────────────────────────────────────────
export function useCallLists(page = 1, size = 20) {
  return useDialerList<CallListResponseSchemaType>(
    `/call-lists?page=${page}&size=${size}`,
  );
}

export function useCallList(id: string | null) {
  return useDialerDetail<CallListResponseSchemaType>(
    id ? `/call-lists/${id}` : null,
  );
}

// ────────────────────────────────────────────
// DNC
// ────────────────────────────────────────────
export function useDncList(page = 1, size = 20) {
  return useDialerList<DncResponseSchemaType>(
    `/dnc?page=${page}&size=${size}`,
  );
}

// ────────────────────────────────────────────
// Scripts
// ────────────────────────────────────────────
export function useScripts(page = 1, size = 20) {
  return useDialerList<ScriptResponseSchemaType>(
    `/scripts?page=${page}&size=${size}`,
  );
}

export function useScript(id: string | null) {
  return useDialerDetail<ScriptResponseSchemaType>(
    id ? `/scripts/${id}` : null,
  );
}

// ────────────────────────────────────────────
// Callbacks
// ────────────────────────────────────────────
export function useCallbacks(page = 1, size = 20) {
  return useDialerList<CallbackResponseSchemaType>(
    `/callbacks?page=${page}&size=${size}`,
  );
}

export function useTodayCallbacks() {
  return useDialerDetail<{ items: CallbackResponseSchemaType[] }>(
    "/callbacks/today",
  );
}

// ────────────────────────────────────────────
// Dispositions
// ────────────────────────────────────────────
export function useDispositions() {
  return useDialerList<DispositionResponseSchemaType>(
    "/dispositions?page=1&size=100",
  );
}

// ────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────
export function useTwilioConfig() {
  return useDialerDetail<TwilioConfigResponseSchemaType>("/settings/twilio");
}

export function useGoogleIntegrations() {
  return useDialerDetail<{
    integrations: GoogleIntegrationStatusSchemaType[];
  }>("/google/status");
}
