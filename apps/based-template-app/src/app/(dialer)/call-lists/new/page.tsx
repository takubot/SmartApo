// app/(dialer)/call-lists/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Textarea,
  Button,
  Tabs,
  Tab,
  Spinner,
  Chip,
  Select,
  SelectItem,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  Save,
  ArrowLeft,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  Check,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
import { PageHeader } from "@/components/dialer";
import apiClient from "@/lib/apiClient";
import { useSheetsConnectionStatus } from "@/hooks/dialer/useDialerSwr";

interface PreviewData {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  rawRows: string[][];
  suggestedMapping: Record<string, string>;
}

/** コンタクトフィールドの選択肢 */
const CONTACT_FIELD_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "-- スキップ --" },
  { value: "phone_primary", label: "電話番号（必須）" },
  { value: "phone_secondary", label: "副電話番号" },
  { value: "phone_mobile", label: "携帯電話" },
  { value: "name", label: "氏名" },
  { value: "name_kana", label: "氏名カナ" },
  { value: "last_name", label: "姓" },
  { value: "first_name", label: "名" },
  { value: "last_name_kana", label: "姓（カナ）" },
  { value: "first_name_kana", label: "名（カナ）" },
  { value: "email", label: "メールアドレス" },
  { value: "company_name", label: "会社名" },
  { value: "department", label: "部署" },
  { value: "position", label: "役職" },
  { value: "postal_code", label: "郵便番号" },
  { value: "prefecture", label: "都道府県" },
  { value: "city", label: "市区町村" },
  { value: "address_line", label: "住所" },
  { value: "birth_date", label: "生年月日" },
  { value: "registered_date", label: "リスト登録日" },
  { value: "notes", label: "備考1" },
  { value: "notes2", label: "備考2" },
  { value: "notes3", label: "備考3" },
];

interface SelectedSheet {
  spreadsheetId: string;
  name: string;
}

interface SheetTab {
  sheetId: number;
  title: string;
}

// ────────────────────────────────────────────
// Google Picker ユーティリティ
// ────────────────────────────────────────────
let gapiLoaded = false;
let pickerLoaded = false;

function loadGapiScript(): Promise<void> {
  if (gapiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("gapi-script");
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "gapi-script";
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      gapiLoaded = true;
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Google API script の読み込みに失敗しました"));
    document.head.appendChild(script);
  });
}

function loadPickerApi(): Promise<void> {
  if (pickerLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    window.gapi.load("picker", () => {
      pickerLoaded = true;
      resolve();
    });
  });
}

async function openGooglePicker(
  onSelect: (file: SelectedSheet) => void,
): Promise<void> {
  const configRes = await apiClient.get("/google/picker-config");
  const { accessToken, apiKey, appId } = configRes.data;

  await loadGapiScript();
  await loadPickerApi();

  const google = window.google;
  const origin = window.location.protocol + "//" + window.location.host;
  const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(false);

  const picker = new google.picker.PickerBuilder()
    .addView(view)
    .enableFeature(google.picker.Feature.SUPPORT_DRIVES)
    .setOAuthToken(accessToken)
    .setDeveloperKey(apiKey)
    .setAppId(appId)
    .setOrigin(origin)
    .setLocale("ja")
    .setTitle("スプレッドシートを選択")
    .setCallback((data: google.picker.ResponseObject) => {
      if (data.action === google.picker.Action.PICKED) {
        const doc = data.docs[0];
        onSelect({ spreadsheetId: doc.id, name: doc.name });
      }
    })
    .build();

  picker.setVisible(true);
}

