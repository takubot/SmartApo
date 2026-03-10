"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
  Textarea,
  Select,
  SelectItem,
  Spinner,
  Divider,
  Card,
  CardBody,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  Phone,
  PhoneOff,
  PhoneCall,
  User,
  Building2,
  Mail,
  Clock,
  X,
  Save,
  Loader2,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

// ── 型定義 ────────────────────────────────────

interface SessionCall {
  callLogId: string;
  contactId: string;
  status: string;
  phoneNumber: string;
  contactName: string;
  companyName?: string | null;
}

interface ConnectedContact {
  contactId: string;
  lastName: string;
  firstName: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  phoneMobile?: string | null;
  email?: string | null;
  companyName?: string | null;
  department?: string | null;
  position?: string | null;
}

interface SessionStatus {
  sessionId: string;
  calls: SessionCall[];
  connectedCallLogId: string | null;
  connectedContact: ConnectedContact | null;
  isComplete: boolean;
}

// ── 定数 ────────────────────────────────────

const TELE_STATUS_OPTIONS = [
  { value: "appointment", label: "アポ獲得", color: "success" },
  { value: "callback", label: "折り返し待ち", color: "warning" },
  { value: "nurturing", label: "育成中・検討中", color: "primary" },
  { value: "refused", label: "お断り", color: "danger" },
  { value: "not_reached", label: "不通", color: "default" },
  { value: "busy", label: "話し中", color: "default" },
  { value: "completed", label: "完了", color: "success" },
] as const;

const CALL_STATUS_MAP: Record<
  string,
  {
    label: string;
    color: "default" | "primary" | "success" | "warning" | "danger";
    icon: "ringing" | "connected" | "ended" | "dialing";
  }
> = {
  dialing: { label: "発信中", color: "primary", icon: "dialing" },
  ringing: { label: "呼出中", color: "warning", icon: "ringing" },
  in_progress: { label: "通話中", color: "success", icon: "connected" },
  answered: { label: "通話中", color: "success", icon: "connected" },
  completed: { label: "終了", color: "default", icon: "ended" },
  busy: { label: "話中", color: "danger", icon: "ended" },
  no_answer: { label: "不在", color: "default", icon: "ended" },
  failed: { label: "失敗", color: "danger", icon: "ended" },
  canceled: { label: "キャンセル", color: "default", icon: "ended" },
  voicemail: { label: "留守電", color: "default", icon: "ended" },
};

// ── Props ────────────────────────────────────

interface PredictiveCallPanelProps {
  callListId: string;
  sessionId: string;
  onClose: () => void;
  onResultSaved: () => void;
}

// ── コンポーネント ────────────────────────────

