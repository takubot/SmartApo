"use client";

import { useGroupContext } from "../../layout-client";
import {
  Card,
  CardBody,
  Button,
  Spinner,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { FileText, Plus, Trash2, Edit3, ClipboardList } from "lucide-react";
import useSWR from "swr";
import {
  list_custom_forms_v2_custom_form_list__group_id__get,
  delete_custom_form_v2_custom_form_delete__custom_form_id__delete,
} from "@repo/api-contracts/based_template/service";
import { showSuccessToast, handleErrorWithUI } from "@common/errorHandler";
import { useRouter } from "next/navigation";

export function CustomFormListContainer() {
  const groupId = useGroupContext();
  const router = useRouter();

  // カスタムフォーム一覧取得
  const {
    data: formsData,
    isLoading: isFormsLoading,
    mutate: mutateForms,
  } = useSWR(groupId ? `custom-forms-${groupId}` : null, () =>
    list_custom_forms_v2_custom_form_list__group_id__get(groupId!),
  );

  const forms = formsData?.formList || [];

  const handleOpenCreate = () => {
    router.push(`/main/${groupId}/customForm/create`);
  };

  const handleOpenEdit = (formId: number) => {
    router.push(`/main/${groupId}/customForm/${formId}/edit`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このフォームを削除してもよろしいですか？")) return;

    try {
      await delete_custom_form_v2_custom_form_delete__custom_form_id__delete(
        id.toString(),
      );
      showSuccessToast("フォームを削除しました");
      mutateForms();
    } catch (error) {
      handleErrorWithUI(error, "フォーム削除");
    }
  };

  return (
    <div className="flex flex-col h-full bg-default-50/30 overflow-hidden">
      <header className="px-4 py-2 border-b border-divider bg-white flex items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-foreground">
            カスタムフォーム管理
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            color="primary"
            size="sm"
            radius="md"
            className="font-bold h-8 px-3"
            startContent={<Plus size={16} strokeWidth={3} />}
            onPress={handleOpenCreate}
          >
            新規フォーム作成
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Card className="border border-divider shadow-none">
          <CardBody>
            {isFormsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner label="読み込み中..." />
              </div>
            ) : forms.length === 0 ? (
              <div className="text-center py-20">
                <ClipboardList
                  size={48}
                  className="mx-auto mb-4 text-default-300"
                />
                <p className="text-default-500">
                  フォームが登録されていません。
                </p>
                <Button
                  variant="light"
                  color="primary"
                  className="mt-2"
                  onPress={handleOpenCreate}
                >
                  最初のフォームを作成する
                </Button>
              </div>
            ) : (
              <Table aria-label="Custom forms table" removeWrapper>
                <TableHeader>
                  <TableColumn>フォーム名</TableColumn>
                  <TableColumn>説明</TableColumn>
                  <TableColumn>タグルール</TableColumn>
                  <TableColumn align="center">操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {forms.map((form: any) => (
                    <TableRow key={form.customFormId}>
                      <TableCell className="font-medium">
                        {form.formName}
                      </TableCell>
                      <TableCell>
                        <p className="truncate max-w-xs text-default-500">
                          {form.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Chip size="sm" color="secondary" variant="flat">
                          {(form.tagRules?.length ?? 0).toString()} 件
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onPress={() => handleOpenEdit(form.customFormId)}
                          >
                            <Edit3 size={16} className="text-default-400" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            onPress={() => handleDelete(form.customFormId)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
