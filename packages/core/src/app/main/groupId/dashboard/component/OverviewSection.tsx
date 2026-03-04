"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { Activity, FileText, Users } from "lucide-react";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ChatActivityItemType,
  DashboardDataResponseType,
  PopularFileItemType,
} from "@repo/api-contracts/based_template/zschema";

const COLORS = {
  primary: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
};

// カラーパレットは現在未使用。必要になれば再導入する。

export default function OverviewSection({
  data,
  chatEntryId,
}: {
  data: DashboardDataResponseType;
  chatEntryId?: number | null;
}) {
  // chatEntryId が指定されている場合、サーバ側で entryId フィルタ済みのデータが来る前提
  // ここでは追加フィルタ処理は不要
  const {
    chatActivity,
    userActivity,
    popularFiles,
    evaluationRatio,
    evaluationTrend,
  } = data;

  const chartData = chatActivity.map((item: ChatActivityItemType) => ({
    date: new Date(item.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    チャット数: item.chatCount,
    ユーザー数: item.userCount,
  }));

  const evaluationPieData = [
    { name: "GOOD", value: evaluationRatio.goodCount, fill: COLORS.success },
    { name: "BAD", value: evaluationRatio.badCount, fill: COLORS.danger },
    { name: "NONE", value: evaluationRatio.noneCount, fill: "#94a3b8" },
  ];

  const evaluationTrendData = evaluationTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    GOOD: item.goodCount,
    BAD: item.badCount,
  }));

  return (
    <>
      {/* 日別チャット推移 - 左側4カラム、2行 */}
      {chartData.length > 0 ? (
        <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
          <CardHeader className="pb-0.5 px-2 py-1 flex-shrink-0">
            <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              チャット活動推移
            </h3>
          </CardHeader>
          <CardBody className="pt-1 px-2 pb-1.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient id="colorChats" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.success}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.success}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={8} />
                  <YAxis stroke="#9ca3af" fontSize={8} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "9px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="チャット数"
                    stroke={COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorChats)"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="ユーザー数"
                    stroke={COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* 評価比率 - 中央4カラム、2行 */}
      {evaluationRatio ? (
        <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
          <CardHeader className="pb-0.5 px-2 py-1 flex-shrink-0">
            <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              評価比率
            </h3>
          </CardHeader>
          <CardBody className="pt-1 px-2 pb-1.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-3 h-full">
              {/* 左側: 文字説明 */}
              <div className="flex flex-col justify-center gap-2">
                {evaluationPieData.map((entry, index) => {
                  const total = evaluationPieData.reduce(
                    (sum, item) => sum + item.value,
                    0,
                  );
                  const percentage =
                    total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-default-50 rounded border border-default-200"
                    >
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: entry.fill as string }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-default-700 font-semibold text-xs">
                            {entry.name}
                          </span>
                          <span className="text-default-600 font-bold text-xs">
                            {percentage}%
                          </span>
                        </div>
                        <div className="text-default-500 text-[10px] mt-0.5">
                          {entry.value.toLocaleString()}件
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* 右側: 円グラフ */}
              <div className="flex items-center justify-center min-h-0">
                <div
                  className="w-full h-full max-w-full max-h-full"
                  style={{ minHeight: 0 }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={evaluationPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        label={false}
                        labelLine={false}
                      >
                        {evaluationPieData.map((entry, index) => (
                          <Cell
                            key={`eval-cell-${index}`}
                            fill={entry.fill as string}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "9px",
                        }}
                        formatter={(value: number, name: string) => {
                          const total = evaluationPieData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );
                          const percentage =
                            total > 0
                              ? ((value / total) * 100).toFixed(1)
                              : "0";
                          return [`${value}件 (${percentage}%)`, name];
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* 評価推移 - 右側4カラム、2行 */}
      {evaluationTrendData.length > 0 ? (
        <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
          <CardHeader className="pb-0.5 px-2 py-1 flex-shrink-0">
            <h3 className="text-[10px] font-semibold text-foreground flex items-center gap-1">
              <Activity className="w-3 h-3 text-primary" />
              評価推移
            </h3>
          </CardHeader>
          <CardBody className="pt-1 px-2 pb-1.5 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0" style={{ minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={evaluationTrendData}
                  margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                >
                  <defs>
                    <linearGradient id="colorGood" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.success}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.success}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient id="colorBad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS.danger}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS.danger}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={8} />
                  <YAxis stroke="#9ca3af" fontSize={8} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "9px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="GOOD"
                    stroke={COLORS.success}
                    fillOpacity={1}
                    fill="url(#colorGood)"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="BAD"
                    stroke={COLORS.danger}
                    fillOpacity={1}
                    fill="url(#colorBad)"
                    strokeWidth={1.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* 人気カード（ユーザー/ファイル） - 6行目、各6カラム */}
      <Card className="col-span-6 row-span-1 border border-default-200 flex flex-col min-h-0">
        <CardHeader className="pb-1 px-2 py-1.5 flex-shrink-0">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Users className="w-3 h-3 text-primary" />
            アクティブユーザー
          </h3>
        </CardHeader>
        <CardBody className="pt-1.5 px-2 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          {userActivity.length > 0 ? (
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {userActivity.slice(0, 5).map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-1 bg-default-50 rounded"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center mr-1 flex-shrink-0">
                      <span className="text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate text-xs">
                        {user.userName}
                      </p>
                      <p className="text-[10px] text-default-500 truncate">
                        {new Date(user.lastActivity).toLocaleDateString(
                          "ja-JP",
                        )}
                      </p>
                    </div>
                  </div>
                  <Chip
                    color="default"
                    variant="flat"
                    size="sm"
                    className="text-[10px] h-4 ml-1"
                  >
                    {user.chatCount}
                  </Chip>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-default-400 min-h-0">
              <div className="text-center">
                <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">データなし</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="col-span-6 row-span-1 border border-default-200 flex flex-col min-h-0">
        <CardHeader className="pb-1 px-2 py-1.5 flex-shrink-0">
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1">
            <FileText className="w-3 h-3 text-primary" />
            ファイルランキング
          </h3>
        </CardHeader>
        <CardBody className="pt-1.5 px-2 pb-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          {popularFiles.length > 0 ? (
            <div className="space-y-1 overflow-y-auto flex-1 min-h-0">
              {popularFiles
                .slice(0, 5)
                .map((file: PopularFileItemType, index: number) => (
                  <div
                    key={file.fileId}
                    className="flex items-center justify-between p-1 bg-default-50 rounded"
                  >
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-4 h-4 bg-success rounded-full flex items-center justify-center mr-1 flex-shrink-0">
                        <span className="text-[10px] font-bold text-white">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate text-xs">
                          {file.fileName}
                        </p>
                        <p className="text-[10px] text-default-500">
                          {file.fileExtension.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    <Chip
                      color="success"
                      variant="flat"
                      size="sm"
                      className="text-[10px] h-4 ml-1"
                    >
                      {file.usageCount}
                    </Chip>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-default-400 min-h-0">
              <div className="text-center">
                <FileText className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">データなし</p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
}
