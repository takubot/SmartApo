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
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  subtitle?: string;
}) {
  return (
    <Card className="h-full border border-default-200">
      <CardBody className="p-3 text-center">
        <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
        <h3 className="text-xs font-medium text-default-600 mb-0.5">{title}</h3>
        <p className="text-base font-bold text-foreground mb-0.5">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-[10px] text-default-400">{subtitle}</p>}
      </CardBody>
    </Card>
  );
}

export default function StatsCards({
  stats,
  data,
}: {
  stats: DashboardStatsResponseType;
  data?: DashboardDataResponseType;
}) {
  const totalChats = stats.totalChats;
  const totalUsers = stats.totalUsers;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      <MetricsCard
        title="総チャット数"
        value={totalChats}
        icon={MessageSquare}
        gradient={COLORS.gradientBlue}
        subtitle={`今日: ${stats.chatsToday}件`}
      />
      <MetricsCard
        title="アクティブユーザー"
        value={totalUsers}
        icon={Users}
        gradient={COLORS.gradientGreen}
        subtitle={`今日: ${stats.activeUsersToday}人`}
      />
      <MetricsCard
        title="ボット数"
        value={stats.totalBots}
        icon={Bot}
        gradient={COLORS.gradientPurple}
        subtitle="運用中のボット"
      />
    </div>
  );
}
