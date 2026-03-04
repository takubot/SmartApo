"use client";

import { useGroupContext } from "../layout-client";
import { useExternalUserManage } from "./hooks/useExternalUserManage";
import { ExternalUserManageScreen } from "./ui/ExternalUserManageScreen";

export default function ExternalUserManagePage() {
  const groupId = useGroupContext();
  const state = useExternalUserManage(groupId);
  return <ExternalUserManageScreen state={state} />;
}
