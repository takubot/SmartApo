// components/dialer/setup/TwilioSetupGuide.tsx
"use client";

import { useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Divider,
  Accordion,
  AccordionItem,
} from "@heroui/react";
import { addToast } from "@heroui/react";
import {
  ExternalLink,
  Save,
  TestTube,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import { updateSetupStatus, type SetupStepStatus } from "@/lib/setupStatus";

interface TwilioSetupGuideProps {
  status: SetupStepStatus;
  onStatusChange: (s: SetupStepStatus) => void;
}

export default function TwilioSetupGuide({
  status,
  onStatusChange,
}: TwilioSetupGuideProps) {
  const [form, setForm] = useState({
    accountSid: "",
    authToken: "",
    defaultCallerId: "",
    webhookUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put("/settings/twilio", form);
      addToast({ title: "Twilio設定を保存しました", color: "success" });

      const updates: Partial<SetupStepStatus> = {};
      if (form.accountSid && form.authToken) {
        updates.twilioAccount = true;
      }
      if (form.defaultCallerId) {
        updates.twilioPhoneNumber = true;
      }
      if (form.webhookUrl) {
        updates.twilioWebhook = true;
      }
      onStatusChange(updateSetupStatus(updates));
    } catch {
      addToast({ title: "保存に失敗しました", color: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiClient.post("/settings/twilio/test");
      setTestResult(res.data);
      if (res.data.success) {
        addToast({ title: "Twilio接続成功!", color: "success" });
        onStatusChange(updateSetupStatus({ twilioAccount: true }));
      }
    } catch {
      setTestResult({ success: false, message: "テストに失敗しました" });
    } finally {
      setTesting(false);
    }
  };

  const handleMarkComplete = (key: keyof SetupStepStatus) => {
    onStatusChange(updateSetupStatus({ [key]: true }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ title: "コピーしました", color: "success" });
  };

  return (
    <div className="space-y-6">
      {/* ==================== STEP 1: アカウント作成 ==================== */}
      <Card shadow="sm" className={status.twilioAccount ? "border border-green-200" : ""}>
        <CardHeader className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${status.twilioAccount ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
              {status.twilioAccount ? <CheckCircle2 size={18} /> : "1"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                Twilioアカウントの作成と接続
              </h3>
              <p className="text-xs text-gray-500">
                Twilioでアカウントを作成し、認証情報を入力します
              </p>
            </div>
          </div>
          {status.twilioAccount && (
            <Chip size="sm" color="success" variant="flat">完了</Chip>
          )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <Accordion variant="bordered" selectionMode="multiple">
            <AccordionItem
              key="create-account"
              title={
                <span className="text-sm font-medium">
                  Twilioアカウントの作成手順
                </span>
              }
            >
              <div className="space-y-4 pb-2">
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Twilio公式サイトにアクセス</p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="mt-1"
                        endContent={<ExternalLink size={14} />}
                        onPress={() => window.open("https://www.twilio.com/ja-jp/try-twilio", "_blank")}
                      >
                        Twilio公式サイトを開く
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                    <p className="text-sm text-gray-700">「無料で始める」ボタンからアカウントを作成</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                    <p className="text-sm text-gray-700">メール認証・電話番号認証を完了</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">4</span>
                    <div>
                      <p className="text-sm text-gray-700">ダッシュボードで Account SID と Auth Token を確認</p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="mt-1"
                        endContent={<ExternalLink size={14} />}
                        onPress={() => window.open("https://console.twilio.com/", "_blank")}
                      >
                        Twilioコンソールを開く
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Twilioコンソールのモック図解 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Twilioコンソール ダッシュボード画面</p>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="ml-2">console.twilio.com</span>
                    </div>
                    <Divider />
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-medium">Account Info</p>
                      <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <div>
                          <p className="text-[10px] text-gray-400">Account SID</p>
                          <p className="text-xs font-mono text-gray-600">ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</p>
                        </div>
                        <Copy size={12} className="text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <div>
                          <p className="text-[10px] text-gray-400">Auth Token</p>
                          <p className="text-xs font-mono text-gray-600">********************************</p>
                        </div>
                        <Copy size={12} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">
                    * Account SID は「AC」で始まる34文字の文字列です
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>注意:</strong> トライアルアカウントでは認証済みの電話番号にしか発信できません。
                    本番運用にはアカウントのアップグレード（クレジットカード登録）が必要です。
                  </p>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          <Divider />

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              Twilioの認証情報を入力
            </p>
            <Input
              label="Account SID"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.accountSid}
              onValueChange={(v) => setForm((p) => ({ ...p, accountSid: v }))}
              description="Twilioダッシュボードからコピーしてください"
            />
            <Input
              label="Auth Token"
              type="password"
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={form.authToken}
              onValueChange={(v) => setForm((p) => ({ ...p, authToken: v }))}
              description="「Show」ボタンで表示してからコピーしてください"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<TestTube size={14} />}
              isLoading={testing}
              onPress={handleTest}
              isDisabled={!form.accountSid || !form.authToken}
            >
              接続テスト
            </Button>
            {!status.twilioAccount && (
              <Button
                size="sm"
                variant="light"
                className="text-gray-400"
                onPress={() => handleMarkComplete("twilioAccount")}
              >
                手動で完了にする
              </Button>
            )}
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
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

      {/* ==================== STEP 2: 電話番号 ==================== */}
      <Card shadow="sm" className={status.twilioPhoneNumber ? "border border-green-200" : ""}>
        <CardHeader className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${status.twilioPhoneNumber ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
              {status.twilioPhoneNumber ? <CheckCircle2 size={18} /> : "2"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                発信用電話番号の登録
              </h3>
              <p className="text-xs text-gray-500">
                Twilioで購入した番号を設定します
              </p>
            </div>
          </div>
          {status.twilioPhoneNumber && (
            <Chip size="sm" color="success" variant="flat">完了</Chip>
          )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <Accordion variant="bordered" selectionMode="multiple">
            <AccordionItem
              key="buy-number"
              title={
                <span className="text-sm font-medium">
                  Twilioで電話番号を購入する手順
                </span>
              }
            >
              <div className="space-y-4 pb-2">
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                    <div>
                      <p className="text-sm text-gray-700">
                        Twilioコンソール <ArrowRight size={12} className="inline mx-1" /> Phone Numbers <ArrowRight size={12} className="inline mx-1" /> Buy a Number
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="mt-1"
                        endContent={<ExternalLink size={14} />}
                        onPress={() => window.open("https://console.twilio.com/us1/develop/phone-numbers/manage/search", "_blank")}
                      >
                        番号購入ページを開く
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                    <p className="text-sm text-gray-700">Country: <strong>Japan (+81)</strong> を選択、Capabilities: <strong>Voice</strong> にチェック</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                    <p className="text-sm text-gray-700">番号を選択して「Buy」をクリック</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <p className="font-bold mb-1">日本の電話番号について</p>
                    <p>日本の番号を取得するにはRegulatory Bundle（規制対応書類）の提出が必要です。会社情報・住所証明書類を提出し、審査通過まで数営業日かかります。</p>
                    <p className="mt-1">テスト用途であれば、米国番号（+1）なら即座に購入可能です。</p>
                  </div>
                </div>

                {/* 番号購入画面のモックアップ */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-2">Twilio 番号購入画面のイメージ</p>
                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <span className="ml-2">console.twilio.com / Phone Numbers / Buy</span>
                    </div>
                    <Divider />
                    <div className="flex gap-2 items-center">
                      <div className="bg-gray-100 rounded px-2 py-1 text-xs">Country: Japan (+81)</div>
                      <div className="bg-blue-100 rounded px-2 py-1 text-xs text-blue-700">Voice</div>
                    </div>
                    <div className="space-y-1 mt-2">
                      {["+81 50-1234-5678", "+81 50-9876-5432", "+81 3-1234-5678"].map((num) => (
                        <div key={num} className="flex items-center justify-between bg-gray-50 rounded p-2">
                          <span className="text-xs font-mono">{num}</span>
                          <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded">Buy $4.50/mo</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          <Divider />

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              購入した番号を入力
            </p>
            <Input
              label="デフォルト発信者番号"
              placeholder="+81XXXXXXXXXX"
              value={form.defaultCallerId}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultCallerId: v }))}
              description="E.164形式（+81で始まる番号）で入力してください"
            />
            {!status.twilioPhoneNumber && (
              <Button
                size="sm"
                variant="light"
                className="text-gray-400"
                onPress={() => handleMarkComplete("twilioPhoneNumber")}
              >
                手動で完了にする
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ==================== STEP 3: Webhook ==================== */}
      <Card shadow="sm" className={status.twilioWebhook ? "border border-green-200" : ""}>
        <CardHeader className="flex items-center justify-between px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${status.twilioWebhook ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600"}`}>
              {status.twilioWebhook ? <CheckCircle2 size={18} /> : "3"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                Webhook URLの設定
              </h3>
              <p className="text-xs text-gray-500">
                通話ステータスを受信するためのURLを設定します
              </p>
            </div>
          </div>
          {status.twilioWebhook && (
            <Chip size="sm" color="success" variant="flat">完了</Chip>
          )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <Accordion variant="bordered" selectionMode="multiple">
            <AccordionItem
              key="webhook-setup"
              title={
                <span className="text-sm font-medium">
                  Webhookの設定手順（TwiML App + 番号設定）
                </span>
              }
            >
              <div className="space-y-4 pb-2">
                <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">TwiML Appの作成</p>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                    <div>
                      <p className="text-sm text-gray-700">
                        Twilioコンソール <ArrowRight size={12} className="inline mx-1" />
                        Voice <ArrowRight size={12} className="inline mx-1" />
                        TwiML <ArrowRight size={12} className="inline mx-1" />
                        TwiML Apps
                      </p>
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        className="mt-1"
                        endContent={<ExternalLink size={14} />}
                        onPress={() => window.open("https://console.twilio.com/us1/develop/voice/manage/twiml-apps", "_blank")}
                      >
                        TwiML Apps設定を開く
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                    <p className="text-sm text-gray-700">「Create new TwiML App」をクリック</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                    <p className="text-sm text-gray-700">以下のURLを設定して保存</p>
                  </div>
                </div>

                {/* Webhook URL一覧 */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">設定するWebhook URL</p>
                  {[
                    { label: "Voice Request URL", path: "/v2/dialer/webhooks/twilio/voice" },
                    { label: "Status Callback URL", path: "/v2/dialer/webhooks/twilio/status" },
                    { label: "Recording Callback (任意)", path: "/v2/dialer/webhooks/twilio/recording" },
                  ].map((item) => (
                    <div key={item.path} className="flex items-center justify-between bg-white rounded p-2 border border-gray-100">
                      <div>
                        <p className="text-[10px] text-gray-400">{item.label}</p>
                        <p className="text-xs font-mono text-gray-600">
                          {"https://<your-domain>"}{item.path}
                        </p>
                      </div>
                      <button
                        className="text-gray-400 hover:text-gray-600 p-1"
                        onClick={() => copyToClipboard(item.path)}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-700">
                    <p className="font-bold mb-1">ローカル開発の場合</p>
                    <p>ngrok等のトンネルツールを使って、ローカルサーバーへのURLを作成してください:</p>
                    <code className="block bg-white/50 rounded px-2 py-1 mt-1 font-mono text-[11px]">
                      ngrok http 8081
                    </code>
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>

          <Divider />

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">
              バックエンドの公開URLを入力
            </p>
            <Input
              label="Webhook Base URL"
              placeholder="https://your-domain.com"
              value={form.webhookUrl}
              onValueChange={(v) => setForm((p) => ({ ...p, webhookUrl: v }))}
              description="Twilioが通話ステータスを送信するベースURL"
            />
            {!status.twilioWebhook && (
              <Button
                size="sm"
                variant="light"
                className="text-gray-400"
                onPress={() => handleMarkComplete("twilioWebhook")}
              >
                手動で完了にする
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ==================== 保存ボタン ==================== */}
      <div className="flex justify-end">
        <Button
          color="primary"
          size="lg"
          startContent={<Save size={18} />}
          isLoading={saving}
          onPress={handleSave}
          isDisabled={!form.accountSid && !form.authToken && !form.defaultCallerId && !form.webhookUrl}
        >
          Twilio設定をまとめて保存
        </Button>
      </div>
    </div>
  );
}
