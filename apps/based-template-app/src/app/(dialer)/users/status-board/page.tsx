// app/(dialer)/users/status-board/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Spinner } from "@heroui/react";
import { ArrowLeft, Phone, PhoneOff } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/dialer";
import { useUserStatusBoard } from "@/hooks/dialer/useDialerSwr";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function StatusBoardPage() {
  const router = useRouter();
  const { data, isLoading } = useUserStatusBoard();

  return (
    <div>
      <PageHeader
        title="ステータスボード"
        description="リアルタイムのユーザー状況"
        actions={
          <Button
            variant="flat"
            startContent={<ArrowLeft size={16} />}
            onPress={() => router.push("/users")}
          >
            ユーザー一覧
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data?.users ?? []).map((user) => (
            <Card
              key={user.userId}
              shadow="sm"
              className="hover:shadow-md transition-shadow"
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.displayName}</p>
                      {user.campaignName && (
                        <p className="text-xs text-gray-400">
                          {user.campaignName}
                        </p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={user.status} category="user" />
                </div>

                {user.currentCallId ? (
                  <div className="flex items-center gap-2 bg-green-50 rounded-lg p-2">
                    <Phone size={14} className="text-green-600" />
                    <span className="text-xs text-green-700">
                      通話中 {formatDuration(user.callDuration ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                    <PhoneOff size={14} className="text-gray-400" />
                    <span className="text-xs text-gray-500">待機中</span>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
