"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useChatEntryForm } from "../hooks/useChatEntryForm";
import ChatEntryForm from "../ui/form/ChatEntryForm";

const ChatEntryCreatePage: React.FC = () => {
  const params = useParams();
  const groupId = params.groupId as string;

  const {
    isLoading,
    isDataLoading,
    isConnectionDataLoading,
    botList,
    suggestList,
    customFormList,
    bookingMenuList,
    handleCreate,
  } = useChatEntryForm(groupId);

  return (
    <div className="h-full w-full">
      <ChatEntryForm
        groupId={groupId}
        botList={botList}
        suggestList={suggestList}
        customFormList={customFormList}
        bookingMenuList={bookingMenuList}
        onSubmit={handleCreate}
        isLoading={isLoading}
        isDataLoading={isDataLoading}
        isConnectionDataLoading={isConnectionDataLoading}
      />
    </div>
  );
};

export default ChatEntryCreatePage;
