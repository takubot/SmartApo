"use client";

import React, { Suspense, useMemo } from "react";
import { useParams } from "next/navigation";
import { TemplateEditor } from "../TemplateEditor";
import { Spinner } from "@heroui/react";

function TemplateEditorWrapper() {
  const params = useParams();
  const templateId = useMemo(() => {
    const raw = params?.templateId;
    const id = typeof raw === "string" ? Number(raw) : Number(raw?.[0]);
    return Number.isFinite(id) ? id : undefined;
  }, [params]);

  return <TemplateEditor mode="edit" templateId={templateId} />;
}

export default function TenantAdminTemplateEditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" color="primary" />
        </div>
      }
    >
      <TemplateEditorWrapper />
    </Suspense>
  );
}
