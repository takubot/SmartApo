"use client";

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tooltip,
  Checkbox,
} from "@heroui/react";
import {
  HashtagIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { CategoryResponseSchemaType } from "@repo/api-contracts/based_template/zschema";

type CategoryListProps = {
  categories: CategoryResponseSchemaType[];
  isMultiSelectMode: boolean;
  selectedCategoryIds: Set<number>;
  onToggleSelect: (categoryId: number, checked: boolean) => void;
  onOpenEdit: (category: CategoryResponseSchemaType) => void;
  onOpenDelete: (category: CategoryResponseSchemaType) => void;
};

export function CategoryList({
  categories,
  isMultiSelectMode,
  selectedCategoryIds,
  onToggleSelect,
  onOpenEdit,
  onOpenDelete,
}: CategoryListProps) {
  return (
    <div className="overflow-x-auto">
      <Table
        aria-label="カテゴリー一覧"
        classNames={{
          wrapper: "min-h-[400px]",
          table: "min-w-[600px]",
        }}
      >
        <TableHeader>
          {[
            ...(isMultiSelectMode
              ? [<TableColumn key="select">選択</TableColumn>]
              : []),
            <TableColumn key="name">カテゴリー名</TableColumn>,
            <TableColumn key="actions">操作</TableColumn>,
          ]}
        </TableHeader>
        <TableBody emptyContent="カテゴリーがありません">
          {categories.map((category) => (
            <TableRow key={category.categoryId}>
              {[
                ...(isMultiSelectMode
                  ? [
                      <TableCell key="select">
                        <Checkbox
                          isSelected={selectedCategoryIds.has(
                            category.categoryId,
                          )}
                          onValueChange={(checked) =>
                            onToggleSelect(category.categoryId, !!checked)
                          }
                          aria-label="select category"
                        />
                      </TableCell>,
                    ]
                  : []),
                <TableCell key="name">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 gradient-primary-light rounded-full flex items-center justify-center shadow-sm">
                      <HashtagIcon className="w-4 h-4 text-primary-700" />
                    </div>
                    <span className="font-medium">{category.categoryName}</span>
                  </div>
                </TableCell>,
                <TableCell key="actions">
                  <div className="flex gap-1 justify-end">
                    <Tooltip content="編集">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="solid"
                        color="primary"
                        onPress={() => onOpenEdit(category)}
                        className="gradient-primary hover:gradient-primary-hover shadow-sm"
                      >
                        <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="削除">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="solid"
                        color="danger"
                        onPress={() => onOpenDelete(category)}
                        className="shadow-sm"
                      >
                        <TrashIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </Tooltip>
                  </div>
                </TableCell>,
              ]}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default CategoryList;
