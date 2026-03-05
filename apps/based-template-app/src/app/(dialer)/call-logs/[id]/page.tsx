// app/(dialer)/call-logs/[id]/page.tsx
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
import { ArrowLeft } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/dialer";
import { useCallLog } from "@/hooks/dialer/useDialerSwr";

export default function CallLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: log, isLoading } = useCallLog(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!log) {
    return <div className="text-center py-20 text-gray-500">ログが見つかりません</div>;
  }

  const m = Math.floor(log.durationSeconds / 60);
  const s = log.durationSeconds % 60;

  return (
    <div>
      <PageHeader
        title="通話ログ詳細"
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/call-logs")}
          >
            一覧へ
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Card shadow="sm">
          <CardHeader>
            <h3 className="text-sm font-semibold">通話情報</h3>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">連絡先ID</dt>
                <dd className="font-medium">{log.contactId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">電話番号</dt>
                <dd className="font-medium">{log.phoneNumberDialed}</dd>
              </div>
              <div>
                <dt className="text-gray-500">結果</dt>
                <dd>
                  <StatusBadge
                    status={log.callStatus}
                    category="call"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">通話時間</dt>
                <dd className="font-medium">{`${m}:${String(s).padStart(2, "0")}`}</dd>
              </div>
              <div>
                <dt className="text-gray-500">呼出時間</dt>
                <dd className="font-medium">{log.ringDurationSeconds}秒</dd>
              </div>
              <div>
                <dt className="text-gray-500">開始日時</dt>
                <dd className="font-medium">
                  {log.initiatedAt
                    ? new Date(log.initiatedAt).toLocaleString("ja-JP")
                    : "-"}
                </dd>
              </div>
              {log.answeredAt && (
                <div>
                  <dt className="text-gray-500">応答日時</dt>
                  <dd className="font-medium">
                    {new Date(log.answeredAt).toLocaleString("ja-JP")}
                  </dd>
                </div>
              )}
              {log.endedAt && (
                <div>
                  <dt className="text-gray-500">終了日時</dt>
                  <dd className="font-medium">
                    {new Date(log.endedAt).toLocaleString("ja-JP")}
                  </dd>
                </div>
              )}
              {log.twilioCallSid && (
                <div>
                  <dt className="text-gray-500">Twilio Call SID</dt>
                  <dd className="font-medium text-xs">{log.twilioCallSid}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">放棄フラグ</dt>
                <dd className="font-medium">{log.isAbandoned ? "はい" : "いいえ"}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {log.recordingUrl && (
          <Card shadow="sm">
            <CardHeader>
              <h3 className="text-sm font-semibold">録音</h3>
            </CardHeader>
            <CardBody>
              <audio controls className="w-full">
                <source src={log.recordingUrl} type="audio/mpeg" />
              </audio>
              {log.recordingDurationSeconds > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  録音時間: {log.recordingDurationSeconds}秒
                </p>
              )}
            </CardBody>
          </Card>
        )}

        {log.notes && (
          <Card shadow="sm">
            <CardHeader>
              <h3 className="text-sm font-semibold">メモ</h3>
            </CardHeader>
            <CardBody>
              <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
