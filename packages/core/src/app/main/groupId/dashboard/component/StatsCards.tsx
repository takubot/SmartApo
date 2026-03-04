"use client";

import { Card, CardBody } from "@heroui/react";
import { Bot, MessageSquare, Users } from "lucide-react";
import React from "react";

import type {
  DashboardDataResponseType,
  DashboardStatsResponseType,
} from "@repo/api-contracts/based_template/zschema";

const COLORS = {
  gradientBlue: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
  gradientGreen: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  gradientPurple: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
};

export function MetricsCard({
  title,
  value,
  icon: Icon,
  gradient,
  subtitle,
  colSpan,
  rowSpan,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  subtitle?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  const colSpanClass =
    colSpan === 4
      ? "col-span-4"
      : colSpan === 6
        ? "col-span-6"
        : colSpan === 3
          ? "col-span-3"
          : "";
  const rowSpanClass =
    rowSpan === 1 ? "row-span-1" : rowSpan === 2 ? "row-span-2" : "";

  return (
    <Card
      className={`h-full border border-default-200 flex flex-col min-h-0 ${colSpanClass} ${rowSpanClass}`}
    >
      <CardBody className="p-2 text-center flex flex-col justify-center flex-1 min-h-0">
        <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
        <div className="text-base font-bold text-primary">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
        <div className="text-[10px] text-default-600">{title}</div>
        {subtitle && (
          <div className="text-[9px] text-default-400 mt-0.5">{subtitle}</div>
        )}
      </CardBody>
    </Card>
  );
}

export default function StatsCards({
  stats,
  data,
  chatEntryId,
}: {
  stats: DashboardStatsResponseType;
  data?: DashboardDataResponseType;
  chatEntryId?: number | null;
}) {
  // 総チャット数/アクティブユーザー数は常にstatsを表示(サーバ側でentryId反映済み)
  const totalChats = stats.totalChats;
  const totalUsers = stats.totalUsers;
  return (
    <>
      <MetricsCard
        title="総チャット数"
        value={totalChats}
        icon={MessageSquare}
        gradient={COLORS.gradientBlue}
        subtitle={`今日: ${stats.chatsToday}件`}
        colSpan={4}
        rowSpan={1}
      />
      <MetricsCard
        title="アクティブユーザー"
        value={totalUsers}
        icon={Users}
        gradient={COLORS.gradientGreen}
        subtitle={`今日: ${stats.activeUsersToday}人`}
        colSpan={4}
        rowSpan={1}
      />
      <MetricsCard
        title="ボット数"
        value={stats.totalBots}
        icon={Bot}
        gradient={COLORS.gradientPurple}
        subtitle="運用中のボット"
        colSpan={4}
        rowSpan={1}
      />
    </>
  );
}
