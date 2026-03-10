// components/dialer/setup/SetupChecklist.tsx
"use client";

import { Card, CardBody, CardHeader, Button, Progress } from "@heroui/react";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Phone,
  PhoneCall,
  Globe,
  Headphones,
  Users,
  Megaphone,
  Rocket,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { SetupStepStatus } from "@/lib/setupStatus";
import {
  getCompletedCount,
  getTotalSteps,
  isSetupComplete,
} from "@/lib/setupStatus";

interface SetupStep {
  key: keyof SetupStepStatus;
  title: string;
  description: string;
  icon: React.ReactNode;
  actionLabel: string;
  href: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    key: "twilioAccount",
    title: "Twilioアカウントを接続",
    description:
      "Account SIDとAuth Tokenを設定して、Twilioとの接続を確立します",
    icon: <Phone size={20} />,
    actionLabel: "Twilio設定へ",
    href: "/settings/twilio",
  },
  {
    key: "twilioPhoneNumber",
    title: "発信用電話番号を登録",
    description:
      "Twilioで購入した電話番号をデフォルト発信者番号として設定します",
    icon: <PhoneCall size={20} />,
    actionLabel: "番号を設定",
    href: "/settings/twilio",
  },
  {
    key: "twilioWebhook",
    title: "TwilioコンソールでWebhookを設定",
    description:
      "TwilioコンソールにWebhook URLを設定します（URLは環境変数から自動取得）",
    icon: <Globe size={20} />,
    actionLabel: "Webhookを設定",
    href: "/settings/twilio",
  },
  {
    key: "agentRegistered",
    title: "エージェントを登録",
    description: "架電を行うエージェントを少なくとも1名登録します",
    icon: <Headphones size={20} />,
    actionLabel: "エージェント登録",
    href: "/agents",
  },
  {
    key: "contactImported",
    title: "コンタクトを追加",
    description: "架電先の連絡先をCSVインポートまたは手動で追加します",
    icon: <Users size={20} />,
    actionLabel: "コンタクト追加",
    href: "/contacts",
  },
  {
    key: "campaignCreated",
    title: "キャンペーンを作成",
    description:
      "架電キャンペーンを作成して、コンタクトとエージェントを割り当てます",
    icon: <Megaphone size={20} />,
    actionLabel: "キャンペーン作成",
    href: "/campaigns/new",
  },
];

interface SetupChecklistProps {
  status: SetupStepStatus;
  onSkip?: () => void;
}

export default function SetupChecklist({
  status,
  onSkip,
}: SetupChecklistProps) {
  const router = useRouter();
  const completed = getCompletedCount(status);
  const total = getTotalSteps();
  const allDone = isSetupComplete(status);
  const progressPercent = Math.round((completed / total) * 100);

  if (allDone) {
    return (
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardBody className="flex flex-col items-center py-10 gap-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <Rocket size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800">
            セットアップ完了!
          </h2>
          <p className="text-sm text-green-600 text-center max-w-md">
            全ての初期設定が完了しました。キャンペーンを開始して架電を始めましょう。
          </p>
          <Button
            color="success"
            size="lg"
            onPress={() => router.push("/campaigns")}
            startContent={<Megaphone size={18} />}
          >
            キャンペーンを開始する
          </Button>
        </CardBody>
      </Card>
    );
  }

  // Find the first incomplete step
  const nextStepIndex = SETUP_STEPS.findIndex((s) => !status[s.key]);

  return (
    <Card className="border border-blue-200 shadow-md">
      <CardHeader className="flex flex-col gap-3 pb-2 pt-6 px-6">
        <div className="flex items-center justify-between w-full">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              初期セットアップ
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              架電を開始するために以下の設定を完了してください
            </p>
          </div>
          {onSkip && (
            <Button
              variant="light"
              size="sm"
              className="text-gray-400"
              onPress={onSkip}
            >
              後で設定する
            </Button>
          )}
        </div>
        <div className="w-full">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              {completed} / {total} ステップ完了
            </span>
            <span>{progressPercent}%</span>
          </div>
          <Progress
            value={progressPercent}
            color="primary"
            size="sm"
            className="w-full"
          />
        </div>
      </CardHeader>

      <CardBody className="px-6 pb-6 pt-2">
        <div className="space-y-1">
          {SETUP_STEPS.map((step, index) => {
            const done = status[step.key];
            const isNext = index === nextStepIndex;

            return (
              <div
                key={step.key}
                className={`
                  flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                  ${done ? "bg-green-50/60" : isNext ? "bg-blue-50 ring-1 ring-blue-200" : "bg-white"}
                `}
              >
                {/* Step number / check icon */}
                <div className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2
                      size={28}
                      className="text-green-500"
                      fill="currentColor"
                      strokeWidth={0}
                    />
                  ) : (
                    <div
                      className={`
                        w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold
                        ${isNext ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-300 text-gray-400"}
                      `}
                    >
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Icon */}
                <div
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center
                    ${done ? "bg-green-100 text-green-600" : isNext ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}
                  `}
                >
                  {step.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${done ? "text-green-700 line-through" : "text-gray-800"}`}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                <div className="flex-shrink-0">
                  {done ? (
                    <span className="text-xs text-green-600 font-medium px-2 py-1 rounded-full bg-green-100">
                      完了
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={isNext ? "solid" : "flat"}
                      color={isNext ? "primary" : "default"}
                      endContent={<ChevronRight size={14} />}
                      onPress={() => router.push(step.href)}
                    >
                      {step.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