// ────────────────────────────────────────────
// axios エラーから detail を取得
// ────────────────────────────────────────────
function getAxiosDetail(err: unknown): string | undefined {
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

// ────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────
export default function NewCallListPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");

  // 手動作成フォーム
  const [manualForm, setManualForm] = useState({ name: "", description: "" });

  // スプレッドシート選択
  const [selectedSpreadsheet, setSelectedSpreadsheet] =
    useState<SelectedSheet | null>(null);
  const [openingPicker, setOpeningPicker] = useState(false);

  // シートタブ選択
  const [sheetTabs, setSheetTabs] = useState<SheetTab[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("");

  // ヘッダー行
  const [headerRow, setHeaderRow] = useState(1);

  // プレビュー
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [previewing, setPreviewing] = useState(false);

  // カラムマッピング
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {},
  );

  // インポート
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [importing, setImporting] = useState(false);

  const { isConnected: isSheetsConnected, isLoading: isSheetsLoading } =
    useSheetsConnectionStatus();

  // ── Google Picker を開く ──
  const handleOpenPicker = async () => {
    setOpeningPicker(true);
    try {
      await openGooglePicker((file) => setSelectedSpreadsheet(file));
    } catch {
      addToast({ title: "ファイル選択の起動に失敗しました", color: "danger" });
    } finally {
      setOpeningPicker(false);
    }
  };

  // ── シートタブ取得 ──
  useEffect(() => {
    if (!selectedSpreadsheet) {
      setSheetTabs([]);
      setSelectedTab("");
      setPreview(null);
      setRawRows([]);
      setHeaderRow(1);
      setColumnMapping({});
      return;
    }
    let cancelled = false;
    setLoadingTabs(true);
    setSheetTabs([]);
    setSelectedTab("");
    setPreview(null);
    setRawRows([]);
    setHeaderRow(1);
    setColumnMapping({});

    apiClient
      .get(
        `/call-lists/sheets/spreadsheets/${selectedSpreadsheet.spreadsheetId}/tabs`,
      )
      .then((res) => {
        if (cancelled) return;
        const tabs: SheetTab[] = res.data.items ?? [];
        setSheetTabs(tabs);
        if (tabs.length > 0) setSelectedTab(tabs[0].title);
      })
      .catch(() => {
        if (!cancelled)
          addToast({
            title: "シート情報の取得に失敗しました",
            color: "danger",
          });
      })
      .finally(() => {
        if (!cancelled) setLoadingTabs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSpreadsheet]);

  // ── プレビュー自動取得（シートタブ or ヘッダー行が変わったら） ──
  useEffect(() => {
    if (!selectedSpreadsheet || !selectedTab) return;
    let cancelled = false;
    setPreviewing(true);

    apiClient
      .post("/call-lists/sheets/preview", {
        spreadsheetId: selectedSpreadsheet.spreadsheetId,
        sheetName: selectedTab,
        headerRow,
      })
      .then((res) => {
        if (cancelled) return;
        setPreview(res.data);
        if (res.data.rawRows?.length) setRawRows(res.data.rawRows);
        // suggestedMapping からカラムマッピング初期化
        if (res.data.suggestedMapping) {
          setColumnMapping(res.data.suggestedMapping);
        } else {
          setColumnMapping({});
        }
        if (res.data.totalRows === 0 && headerRow === 1) {
          addToast({ title: "データが見つかりませんでした", color: "warning" });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        addToast({
          title: getAxiosDetail(err) || "プレビューの取得に失敗しました",
          color: "danger",
        });
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSpreadsheet?.spreadsheetId, selectedTab, headerRow]);

  // ── 手動作成 ──
  const handleManualSubmit = async () => {
    if (!manualForm.name.trim()) {
      addToast({ title: "リスト名は必須です", color: "warning" });
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post("/call-lists", {
        name: manualForm.name,
        description: manualForm.description || undefined,
      });
      addToast({ title: "リストを作成しました", color: "success" });
      router.push(`/call-lists/${res.data.callListId}`);
    } catch {
      addToast({ title: "作成に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  // ── カラムマッピング変更 ──
  const handleMappingChange = (header: string, field: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      // 同じフィールドが既に別のヘッダーに割り当てられていたらクリア
      if (field) {
        for (const [h, f] of Object.entries(next)) {
          if (f === field && h !== header) {
            next[h] = "";
          }
        }
      }
      next[header] = field;
      return next;
    });
  };

  // phone_primary がマッピングされているか
  const isPhoneMapped = Object.values(columnMapping).includes("phone_primary");

  // ── インポート ──
  const handleSheetsImport = async () => {
    if (!selectedSpreadsheet || !selectedTab) return;
    if (!listName.trim()) {
      addToast({ title: "リスト名は必須です", color: "warning" });
      return;
    }
    if (!isPhoneMapped) {
      addToast({
        title: "電話番号の列を指定してください",
        color: "warning",
      });
      return;
    }
    setImporting(true);
    try {
      const res = await apiClient.post("/call-lists/sheets/import", {
        spreadsheetId: selectedSpreadsheet.spreadsheetId,
        sheetName: selectedTab,
        headerRow,
        listName,
        listDescription: listDescription || undefined,
        columnMapping,
      });
      addToast({ title: res.data.message, color: "success" });
      router.push(`/call-lists/${res.data.callListId}`);
    } catch (err: unknown) {
      addToast({
        title: getAxiosDetail(err) || "インポートに失敗しました",
        color: "danger",
      });
    } finally {
      setImporting(false);
    }
  };

  // ── シート連携済みのメインUI ──
  const renderSheetsConnected = () => {
    const hasRawPreview = rawRows.length > 0 || previewing;

    return (
      <div
        className={`flex gap-6 items-start ${hasRawPreview ? "" : "max-w-xl"}`}
      >
        {/* ═══ 左パネル: 設定 ═══ */}
        <div className="flex-1 min-w-0 max-w-xl space-y-4">
          {/* Step 1: スプレッドシート選択 */}
          <Card shadow="sm">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <h3 className="text-sm font-semibold">
                  1. スプレッドシートを選択
                </h3>
                <Chip color="success" size="sm" variant="flat">
                  <div className="flex items-center gap-1">
                    <Check size={12} />
                    Google連携済み
                  </div>
                </Chip>
              </div>
            </CardHeader>
            <CardBody>
              {selectedSpreadsheet ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                      <FileSpreadsheet size={18} className="text-green-700" />
                    </div>
                    <p className="text-sm font-medium text-green-800">
                      {selectedSpreadsheet.name}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={handleOpenPicker}
                    isLoading={openingPicker}
                  >
                    変更
                  </Button>
                </div>
              ) : (
                <Button
                  color="primary"
                  variant="flat"
                  className="w-full h-20"
                  startContent={
                    !openingPicker ? <FileSpreadsheet size={20} /> : undefined
                  }
                  isLoading={openingPicker}
                  onPress={handleOpenPicker}
                >
                  Googleドライブからスプレッドシートを選択
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Step 2: シートタブ選択 */}
          {selectedSpreadsheet && (
            <Card shadow="sm">
              <CardHeader>
                <h3 className="text-sm font-semibold">2. シートを選択</h3>
              </CardHeader>
              <CardBody>
                {loadingTabs ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <Select
                    label="シートタブ"
                    selectedKeys={selectedTab ? [selectedTab] : []}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0] as string;
                      setSelectedTab(val ?? "");
                      setHeaderRow(1);
                    }}
                    description={`${sheetTabs.length}個のシートがあります`}
                  >
                    {sheetTabs.map((tab) => (
                      <SelectItem key={tab.title}>{tab.title}</SelectItem>
                    ))}
                  </Select>
                )}
              </CardBody>
            </Card>
          )}

          {/* Step 3: カラムマッピング */}
          {preview && preview.totalRows > 0 && (
            <Card shadow="sm">
              <CardHeader>
                <div>
                  <h3 className="text-sm font-semibold">3. カラムマッピング</h3>
                  <p className="text-xs text-default-400 mt-0.5">
                    スプレッドシートの列をコンタクト項目に割り当て
                  </p>
                </div>
              </CardHeader>
              <CardBody className="space-y-0">
                {!isPhoneMapped && (
                  <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-warning-50 border border-warning-200 text-warning-700 text-xs">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>
                      「電話番号（必須）」を1つの列に割り当ててください
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {preview.headers.map((header) => {
                    const sampleVal = preview.rows[0]?.[header] || "";
                    const mappedField = columnMapping[header] || "";
                    return (
                      <div
                        key={header}
                        className="flex items-center gap-3 p-2 rounded-lg border border-default-200 bg-default-50"
                      >
                        {/* ヘッダー名 + サンプル */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {header}
                          </p>
                          {sampleVal && (
                            <p className="text-xs text-default-400 truncate">
                              例: {sampleVal}
                            </p>
                          )}
                        </div>
                        {/* → アイコン */}
                        <span className="text-default-300 text-sm shrink-0">
                          →
                        </span>
                        {/* ドロップダウン */}
                        <Select
                          size="sm"
                          className="w-48 shrink-0"
                          selectedKeys={mappedField ? [mappedField] : []}
                          onSelectionChange={(keys) => {
                            const val = (Array.from(keys)[0] as string) ?? "";
                            handleMappingChange(header, val);
                          }}
                          placeholder="スキップ"
                          aria-label={`${header} のマッピング`}
                          classNames={{
                            trigger:
                              mappedField === "phone_primary"
                                ? "border-primary bg-primary-50"
                                : mappedField
                                  ? "border-success bg-success-50"
                                  : "",
                          }}
                        >
                          {CONTACT_FIELD_OPTIONS.filter(
                            (opt) => opt.value !== "",
                          ).map((opt) => {
                            const isUsed =
                              Object.values(columnMapping).includes(
                                opt.value,
                              ) && columnMapping[header] !== opt.value;
                            return (
                              <SelectItem
                                key={opt.value}
                                isDisabled={isUsed}
                                className={isUsed ? "opacity-40" : ""}
                              >
                                {opt.label}
                              </SelectItem>
                            );
                          })}
                        </Select>
                      </div>
                    );
                  })}
                </div>
                {/* マッピングサマリー */}
                <div className="mt-3 pt-3 border-t border-default-200">
                  <div className="flex items-center justify-between text-xs text-default-500">
                    <span>
                      {Object.values(columnMapping).filter((v) => v).length}/
                      {preview.headers.length} 列をマッピング済み
                    </span>
                    {isPhoneMapped && (
                      <Chip color="success" size="sm" variant="flat">
                        <div className="flex items-center gap-1">
                          <Check size={12} />
                          電話番号OK
                        </div>
                      </Chip>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Step 4: 連携設定 */}
          {preview && preview.totalRows > 0 && isPhoneMapped && (
            <Card shadow="sm">
              <CardHeader>
                <h3 className="text-sm font-semibold">4. 連携設定</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {/* サマリー */}
                <div className="rounded-lg bg-default-100 p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">ヘッダー行</span>
                    <span className="font-medium">{headerRow}行目</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">マッピング列</span>
                    <span className="font-medium">
                      {Object.values(columnMapping).filter((v) => v).length}列
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-default-500">データ行数</span>
                    <span className="font-medium">{preview.totalRows}行</span>
                  </div>
                </div>

                <Input
                  label="コールリスト名"
                  value={listName}
                  onValueChange={setListName}
                  isRequired
                  placeholder="例: 2026年3月架電リスト"
                />
                <Textarea
                  label="説明（任意）"
                  value={listDescription}
                  onValueChange={setListDescription}
                />
                <p className="text-xs text-default-400">
                  連携後、スプレッドシートのデータは自動で同期されます。スプシを更新すればリストにも反映されます。
                </p>
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    startContent={<FileSpreadsheet size={16} />}
                    isLoading={importing}
                    onPress={handleSheetsImport}
                  >
                    スプシと連携（{preview.totalRows}件）
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ═══ 右パネル: 生データプレビュー ═══ */}
        {selectedTab && (
          <div className="flex-1 min-w-[360px] max-w-[560px]">
            <Card shadow="sm" className="sticky top-4">
              <CardHeader className="pb-1">
                <div>
                  <h3 className="text-sm font-semibold">シート内容</h3>
                  <p className="text-xs text-default-400 mt-0.5 flex items-center gap-1">
                    <MousePointerClick size={12} />
                    行をクリックしてヘッダー行を選択
                  </p>
                </div>
              </CardHeader>
              <CardBody className="pt-1">
                {previewing && rawRows.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <Spinner size="sm" />
                  </div>
                ) : rawRows.length > 0 ? (
                  <>
                    <div className="overflow-auto max-h-[65vh] rounded-lg border border-default-200">
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          {rawRows.map((row, i) => {
                            const rowNum = i + 1;
                            const isHeader = rowNum === headerRow;
                            const isAbove = rowNum < headerRow;
                            return (
                              <tr
                                key={i}
                                onClick={() => setHeaderRow(rowNum)}
                                className={[
                                  "cursor-pointer border-b border-default-100 transition-colors",
                                  isHeader
                                    ? "bg-primary-50 font-semibold ring-2 ring-primary/40 ring-inset"
                                    : isAbove
                                      ? "opacity-30"
                                      : "hover:bg-default-100",
                                ].join(" ")}
                              >
                                {/* 行番号 */}
                                <td className="px-2 py-1.5 text-right text-default-400 w-8 border-r border-default-200 bg-default-50 select-none tabular-nums">
                                  {rowNum}
                                </td>
                                {/* セル */}
                                {row.map((cell, j) => (
                                  <td
                                    key={j}
                                    className="px-2 py-1.5 whitespace-nowrap max-w-[130px] truncate"
                                    title={cell}
                                  >
                                    {cell || (
                                      <span className="text-default-300">
                                        -
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-2 text-xs text-default-400 space-y-0.5">
                      <p>
                        <span className="inline-block w-3 h-3 rounded-sm bg-primary-50 ring-1 ring-primary/40 mr-1 align-middle" />
                        = ヘッダー行（{headerRow}行目）
                      </p>
                      <p>{headerRow + 1}行目以降がデータとして読み込まれます</p>
                      {previewing && (
                        <p className="text-primary">読み込み中...</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-default-400 text-center py-6">
                    データがありません
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="新規コールリスト"
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.back()}
          >
            戻る
          </Button>
        }
      />
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        variant="underlined"
        classNames={{ tabList: "mb-4" }}
      >
        {/* ── 手動作成タブ ── */}
        <Tab key="manual" title="手動作成">
          <div className="max-w-3xl">
            <Card shadow="sm">
              <CardHeader>
                <h3 className="text-sm font-semibold">リスト情報</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <Input
                  label="リスト名"
                  value={manualForm.name}
                  onValueChange={(v) =>
                    setManualForm((p) => ({ ...p, name: v }))
                  }
                  isRequired
                />
                <Textarea
                  label="説明"
                  value={manualForm.description}
                  onValueChange={(v) =>
                    setManualForm((p) => ({ ...p, description: v }))
                  }
                />
                <div className="flex justify-end">
                  <Button
                    color="primary"
                    startContent={<Save size={16} />}
                    isLoading={saving}
                    onPress={handleManualSubmit}
                  >
                    作成
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* ── Google Sheetsインポートタブ ── */}
        <Tab
          key="sheets"
          title={
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} />
              Google Sheets
            </div>
          }
        >
          {isSheetsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="lg" />
            </div>
          ) : !isSheetsConnected ? (
            <div className="max-w-xl">
              <Card shadow="sm">
                <CardBody className="flex flex-col items-center gap-4 py-10">
                  <AlertCircle size={48} className="text-warning" />
                  <div className="text-center">
                    <p className="font-semibold text-lg">
                      Googleアカウントが未連携です
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      スプレッドシートからインポートするには、先にGoogleアカウントを連携してください。
                    </p>
                  </div>
                  <Button
                    color="primary"
                    startContent={<ExternalLink size={16} />}
                    onPress={() => router.push("/settings/google")}
                  >
                    Google連携設定へ
                  </Button>
                </CardBody>
              </Card>
            </div>
          ) : (
            renderSheetsConnected()
          )}
        </Tab>
      </Tabs>
    </div>
  );
}
