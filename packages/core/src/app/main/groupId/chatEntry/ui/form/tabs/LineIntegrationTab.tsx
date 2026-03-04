"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";
import { MessageCircle } from "lucide-react";
import GeneralAccessStep from "./GeneralAccessTab";

interface LineIntegrationTabContentProps {
  mode: "create" | "edit";
}

const LineIntegrationTabContent: React.FC<LineIntegrationTabContentProps> = ({
  mode,
}) => {
  return (
    <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card
        shadow="none"
        className="border border-default-200 rounded-xl bg-white"
      >
        <CardBody className="p-4 sm:p-6 lg:p-8">
          <div className="bg-success-50 border border-success-200 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="w-6 h-6 text-success-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-success-800 font-bold text-base">
                LINE連携の詳細設定
              </h4>
              <p className="text-success-700 text-sm mt-1 leading-relaxed whitespace-normal break-words">
                LINE公式アカウントとDOPPELを連携させるためのMessaging
                API設定とミニアプリ設定を行います。 Webhook
                URLは保存後に自動発行されます。
              </p>
            </div>
          </div>
          <GeneralAccessStep mode={mode} showOnly="line" />
        </CardBody>
      </Card>
    </div>
  );
};

export default LineIntegrationTabContent;
