import { tenantId } from "../lib/firebase";

const HANDOFF_TENANT_COLLECTION = "handoff_tenants";
const HANDOFF_SESSION_COLLECTION = "handoff_sessions";
const GROUP_COLLECTION = "groups";

const normalizeId = (value: string) => value.trim();

export const getTenantHandoffSessionsPath = () =>
  `${HANDOFF_TENANT_COLLECTION}/${normalizeId(tenantId)}/${HANDOFF_SESSION_COLLECTION}`;

export const getGroupHandoffSessionsPath = (groupId: string) =>
  `${HANDOFF_TENANT_COLLECTION}/${normalizeId(tenantId)}/${GROUP_COLLECTION}/${groupId}/${HANDOFF_SESSION_COLLECTION}`;

export const getSessionMessagesPath = (chatSpaceId: number) =>
  `${getTenantHandoffSessionsPath()}/${chatSpaceId}/messages`;
