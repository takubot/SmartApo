"use client";

import React, { Suspense } from "react";
import { TemplateEditor } from "../TemplateEditor";
import { Spinner } from "@heroui/react";

export default function TenantAdminTemplateCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-full">
          <Spinner size="lg" color="primary" />
        </div>
      }
    >
      <TemplateEditor mode="create" />
    </Suspense>
  );
}
