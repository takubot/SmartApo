"use client";

import { LayoutDashboard, Settings, Users, Bot, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React from "react";

type MenuItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const MENU_ITEMS: MenuItem[] = [
  {
    href: "/main/group/tenant-admin/dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
  },
  {
    href: "/main/group/tenant-admin/dataTable",
    label: "データ検索",
    icon: Search,
  },
  {
    href: "/main/group/tenant-admin/user",
    label: "ユーザー管理",
    icon: Users,
  },
  {
    href: "/main/group/tenant-admin/setting",
    label: "設定",
    icon: Settings,
  },
  {
    href: "/main/group/tenant-admin/template-setting",
    label: "ボットテンプレ",
    icon: Bot,
  },
];

export default function TenantAdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigate = (href: string) => {
    if (pathname === href) return;
    router.push(href);
  };

  return (
    <aside className="w-48 text-gray-100 flex-shrink-0 flex flex-col h-full bg-sidebar">
      <nav className="flex-1 overflow-y-auto">
        <div className="mt-4 px-2 mb-2">
          <p className="text-xs font-semibold text-indigo-200/80 tracking-wide uppercase">
            テナント管理
          </p>
        </div>
        <ul className="px-2 space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => handleNavigate(item.href)}
                  className={`w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-left ${
                    isActive
                      ? "text-white bg-white/10 shadow-lg cursor-default"
                      : "text-indigo-100 hover:bg-white/5 cursor-pointer"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
