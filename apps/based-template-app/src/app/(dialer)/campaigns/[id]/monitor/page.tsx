// app/(dialer)/campaigns/[id]/monitor/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, Button, Spinner } from "@heroui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { PageHeader, KpiCard } from "@/components/dialer";
import { useCampaign, useCampaignStats } from "@/hooks/dialer/useDialerSwr";

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#6b7280"];

export default function CampaignMonitorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading } = useCampaign(id);
  const { data: stats } = useCampaignStats(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const answerRate = stats && stats.totalCalls > 0
    ? stats.totalAnswered / stats.totalCalls
    : 0;

  const remaining = stats
    ? stats.totalContacts - stats.completedContacts
    : 0;

  const pieData = stats
    ? [
        { name: "応答", value: stats.totalAnswered },
        { name: "放棄", value: stats.totalAbandoned },
        { name: "未完了", value: remaining > 0 ? remaining : 0 },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title={`${campaign?.name ?? ""} - モニター`}
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push(`/campaigns/${id}`)}
          >
            詳細へ
          </Button>
        }
      />

      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard title="総件数" value={stats.totalContacts} color="primary" />
            <KpiCard title="完了件数" value={stats.completedContacts} color="success" />
            <KpiCard
              title="応答率"
              value={`${(answerRate * 100).toFixed(1)}%`}
              color="success"
            />
            <KpiCard
              title="放棄率"
              value={`${(stats.abandonRate * 100).toFixed(1)}%`}
              color={stats.abandonRate > 0.03 ? "danger" : "success"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card shadow="sm">
              <CardHeader>
                <h3 className="text-sm font-semibold">架電結果内訳</h3>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card shadow="sm">
              <CardHeader>
                <h3 className="text-sm font-semibold">進捗</h3>
              </CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={[
                      { label: "応答", count: stats.totalAnswered },
                      { label: "放棄", count: stats.totalAbandoned },
                      { label: "残り", count: remaining > 0 ? remaining : 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
