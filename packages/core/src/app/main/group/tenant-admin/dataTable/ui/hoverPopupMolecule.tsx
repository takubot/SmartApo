"use client";

import React from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Button } from "@heroui/react";

type PopupContent = React.ReactNode | string | Date;

interface HoverPopupProps {
  content: PopupContent;
  children: React.ReactNode;
}

export default function HoverPopupMolecule({
  content,
  children,
}: HoverPopupProps) {
  // 日時コンテンツかどうかをフォーマット
  const formatContent = (value: PopupContent): React.ReactNode => {
    if (React.isValidElement(value)) {
      return value;
    }
    if (typeof value !== "string" && !(value instanceof Date)) {
      return value;
    }
    if (value instanceof Date) {
      return formatDate(value);
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatDate(date);
    }

    return value;
  };

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    };
    return date.toLocaleDateString("ja-JP", options);
  };

  return (
    <Popover placement="top" showArrow={true}>
      <PopoverTrigger>
        <Button variant="light" className="p-0 min-w-0 h-auto bg-transparent">
          {children}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="px-1 py-2">
          <div className="text-small" role="tooltip">
            {formatContent(content)}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
