// app/(dialer)/setup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Tabs, Tab } from "@heroui/react";
import {
  Server,
  Headphones,
  Users,
  Megaphone,
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/dialer";
import SetupChecklist from "@/components/dialer/setup/SetupChecklist";
import FreeSwitchSetupGuide from "@/components/dialer/setup/FreeSwitchSetupGuide";
import {
  getSetupStatus,
  updateSetupStatus,
  isSetupComplete,
  type SetupStepStatus,
} from "@/lib/setupStatus";

type TabKey = "overview" | "phone" | "users" | "contacts" | "campaign";

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SetupStepStatus>(getSetupStatus);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    setStatus(getSetupStatus());
  }, []);

  const handleStatusChange = (newStatus: SetupStepStatus) => {
    setStatus(newStatus);
  };

  const handleUserDone = () => {
    const updated = updateSetupStatus({ userRegistered: true });
    setStatus(updated);
  };

  const handleContactDone = () => {
    const updated = updateSetupStatus({ contactImported: true });
    setStatus(updated);
  };

  const handleCampaignDone = () => {
    const updated = updateSetupStatus({ campaignCreated: true });
    setStatus(updated);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="初期セットアップ"
        description="架電を開始するために必要な設定を順番にご案内します"
      />

      <Tabs
        aria-label="セットアップタブ"
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as TabKey)}
        variant="underlined"
        color="primary"
        classNames={{
          tabList: "gap-4 mb-6",
          tab: "text-sm",
        }}
      >
        {/* ==================== Overview Tab ==================== */}
        <Tab
          key="overview"
          title={
            <div className="flex items-center gap-2">
              <LayoutDashboard size={16} />
              <span>概要</span>
            </div>
          }
        >
          <SetupChecklist
            status={status}
            onSkip={() => router.push("/dashboard")}
          />

          {isSetupComplete(status) && (
            <div className="mt-6 flex justify-center">
              <Button
                color="primary"
                size="lg"
                onPress={() => router.push("/dashboard")}
                startContent={<LayoutDashboard size={18} />}
              >
                ダッシュボードへ
              </Button>
            </div>
          )}
        </Tab>

        {/* ==================== Phone/PBX Tab ==================== */}
        <Tab
          key="phone"
          title={
            <div className="flex items-center gap-2">
              <Server size={16} />
              <span>電話設定</span>
              {status.pbxConnected && status.sipTrunkConfigured ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </div>
          }
        >
          <FreeSwitchSetupGuide
            status={status}
            onStatusChange={handleStatusChange}
          />
        </Tab>

        {/* ==================== Users Tab ==================== */}
        <Tab
          key="users"
          title={
            <div className="flex items-center gap-2">
              <Headphones size={16} />
              <span>ユーザー</span>
              {status.userRegistered ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
          }
        >
          <UserSetupSection
            done={status.userRegistered}
            onDone={handleUserDone}
          />
        </Tab>

        {/* ==================== Contacts Tab ==================== */}
        <Tab
          key="contacts"
          title={
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>コンタクト</span>
              {status.contactImported ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
          }
        >
          <ContactSetupSection
            done={status.contactImported}
            onDone={handleContactDone}
          />
        </Tab>

        {/* ==================== Campaign Tab ==================== */}
        <Tab
          key="campaign"
          title={
            <div className="flex items-center gap-2">
              <Megaphone size={16} />
              <span>キャンペーン</span>
              {status.campaignCreated ? (
                <span className="w-2 h-2 rounded-full bg-green-500" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-gray-300" />
              )}
            </div>
          }
        >
          <CampaignSetupSection
            done={status.campaignCreated}
            onDone={handleCampaignDone}
          />
        </Tab>
      </Tabs>

      {/* Bottom navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
        <Button
          variant="flat"
          startContent={<ArrowLeft size={16} />}
          onPress={() => {
            const tabs: TabKey[] = [
              "overview",
              "phone",
              "users",
              "contacts",
              "campaign",
            ];
            const currentIdx = tabs.indexOf(activeTab);
            if (currentIdx > 0) setActiveTab(tabs[currentIdx - 1]);
          }}
          isDisabled={activeTab === "overview"}
        >
          前へ
        </Button>
        <Button
          color="primary"
          endContent={<ArrowRight size={16} />}
          onPress={() => {
            const tabs: TabKey[] = [
              "overview",
              "phone",
              "users",
              "contacts",
              "campaign",
            ];
            const currentIdx = tabs.indexOf(activeTab);
            if (currentIdx < tabs.length - 1)
              setActiveTab(tabs[currentIdx + 1]);
            else router.push("/dashboard");
          }}
        >
          {activeTab === "campaign" ? "ダッシュボードへ" : "次へ"}
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// User Setup Section
// ────────────────────────────────────────────
function UserSetupSection({
  done,
  onDone,
}: {
  done: boolean;
  onDone: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${done ? "bg-green-100" : "bg-blue-100"}`}
          >
            <Headphones
              size={22}
              className={done ? "text-green-600" : "text-blue-600"}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              ユーザーの登録
            </h3>
            <p className="text-sm text-gray-500">
              ダイヤラーにログインすると自動でユーザーが登録されます
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            自動登録される情報:
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong>表示名</strong> - Firebaseの表示名が自動設定されます
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong>SIP内線番号</strong> - 1001番から自動採番されます
              </span>
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            color="primary"
            onPress={() => router.push("/users")}
            endContent={<ArrowRight size={16} />}
          >
            ユーザー一覧へ
          </Button>
          {!done && (
            <Button variant="light" className="text-gray-400" onPress={onDone}>
              手動で完了にする
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Contact Setup Section
// ────────────────────────────────────────────
function ContactSetupSection({
  done,
  onDone,
}: {
  done: boolean;
  onDone: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${done ? "bg-green-100" : "bg-blue-100"}`}
          >
            <Users
              size={22}
              className={done ? "text-green-600" : "text-blue-600"}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              コンタクト（架電先）の登録
            </h3>
            <p className="text-sm text-gray-500">
              架電先の連絡先を追加してください
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            3つの方法で追加できます:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              onClick={() => router.push("/contacts/new")}
            >
              <p className="text-sm font-medium text-gray-800">手動入力</p>
              <p className="text-xs text-gray-500 mt-1">1件ずつ連絡先を入力</p>
            </button>
            <button
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              onClick={() => router.push("/contacts/import")}
            >
              <p className="text-sm font-medium text-gray-800">CSVインポート</p>
              <p className="text-xs text-gray-500 mt-1">
                CSVファイルから一括取り込み
              </p>
            </button>
            <button
              className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              onClick={() => router.push("/settings/google")}
            >
              <p className="text-sm font-medium text-gray-800">Google連携</p>
              <p className="text-xs text-gray-500 mt-1">
                Google ContactsやSheetsから同期
              </p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-700 font-medium">
            CSVファイルのフォーマット例:
          </p>
          <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
            <pre className="text-xs text-green-400 font-mono whitespace-pre">
              {`last_name,first_name,company,phone_number1,email
田中,太郎,株式会社ABC,090-1234-5678,tanaka@example.com
佐藤,花子,XYZ商事,03-1234-5678,sato@example.com`}
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            color="primary"
            onPress={() => router.push("/contacts")}
            endContent={<ArrowRight size={16} />}
          >
            コンタクト管理ページへ
          </Button>
          {!done && (
            <Button variant="light" className="text-gray-400" onPress={onDone}>
              手動で完了にする
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Campaign Setup Section
// ────────────────────────────────────────────
function CampaignSetupSection({
  done,
  onDone,
}: {
  done: boolean;
  onDone: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${done ? "bg-green-100" : "bg-blue-100"}`}
          >
            <Megaphone
              size={22}
              className={done ? "text-green-600" : "text-blue-600"}
            />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">
              キャンペーンの作成
            </h3>
            <p className="text-sm text-gray-500">
              架電キャンペーンを作成して、コンタクトとユーザーを割り当てます
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            キャンペーン設定項目:
          </p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </span>
              <span>
                <strong>キャンペーン名</strong> - 識別用の名称
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </span>
              <span>
                <strong>架電モード</strong> - プレディクティブ / プログレッシブ
                / プレビュー
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong>営業時間</strong> - 架電を行う時間帯と曜日
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                4
              </span>
              <span>
                <strong>コールリスト</strong> - 架電先コンタクトの選択
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                5
              </span>
              <span>
                <strong>ユーザー割当</strong> - 参加するユーザーの選択
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-amber-500 flex-shrink-0 mt-0.5 text-sm">i</span>
          <p className="text-xs text-amber-700">
            キャンペーン作成前に、ユーザーとコンタクトの登録を先に完了してください。
            キャンペーン作成時にそれらを割り当てる必要があります。
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            color="primary"
            onPress={() => router.push("/campaigns/new")}
            endContent={<ArrowRight size={16} />}
          >
            キャンペーン作成ページへ
          </Button>
          {!done && (
            <Button variant="light" className="text-gray-400" onPress={onDone}>
              手動で完了にする
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