export default function PredictiveCallPanel({
  callListId,
  sessionId,
  onClose,
  onResultSaved,
}: PredictiveCallPanelProps) {
  const [session, setSession] = useState<SessionStatus | null>(null);
  const [teleStatus, setTeleStatus] = useState("");
  const [teleNote, setTeleNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [endingCall, setEndingCall] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const connectedAt = useRef<number | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── ポーリング ────────────────────────────

  const poll = useCallback(async () => {
    try {
      const res = await apiClient.get<SessionStatus>(
        `/call-lists/${callListId}/calling-session/${sessionId}`,
      );
      setSession(res.data);

      // 最初の接続検出 → タイマー開始
      if (res.data.connectedCallLogId && !connectedAt.current) {
        connectedAt.current = Date.now();
      }

      // 接続済み通話が終了した場合
      if (res.data.connectedCallLogId) {
        const connectedCall = res.data.calls.find(
          (c) => c.callLogId === res.data.connectedCallLogId,
        );
        if (
          connectedCall &&
          ["completed", "failed", "canceled"].includes(connectedCall.status)
        ) {
          setCallEnded(true);
        }
      }
    } catch {
      // セッション消失 → 閉じる
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [callListId, sessionId]);

  useEffect(() => {
    poll();
    pollingRef.current = setInterval(poll, 500);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [poll]);

  // ── 通話タイマー ──────────────────────────

  useEffect(() => {
    if (connectedAt.current && !callEnded) {
      timerRef.current = setInterval(() => {
        setElapsed(
          Math.floor((Date.now() - (connectedAt.current ?? Date.now())) / 1000),
        );
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.connectedCallLogId, callEnded]);

  // ── 通話終了 ──────────────────────────────

  const handleEndCall = async () => {
    setEndingCall(true);
    try {
      await apiClient.post(
        `/call-lists/${callListId}/calling-session/${sessionId}/end-call`,
      );
      setCallEnded(true);
    } catch {
      addToast({ title: "通話終了に失敗しました", color: "danger" });
    } finally {
      setEndingCall(false);
    }
  };

  // ── 結果保存 ──────────────────────────────

  const handleSaveResult = async () => {
    if (!teleStatus) {
      addToast({ title: "テレアポ状況を選択してください", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(
        `/call-lists/${callListId}/calling-session/${sessionId}/result`,
        {
          teleStatus,
          teleNote: teleNote || null,
          notes: notes || null,
        },
      );
      addToast({ title: "架電結果を保存しました", color: "success" });
      if (pollingRef.current) clearInterval(pollingRef.current);
      onResultSaved();
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // ── 全通話キャンセル ──────────────────────

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await apiClient.post(
        `/call-lists/${callListId}/calling-session/${sessionId}/cancel`,
      );
      if (pollingRef.current) clearInterval(pollingRef.current);
      onClose();
    } catch {
      addToast({ title: "キャンセルに失敗しました", color: "danger" });
    } finally {
      setCanceling(false);
    }
  };

  // ── ヘルパー ──────────────────────────────

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const isConnected = !!session?.connectedCallLogId;
  const allFailed =
    session?.isComplete && !session.connectedCallLogId;

  return (
    <Modal
      isOpen
      onClose={handleCancel}
      size="3xl"
      isDismissable={false}
      hideCloseButton
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-3">
          <PhoneCall size={20} className="text-primary-600" />
          <span>プレディクティブコール</span>
          {isConnected && !callEnded && (
            <Chip size="sm" color="success" variant="dot" className="ml-auto">
              <Clock size={12} className="mr-1 inline" />
              {formatTime(elapsed)}
            </Chip>
          )}
          {callEnded && (
            <Chip size="sm" color="default" variant="flat" className="ml-auto">
              通話終了
            </Chip>
          )}
        </ModalHeader>

        <ModalBody className="gap-4">
          {/* ── 通話ステータス一覧 ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              架電状況
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {session?.calls.map((call) => {
                const info = CALL_STATUS_MAP[call.status] ?? CALL_STATUS_MAP.dialing;
                const isThisConnected =
                  call.callLogId === session.connectedCallLogId;
                return (
                  <div
                    key={call.callLogId}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                      isThisConnected
                        ? "border-success-300 bg-success-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    {info.icon === "dialing" || info.icon === "ringing" ? (
                      <Loader2
                        size={16}
                        className="text-primary-500 animate-spin"
                      />
                    ) : info.icon === "connected" ? (
                      <PhoneCall size={16} className="text-success-600" />
                    ) : (
                      <PhoneOff size={16} className="text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {call.contactName || "不明"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {call.phoneNumber}
                        {call.companyName ? ` / ${call.companyName}` : ""}
                      </p>
                    </div>
                    <Chip size="sm" variant="flat" color={info.color}>
                      {info.label}
                    </Chip>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── ローディング中（未接続） ── */}
          {!isConnected && !allFailed && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Spinner size="lg" color="primary" />
              <p className="text-sm text-gray-600">
                応答を待っています...
              </p>
            </div>
          )}

          {/* ── 全件不通 ── */}
          {allFailed && (
            <div className="text-center py-6">
              <PhoneOff size={40} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">
                架電対象者に繋がりませんでした
              </p>
              <p className="text-sm text-gray-400 mt-1">
                時間を置いて再度お試しください
              </p>
            </div>
          )}

          {/* ── 接続中コンタクトプロフィール ── */}
          {isConnected && session?.connectedContact && (
            <>
              <Divider />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  接続中のコンタクト
                </p>
                <Card shadow="sm" className="border border-success-200">
                  <CardBody className="gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <User size={24} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold">
                          {session.connectedContact.lastName}{" "}
                          {session.connectedContact.firstName}
                        </h3>
                        {session.connectedContact.companyName && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 mt-0.5">
                            <Building2 size={14} />
                            <span>
                              {session.connectedContact.companyName}
                              {session.connectedContact.department
                                ? ` / ${session.connectedContact.department}`
                                : ""}
                              {session.connectedContact.position
                                ? ` / ${session.connectedContact.position}`
                                : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{session.connectedContact.phonePrimary}</span>
                      </div>
                      {session.connectedContact.phoneMobile && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          <span>
                            携帯: {session.connectedContact.phoneMobile}
                          </span>
                        </div>
                      )}
                      {session.connectedContact.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          <span>{session.connectedContact.email}</span>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* ── 架電結果フォーム ── */}
              <Divider />
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  架電結果
                </p>
                <div className="space-y-3">
                  <Select
                    label="テレアポ状況"
                    placeholder="選択してください"
                    size="sm"
                    selectedKeys={teleStatus ? [teleStatus] : []}
                    onSelectionChange={(keys) => {
                      const val = [...keys][0] as string;
                      if (val) setTeleStatus(val);
                    }}
                    isRequired
                  >
                    {TELE_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </Select>
                  <Textarea
                    label="テレアポメモ"
                    placeholder="テレアポの内容、次回アクションなど..."
                    value={teleNote}
                    onValueChange={setTeleNote}
                    size="sm"
                    minRows={2}
                    maxRows={4}
                  />
                  <Textarea
                    label="通話メモ"
                    placeholder="通話中のメモ..."
                    value={notes}
                    onValueChange={setNotes}
                    size="sm"
                    minRows={2}
                    maxRows={4}
                  />
                </div>
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter className="flex justify-between">
          <div>
            {!isConnected && !allFailed && (
              <Button
                color="danger"
                variant="flat"
                startContent={<X size={14} />}
                isLoading={canceling}
                onPress={handleCancel}
                size="sm"
              >
                全通話キャンセル
              </Button>
            )}
            {allFailed && (
              <Button
                variant="flat"
                onPress={() => {
                  if (pollingRef.current) clearInterval(pollingRef.current);
                  onClose();
                }}
                size="sm"
              >
                閉じる
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {isConnected && !callEnded && (
              <Button
                color="danger"
                variant="flat"
                startContent={<PhoneOff size={14} />}
                isLoading={endingCall}
                onPress={handleEndCall}
                size="sm"
              >
                通話を終了
              </Button>
            )}
            {isConnected && (
              <Button
                color="primary"
                startContent={<Save size={14} />}
                isLoading={saving}
                onPress={handleSaveResult}
                size="sm"
              >
                結果を保存
              </Button>
            )}
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
