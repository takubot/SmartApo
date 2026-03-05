// components/dialer/PageHeader.tsx
"use client";

import { Button } from "@heroui/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface PageHeaderProps {
  title: string;
  description?: string;
  createHref?: string;
  createLabel?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  createHref,
  createLabel = "新規作成",
  actions,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {createHref && (
          <Button
            color="primary"
            startContent={<Plus size={16} />}
            onPress={() => router.push(createHref)}
          >
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
