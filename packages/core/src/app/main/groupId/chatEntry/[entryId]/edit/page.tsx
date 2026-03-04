"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useChatEntryForm } from "../../hooks/useChatEntryForm";
import ChatEntryForm from "../../ui/form/ChatEntryForm";

const ChatEntryEditPage: React.FC = () => {
  const params = useParams();
  const groupId = params.groupId as string;
  const entryId = params.entryId as string;

  const {
    isLoading,
    isDataLoading,
    isConnectionDataLoading,
    editTarget,
    botList,
    suggestList,
    customFormList,
    bookingMenuList,
    handleUpdate,
  } = useChatEntryForm(groupId, entryId);

  return (
    <div className="h-full w-full">
      <ChatEntryForm
        groupId={groupId}
        entryId={entryId}
        editTarget={editTarget}
        botList={botList}
        suggestList={suggestList}
        customFormList={customFormList}
        bookingMenuList={bookingMenuList}
        onSubmit={handleUpdate}
        isLoading={isLoading}
        isDataLoading={isDataLoading}
        isConnectionDataLoading={isConnectionDataLoading}
      />
    </div>
  );
};

export default ChatEntryEditPage;
