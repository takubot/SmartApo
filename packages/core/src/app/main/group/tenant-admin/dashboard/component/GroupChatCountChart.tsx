"use client";

import React, { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import { Users } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { TenantGroupChatCountItemType } from "@repo/api-contracts/based_template/zschema";

const COLORS = {
  primary: "#3B82F6",
};

interface GroupChatCountChartProps {
  data: TenantGroupChatCountItemType[];
  isLoading?: boolean;
}

export default function GroupChatCountChart({
  data,
  isLoading = false,
}: GroupChatCountChartProps) {
  // チャート用データに変換（メモ化）
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }
    return data.slice(0, 15).map((group) => ({
      name:
        group.groupName && group.groupName.length > 20
          ? `${group.groupName.slice(0, 20)}...`
          : group.groupName || `グループ ${group.groupId}`,
      chats: group.chatCount || 0,
    }));
  }, [data]);

  // ローディング状態
  if (isLoading) {
    return (
      <Card className="col-span-6 row-span-2 border border-default-200 flex flex-col min-h-0">
        <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
        </CardBody>
      </Card>
    );
  }

  // データがない場合
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="col-span-6 row-span-2 border border-default-200 flex flex-col min-h-0">
        <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
          <h3 className="text-[10px] font-bold text-default-800 mb-1.5 flex items-center gap-1 flex-shrink-0">
            <Users className="w-3 h-3 text-primary" />
            グループごとのチャット数
          </h3>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="text-center">
              <Users className="w-6 h-6 mx-auto mb-1 text-default-300" />
              <p className="text-[10px] text-default-500">データがありません</p>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  // チャート表示
  return (
    <Card className="col-span-6 row-span-2 border border-default-200 flex flex-col min-h-0">
      <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
        <h3 className="text-[10px] font-bold text-default-800 mb-1.5 flex items-center gap-1 flex-shrink-0">
          <Users className="w-3 h-3 text-primary" />
          グループごとのチャット数
        </h3>
        <div
          className="flex-1 w-full min-h-0 relative overflow-hidden"
          style={{ minHeight: 0 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
              barCategoryGap="10%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 8, fill: "#6b7280" }}
                stroke="#9ca3af"
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 7, fill: "#6b7280" }}
                stroke="#9ca3af"
                width={100}
                interval={0}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "9px",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: number) => [`${value}件`, "チャット数"]}
                labelStyle={{
                  fontWeight: 600,
                  marginBottom: "3px",
                  fontSize: "9px",
                }}
              />
              <Bar
                dataKey="chats"
                fill={COLORS.primary}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
}
