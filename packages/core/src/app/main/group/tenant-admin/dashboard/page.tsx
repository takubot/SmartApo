"use client";

import React, { useState, useEffect } from "react";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import {
  RefreshCcw,
  TrendingUp,
  Users,
  MessageSquare,
  Bot,
  FileText,
  Activity,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import useSWR from "swr";
import { auth } from "../../../../../lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { post_tenant_dashboard_data_v2_tenant_config_dashboard_overview_post } from "@repo/api-contracts/based_template/service";
import type {
  TenantDashboardDataResponseType,
  TenantDashboardOverviewRequestType,
} from "@repo/api-contracts/based_template/zschema";
import type { KeywordOverviewType } from "@repo/api-contracts/based_template/zschema";
import { handleErrorWithUI } from "@common/errorHandler";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import KeywordCloud from "./component/KeywordCloud";
import GroupChatCountChart from "./component/GroupChatCountChart";

// カスタムフック: テナントダッシュボードデータ取得
function useTenantDashboardData(isAuthReady: boolean, yearMonth: string) {
  const { data, error, mutate } = useSWR(
    isAuthReady ? [`tenant-dashboard-${yearMonth}`] : null,
    async () => {
      const requestPayload: TenantDashboardOverviewRequestType = {
        yearMonth,
        lightweight: false,
      };
      const response =
        await post_tenant_dashboard_data_v2_tenant_config_dashboard_overview_post(
          requestPayload,
        );
      return response as TenantDashboardDataResponseType;
    },
  );
  return {
    dashboardData: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

const COLORS = {
  primary: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  purple: "#8B5CF6",
};

function EmptyState({
  message,
  description,
  icon: Icon = AlertCircle,
}: {
  message: string;
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <Card className="w-full border-2 border-dashed border-default-200 bg-gradient-to-br from-gray-50 to-gray-100/50">
      <CardBody className="p-8 sm:p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-default-100 flex items-center justify-center">
            <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-default-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-default-700">
              {message}
            </h3>
            {description && (
              <p className="text-sm sm:text-base text-default-500 max-w-md mx-auto">
                {description}
              </p>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function TenantAdminDashboardPage() {
  // Firebase認証状態
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedYearMonth, setSelectedYearMonth] = useState(() =>
    new Date().toISOString().slice(0, 7),
  );

  // Firebase認証状態の監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // ダッシュボードデータ取得（認証完了後に実行）
  const { dashboardData, isLoading, isError, mutate } = useTenantDashboardData(
    authChecked && !!user,
    selectedYearMonth,
  );

  // SWRエラーハンドリング
  useEffect(() => {
    if (isError) {
      handleErrorWithUI(isError, "ダッシュボードデータ取得");
    }
  }, [isError]);

  // リフレッシュハンドラー
  const handleRefresh = React.useCallback(() => {
    mutate();
  }, [mutate]);

  const stats = dashboardData?.stats;
  const chatActivity = dashboardData?.chatActivity || [];
  const evaluationRatio = dashboardData?.evaluationRatio;
  const evaluationTrend = dashboardData?.evaluationTrend || [];
  const keywordOverview = dashboardData?.keywordOverview;
  // グループごとのチャット数
  const groupChatCounts = dashboardData?.groupChatCounts || [];

  const chartData = chatActivity.map((item) => ({
    date: new Date(item.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    チャット数: item.chatCount,
    ユーザー数: item.userCount,
  }));

  const evaluationPieData = evaluationRatio
    ? [
        {
          name: "GOOD",
          value: evaluationRatio.goodCount,
          fill: COLORS.success,
        },
        { name: "BAD", value: evaluationRatio.badCount, fill: COLORS.danger },
        { name: "NONE", value: evaluationRatio.noneCount, fill: "#94a3b8" },
      ]
    : [];

  const evaluationTrendData = evaluationTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    GOOD: item.goodCount,
    BAD: item.badCount,
  }));

  // 認証チェック中
  if (!authChecked) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center overflow-hidden">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardBody className="p-8 text-center">
            <Spinner size="lg" color="primary" className="mx-auto mb-4" />
            <p className="text-default-600 font-medium">認証確認中...</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center p-4 overflow-hidden">
        <EmptyState
          message="ログインが必要です"
          description="このページを表示するにはログインしてください。"
          icon={AlertCircle}
        />
      </div>
    );
  }

  // エラー状態（早期リターンはHooksの後）
  if (isError && !isLoading) {
    return (
      <div className="h-full w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 flex items-center justify-center p-4 overflow-hidden">
        <Card className="max-w-md w-full border-2 border-danger-200 bg-danger-50/50">
          <CardBody className="p-8 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-danger-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-danger-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-danger-700">
                  データの取得に失敗しました
                </h3>
                <p className="text-sm text-danger-600">
                  ダッシュボードデータの読み込み中にエラーが発生しました。
                </p>
              </div>
              <Button
                color="danger"
                variant="flat"
                onPress={handleRefresh}
                startContent={<RefreshCcw className="w-4 h-4" />}
                className="mt-4"
              >
                再試行
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-default-50 overflow-hidden">
      {/* ヘッダーセクション */}
      <div className="flex-shrink-0 bg-white border-b border-default-200 shadow-sm">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-base font-bold text-foreground">
                テナントダッシュボード
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="month"
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="h-8 rounded-md border border-default-200 bg-white px-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                disabled={isLoading}
              />
              <Button
                color="default"
                variant="flat"
                size="sm"
                onPress={handleRefresh}
                startContent={<RefreshCcw className="w-4 h-4" />}
                isLoading={isLoading}
              >
                更新
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ - スクロールなしで全体表示 */}
      <div className="flex-1 overflow-hidden px-2 py-2 min-h-0 max-h-full">
        {/* 3カラム以上のグリッドレイアウト - 全幅使用 */}
        <div
          className="h-full grid grid-cols-12 gap-2 min-h-0"
          style={{
            gridTemplateRows: "repeat(6, minmax(0, 1fr))",
            gridAutoRows: "minmax(0, 1fr)",
          }}
        >
          {/* 統計サマリー - 上部1行目 */}
          {isLoading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <Card
                  key={`skel-stats-${i}`}
                  className="col-span-3 row-span-1 border border-default-200 flex flex-col min-h-0"
                >
                  <CardBody className="p-2 flex flex-col justify-center flex-1 min-h-0">
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 bg-default-200 rounded animate-pulse mx-auto" />
                      <div className="h-5 w-20 bg-default-200 rounded animate-pulse mx-auto" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </>
          ) : !stats ? (
            <div className="col-span-12 row-span-5">
              <EmptyState
                message="データがありません"
                description="選択した期間にデータが見つかりませんでした。別の期間を選択してください。"
              />
            </div>
          ) : (
            <>
              {/* 統計カード - 4枚を12カラムに配置（1行目） */}
              <Card className="col-span-3 row-span-1 border border-default-200 flex flex-col min-h-0">
                <CardBody className="p-2 text-center flex flex-col justify-center flex-1 min-h-0">
                  <MessageSquare className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <div className="text-base font-bold text-primary">
                    {stats.totalChats.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-default-600">
                    総チャット数
                  </div>
                  <div className="text-[9px] text-default-400 mt-0.5">
                    今日: {stats.chatsToday}件
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-3 row-span-1 border border-default-200 flex flex-col min-h-0">
                <CardBody className="p-2 text-center flex flex-col justify-center flex-1 min-h-0">
                  <Users className="w-3.5 h-3.5 text-secondary mx-auto mb-0.5" />
                  <div className="text-base font-bold text-secondary">
                    {stats.totalUsers.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-default-600">
                    総ユーザー数
                  </div>
                  <div className="text-[9px] text-default-400 mt-0.5">
                    今日: {stats.activeUsersToday}人
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-3 row-span-1 border border-default-200 flex flex-col min-h-0">
                <CardBody className="p-2 text-center flex flex-col justify-center flex-1 min-h-0">
                  <Bot className="w-3.5 h-3.5 text-success mx-auto mb-0.5" />
                  <div className="text-base font-bold text-success">
                    {stats.totalBots.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-default-600">ボット数</div>
                  <div className="text-[9px] text-default-400 mt-0.5">
                    運用中
                  </div>
                </CardBody>
              </Card>
              <Card className="col-span-3 row-span-1 border border-default-200 flex flex-col min-h-0">
                <CardBody className="p-2 text-center flex flex-col justify-center flex-1 min-h-0">
                  <FileText className="w-3.5 h-3.5 text-warning mx-auto mb-0.5" />
                  <div className="text-base font-bold text-warning">
                    {stats.totalFiles.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-default-600">ファイル数</div>
                  <div className="text-[9px] text-default-400 mt-0.5">総数</div>
                </CardBody>
              </Card>

              {/* 日別チャット推移 - 左側4カラム、2行 */}
              {isLoading ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                  </CardBody>
                </Card>
              ) : chartData.length > 0 ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <h3 className="text-[10px] font-bold text-default-800 mb-1.5 flex items-center gap-1 flex-shrink-0">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      日別チャット推移
                    </h3>
                    <div
                      className="flex-1 min-h-0 w-full"
                      style={{ minHeight: 0 }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={chartData}
                          margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorChats"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={COLORS.primary}
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor={COLORS.primary}
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                            <linearGradient
                              id="colorUsers"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={COLORS.success}
                                stopOpacity={0.4}
                              />
                              <stop
                                offset="95%"
                                stopColor={COLORS.success}
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 8, fill: "#6b7280" }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            tick={{ fontSize: 8, fill: "#6b7280" }}
                            allowDecimals={false}
                            stroke="#9ca3af"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              fontSize: "11px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="チャット数"
                            name="チャット数"
                            stroke={COLORS.primary}
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorChats)"
                          />
                          <Area
                            type="monotone"
                            dataKey="ユーザー数"
                            name="ユーザー数"
                            stroke={COLORS.success}
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorUsers)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {/* 評価比率 - 中央4カラム、2行 */}
              {isLoading ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                  </CardBody>
                </Card>
              ) : evaluationRatio ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <h3 className="text-[10px] font-bold text-default-800 mb-1.5 flex items-center gap-1 flex-shrink-0">
                      <Activity className="w-3 h-3 text-primary" />
                      評価比率
                    </h3>
                    <div className="flex-1 min-h-0 w-full grid grid-cols-2 gap-2">
                      {/* 左側: 文字説明（凡例） */}
                      <div className="flex flex-col justify-center gap-1.5 min-h-0">
                        {evaluationPieData.map((entry, index) => {
                          const total = evaluationPieData.reduce(
                            (sum, item) => sum + item.value,
                            0,
                          );
                          const percentage =
                            total > 0
                              ? ((entry.value / total) * 100).toFixed(1)
                              : "0";
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-1.5 p-1.5 bg-default-50 rounded border border-default-200"
                            >
                              <div
                                className="w-3 h-3 rounded flex-shrink-0"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-default-700 font-semibold text-[10px]">
                                    {entry.name}
                                  </span>
                                  <span className="text-default-600 font-bold text-[10px]">
                                    {percentage}%
                                  </span>
                                </div>
                                <div className="text-default-500 text-[9px] mt-0.5">
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
                            <PieChart>
                              <Pie
                                data={evaluationPieData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={55}
                                label={false}
                              >
                                {evaluationPieData.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                                  border: "1px solid #e5e7eb",
                                  borderRadius: "6px",
                                  fontSize: "10px",
                                }}
                                formatter={(value: number, name: string) => [
                                  `${value}件 (${((value / evaluationPieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%)`,
                                  name,
                                ]}
                                labelFormatter={(label) => `評価: ${label}`}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ) : null}

              {/* 評価推移 - 右側4カラム、2行 */}
              {isLoading ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                  </CardBody>
                </Card>
              ) : evaluationRatio ? (
                <Card className="col-span-4 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <h3 className="text-[10px] font-bold text-default-800 mb-1.5 flex items-center gap-1 flex-shrink-0">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      評価推移
                    </h3>
                    <div
                      className="flex-1 min-h-0 w-full"
                      style={{ minHeight: 0 }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={evaluationTrendData}
                          margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorGood"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
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
                            <linearGradient
                              id="colorBad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
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
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 8, fill: "#6b7280" }}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            tick={{ fontSize: 8, fill: "#6b7280" }}
                            stroke="#9ca3af"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              fontSize: "11px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="GOOD"
                            name="GOOD"
                            stroke={COLORS.success}
                            fillOpacity={1}
                            fill="url(#colorGood)"
                            strokeWidth={1.5}
                          />
                          <Area
                            type="monotone"
                            dataKey="BAD"
                            name="BAD"
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

              {/* グループごとのチャット数 - 左側6カラム、2行 */}
              <GroupChatCountChart
                data={groupChatCounts}
                isLoading={isLoading}
              />

              {/* キーワードクラウド - 右側6カラム、2行 */}
              {isLoading ? (
                <Card className="col-span-6 row-span-2 border border-default-200 flex flex-col min-h-0">
                  <CardBody className="p-2 flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex-1 bg-default-100 rounded animate-pulse min-h-0" />
                  </CardBody>
                </Card>
              ) : keywordOverview ? (
                <div className="col-span-6 row-span-2 min-h-0 flex flex-col">
                  <KeywordCloud
                    keywordOverview={keywordOverview as KeywordOverviewType}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
