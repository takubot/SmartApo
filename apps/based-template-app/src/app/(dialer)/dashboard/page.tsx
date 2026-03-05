// app/(dialer)/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Spinner } from "@heroui/react";
import {
  Megaphone,
  Headphones,
  Phone,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PageHeader, KpiCard } from "@/components/dialer";
import {
  useDashboardOverview,
  useDashboardHourly,
  useDashboardAgentPerformance,
} from "@/hooks/dialer/useDialerSwr";
import SetupChecklist from "@/components/dialer/setup/SetupChecklist";
import {
  getSetupStatus,
  isSetupComplete,
  type SetupStepStatus,
} from "@/lib/setupStatus";

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useDashboardOverview();
  const { data: hourly, isLoading: loadingHourly } = useDashboardHourly();
  const { data: agentPerf, isLoading: loadingAgents } =
    useDashboardAgentPerformance();

  const [setupStatus, setSetupStatus] = useState<SetupStepStatus | null>(null);
  const [setupDismissed, setSetupDismissed] = useState(false);

  useEffect(() => {
    setSetupStatus(getSetupStatus());
    setSetupDismissed(sessionStorage.getItem("setup_dismissed") === "true");
  }, []);

  const showSetup =
    setupStatus && !isSetupComplete(setupStatus) && !setupDismissed;

  const handleDismiss = () => {
    setSetupDismissed(true);
    sessionStorage.setItem("setup_dismissed", "true");
  };

  return (
    <div>
      <PageHeader title="ダッシュボード" description="リアルタイム架電状況" />

      {/* Setup checklist banner */}
      {showSetup && (
        <div className="mb-6">
          <SetupChecklist status={setupStatus} onSkip={handleDismiss} />
        </div>
      )}

      {loadingOverview ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* KPI カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="稼働キャンペーン"
              value={overview?.activeCampaigns ?? 0}
              icon={<Megaphone size={20} />}
              color="primary"
            />
            <KpiCard
              title="稼働エージェント"
              value={overview?.activeAgents ?? 0}
              icon={<Headphones size={20} />}
              color="success"
            />
            <KpiCard
              title="本日の架電数"
              value={overview?.totalCallsToday ?? 0}
              icon={<Phone size={20} />}
              color="primary"
            />
            <KpiCard
              title="本日の応答数"
              value={overview?.totalAnsweredToday ?? 0}
              icon={<Phone size={20} />}
              color="success"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              title="応答率"
              value={`${((overview?.answerRateToday ?? 0) * 100).toFixed(1)}%`}
              icon={<TrendingUp size={20} />}
              color="success"
            />
            <KpiCard
              title="平均通話時間"
              value={formatSeconds(overview?.avgCallDurationSeconds ?? 0)}
              icon={<Clock size={20} />}
            />
            <KpiCard
              title="本日のコールバック"
              value={overview?.totalCallbacksToday ?? 0}
              icon={<Phone size={20} />}
              color="warning"
            />
            <KpiCard
              title="登録コンタクト数"
              value={overview?.totalContacts ?? 0}
              icon={<Users size={20} />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 時間帯別グラフ */}
            <Card shadow="sm">
              <CardHeader className="pb-0">
                <h3 className="text-sm font-semibold text-gray-700">
                  時間帯別架電状況
                </h3>
              </CardHeader>
              <CardBody>
                {loadingHourly ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hourly?.stats ?? []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tickFormatter={(h) => `${h}時`} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalAnswered" name="応答" fill="#22c55e" />
                      <Bar dataKey="totalCalls" name="架電" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* エージェントパフォーマンス */}
            <Card shadow="sm">
              <CardHeader className="pb-0">
                <h3 className="text-sm font-semibold text-gray-700">
                  エージェントパフォーマンス
                </h3>
              </CardHeader>
              <CardBody>
                {loadingAgents ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {(agentPerf?.agents ?? []).map((agent) => (
                      <div
                        key={agent.agentId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                            {agent.displayName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {agent.displayName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {agent.totalCalls}件 / 応答率{" "}
                              {(agent.answerRate * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          平均 {formatSeconds(agent.avgCallDurationSeconds)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
