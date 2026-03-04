"use client";

import { Tab, Tabs } from "@heroui/react";
import { AtSign, Mail, Users } from "lucide-react";
import type { UseExternalUserManageResult } from "../hooks/useExternalUserManage";
import { SenderConfigTab } from "./SenderConfigTab";
import { TemplateTab } from "./TemplateTab";
import { UserListTab } from "./UserListTab";

type Props = {
  state: UseExternalUserManageResult;
};

export function ExternalUserManageScreen({ state }: Props) {
  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2.5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center mt-0.5">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">
                外部ユーザー管理
              </h1>
              <p className="text-xs text-default-500 mt-0.5">
                外部ユーザーの絞り込み・選択・一斉メール配信を一画面で管理できます
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        <Tabs
          aria-label="external-user-manage-tabs"
          selectedKey={state.activeTab}
          onSelectionChange={(key) =>
            state.setActiveTab(key as "users" | "template" | "sender")
          }
          color="primary"
          variant="underlined"
          classNames={{
            tabList: "gap-4 border-b border-default-200",
            tab: "h-8 px-1",
            tabContent: "text-sm",
            panel: "pt-2",
          }}
        >
          <Tab
            key="users"
            title={
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                外部ユーザー一覧
              </div>
            }
          >
            <UserListTab state={state} />
          </Tab>

          <Tab
            key="template"
            title={
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                送信テンプレート作成
              </div>
            }
          >
            <TemplateTab state={state} />
          </Tab>

          <Tab
            key="sender"
            title={
              <div className="flex items-center gap-2">
                <AtSign className="w-4 h-4" />
                送信元管理
              </div>
            }
          >
            <SenderConfigTab state={state} />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
