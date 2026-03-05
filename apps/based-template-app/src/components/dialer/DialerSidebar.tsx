// components/dialer/DialerSidebar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Headphones,
  PhoneCall,
  ClipboardList,
  ListChecks,
  Ban,
  FileText,
  PhoneForwarded,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getSetupStatus, isSetupComplete } from "@/lib/setupStatus";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "概要",
    items: [
      { label: "ダッシュボード", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "架電管理",
    items: [
      { label: "キャンペーン", href: "/campaigns", icon: Megaphone },
      { label: "コンタクト", href: "/contacts", icon: Users },
      { label: "コールリスト", href: "/call-lists", icon: ListChecks },
      { label: "エージェント", href: "/agents", icon: Headphones },
    ],
  },
  {
    title: "通話記録",
    items: [
      { label: "通話ログ", href: "/call-logs", icon: PhoneCall },
      { label: "コールバック", href: "/callbacks", icon: PhoneForwarded },
    ],
  },
  {
    title: "設定",
    items: [
      { label: "スクリプト", href: "/scripts", icon: FileText },
      { label: "DNCリスト", href: "/dnc", icon: Ban },
      { label: "架電結果設定", href: "/settings/dispositions", icon: ClipboardList },
      { label: "Twilio設定", href: "/settings/twilio", icon: Settings },
      { label: "Google連携", href: "/settings/google", icon: Settings },
    ],
  },
];

export default function DialerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showSetupBadge, setShowSetupBadge] = useState(false);

  useEffect(() => {
    setShowSetupBadge(!isSetupComplete(getSetupStatus()));
  }, []);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <aside
      className={`
        fixed top-0 left-0 h-screen bg-white border-r border-gray-200
        flex flex-col transition-all duration-200 z-30
        ${collapsed ? "w-16" : "w-60"}
      `}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
        {!collapsed && (
          <span className="text-lg font-bold text-primary-600 truncate">
            Dialer
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 text-gray-400"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* セットアップバッジ */}
      {showSetupBadge && (
        <div className={`px-2 py-2 border-b border-gray-100 ${collapsed ? "px-1" : ""}`}>
          <button
            onClick={() => router.push("/setup")}
            className={`
              w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
              bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200
              text-blue-700 hover:from-blue-100 hover:to-indigo-100 transition-all
              ${collapsed ? "justify-center px-0" : ""}
            `}
            title={collapsed ? "初期セットアップ" : undefined}
          >
            <Rocket size={16} className="flex-shrink-0 text-blue-500" />
            {!collapsed && (
              <div className="flex-1 text-left">
                <span className="font-medium text-xs">初期セットアップ</span>
                <span className="block text-[10px] text-blue-500">設定が未完了です</span>
              </div>
            )}
            {!collapsed && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>
      )}

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-hide">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-3">
            {!collapsed && (
              <p className="px-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm
                    transition-colors duration-150
                    ${active
                      ? "bg-primary-50 text-primary-700 font-medium border-r-2 border-primary-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }
                    ${collapsed ? "justify-center px-0" : ""}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
