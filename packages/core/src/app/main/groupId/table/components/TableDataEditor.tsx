"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import type { ChunkTableItemType } from "@repo/api-contracts/based_template/zschema";
import { ColumnDataTypeEnum } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI, showSuccessToast } from "@common/errorHandler";
import type {
  WorksheetInstance,
  ContextMenuItem,
  ContextMenuRole,
} from "jspreadsheet-ce";

// Jspreadsheet CE
import "jsuites/dist/jsuites.css";
import "jspreadsheet-ce/dist/jspreadsheet.css";

const JSPREADSHEET_JA_DICTIONARY: Record<string, string> = {
  noRecordsFound: "該当するデータがありません",
  showingPage: "{1} 件中 {0} ページ目を表示",
  show: "表示",
  search: "検索",
  entries: " 件",
  columnName: "列名",
  insertANewColumnBefore: "左に列を挿入",
  insertANewColumnAfter: "右に列を挿入",
  deleteSelectedColumns: "選択した列を削除",
  renameThisColumn: "列名を変更",
  orderAscending: "昇順",
  orderDescending: "降順",
  insertANewRowBefore: "上に行を挿入",
  insertANewRowAfter: "下に行を挿入",
  deleteSelectedRows: "選択した行を削除",
  editComments: "コメントを編集",
  addComments: "コメントを追加",
  comments: "コメント",
  clearComments: "コメントを削除",
  copy: "コピー...",
  paste: "貼り付け...",
  saveAs: "名前を付けて保存...",
  about: "このソフトについて",
  areYouSureToDeleteTheSelectedRows: "選択した行を削除します。よろしいですか？",
  areYouSureToDeleteTheSelectedColumns:
    "選択した列を削除します。よろしいですか？",
  thisActionWillDestroyAnyExistingMergedCellsAreYouSure:
    "この操作により結合セルが解除されます。よろしいですか？",
  thisActionWillClearYourSearchResultsAreYouSure:
    "この操作により検索結果がクリアされます。よろしいですか？",
  thereIsAConflictWithAnotherMergedCell: "別の結合セルと競合しています",
  invalidMergeProperties: "結合設定が不正です",
  cellAlreadyMerged: "このセルは既に結合されています",
  noCellsSelected: "セルが選択されていません",
};

const CONTEXT_MENU_EN_TO_JA: Record<string, string> = {
  "Insert a new column before": "左に列を挿入",
  "Insert a new column after": "右に列を挿入",
  "Delete selected columns": "選択した列を削除",
  "Rename this column": "列名を変更",
  "Order ascending": "昇順",
  "Order descending": "降順",
  "Insert a new row before": "上に行を挿入",
  "Insert a new row after": "下に行を挿入",
  "Delete selected rows": "選択した行を削除",
  "Edit comments": "コメントを編集",
  "Add comments": "コメントを追加",
  Comments: "コメント",
  "Clear comments": "コメントを削除",
  "Copy...": "コピー...",
  "Paste...": "貼り付け...",
  "Save as...": "名前を付けて保存...",
  About: "このソフトについて",
};

const HIDDEN_CONTEXT_MENU_TITLES = new Set<string>([
  "About",
  "このソフトについて",
  "Add comments",
  "コメントを追加",
]);

interface HeaderColumn {
  label: string;
  key?: string;
  type?: string;
  description?: string;
}

function normalizeWorksheetInstance(value: unknown): WorksheetInstance | null {
  if (!value) return null;
  if (Array.isArray(value)) return normalizeWorksheetInstance(value[0]);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    // Jspreadsheet React wrapper properties
    if (obj.jspreadsheet)
      return obj.jspreadsheet as unknown as WorksheetInstance;
    if (Array.isArray(obj.worksheets) && obj.worksheets[0])
      return obj.worksheets[0] as unknown as WorksheetInstance;
    if ("current" in obj) return normalizeWorksheetInstance(obj.current);
    if ("0" in obj) return normalizeWorksheetInstance(obj["0"]);
    // Direct instance check (some versions attach to DOM)
    if (obj.el) {
      const element = obj.el as
        | { jspreadsheet?: WorksheetInstance }
        | undefined;
      if (element?.jspreadsheet)
        return element.jspreadsheet as unknown as WorksheetInstance;
    }
    return obj as unknown as WorksheetInstance;
  }
  return null;
}

