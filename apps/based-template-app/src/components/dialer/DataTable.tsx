// components/dialer/DataTable.tsx
"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Spinner,
} from "@heroui/react";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  align?: "start" | "center" | "end";
  width?: number;
}

interface DataTableProps<T extends { id?: string }> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCreateHref?: string;
}

export default function DataTable<T extends { id?: string }>({
  columns,
  data,
  isLoading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  emptyTitle = "データがありません",
  emptyDescription,
  emptyCreateHref,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        createHref={emptyCreateHref}
      />
    );
  }

  return (
    <div>
      <Table
        aria-label="data table"
        selectionMode={onRowClick ? "single" : "none"}
        onRowAction={(key) => {
          if (!onRowClick) return;
          const item = data.find((d) => d.id === String(key));
          if (item) onRowClick(item);
        }}
      >
        <TableHeader>
          {columns.map((col) => (
            <TableColumn
              key={col.key}
              align={col.align}
              width={col.width}
            >
              {col.label}
            </TableColumn>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow key={item.id ?? idx} className={onRowClick ? "cursor-pointer" : ""}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && onPageChange && (
        <div className="flex justify-center mt-4">
          <Pagination
            total={totalPages}
            page={page}
            onChange={onPageChange}
            showControls
          />
        </div>
      )}
    </div>
  );
}
