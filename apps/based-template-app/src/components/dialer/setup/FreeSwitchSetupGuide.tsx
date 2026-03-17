"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import { TestTube, CheckCircle2, AlertCircle, Server } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { updateSetupStatus, type SetupStepStatus } from "@/lib/setupStatus";

interface FreeSwitchSetupGuideProps {
  status: SetupStepStatus;
  onStatusChange: (s: SetupStepStatus) => void;
}

export default function FreeSwitchSetupGuide({
  status,
  onStatusChange,
}: FreeSwitchSetupGuideProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post<{
        success: boolean;
        message: string;
        freeswitchVersion?: string;
      }>("/settings/phone/test");
      setTestResult(res.data);
      if (res.data.success) {
        addToast({ title: "FreeSWITCH接続成功!", color: "success" });
        onStatusChange(
          updateSetupStatus({ pbxConnected: true, sipTrunkConfigured: true }),
        );
      }
    } catch {
      setTestResult({ success: false, message: "テストに失敗しました" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* STEP 1: FreeSWITCH接続 */}
      <Card
        shadow="sm"
        className={status.pbxConnected ? "border border-green-200" : ""}
      >
        <CardHeader className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                status.pbxConnected
                  ? "bg-green-100 text-green-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {status.pbxConnected ? <CheckCircle2 size={18} /> : "1"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                FreeSWITCH PBXの接続確認
              </h3>
              <p className="text-xs text-gray-500">
                ESL接続が正常に動作しているか確認します
              </p>
            </div>
          </div>
          {status.pbxConnected && (
            <Chip size="sm" color="success" variant="flat">
              完了
            </Chip>
          )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
            <p className="text-xs font-medium text-gray-500">必要な環境変数</p>
            <div className="space-y-1 text-xs font-mono text-gray-600">
              <p>FREESWITCH_ESL_HOST=127.0.0.1</p>
              <p>FREESWITCH_ESL_PORT=8021</p>
              <p>FREESWITCH_ESL_PASSWORD=ClueCon</p>
              <p>FREESWITCH_SIP_GATEWAY=sip-provider</p>
              <p>FREESWITCH_WSS_URL=wss://your-server:7443</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              color="primary"
              startContent={<TestTube size={14} />}
              isLoading={testing}
              onPress={handleTest}
            >
              接続テスト
            </Button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                testResult.success
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {testResult.message}
            </div>
          )}
        </CardBody>
      </Card>

      {/* STEP 2: SIPトランク */}
      <Card
        shadow="sm"
        className={status.sipTrunkConfigured ? "border border-green-200" : ""}
      >
        <CardHeader className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                status.sipTrunkConfigured
                  ? "bg-green-100 text-green-600"
                  : "bg-blue-100 text-blue-600"
              }`}
            >
              {status.sipTrunkConfigured ? <CheckCircle2 size={18} /> : "2"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                SIPトランクの設定
              </h3>
              <p className="text-xs text-gray-500">
                外線発信用のSIPプロバイダゲートウェイを設定します
              </p>
            </div>
          </div>
          {status.sipTrunkConfigured && (
            <Chip size="sm" color="success" variant="flat">
              完了
            </Chip>
          )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle
              size={16}
              className="text-amber-500 flex-shrink-0 mt-0.5"
            />
            <div className="text-xs text-amber-700">
              <p>
                SIPプロバイダのゲートウェイ設定は FreeSWITCH の
                <code className="bg-white/50 px-1 rounded">
                  sip_profiles/external.xml
                </code>
                で行います。プロバイダから提供されたSIPアカウント情報を設定してください。
              </p>
            </div>
          </div>

          <Divider />

          <div className="flex items-center gap-3">
            <Server size={16} className="text-gray-400" />
            <p className="text-sm text-gray-600">
              FreeSWITCH接続テストが成功すれば、SIPゲートウェイも確認できます。
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
