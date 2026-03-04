"use client";

import React from "react";
import EndpointTemplate from "./chatEntryTemplate/template";
import { useGroupContext } from "../layout-client"; // 要件どおり

const EndpointPage: React.FC = () => {
  // グループIDをコンテキストから取得
  const groupId = useGroupContext();

  return (
    <div className="h-full w-full">
      <EndpointTemplate groupId={groupId} />
    </div>
  );
};

export default EndpointPage;
