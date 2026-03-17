// hooks/dialer/useDialerSwr.ts
// Dialer API 用 SWR ラッパーフック集（生成型使用）

import useSWR, { type SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";
import apiClient, { swrFetcher } from "@/lib/apiClient";
import type {
  CampaignResponseSchemaType,
  CampaignStatsSchemaType,
  ContactResponseSchemaType,
  CallLogResponseSchemaType,
  CallListResponseSchemaType,
  CallbackResponseSchemaType,
  DispositionResponseSchemaType,
  DncResponseSchemaType,
  ScriptResponseSchemaType,
  DashboardOverviewSchemaType,
  HourlyStatSchemaType,
  GoogleIntegrationStatusSchemaType,
  UserResponseSchemaType,
  UserPerformanceSchemaType,
} from "@repo/api-contracts/based_template/zschema";

export type DialerUserType = UserResponseSchemaType;
export type UserPerformanceType = UserPerformanceSchemaType;

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
  return useDialerDetail<{ stats: HourlyStatSchemaType[] }>(
    "/dashboard/hourly",
  );
}

export function useDashboardUserPerformance() {
  return useDialerDetail<{ users: UserPerformanceType[] }>(
    "/dashboard/users/performance",
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
// Users
// ────────────────────────────────────────────

/** ログインユーザーの情報を取得（自動作成） */
export function useCurrentUser(displayName?: string | null) {
  const qs = displayName
    ? `?display_name=${encodeURIComponent(displayName)}`
    : "";
  return useSWR<DialerUserType>(`/users/me${qs}`, swrFetcher, {
    revalidateOnFocus: false,
  });
}

export function useUsers() {
  return useSWR<DialerUserType[]>("/users", swrFetcher, {
    revalidateOnFocus: false,
  });
}

export function useUser(id: string | null) {
  return useDialerDetail<DialerUserType>(id ? `/users/${id}` : null);
}

export function useUserStatusBoard() {
  return useDialerDetail<{
    users: (DialerUserType & {
      callDuration?: number;
      campaignName?: string | null;
    })[];
  }>("/users/status-board");
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

export function useCallListContacts(
  callListId: string | null,
  page = 1,
  size = 20,
) {
  return useDialerList<{
    contactId: string;
    lastName: string;
    firstName: string;
    phonePrimary: string;
    phoneSecondary?: string | null;
    phoneMobile?: string | null;
    email?: string | null;
    companyName?: string | null;
    teleStatus: string;
    teleNote?: string | null;
    totalCalls: number;
    lastCalledAt?: string | null;
  }>(
    callListId
      ? `/call-lists/${callListId}/contacts?page=${page}&page_size=${size}`
      : null,
  );
}

export function useSheetsConnectionStatus() {
  const { data, isLoading } = useGoogleIntegrations();
  const googleIntegration = data?.integrations?.find(
    (i) => i.integrationType === "google",
  );
  return {
    isConnected: googleIntegration?.status === "connected",
    isLoading,
    integration: googleIntegration,
  };
}

// ────────────────────────────────────────────
// DNC
// ────────────────────────────────────────────
export function useDncList(page = 1, size = 20) {
  return useDialerList<DncResponseSchemaType>(`/dnc?page=${page}&size=${size}`);
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
export function usePhoneConfig() {
  return useDialerDetail<{
    eslConnected: boolean;
    sipGateway: string | null;
    registeredUsers: number;
  }>("/settings/phone");
}

export function useGoogleIntegrations() {
  return useDialerDetail<{
    integrations: GoogleIntegrationStatusSchemaType[];
  }>("/google/status");
}
