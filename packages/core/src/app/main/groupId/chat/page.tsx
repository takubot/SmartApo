"use client";

import React from "react";
import ChatTemplate from "./chatTemplate/template";
import { useGroupContext } from "../layout-client";

type ChatPageProps = {
  chatTitle?: string;
};

export default function ChatPage({ chatTitle }: ChatPageProps) {
  // グループIDをコンテキストから取得
  const groupId = useGroupContext();

  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <ChatTemplate groupId={groupId} chatTitle={chatTitle} />
      </div>
    </div>
  );
}
