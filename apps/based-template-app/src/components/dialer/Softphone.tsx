"use client";

import { useState } from "react";
import { Button, Chip, Input, Tooltip } from "@heroui/react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  Mic,
  MicOff,
  Pause,
  Play,
  Hash,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  useWebRTCPhone,
  type SipConfig,
  type PhoneStatus,
} from "@/hooks/dialer/useWebRTCPhone";

interface SoftphoneProps {
  sipConfig: SipConfig;
}

const STATUS_LABELS: Record<PhoneStatus, string> = {
  disconnected: "未接続",
  connecting: "接続中...",
  registered: "待機中",
  unregistered: "未登録",
  ringing: "着信中",
  in_call: "通話中",
  on_hold: "保留中",
  error: "エラー",
};

const STATUS_COLORS: Record<
  PhoneStatus,
  "default" | "primary" | "success" | "warning" | "danger"
> = {
  disconnected: "default",
  connecting: "primary",
  registered: "success",
  unregistered: "warning",
  ringing: "warning",
  in_call: "success",
  on_hold: "warning",
  error: "danger",
};

const DTMF_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["*", "0", "#"],
];

export default function Softphone({ sipConfig }: SoftphoneProps) {
  const phone = useWebRTCPhone(sipConfig);
  const [expanded, setExpanded] = useState(true);
  const [showDtmf, setShowDtmf] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {phone.status === "registered" ||
          phone.status === "in_call" ||
          phone.status === "on_hold" ? (
            <Wifi size={16} className="text-green-500" />
          ) : (
            <WifiOff size={16} className="text-gray-400" />
          )}
          <span className="text-sm font-semibold text-gray-700">
            ソフトフォン
          </span>
          <Chip size="sm" color={STATUS_COLORS[phone.status]} variant="flat">
            {STATUS_LABELS[phone.status]}
          </Chip>
        </div>
        {expanded ? (
          <ChevronDown size={16} className="text-gray-400" />
        ) : (
          <ChevronUp size={16} className="text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Error display */}
          {phone.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
              {phone.error}
            </div>
          )}

          {/* Connection controls */}
          {phone.status === "disconnected" ||
          phone.status === "unregistered" ||
          phone.status === "error" ? (
            <Button
              color="primary"
              className="w-full"
              startContent={<Phone size={16} />}
              isLoading={phone.status === "connecting"}
              onPress={() => phone.register()}
            >
              SIP登録
            </Button>
          ) : phone.status === "connecting" ? (
            <Button color="primary" className="w-full" isLoading isDisabled>
              接続中...
            </Button>
          ) : null}

          {/* Incoming call banner */}
          {phone.status === "ringing" && phone.incomingCallFrom && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <PhoneIncoming
                  size={18}
                  className="text-blue-600 animate-pulse"
                />
                <div>
                  <p className="text-xs text-blue-500">着信中</p>
                  <p className="text-sm font-semibold text-blue-800">
                    {phone.incomingCallFrom}
                  </p>
                </div>
              </div>
              {!sipConfig.autoAnswer && (
                <div className="flex gap-2">
                  <Button
                    color="success"
                    size="sm"
                    className="flex-1"
                    startContent={<PhoneCall size={14} />}
                    onPress={phone.answer}
                  >
                    応答
                  </Button>
                  <Button
                    color="danger"
                    size="sm"
                    className="flex-1"
                    startContent={<PhoneOff size={14} />}
                    onPress={phone.hangup}
                  >
                    拒否
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* In-call controls */}
          {phone.isOnCall && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {phone.isOnHold ? "保留中" : "通話中"}
                </p>
              </div>

              <div className="flex justify-center gap-2">
                {/* Mute */}
                <Tooltip content={phone.isMuted ? "ミュート解除" : "ミュート"}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant={phone.isMuted ? "solid" : "flat"}
                    color={phone.isMuted ? "danger" : "default"}
                    onPress={phone.toggleMute}
                  >
                    {phone.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  </Button>
                </Tooltip>

                {/* Hold */}
                <Tooltip content={phone.isOnHold ? "保留解除" : "保留"}>
                  <Button
                    isIconOnly
                    size="sm"
                    variant={phone.isOnHold ? "solid" : "flat"}
                    color={phone.isOnHold ? "warning" : "default"}
                    onPress={phone.toggleHold}
                  >
                    {phone.isOnHold ? <Play size={16} /> : <Pause size={16} />}
                  </Button>
                </Tooltip>

                {/* DTMF toggle */}
                <Tooltip content="ダイヤルパッド">
                  <Button
                    isIconOnly
                    size="sm"
                    variant={showDtmf ? "solid" : "flat"}
                    color={showDtmf ? "primary" : "default"}
                    onPress={() => setShowDtmf(!showDtmf)}
                  >
                    <Hash size={16} />
                  </Button>
                </Tooltip>

                {/* Hangup */}
                <Tooltip content="通話終了">
                  <Button
                    isIconOnly
                    size="sm"
                    color="danger"
                    onPress={phone.hangup}
                  >
                    <PhoneOff size={16} />
                  </Button>
                </Tooltip>
              </div>

              {/* DTMF pad */}
              {showDtmf && (
                <div className="grid grid-cols-3 gap-1">
                  {DTMF_KEYS.flat().map((key) => (
                    <Button
                      key={key}
                      size="sm"
                      variant="flat"
                      className="font-mono text-base"
                      onPress={() => phone.sendDtmf(key)}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Registered - show disconnect */}
          {phone.status === "registered" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                内線: {sipConfig.extension}
              </span>
              <Button
                size="sm"
                variant="light"
                color="danger"
                onPress={() => phone.unregister()}
              >
                切断
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
