// app/(dialer)/campaigns/[id]/page.tsx
"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Divider,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  Play,
  Pause,
  Square,
  Edit,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import { PageHeader, StatusBadge, KpiCard } from "@/components/dialer";
import { useCampaign, useCampaignStats } from "@/hooks/dialer/useDialerSwr";
import apiClient from "@/lib/apiClient";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: campaign, isLoading, mutate } = useCampaign(id);
  const { data: stats } = useCampaignStats(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-center py-20 text-gray-500">キャンペーンが見つかりません</div>;
  }

  const handleAction = async (action: "start" | "pause" | "stop") => {
    try {
      await apiClient.post(`/campaigns/${id}/${action}`);
      addToast({
        title:
          action === "start" ? "開始しました" : action === "pause" ? "一時停止しました" : "停止しました",
        color: "success",
      });
      mutate();
    } catch {
      addToast({ title: "操作に失敗しました", color: "danger" });
    }
  };

  const answerRate = stats && stats.totalCalls > 0
    ? stats.totalAnswered / stats.totalCalls
    : 0;

  return (
    <div>
      <PageHeader
        title={campaign.name}
        actions={
          <div className="flex gap-2">
            <Button
              variant="flat"
              startContent={<ArrowLeft size={16} />}
              onPress={() => router.push("/campaigns")}
            >
              一覧へ
            </Button>
            <Button
              variant="flat"
              startContent={<Edit size={16} />}
              onPress={() => router.push(`/campaigns/${id}/edit`)}
            >
              編集
            </Button>
            <Button
              variant="flat"
              color="primary"
              startContent={<BarChart3 size={16} />}
              onPress={() => router.push(`/campaigns/${id}/monitor`)}
            >
              モニター
            </Button>
          </div>
        }
      />

      {/* ステータスとアクション */}
      <div className="flex items-center gap-4 mb-6">
        <StatusBadge status={campaign.status} category="campaign" size="md" />
        <Divider orientation="vertical" className="h-6" />
        {campaign.status !== "active" && (
          <Button
            color="success"
            size="sm"
            startContent={<Play size={14} />}
            onPress={() => handleAction("start")}
          >
            開始
          </Button>
        )}
        {campaign.status === "active" && (
          <Button
            color="warning"
            size="sm"
            startContent={<Pause size={14} />}
            onPress={() => handleAction("pause")}
          >
            一時停止
          </Button>
        )}
        {(campaign.status === "active" || campaign.status === "paused") && (
          <Button
            color="danger"
            size="sm"
            variant="flat"
            startContent={<Square size={14} />}
            onPress={() => handleAction("stop")}
          >
            停止
          </Button>
        )}
      </div>

      {/* 統計 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="対象件数" value={stats.totalContacts} color="primary" />
          <KpiCard title="完了件数" value={stats.completedContacts} color="success" />
          <KpiCard
            title="応答率"
            value={`${(answerRate * 100).toFixed(1)}%`}
            color="success"
          />
          <KpiCard title="通話中" value={stats.activeCalls} color="warning" />
        </div>
      )}

      {/* 詳細情報 */}
      <Card shadow="sm">
        <CardHeader>
          <h3 className="text-sm font-semibold">キャンペーン詳細</h3>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">最大同時通話数</dt>
              <dd className="font-medium">{campaign.maxConcurrentCalls}</dd>
            </div>
            <div>
              <dt className="text-gray-500">プレディクティブ倍率</dt>
              <dd className="font-medium">{campaign.predictiveRatio}</dd>
            </div>
            <div>
              <dt className="text-gray-500">架電時間帯</dt>
              <dd className="font-medium">
                {campaign.dailyStartTime} 〜 {campaign.dailyEndTime}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">最大放棄率</dt>
              <dd className="font-medium">{campaign.maxAbandonRate}%</dd>
            </div>
            {campaign.description && (
              <div className="col-span-2">
                <dt className="text-gray-500">説明</dt>
                <dd className="font-medium">{campaign.description}</dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
