// components/dialer/DialerSidebar.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
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
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getSetupStatus, isSetupComplete } from "@/lib/setupStatus";
import { useAuth } from "@/app/providers";
import { logout } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon | React.FC<{ size?: number; className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GoogleIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 18,
  className,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

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
      {
        label: "架電結果設定",
        href: "/settings/dispositions",
        icon: ClipboardList,
      },
      { label: "Twilio設定", href: "/settings/twilio", icon: Settings },
    ],
  },
  {
    title: "外部連携",
    items: [
      { label: "Google連携", href: "/settings/google", icon: GoogleIcon },
    ],
  },
];

export default function DialerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
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
        <div
          className={`px-2 py-2 border-b border-gray-100 ${collapsed ? "px-1" : ""}`}
        >
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
                <span className="block text-[10px] text-blue-500">
                  設定が未完了です
                </span>
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
                    ${
                      active
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

      {/* ユーザー情報 & ログアウト */}
      <div className="border-t border-gray-200 px-3 py-3">
        {!collapsed && user && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-gray-700 truncate">
              {user.displayName || "ユーザー"}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
            text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors
            ${collapsed ? "justify-center px-0" : ""}
          `}
          title={collapsed ? "ログアウト" : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>ログアウト</span>}
        </button>
      </div>
    </aside>
  );
}
