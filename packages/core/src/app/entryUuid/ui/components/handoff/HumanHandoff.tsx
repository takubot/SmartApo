"use client";

import React from "react";
import { Card, CardBody, Button, Spinner } from "@heroui/react";
import { Headphones, UserCheck } from "lucide-react";

interface HumanHandoffProposalProps {
  onConnect: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
  description?: string;
  buttonText?: string;
  className?: string;
}

export const HumanHandoffProposal: React.FC<HumanHandoffProposalProps> = ({
  onConnect,
  isLoading = false,
  isDisabled = false,
  title = "有人オペレーターへ引き継ぎ",
  description = "必要に応じて担当者へ切り替えられます。準備ができ次第ご案内します。",
  buttonText = "オペレーターに接続する",
  className = "",
}) => {
  return (
    <div className={`w-full ${className}`}>
      <Card className="bg-amber-50 border-amber-200 shadow-sm border animate-in fade-in slide-in-from-bottom-2">
        <CardBody className="p-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 text-amber-700 font-black">
            <Headphones size={20} />
            <span className="text-sm">{title}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            {description}
          </p>
          <Button
            color="warning"
            size="md"
            className="font-black shadow-lg shadow-amber-200/50 text-white"
            onPress={onConnect}
            isLoading={isLoading}
            isDisabled={isDisabled}
            startContent={!isLoading && <UserCheck size={18} />}
          >
            {buttonText}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
};

interface HumanHandoffStatusProps {
  operatorName?: string | null;
  statusText?: string;
  connectedText?: string;
  waitingText?: string;
  onCancel?: () => void;
  cancelButtonText?: string;
  isCancelling?: boolean;
  className?: string;
  variant?: "card" | "banner";
}

export const HumanHandoffStatus: React.FC<HumanHandoffStatusProps> = ({
  operatorName,
  statusText,
  connectedText = "担当者が参加しました。続けてお話しください。",
  waitingText = "担当者を呼び出しています。まもなくご案内します。",
  onCancel,
  cancelButtonText = "ボットに戻る",
  isCancelling = false,
  className = "",
  variant = "card",
}) => {
  const isConnected = !!operatorName;

  if (variant === "banner") {
    return (
      <div className={`w-full ${className}`}>
        <Card className="border-none shadow-sm bg-indigo-50">
          <CardBody className="py-2 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                <Headphones size={16} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                  Operator Response
                </p>
                <p className="text-xs font-black text-indigo-800">
                  {statusText || (isConnected ? connectedText : waitingText)}
                </p>
              </div>
            </div>
            {!isConnected && (
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="secondary" />
                {onCancel && (
                  <Button
                    size="sm"
                    color="default"
                    variant="flat"
                    className="text-xs font-black"
                    onPress={onCancel}
                    isLoading={isCancelling}
                    isDisabled={isCancelling}
                  >
                    {cancelButtonText}
                  </Button>
                )}
              </div>
            )}
            {isConnected && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      <Card className="bg-indigo-50 border-indigo-200 shadow-sm border">
        <CardBody className="p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-indigo-700 font-black">
            <Headphones
              size={20}
              className={!isConnected ? "animate-pulse" : ""}
            />
            <span className="text-sm">
              {statusText ||
                (isConnected
                  ? `担当：${operatorName}`
                  : "オペレーターに接続中")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isConnected ? (
              <>
                <Spinner size="sm" color="primary" />
                <span className="text-xs text-indigo-600 font-bold">
                  {waitingText}
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                <span className="text-xs text-indigo-600 font-bold">
                  {connectedText}
                </span>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