interface TableDataEditorProps {
  templateName: string;
  templateId: number;
  headers: HeaderColumn[];
  initialData?: Record<string, unknown>[];
  onSave?: (data: Record<string, unknown>[]) => Promise<void>;
  updateTemplateHeaders?: (
    templateId: number,
    headers: {
      key: string;
      name: string;
      type: string;
      description?: string;
    }[],
  ) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  getTablesByTemplate: (templateId: number) => ChunkTableItemType[];
  batchUpdateTableRows: (
    templateId: number,
    data: Record<string, unknown>[],
  ) => Promise<void>;
}

type SaveStatus = "saved" | "saving" | "unsaved";

const MIN_VISIBLE_COLUMNS = 20;
const MIN_VISIBLE_ROWS = 200;
const MAX_SAFE_ROWS = 2000;
const TableDataEditor: React.FC<TableDataEditorProps> = ({
  templateName: _templateName,
  templateId,
  headers,
  initialData = [],
  onSave,
  updateTemplateHeaders,
  onBack: _onBack,
  getTablesByTemplate,
  batchUpdateTableRows,
}) => {
  const [localHeaders, setLocalHeaders] = useState<HeaderColumn[]>(
    headers.length > 0
      ? headers
      : Array.from({ length: MIN_VISIBLE_COLUMNS }, () => ({
          label: "",
          type: "TEXT",
        })),
  );

  const localHeadersRef = useRef(localHeaders);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [hasChanges, setHasChanges] = useState(false);

  const [typeDropdownState, setTypeDropdownState] = useState<{
    isOpen: boolean;
    colIndex: number;
    x: number;
    y: number;
  }>({ isOpen: false, colIndex: -1, x: 0, y: 0 });

  const spreadsheetRef = useRef<unknown>(null);
  const worksheetInstanceRef = useRef<WorksheetInstance | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isHydratingRef = useRef(false);
  const [draftRowCount, setDraftRowCount] = useState(0);
  const [tableHeight, setTableHeight] = useState(0);

  const [isClient, setIsClient] = useState(false);
  const [SpreadsheetComponent, setSpreadsheetComponent] =
    useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [WorksheetComponent, setWorksheetComponent] =
    useState<React.ComponentType<Record<string, unknown>> | null>(null);

  const [worksheetKey, setWorksheetKey] = useState(0);
  const [worksheetData, setWorksheetData] = useState<any[][]>([]);

  void _templateName;
  void _onBack;

  const getColumnName = useCallback((index: number) => {
    let dividend = index + 1;
    let columnName = "";
    while (dividend > 0) {
      const modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }
    return columnName;
  }, []);

  const syncBadges = useCallback(() => {
    if (!containerRef.current) return;
    const firstRowCells = containerRef.current.querySelectorAll(
      ".jss_worksheet tbody tr:first-child td",
    );
    firstRowCells.forEach((td, i) => {
      if (td.classList.contains("jss_row")) return;
      const colIndex =
        i - (td.parentElement?.querySelector(".jss_row") ? 1 : 0);
      if (colIndex < 0) return;
      const type = localHeadersRef.current[colIndex]?.type || "TEXT";
      td.setAttribute("data-type", type);
      td.classList.add("header-cell-with-type");
    });
  }, []);

  useEffect(() => {
    localHeadersRef.current = localHeaders;
    syncBadges();
  }, [localHeaders, syncBadges]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new MutationObserver(() => syncBadges());
    observer.observe(containerRef.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [syncBadges]);

  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const updateHeight = () => {
      setTableHeight(Math.max(element.clientHeight, 200));
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const getWorksheetInstance = useCallback(() => {
    return (
      worksheetInstanceRef.current ??
      normalizeWorksheetInstance(spreadsheetRef.current)
    );
  }, []);

  const getGridFromWorksheet = useCallback((): any[][] | null => {
    const instance = getWorksheetInstance();
    if (!instance) return null;
    try {
      const grid = instance.getData();
      return Array.isArray(grid) ? (grid as unknown as any[][]) : null;
    } catch {
      return null;
    }
  }, [getWorksheetInstance]);

  const validateAndCastGrid = useCallback(
    (grid: any[][]) => {
      const nameRow = (grid?.[0] ?? []).map((v, i) => {
        const raw = String(v ?? "").trim();
        const type = localHeadersRef.current[i]?.type || "TEXT";
        const prevLabel = localHeadersRef.current[i]?.label || "";
        const isBoolHeader =
          type === "BOOLEAN" &&
          (raw.toLowerCase() === "true" || raw.toLowerCase() === "false");
        if (isBoolHeader && prevLabel && prevLabel !== raw) {
          return prevLabel;
        }
        return raw;
      });
      const updatedHeaders: HeaderColumn[] = nameRow.map((name, i) => {
        const type = localHeadersRef.current[i]?.type || "TEXT";
        return {
          label: name,
          key: headers.find((o) => o.label === name)?.key || name,
          type: type,
        };
      });

      // 項目名重複チェック
      const usedNames = new Set<string>();
      for (const name of nameRow) {
        if (!name) continue;
        if (usedNames.has(name))
          throw new Error(`項目名「${name}」が重複しています。`);
        usedNames.add(name);
      }

      const rawRows = (grid ?? []).slice(1);
      const records: Record<string, unknown>[] = [];
      const errors: string[] = [];

      rawRows.forEach((row, rowIndex) => {
        const cells = Array.isArray(row) ? row : [];
        // 全セル空の行はスキップ
        if (cells.every((v) => String(v ?? "").trim() === "")) return;

        const rowData: Record<string, unknown> = {};
        for (let i = 0; i < updatedHeaders.length; i++) {
          const h = updatedHeaders[i] ?? { label: "", key: "", type: "TEXT" };
          const key = h.key || h.label;
          if (!key.trim()) continue;

          const rawVal = String(cells[i] ?? "").trim();
          if (rawVal === "") {
            rowData[key] = null;
            continue;
          }

          if (h.type === "NUMBER") {
            const num = Number(rawVal);
            if (isNaN(num)) {
              errors.push(
                `${rowIndex + 2}行目 ${getColumnName(i)}列: 「${rawVal}」は数値ではありません。`,
              );
            }
            rowData[key] = num;
          } else if (h.type === "BOOLEAN") {
            const low = String(rawVal).toLowerCase();
            const isTrue =
              low === "true" || low === "1" || low === "yes" || low === "on";
            const isFalse =
              low === "false" || low === "0" || low === "no" || low === "off";
            if (!isTrue && !isFalse) {
              errors.push(
                `${rowIndex + 2}行目 ${getColumnName(i)}列: 「${rawVal}」は真偽値(0/1)ではありません。`,
              );
            }
            rowData[key] = isTrue ? 1 : 0;
          } else if (h.type === "DATE") {
            const date = new Date(rawVal);
            if (isNaN(date.getTime())) {
              errors.push(
                `${rowIndex + 2}行目 ${getColumnName(i)}列: 「${rawVal}」は正しい日付形式ではありません。`,
              );
            }
            rowData[key] = rawVal;
          } else {
            rowData[key] = rawVal;
          }
        }
        records.push(rowData);
      });

      if (errors.length > 0) {
        throw new Error(
          "型エラーが見つかりました:\n" +
            errors.slice(0, 5).join("\n") +
            (errors.length > 5 ? `\nほか${errors.length - 5}件` : ""),
        );
      }

      if (records.length > 0 && !nameRow.some((n) => n !== "")) {
        throw new Error(
          "データが入力されていますが、1行目（項目名）がすべて空です。",
        );
      }

      return { headers: updatedHeaders, records };
    },
    [headers, getColumnName],
  );

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;
    setSaveStatus("saving");
    try {
      const grid = getGridFromWorksheet();
      if (!grid) throw new Error("データの取得に失敗しました。");

      const { records, headers: updatedHeaders } = validateAndCastGrid(grid);

      if (updateTemplateHeaders) {
        await updateTemplateHeaders(
          templateId,
          updatedHeaders.map((h) => ({
            key: h.key || h.label,
            name: h.label,
            type: h.type || "TEXT",
          })),
        );
      }

      await batchUpdateTableRows(templateId, records);
      if (onSave) await onSave(records);

      setSaveStatus("saved");
      setHasChanges(false);
      showSuccessToast("データを保存しました。");
    } catch (error: unknown) {
      setSaveStatus("unsaved");
      handleErrorWithUI(error, "データ保存");
    }
  }, [
    hasChanges,
    templateId,
    batchUpdateTableRows,
    onSave,
    getGridFromWorksheet,
    validateAndCastGrid,
    updateTemplateHeaders,
  ]);

  const convertToWorksheetData = useCallback(
    (rows: Record<string, unknown>[], fallbackHeaders: HeaderColumn[]) => {
      const nameRow = fallbackHeaders.map((h) => h.label);
      const grid: any[][] = [nameRow];
      rows.slice(0, MAX_SAFE_ROWS).forEach((rowData) => {
        grid.push(
          fallbackHeaders.map((h) => {
            const val = rowData[h.key || h.label];
            if (val === null || val === undefined) return "";
            if (h.type === "BOOLEAN") {
              if (typeof val === "boolean") return val ? 1 : 0;
              const low = String(val).toLowerCase();
              return low === "true" ||
                low === "1" ||
                low === "yes" ||
                low === "on"
                ? 1
                : 0;
            }
            if (h.type === "NUMBER") {
              const num = Number(val);
              return isNaN(num) ? String(val) : num;
            }
            return String(val);
          }),
        );
      });
      while (grid.length < MIN_VISIBLE_ROWS + 1)
        grid.push(Array.from({ length: nameRow.length }, () => ""));
      return grid;
    },
    [],
  );

  useEffect(() => {
    const existing = getTablesByTemplate(templateId);
    let allData: Record<string, unknown>[] = [];
    if (existing.length > 0) {
      existing
        .sort((a, b) => (a.colIndex || 0) - (b.colIndex || 0))
        .forEach((t) => {
          if (Array.isArray(t.chunkContent)) {
            allData.push(...(t.chunkContent as Record<string, unknown>[]));
          }
        });
    } else {
      allData = initialData;
    }
    setHasChanges(false);
    setSaveStatus("saved");
    setWorksheetData(convertToWorksheetData(allData, headers));
    setDraftRowCount(allData.length);
    isHydratingRef.current = true;
    setWorksheetKey((k) => k + 1);
    setTimeout(() => {
      isHydratingRef.current = false;
      syncBadges();
    }, 500);
  }, [
    templateId,
    initialData,
    headers,
    getTablesByTemplate,
    convertToWorksheetData,
    syncBadges,
  ]);

  useEffect(() => {
    setIsClient(true);
    import("@jspreadsheet-ce/react").then(
      ({ Spreadsheet, Worksheet, jspreadsheet }) => {
        if (jspreadsheet && typeof jspreadsheet.setDictionary === "function") {
          jspreadsheet.setDictionary(JSPREADSHEET_JA_DICTIONARY);
        }
        setSpreadsheetComponent(() => Spreadsheet);
        setWorksheetComponent(() => Worksheet);
      },
    );
  }, []);

  const columns = useMemo(() => {
    return Array.from(
      { length: Math.max(localHeaders.length, MIN_VISIBLE_COLUMNS) },
      (_, i) => {
        const h = localHeaders[i];
        let type: any = "text";
        if (h?.type === "NUMBER") type = "numeric";
        else if (h?.type === "DATE") type = "calendar";
        else if (h?.type === "BOOLEAN") type = "checkbox";
        return { type, width: 140 };
      },
    );
  }, [localHeaders]);

  const cells = useCallback(
    (
      instance: WorksheetInstance,
      _cell: HTMLTableCellElement,
      x: string | number | null,
      y: string | number | null,
    ) => {
      if (x === null || y === null) return undefined;
      const colIndex = typeof x === "string" ? parseInt(x, 10) : Number(x);
      const rowIndex = typeof y === "string" ? parseInt(y, 10) : Number(y);

      if (Number.isNaN(colIndex) || Number.isNaN(rowIndex)) return undefined;

      // 1行目（項目名）は常にテキスト入力を強制し、レンダラーでチェックボックス化を阻害する
      if (rowIndex === 0) {
        return {
          type: "text",
          renderer: (cell: HTMLElement, value: any) => {
            cell.innerHTML = value || "";
            cell.classList.remove("jss_checkbox");
            // チェックボックスのイベントを止める
            cell.onclick = null;
            return value;
          },
        };
      }

      return undefined;
    },
    [],
  );

  const handleKeyDown = useCallback(
    (
      instance: WorksheetInstance,
      element: HTMLTableCellElement,
      event: KeyboardEvent,
    ) => {
      // 1行目（項目名）のセルの場合は、チェックボックス等の特殊挙動を制限しテキスト入力を優先する
      const selected = instance.selectedCell;
      if (selected && selected[1] === 0) {
        // 1行目でのEnterキーや文字入力で正しくエディタが開くようにする
        if (
          event.key === "Enter" ||
          (event.key.length === 1 && !event.ctrlKey && !event.metaKey)
        ) {
          if (instance && typeof instance.openEditor === "function") {
            instance.openEditor(element, event.key !== "Enter");
          }
        }
      }

      if (event.key === " ") {
        // スペースキーで編集モードに入るときに中身を消さないようにする
        if (instance && typeof instance.openEditor === "function") {
          // elementが渡されない場合は現在の選択セルを使用する
          let targetElement = element;
          if (!targetElement && instance.selectedCell) {
            const [x, y] = instance.selectedCell as [
              number,
              number,
              number,
              number,
            ];
            targetElement = instance.getCellFromCoords(x, y);
          }

          if (targetElement) {
            instance.openEditor(targetElement, false);
            event.preventDefault();
          }
        }
      }
    },
    [],
  );

  const handleContextMenu = useCallback(
    (
      instance: WorksheetInstance,
      x: string | number | null,
      _y: string | number | null,
      _e: PointerEvent,
      items: ContextMenuItem[],
      role: ContextMenuRole,
    ) => {
      // セル上での右クリック時に列操作メニューがない場合は追加する
      const hasColumnInsert = items.some(
        (item) =>
          item.title === "Insert a new column before" ||
          item.title === "左に列を挿入",
      );

      if (!hasColumnInsert && (role === "cell" || role === "header")) {
        const colIndex = x !== null ? parseInt(x.toString()) : 0;
        const columnItems: ContextMenuItem[] = [
          {
            title: "Insert a new column before",
            onclick: () => instance.insertColumn(1, colIndex, true),
          },
          {
            title: "Insert a new column after",
            onclick: () => instance.insertColumn(1, colIndex, false),
          },
          {
            title: "Delete selected columns",
            onclick: () => instance.deleteColumn(colIndex, 1),
          },
          { type: "line", title: "" },
        ];
        // メニューの先頭に追加
        items.unshift(...columnItems);
      }

      return items
        .map((item) => {
          const title = item.title ?? "";
          const translatedTitle = title
            ? CONTEXT_MENU_EN_TO_JA[title]
            : undefined;
          if (translatedTitle) {
            item.title = translatedTitle;
          }
          if (item.submenu) {
            item.submenu = item.submenu.map((sub) => {
              const subTitle = sub.title ?? "";
              const translatedSubTitle = subTitle
                ? CONTEXT_MENU_EN_TO_JA[subTitle]
                : undefined;
              if (translatedSubTitle) {
                sub.title = translatedSubTitle;
              }
              return sub;
            });
          }
          return item;
        })
        .filter((item) =>
          item.title ? !HIDDEN_CONTEXT_MENU_TITLES.has(item.title) : true,
        );
    },
    [],
  );

  const handleUpdateColumnType = useCallback((col: number, type: string) => {
    setLocalHeaders((prev) => {
      const next = [...prev];
      next[col] = { ...(next[col] || { label: "" }), type };
      return next;
    });

    setWorksheetData((prevData) => {
      if (!prevData || prevData.length === 0) return prevData;
      const updatedGrid = prevData.map((row, rowIndex) => {
        if (rowIndex === 0) return row; // ヘッダー行はそのまま
        const newRow = [...row];
        const val = row[col];
        if (val === null || val === undefined || String(val).trim() === "") {
          newRow[col] = type === "BOOLEAN" ? 0 : "";
        } else if (type === "BOOLEAN") {
          const low = String(val).toLowerCase();
          newRow[col] =
            low === "true" || low === "1" || low === "yes" || low === "on"
              ? 1
              : 0;
        } else if (type === "NUMBER") {
          const num = Number(val);
          newRow[col] = isNaN(num) ? val : num;
        } else {
          newRow[col] = String(val);
        }
        return newRow;
      });
      return updatedGrid;
    });

    setHasChanges(true);
    setSaveStatus("unsaved");
    setTypeDropdownState((s) => ({ ...s, isOpen: false }));
    // Worksheetを強制再レンダリングして新しい型設定（checkbox等）を適用する
    setWorksheetKey((k) => k + 1);
  }, []);

  const handleTableClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const td = target.closest("td");
    if (!td || !td.parentElement) return;
    const isFirstRow =
      td.parentElement === td.parentElement.parentElement?.firstElementChild;
    if (!isFirstRow) return;
    const rect = td.getBoundingClientRect();
    const isBottomRight =
      e.clientX > rect.right - 50 && e.clientY > rect.bottom - 25;
    if (isBottomRight) {
      const colIndex = Array.from(td.parentElement.children).indexOf(td) - 1;
      if (colIndex >= 0) {
        e.preventDefault();
        e.stopPropagation();
        setTypeDropdownState({
          isOpen: true,
          colIndex,
          x: e.clientX,
          y: e.clientY,
        });
      }
    }
  }, []);

  const Spreadsheet = SpreadsheetComponent;
  const Worksheet = WorksheetComponent;

  return (
    <div
      className="h-full flex flex-col relative"
      onMouseDown={handleTableClick}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        /* Google Sheets Theme for Jspreadsheet */
        .jss_container {
          font-family: 'Roboto', 'Segoe UI', Tahoma, sans-serif !important;
          background-color: #fff;
        }
        
        /* Grid and Cells */
        .jss {
          border-collapse: separate;
          border-spacing: 0;
          border: 1px solid #ccc;
        }
        
        .jss td {
          border-right: 1px solid #e2e3e3 !important;
          border-bottom: 1px solid #e2e3e3 !important;
          padding: 4px 8px !important;
          font-size: 13px;
          color: #3c4043;
          height: 25px !important;
        }

        /* Headers (A, B, C / 1, 2, 3) */
        .jss thead td, .jss_row {
          background-color: #f8f9fa !important;
          color: #5f6368 !important;
          text-align: center !important;
          font-weight: 400 !important;
          border-right: 1px solid #c0c0c0 !important;
          border-bottom: 1px solid #c0c0c0 !important;
          cursor: pointer;
          font-size: 12px !important;
          transition: background-color 0.1s;
        }

        .jss thead td:hover, .jss_row:hover {
          background-color: #f1f3f4 !important;
          color: #202124 !important;
        }

        /* Active Header Styling */
        .jss thead td.highlight, .jss_row.highlight {
          background-color: #e8f0fe !important;
          color: #1a73e8 !important;
          position: relative;
        }

        .jss thead td.highlight::after {
          content: "";
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #1a73e8;
        }

        .jss_row.highlight::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          width: 2px;
          background-color: #1a73e8;
        }

        /* Selection */
        .jss_selection {
          background-color: rgba(26, 115, 232, 0.1) !important;
          border: 2px solid #1a73e8 !important;
          z-index: 5;
        }

        .jss_selection_handle {
          width: 6px !important;
          height: 6px !important;
          background-color: #1a73e8 !important;
          border: 1px solid #fff !important;
          right: -4px !important;
          bottom: -4px !important;
          cursor: crosshair;
        }

        /* 1st Row (Item Names) */
        .jss_worksheet tbody tr:first-child td {
          background-color: #ffffff !important;
          font-weight: bold !important;
          color: #1a73e8 !important;
          border-bottom: 2px solid #1a73e8 !important;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .header-cell-with-type::after {
          content: attr(data-type);
          position: absolute;
          right: 4px;
          top: 4px;
          background: #e8f0fe;
          color: #1a73e8;
          font-size: 10px;
          font-weight: normal;
          padding: 1px 4px;
          border-radius: 4px;
          line-height: 1;
          pointer-events: none;
          z-index: 20;
          border: 1px solid #d2e3fc;
        }

        /* Context Menu */
        .jcontextmenu {
          background-color: #fff !important;
          box-shadow: 0 2px 6px 2px rgba(60,64,67,.15) !important;
          border-radius: 4px !important;
          border: none !important;
          padding: 6px 0 !important;
        }

        .jcontextmenu > div {
          padding: 6px 24px !important;
          font-size: 14px !important;
          color: #3c4043 !important;
        }

        .jcontextmenu > div:hover {
          background-color: #f1f3f4 !important;
        }

        /* Scrollbars */
        .jss_content::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .jss_content::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .jss_content::-webkit-scrollbar-thumb {
          background: #ccc;
          border: 3px solid #f1f1f1;
          border-radius: 10px;
        }
        .jss_content::-webkit-scrollbar-thumb:hover {
          background: #999;
        }

        /* Scrollable container fix */
        .jss_container {
          height: 100% !important;
          width: 100% !important;
          display: flex;
          flex-direction: column;
        }
        .jss_content {
          flex: 1;
          overflow: auto !important;
        }
      `,
        }}
      />

      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500 font-medium">
            {draftRowCount} 行のデータ
          </p>
          <Chip
            size="sm"
            variant="flat"
            color="primary"
            className="font-medium"
          >
            1行目: 項目名 / 右下をクリックで型変更
          </Chip>
        </div>
        <div className="flex items-center gap-3">
          <Chip
            color={hasChanges ? "warning" : "success"}
            variant="flat"
            size="sm"
            className="font-medium"
          >
            {hasChanges ? "未保存の変更あり" : "保存済み"}
          </Chip>
          <Button
            size="sm"
            color="primary"
            onPress={handleSave}
            isDisabled={!hasChanges}
            isLoading={saveStatus === "saving"}
            className="font-bold px-6"
          >
            保存
          </Button>
        </div>
      </div>

      <Card className="flex-1 min-h-0 border-none shadow-sm">
        <CardBody className="p-0 flex-1 relative overflow-hidden">
          <div ref={containerRef} className="h-full w-full">
            {!isClient || !Spreadsheet || !Worksheet ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                スプレッドシートを起動中...
              </div>
            ) : (
              <Spreadsheet
                ref={spreadsheetRef}
                tabs={false}
                toolbar={false}
                about={false}
                style={{ width: "100%", height: "100%" }}
                onafterchanges={() => {
                  setHasChanges(true);
                  setSaveStatus("unsaved");
                }}
                contextMenu={handleContextMenu}
              >
                <Worksheet
                  key={worksheetKey}
                  data={worksheetData}
                  columns={columns}
                  cells={cells}
                  columnHeaders={true}
                  columnResize={true}
                  columnDrag={true}
                  rowResize={true}
                  rowDrag={true}
                  tableOverflow={true}
                  tableHeight={tableHeight > 0 ? tableHeight : undefined}
                  tableWidth="100%"
                  allowInsertColumn={true}
                  allowDeleteColumn={true}
                  allowInsertRow={true}
                  allowDeleteRow={true}
                  minDimensions={[columns.length, worksheetData.length]}
                  onkeydown={handleKeyDown}
                />
              </Spreadsheet>
            )}

            <div
              style={{
                position: "fixed",
                left: typeDropdownState.x,
                top: typeDropdownState.y,
                zIndex: 10000,
              }}
            >
              <Dropdown
                isOpen={typeDropdownState.isOpen}
                onOpenChange={(o) =>
                  !o && setTypeDropdownState((s) => ({ ...s, isOpen: false }))
                }
              >
                <DropdownTrigger>
                  <div className="w-0 h-0" />
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="型選択"
                  onAction={(k) =>
                    handleUpdateColumnType(
                      typeDropdownState.colIndex,
                      k as string,
                    )
                  }
                >
                  {Object.values(ColumnDataTypeEnum.enum).map((t) => (
                    <DropdownItem
                      key={t}
                      description={
                        t === "TEXT"
                          ? "文字列"
                          : t === "NUMBER"
                            ? "数値"
                            : t === "DATE"
                              ? "日付"
                              : "真偽値"
                      }
                    >
                      {t}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default TableDataEditor;
