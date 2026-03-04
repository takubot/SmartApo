"use client";

import { useGroupContext } from "../../../layout-client";
import { CustomFormEditorContainer } from "../../components/CustomFormEditorContainer";
import useSWR from "swr";
import { list_custom_forms_v2_custom_form_list__group_id__get } from "@repo/api-contracts/based_template/service";
import { Spinner } from "@heroui/react";
import { useParams } from "next/navigation";

export default function EditCustomFormPage() {
  const { formId } = useParams();
  const groupId = useGroupContext();

  const { data: formsData, isLoading } = useSWR(
    groupId ? `custom-forms-${groupId}` : null,
    () => list_custom_forms_v2_custom_form_list__group_id__get(groupId!),
  );

  const form = formsData?.formList?.find(
    (f: any) => f.customFormId.toString() === formId,
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="読み込み中..." />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>フォームが見つかりません</p>
      </div>
    );
  }

  return <CustomFormEditorContainer initialData={form} isEdit />;
}
