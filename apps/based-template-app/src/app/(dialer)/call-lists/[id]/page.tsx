// app/(dialer)/call-lists/[id]/page.tsx
"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
  Input,
  Slider,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Tooltip,
  type Selection,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  ArrowLeft,
  RefreshCw,
  FileSpreadsheet,
  Phone,
  Play,
  PhoneCall,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dialer";
import PredictiveCallPanel from "@/components/dialer/PredictiveCallPanel";
import { useCallList, useCallListContacts } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

// OpenAPI生成後に不要になる一時的な型拡張
interface SheetsCallListFields {
  spreadsheetId?: string | null;
  sheetName?: string | null;
  sheetRange?: string | null;
  headerRow?: number | null;
  columnMapping?: string | null;
  lastSheetSyncedAt?: string | null;
}

type CallListContact = {
  contactId: string;
  lastName: string;
  firstName: string;
  phonePrimary: string;
  phoneSecondary?: string | null;
  phoneMobile?: string | null;
  email?: string | null;
  companyName?: string | null;
  teleStatus: string;
  teleNote?: string | null;
  totalCalls: number;
  lastCalledAt?: string | null;
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "手動",
  google_sheets: "Google Sheets",
  csv: "CSV",
  google_contacts: "Google Contacts",
};

const TELE_STATUS_MAP: Record<
  string,
  {
    label: string;
    color: "default" | "success" | "warning" | "danger" | "primary";
  }
> = {
  none: { label: "未架電", color: "default" },
  not_reached: { label: "不通", color: "default" },
  busy: { label: "話し中", color: "warning" },
  callback: { label: "折り返し待ち", color: "warning" },
  refused: { label: "お断り", color: "danger" },
  nurturing: { label: "育成中", color: "primary" },
  appointment: { label: "アポ獲得", color: "success" },
  completed: { label: "完了", color: "success" },
};

