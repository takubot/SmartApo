// components/dialer/EmptyState.tsx
"use client";

import { Button } from "@heroui/react";
import { Inbox, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

interface EmptyStateProps {
  title: string;
  description?: string;
  createHref?: string;
  createLabel?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  createHref,
  createLabel = "新規作成",
  icon,
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">
        {icon || <Inbox size={48} />}
      </div>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 mt-1 max-w-md">{description}</p>
      )}
      {createHref && (
        <Button
          color="primary"
          variant="flat"
          startContent={<Plus size={16} />}
          className="mt-4"
          onPress={() => router.push(createHref)}
        >
          {createLabel}
        </Button>
      )}
    </div>
  );
}
