// components/dialer/KpiCard.tsx
"use client";

import { Card, CardBody } from "@heroui/react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: "primary" | "success" | "warning" | "danger" | "default";
}

const COLOR_MAP = {
  primary: "text-primary-600",
  success: "text-green-600",
  warning: "text-amber-600",
  danger: "text-red-600",
  default: "text-gray-600",
} as const;

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "default",
}: KpiCardProps) {
  return (
    <Card shadow="sm">
      <CardBody className="flex flex-row items-center gap-4 p-4">
        {icon && (
          <div className={`rounded-lg bg-gray-100 p-3 ${COLOR_MAP[color]}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className={`text-2xl font-bold mt-1 ${COLOR_MAP[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <p
              className={`text-xs mt-1 ${trend.value >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