export default function CallListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: rawList, isLoading, mutate } = useCallList(id);
  const list = rawList as (typeof rawList & SheetsCallListFields) | undefined;

  // コンタクト一覧
  const [contactPage, setContactPage] = useState(1);
  const {
    data: contactsData,
    isLoading: contactsLoading,
    mutate: mutateContacts,
  } = useCallListContacts(id, contactPage, 50);

  // 架電制御
  const [callerId, setCallerId] = useState("");
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [calling, setCalling] = useState(false);

  // プレディクティブコール セッション
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 選択状態
  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set([]));

  // スプシ同期
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const autoSyncTriggered = useRef(false);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await apiClient.post(`/call-lists/${id}/sheets/sync`);
      setSyncResult(res.data.message);
      addToast({ title: res.data.message, color: "success" });
      mutate();
      mutateContacts();
    } catch (err: unknown) {
      const msg = extractErrorMessage(err);
      addToast({ title: msg || "同期に失敗しました", color: "danger" });
    } finally {
      setSyncing(false);
    }
  };

  // 架電実行（共通）
  const execCall = useCallback(
    async (contactIds?: string[]) => {
      setCalling(true);
      try {
        const payload: Record<string, unknown> = {
          maxConcurrentCalls: maxConcurrent,
        };
        if (callerId.trim()) {
          payload.callerId = callerId.trim();
        }
        if (contactIds && contactIds.length > 0) {
          payload.contactIds = contactIds;
        }
        const res = await apiClient.post(
          `/call-lists/${id}/start-calling`,
          payload,
        );
        if (res.data.initiatedCount > 0 && res.data.sessionId) {
          setActiveSessionId(res.data.sessionId);
        } else {
          addToast({ title: res.data.message, color: "warning" });
        }
        setSelectedKeys(new Set([]));
      } catch (err: unknown) {
        const msg = extractErrorMessage(err);
        addToast({ title: msg || "架電開始に失敗しました", color: "danger" });
      } finally {
        setCalling(false);
      }
    },
    [callerId, maxConcurrent, id],
  );

  // 1人に架電
  const handleCallSingle = (contactId: string) => execCall([contactId]);

  // 選択した人に架電
  const handleCallSelected = () => {
    if (selectedKeys === "all") {
      // 全選択時は全コンタクトID
      const ids = (contactsData?.items ?? []).map((c) => c.contactId);
      execCall(ids);
    } else {
      execCall([...(selectedKeys as Set<string>)]);
    }
  };

  // 未架電全員に架電
  const handleCallAllPending = () => execCall();

  // スプシ自動同期
  const isSheets =
    !isLoading && list?.source === "google_sheets" && !!list?.spreadsheetId;
  useEffect(() => {
    if (!isSheets || autoSyncTriggered.current) return;
    autoSyncTriggered.current = true;
    handleSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSheets]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-20 text-gray-500">
        リストが見つかりません
      </div>
    );
  }

  const contacts: CallListContact[] = contactsData?.items ?? [];
  const selectedCount =
    selectedKeys === "all"
      ? contacts.length
      : (selectedKeys as Set<string>).size;

  return (
    <div>
      {/* プレディクティブコール パネル */}
      {activeSessionId && (
        <PredictiveCallPanel
          callListId={id}
          sessionId={activeSessionId}
          onClose={() => {
            setActiveSessionId(null);
            mutateContacts();
          }}
          onResultSaved={() => {
            setActiveSessionId(null);
            mutateContacts();
          }}
        />
      )}

      <PageHeader
        title={list.name}
        actions={
          <div className="flex items-center gap-2">
            {isSheets && (
              <Button
                color="primary"
                variant="flat"
                startContent={<RefreshCw size={16} />}
                isLoading={syncing}
                onPress={handleSync}
                size="sm"
              >
                スプシから再同期
              </Button>
            )}
            <Button
              variant="flat"
              startContent={<ArrowLeft size={16} />}
              onPress={() => router.push("/call-lists")}
              size="sm"
            >
              一覧へ
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* スプシ同期ステータス */}
        {isSheets && syncing && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 border border-primary-200 text-primary-700 text-sm">
            <Spinner size="sm" />
            <span>スプレッドシートからデータを同期中...</span>
          </div>
        )}
        {isSheets && syncResult && !syncing && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success-50 border border-success-200 text-success-700 text-sm">
            <RefreshCw size={14} />
            <span>{syncResult}</span>
          </div>
        )}

        {/* リスト情報 + 架電設定 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* リスト情報 */}
          <Card shadow="sm">
            <CardHeader>
              <h3 className="text-sm font-semibold">リスト情報</h3>
            </CardHeader>
            <CardBody>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">登録件数</dt>
                  <dd className="font-medium">{list.contactCount}件</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">ソース</dt>
                  <dd>
                    <Chip
                      size="sm"
                      variant="flat"
                      color={isSheets ? "primary" : "default"}
                      startContent={
                        isSheets ? <FileSpreadsheet size={12} /> : undefined
                      }
                    >
                      {SOURCE_LABELS[list.source ?? "manual"] ??
                        list.source ??
                        "手動"}
                    </Chip>
                  </dd>
                </div>
                {list.description && (
                  <div>
                    <dt className="text-gray-500">説明</dt>
                    <dd className="font-medium">{list.description}</dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>

          {/* 架電設定 */}
          <Card
            shadow="sm"
            className="border-2 border-primary-100 lg:col-span-2"
          >
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold">架電設定</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <Input
                  label="発信者番号"
                  placeholder="+81XXXXXXXXXX"
                  value={callerId}
                  onValueChange={setCallerId}
                  size="sm"
                  className="sm:max-w-[220px]"
                />
                <div className="sm:max-w-[200px] w-full">
                  <p className="text-xs text-gray-600 mb-1">
                    同時架電数:{" "}
                    <span className="font-semibold">{maxConcurrent}</span>
                  </p>
                  <Slider
                    aria-label="同時架電数"
                    step={1}
                    minValue={1}
                    maxValue={10}
                    value={maxConcurrent}
                    onChange={(v) =>
                      setMaxConcurrent(Array.isArray(v) ? v[0] : v)
                    }
                    size="sm"
                  />
                </div>
                <Divider
                  orientation="vertical"
                  className="hidden sm:block h-10"
                />
                <div className="flex gap-2 flex-wrap">
                  {selectedCount > 0 && (
                    <Button
                      color="secondary"
                      size="sm"
                      startContent={<PhoneCall size={14} />}
                      isLoading={calling}
                      onPress={handleCallSelected}
                    >
                      選択{selectedCount}件を架電
                    </Button>
                  )}
                  <Button
                    color="primary"
                    size="sm"
                    startContent={<Play size={14} />}
                    isLoading={calling}
                    onPress={handleCallAllPending}
                  >
                    <Users size={14} className="mr-1" />
                    未架電全員
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Google Sheets連携情報 */}
        {isSheets && list.spreadsheetId && (
          <Card shadow="sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-green-600" />
                <h3 className="text-sm font-semibold">Google Sheets連携</h3>
              </div>
            </CardHeader>
            <CardBody>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="col-span-2">
                  <dt className="text-gray-500 text-xs">スプレッドシートID</dt>
                  <dd className="font-mono text-xs break-all">
                    {list.spreadsheetId}
                  </dd>
                </div>
                {list.sheetName && (
                  <div>
                    <dt className="text-gray-500 text-xs">シート名</dt>
                    <dd className="font-medium">{list.sheetName}</dd>
                  </div>
                )}
                {list.lastSheetSyncedAt && (
                  <div>
                    <dt className="text-gray-500 text-xs">最終同期</dt>
                    <dd className="font-medium">
                      {new Date(list.lastSheetSyncedAt).toLocaleString("ja-JP")}
                    </dd>
                  </div>
                )}
              </dl>
            </CardBody>
          </Card>
        )}

        {/* コンタクト一覧（チェックボックス付き） */}
        <Card shadow="sm">
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">
              コンタクト一覧 ({contactsData?.total ?? 0}件)
            </h3>
            {selectedCount > 0 && (
              <Chip size="sm" variant="flat" color="primary">
                {selectedCount}件選択中
              </Chip>
            )}
          </CardHeader>
          <CardBody className="p-0">
            {contactsLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                コンタクトがありません。リストにコンタクトを追加してください。
              </div>
            ) : (
              <>
                <Table
                  aria-label="コンタクト一覧"
                  selectionMode="multiple"
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedKeys}
                  removeWrapper
                >
                  <TableHeader>
                    <TableColumn>氏名</TableColumn>
                    <TableColumn>電話番号</TableColumn>
                    <TableColumn>会社名</TableColumn>
                    <TableColumn>架電状況</TableColumn>
                    <TableColumn>通話回数</TableColumn>
                    <TableColumn width={80} align="center">
                      操作
                    </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((c) => {
                      const status =
                        TELE_STATUS_MAP[c.teleStatus] ?? TELE_STATUS_MAP.none;
                      return (
                        <TableRow key={c.contactId}>
                          <TableCell>
                            {c.lastName} {c.firstName}
                          </TableCell>
                          <TableCell>{c.phonePrimary}</TableCell>
                          <TableCell>{c.companyName || "-"}</TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat" color={status.color}>
                              {status.label}
                            </Chip>
                          </TableCell>
                          <TableCell>{c.totalCalls}回</TableCell>
                          <TableCell>
                            <Tooltip content="この人に架電">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="primary"
                                isLoading={calling}
                                onPress={() => handleCallSingle(c.contactId)}
                              >
                                <Phone size={14} />
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {(contactsData?.totalPages ?? 1) > 1 && (
                  <div className="flex justify-center py-3 border-t border-gray-100">
                    <Pagination
                      total={contactsData?.totalPages ?? 1}
                      page={contactPage}
                      onChange={setContactPage}
                      showControls
                      size="sm"
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ── ヘルパー ────────────────────────────────────────
function extractErrorMessage(err: unknown): string | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as Record<string, unknown>).response === "object" &&
    (err as Record<string, Record<string, unknown>>).response !== null
  ) {
    return (
      (err as Record<string, Record<string, unknown>>).response.data as Record<
        string,
        string
      >
    )?.detail;
  }
  return undefined;
}
