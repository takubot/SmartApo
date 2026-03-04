"use client";

import { Avatar, Divider, Spinner } from "@heroui/react";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  Bot,
  FileText,
  FormInput,
  Link as LinkIcon,
  Loader2,
  LogOut,
  MessageSquare,
  Search,
  Tag,
  User,
  ListChecks,
  Users,
  ChevronDown,
  ChevronRight,
  Globe,
  Calendar,
} from "lucide-react";
import { BadgeCheck, Crown, Shield } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { auth } from "../../../lib/firebase";
import { useGroupContext, useGroupDataContext } from "./layout-client";
import { useTenantRoleContext } from "../../../context/role";
import { usePermissionCheck } from "../../../lib/permissions";

/* ───────── メニュー定義 ───────── */
const menuItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: BarChart3 },
  { href: "/dataTable", label: "データ検索", icon: Search },
  { href: "/chat", label: "チャット", icon: MessageSquare },
];

const userManagementMenuItems = [
  { href: "/member", label: "メンバー管理", icon: User },
  { href: "/externalUserManage", label: "外部ユーザー管理", icon: Users },
];

const botManagementMenuItems = [
  { href: "/chatBot", label: "ボット管理", icon: Bot },
];

const knowledgeMenuItems = [
  { href: "/file", label: "ファイル管理", icon: FileText },
  { href: "/table", label: "テーブル管理", icon: ListChecks },
  { href: "/category", label: "カテゴリー管理", icon: Tag },
  {
    href: "/reference-link",
    label: "参照リンク管理",
    icon: LinkIcon,
  },
];

const externalChatMenuItems = [
  { href: "/chatEntry", label: "URL管理", icon: LinkIcon },
  { href: "/suggest", label: "サジェスト管理", icon: ListChecks },
  {
    href: "/customForm/manage",
    label: "カスタムフォーム管理",
    icon: FormInput,
  },
  { href: "/booking", label: "予約管理", icon: Calendar },
];

const userChatManageMenuItems = [
  { href: "/userChatManage/line", label: "LINEユーザー", icon: Users },
  { href: "/userChatManage/web", label: "Webユーザー", icon: Globe },
];

/* ───────── 型 ───────── */
interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  /* ----- グループ ID（コンテキスト） ----- */
  const groupId = useGroupContext(); // 現在のグループ ID

  /* ----- サイドバー色はTailwindのbg-sidebarを使用 ----- */

  /* ----- Next.js ルーター関連 ----- */
  const router = useRouter();
  const pathname = usePathname();

  /* ----- ナビゲーション状態管理 ----- */
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isUserChatManageOpen, setIsUserChatManageOpen] = useState(false);
  const [isExternalChatOpen, setIsExternalChatOpen] = useState(false);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  // パス名が変更されたらナビゲーション状態をリセット
  useEffect(() => {
    setIsNavigating(false);
    setNavigatingTo(null);
  }, [pathname]);

  // ナビゲーションタイムアウト（予期しないエラーで永続化することを防ぐ）
  useEffect(() => {
    if (isNavigating) {
      const timeout = setTimeout(() => {
        setIsNavigating(false);
        setNavigatingTo(null);
      }, 5000); // 5秒後にタイムアウト

      return () => clearTimeout(timeout);
    }
  }, [isNavigating]);

  const startNavigation = (path: string) => {
    setNavigatingTo(path);
    setIsNavigating(true);
  };

  /* ----- コンテキストからデータを取得 - 重複したAPI呼び出しを排除 ----- */
  const {
    user,
    groupRole,
    isUserDataLoading: isLoading,
    isUserDataError: error,
    isAuthChecked: authChecked,
  } = useGroupDataContext();

  // tenantRoleとuserProfileを取得
  const { userProfile, tenantRole: userTenantRole } = useTenantRoleContext();

  // 権限コンテキストを統合
  const permissionContext = {
    tenantRole: userTenantRole,
    groupRole,
    isAuthChecked: authChecked,
    isLoading,
    hasError: error,
  };

  // ページ権限チェック用フック
  const { checkAccess } = usePermissionCheck(permissionContext);

  /* ----- ログアウト関連の状態管理 ----- */
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!authChecked) return; // まだ認証確認中
    if (!user || error) {
      // 未ログイン or API エラー → /login へ
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, [authChecked, user, error]);

  /* ----- ログアウト処理 ----- */
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      // ログアウト後はログインページにリダイレクト
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("ログアウトエラー:", error);
      setIsLoggingOut(false);
      // エラー時はモーダルを閉じる
      setShowLogoutModal(false);
    }
  };

  /* ----- モーダル関連のイベントハンドラー ----- */
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showLogoutModal) {
        setShowLogoutModal(false);
      }
    };

    if (showLogoutModal) {
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden"; // スクロールを無効化
      return () => {
        document.removeEventListener("keydown", handleEscapeKey);
        document.body.style.overflow = "unset"; // スクロールを復元
      };
    }
  }, [showLogoutModal]);

  /* ----- メニュー絞り込み - 権限に基づく表示制御 ----- */
  const filteredMenuItems = useMemo(() => {
    // サイドバー項目は定義済みの menuItems を基準に、権限で絞り込み
    return menuItems.filter((item) => checkAccess(item.href));
  }, [checkAccess]);

  const filteredBotManagementMenuItems = useMemo(() => {
    return botManagementMenuItems.filter((item) => checkAccess(item.href));
  }, [checkAccess]);

  const filteredUserManagementMenuItems = useMemo(() => {
    return userManagementMenuItems.filter((item) => checkAccess(item.href));
  }, [checkAccess]);

  const filteredKnowledgeMenuItems = useMemo(() => {
    return knowledgeMenuItems.filter((item) => checkAccess(item.href));
  }, [checkAccess]);

  const filteredExternalChatMenuItems = useMemo(() => {
    return externalChatMenuItems.filter((item) => checkAccess(item.href));
  }, [checkAccess]);

  // リンククリック時の処理（改良版）
  const handleLinkClick = (href: string) => {
    // 現在のページの場合は何もしない
    if (isActivePage(href)) {
      return;
    }

    // 権限チェック
    if (!checkAccess(href)) {
      console.warn(`アクセス権限がありません: ${href}`);
      return;
    }

    // ページ移動の視覚的フィードバックを開始
    startNavigation(href);

    // Next.jsのクライアントサイドナビゲーション使用
    const fullPath = `/main/${groupId}${href}`;
    router.push(fullPath);

    // モバイル時にサイドバーを閉じる
    if (onClose) {
      // 少し遅延させてスムーズに閉じる
      setTimeout(() => {
        onClose();
      }, 150);
    }
  };

  // 現在のページを判定するヘルパー関数
  const isActivePage = (href: string) => {
    // パスの最後のセグメントを取得
    const pathSegments = pathname.split("/");
    const currentPageSegment = pathSegments[pathSegments.length - 1];

    // hrefから先頭のスラッシュを除去してセグメントとして比較
    const targetSegment = href.startsWith("/") ? href.slice(1) : href;

    // 正確な一致を確認
    return currentPageSegment === targetSegment;
  };

  /* ----- ローディング表示 ----- */
  if (!authChecked || (user && isLoading)) {
    return (
      <aside className="w-56 text-gray-100 flex-shrink-0 flex flex-col h-full bg-sidebar">
        {/* ローディング状態のメニュー部分 */}
        <nav className="flex-1 overflow-y-auto">
          <div className="mt-4 px-2 space-y-1">
            {/* メニューアイテムのスケルトン */}
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center px-3 py-3 rounded-md group"
              >
                <div className="w-5 h-5 bg-indigo-400/40 rounded animate-pulse mr-3 flex-shrink-0"></div>
                <div className="h-4 bg-indigo-400/40 rounded animate-pulse flex-1"></div>
              </div>
            ))}
          </div>

          {/* ローディングインジケータ */}
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center space-y-3">
              <Spinner
                size="lg"
                color="white"
                classNames={{
                  circle1: "border-b-white",
                  circle2: "border-b-white",
                }}
              />
              <div className="text-center">
                <p className="text-white/90 text-sm font-medium">
                  設定を読み込み中
                </p>
                <p className="text-indigo-200/70 text-xs mt-1">
                  お待ちください...
                </p>
              </div>
            </div>
          </div>
        </nav>

        {/* ユーザー情報セクションのスケルトン */}
        <div className="border-t border-indigo-400/30 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-indigo-400/40 rounded-full animate-pulse flex-shrink-0"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 bg-indigo-400/40 rounded animate-pulse"></div>
              <div className="h-3 bg-indigo-400/40 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  /* ----- エラー表示 ----- */
  if (error && !isLoading) {
    return (
      <aside className="w-56 text-gray-100 flex-shrink-0 flex flex-col h-full bg-sidebar">
        {/* 基本メニュー（エラー時でも表示） */}
        <nav className="flex-1 overflow-y-auto">
          <div className="mt-4 px-2 space-y-1">
            {/* 基本的なメニューのみ表示 */}
            <div className="flex items-center px-3 py-3 rounded-md opacity-50">
              <MessageSquare className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">チャット</span>
            </div>
          </div>

          {/* エラー通知 */}
          <div className="px-4 py-6">
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <svg
                  className="w-5 h-5 text-red-300 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <h3 className="text-red-100 font-medium text-sm">接続エラー</h3>
              </div>
              <p className="text-red-200 text-xs mb-3 leading-relaxed">
                グループ設定の読み込みに失敗しました。ネットワークを確認してください。
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-3 py-2 bg-red-500/30 hover:bg-red-500/40 text-red-100 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-indigo-500"
              >
                再試行
              </button>
            </div>
          </div>
        </nav>

        {/* ユーザー情報セクション（エラー時） */}
        {user && (
          <div className="p-4 border-t border-indigo-400/30 flex-shrink-0">
            <div className="flex items-center space-x-3 opacity-75">
              <Avatar
                size="sm"
                src={user.photoURL || undefined}
                fallback={<User className="w-4 h-4" />}
                className="border-2 border-red-300/50 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.displayName || "ユーザー"}
                </p>
                <p className="text-xs text-red-200 truncate">制限モード</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  /* ----- サイドバー本体 ----- */
  // 権限に応じたアバター見た目
  const tenantRole = userTenantRole;
  const avatarBorderClass =
    tenantRole === "TENANT_ADMIN"
      ? "border-amber-300"
      : tenantRole === "TENANT_MANAGER"
        ? "border-cyan-300"
        : "border-indigo-300";

  const FallbackIcon =
    tenantRole === "TENANT_ADMIN"
      ? BadgeCheck
      : tenantRole === "TENANT_MANAGER"
        ? Shield
        : User;

  return (
    <aside className="w-56 text-gray-100 flex-shrink-0 flex flex-col h-full bg-sidebar">
      {/* ナビゲーションメニュー */}
      <nav className="flex-1 overflow-y-auto">
        {/* データ読み込み中の微細なローディング表示 */}
        {isLoading && (
          <div className="h-0.5 bg-indigo-400/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse"></div>
          </div>
        )}

        <ul className="mt-4 px-2 space-y-1">
          {filteredMenuItems.map(({ href, label, icon: Icon }) => {
            const isActive = isActivePage(href);
            const isCurrentlyNavigating = navigatingTo === href;

            return (
              <li key={href}>
                <button
                  onClick={() => handleLinkClick(href)}
                  disabled={
                    isActive || (isNavigating && !isCurrentlyNavigating)
                  }
                  className={`w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                    isActive
                      ? "text-white bg-white/10 shadow-lg cursor-default"
                      : "text-indigo-100 hover:bg-white/5"
                  } ${
                    isLoading || (isNavigating && !isCurrentlyNavigating)
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                        ? "cursor-default"
                        : "cursor-pointer"
                  } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                >
                  <div className="flex items-center w-full">
                    {isCurrentlyNavigating ? (
                      <Loader2 className="w-5 h-5 mr-3 flex-shrink-0 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    )}
                    <span className="whitespace-normal break-words leading-5">
                      {label}
                    </span>
                    {isCurrentlyNavigating && (
                      <div className="ml-auto">
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}

          {/* ボット管理（チャット直下の単独メニュー） */}
          {filteredBotManagementMenuItems.map(({ href, label, icon: Icon }) => {
            const isActive = isActivePage(href);
            const isCurrentlyNavigating = navigatingTo === href;

            return (
              <li key={href}>
                <button
                  onClick={() => handleLinkClick(href)}
                  disabled={
                    isActive || (isNavigating && !isCurrentlyNavigating)
                  }
                  className={`w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                    isActive
                      ? "text-white bg-white/10 shadow-lg cursor-default"
                      : "text-indigo-100 hover:bg-white/5"
                  } ${
                    isLoading || (isNavigating && !isCurrentlyNavigating)
                      ? "opacity-50 cursor-not-allowed"
                      : isActive
                        ? "cursor-default"
                        : "cursor-pointer"
                  } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                >
                  <div className="flex items-center w-full">
                    {isCurrentlyNavigating ? (
                      <Loader2 className="w-5 h-5 mr-3 flex-shrink-0 animate-spin" />
                    ) : (
                      <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    )}
                    <span className="whitespace-normal break-words leading-5">
                      {label}
                    </span>
                    {isCurrentlyNavigating && (
                      <div className="ml-auto">
                        <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}

          {/* ナレッジ管理グループ */}
          {filteredKnowledgeMenuItems.length > 0 && (
            <li>
              <button
                onClick={() => setIsKnowledgeOpen(!isKnowledgeOpen)}
                className="w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left text-indigo-100 hover:bg-white/5"
              >
                <div className="flex items-center w-full">
                  <FileText className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="whitespace-normal break-words leading-5">
                    ナレッジ管理
                  </span>
                  <div className="ml-auto">
                    {isKnowledgeOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>
              {isKnowledgeOpen && (
                <ul className="mt-1 ml-4 space-y-1 border-l border-indigo-400/30">
                  {filteredKnowledgeMenuItems.map(
                    ({ href, label, icon: Icon }) => {
                      const isActive = isActivePage(href);
                      const isCurrentlyNavigating = navigatingTo === href;

                      return (
                        <li key={href}>
                          <button
                            onClick={() => handleLinkClick(href)}
                            disabled={
                              isActive ||
                              (isNavigating && !isCurrentlyNavigating)
                            }
                            className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                              isActive
                                ? "text-white bg-white/10 shadow-lg cursor-default"
                                : "text-indigo-100 hover:bg-white/5"
                            } ${
                              isLoading ||
                              (isNavigating && !isCurrentlyNavigating)
                                ? "opacity-50 cursor-not-allowed"
                                : isActive
                                  ? "cursor-default"
                                  : "cursor-pointer"
                            } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                          >
                            <div className="flex items-center w-full">
                              {isCurrentlyNavigating ? (
                                <Loader2 className="w-4 h-4 mr-3 flex-shrink-0 animate-spin" />
                              ) : (
                                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              )}
                              <span className="whitespace-normal break-words leading-5">
                                {label}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </li>
          )}

          {/* ユーザー管理グループ */}
          {filteredUserManagementMenuItems.length > 0 && (
            <li>
              <button
                onClick={() => setIsUserManagementOpen(!isUserManagementOpen)}
                className="w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left text-indigo-100 hover:bg-white/5"
              >
                <div className="flex items-center w-full">
                  <User className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="whitespace-normal break-words leading-5">
                    ユーザー管理
                  </span>
                  <div className="ml-auto">
                    {isUserManagementOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>
              {isUserManagementOpen && (
                <ul className="mt-1 ml-4 space-y-1 border-l border-indigo-400/30">
                  {filteredUserManagementMenuItems.map(
                    ({ href, label, icon: Icon }) => {
                      const isActive = isActivePage(href);
                      const isCurrentlyNavigating = navigatingTo === href;

                      return (
                        <li key={href}>
                          <button
                            onClick={() => handleLinkClick(href)}
                            disabled={
                              isActive ||
                              (isNavigating && !isCurrentlyNavigating)
                            }
                            className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                              isActive
                                ? "text-white bg-white/10 shadow-lg cursor-default"
                                : "text-indigo-100 hover:bg-white/5"
                            } ${
                              isLoading ||
                              (isNavigating && !isCurrentlyNavigating)
                                ? "opacity-50 cursor-not-allowed"
                                : isActive
                                  ? "cursor-default"
                                  : "cursor-pointer"
                            } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                          >
                            <div className="flex items-center w-full">
                              {isCurrentlyNavigating ? (
                                <Loader2 className="w-4 h-4 mr-3 flex-shrink-0 animate-spin" />
                              ) : (
                                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              )}
                              <span className="whitespace-normal break-words leading-5">
                                {label}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </li>
          )}

          {/* 外部チャット管理グループ */}
          {filteredExternalChatMenuItems.length > 0 && (
            <li>
              <button
                onClick={() => setIsExternalChatOpen(!isExternalChatOpen)}
                className="w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left text-indigo-100 hover:bg-white/5"
              >
                <div className="flex items-center w-full">
                  <Globe className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="whitespace-normal break-words leading-5">
                    外部チャット管理
                  </span>
                  <div className="ml-auto">
                    {isExternalChatOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </button>
              {isExternalChatOpen && (
                <ul className="mt-1 ml-4 space-y-1 border-l border-indigo-400/30">
                  {filteredExternalChatMenuItems.map(
                    ({ href, label, icon: Icon }) => {
                      const isActive = isActivePage(href);
                      const isCurrentlyNavigating = navigatingTo === href;

                      return (
                        <li key={href}>
                          <button
                            onClick={() => handleLinkClick(href)}
                            disabled={
                              isActive ||
                              (isNavigating && !isCurrentlyNavigating)
                            }
                            className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                              isActive
                                ? "text-white bg-white/10 shadow-lg cursor-default"
                                : "text-indigo-100 hover:bg-white/5"
                            } ${
                              isLoading ||
                              (isNavigating && !isCurrentlyNavigating)
                                ? "opacity-50 cursor-not-allowed"
                                : isActive
                                  ? "cursor-default"
                                  : "cursor-pointer"
                            } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                          >
                            <div className="flex items-center w-full">
                              {isCurrentlyNavigating ? (
                                <Loader2 className="w-4 h-4 mr-3 flex-shrink-0 animate-spin" />
                              ) : (
                                <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              )}
                              <span className="whitespace-normal break-words leading-5">
                                {label}
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </li>
          )}

          {/* チャット管理グループ */}
          <li>
            <button
              onClick={() => setIsUserChatManageOpen(!isUserChatManageOpen)}
              className="w-full flex items-center px-3 py-3 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left text-indigo-100 hover:bg-white/5"
            >
              <div className="flex items-center w-full">
                <Users className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="whitespace-normal break-words leading-5">
                  チャット管理
                </span>
                <div className="ml-auto">
                  {isUserChatManageOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </div>
            </button>
            {isUserChatManageOpen && (
              <ul className="mt-1 ml-4 space-y-1 border-l border-indigo-400/30">
                {userChatManageMenuItems.map(({ href, label, icon: Icon }) => {
                  const isActive = isActivePage(href);
                  const isCurrentlyNavigating = navigatingTo === href;

                  return (
                    <li key={href}>
                      <button
                        onClick={() => handleLinkClick(href)}
                        disabled={
                          isActive || (isNavigating && !isCurrentlyNavigating)
                        }
                        className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 touch-manipulation text-left ${
                          isActive
                            ? "text-white bg-white/10 shadow-lg cursor-default"
                            : "text-indigo-100 hover:bg-white/5"
                        } ${
                          isLoading || (isNavigating && !isCurrentlyNavigating)
                            ? "opacity-50 cursor-not-allowed"
                            : isActive
                              ? "cursor-default"
                              : "cursor-pointer"
                        } ${isCurrentlyNavigating ? "opacity-75" : ""}`}
                      >
                        <div className="flex items-center w-full">
                          {isCurrentlyNavigating ? (
                            <Loader2 className="w-4 h-4 mr-3 flex-shrink-0 animate-spin" />
                          ) : (
                            <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                          )}
                          <span className="whitespace-normal break-words leading-5">
                            {label}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>

      {/* ログアウト確認モーダル */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all duration-200 ease-out scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* モーダルヘッダー */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                ログアウトしますか？
              </h3>
              <p className="text-sm text-gray-600 text-center">
                現在のセッションが終了され、ログイン画面に戻ります。
              </p>
            </div>

            {/* モーダルボタン */}
            <div className="px-6 pb-6">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex-1 px-4 py-3 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isLoggingOut ? (
                    <>
                      <Spinner
                        size="sm"
                        color="white"
                        classNames={{
                          circle1: "border-b-white",
                          circle2: "border-b-white",
                        }}
                      />
                      <span>ログアウト中...</span>
                    </>
                  ) : (
                    <span>ログアウト</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ユーザー情報セクション */}
      {user && (
        <div className="p-4 border-t border-indigo-400 flex-shrink-0">
          <Divider className="mb-4 bg-indigo-400" />

          {/* ユーザー情報とログアウトアイコン */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar
                size="sm"
                src={user.photoURL || undefined}
                fallback={<FallbackIcon className="w-4 h-4" />}
                className={`border-2 ${avatarBorderClass} flex-shrink-0 transition-all duration-200 ${
                  isLoading ? "opacity-75" : ""
                }`}
              />
              {/* グループ権限バッジ（右上） */}
              {groupRole === "GROUP_OWNER" && (
                <Crown className="w-3 h-3 text-yellow-300 absolute -top-1 -right-1 drop-shadow" />
              )}
              {groupRole === "GROUP_MANAGER" && (
                <Shield className="w-3 h-3 text-cyan-200 absolute -top-1 -right-1 drop-shadow" />
              )}
              {/* テナント権限バッジ（右下） */}
              {tenantRole === "TENANT_ADMIN" && (
                <BadgeCheck className="w-3 h-3 text-amber-300 absolute -bottom-1 -right-1 drop-shadow" />
              )}
              {tenantRole === "TENANT_MANAGER" && (
                <Shield className="w-3 h-3 text-indigo-200 absolute -bottom-1 -right-1 drop-shadow" />
              )}
              {isLoading && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userProfile?.userName || user?.displayName || "ユーザー"}
              </p>
              <p
                className="text-xs text-indigo-200 truncate"
                title={userProfile?.email || user?.email || ""}
              >
                {userProfile?.email || user?.email}
              </p>
            </div>

            {/* ログアウトアイコンボタン */}
            <button
              onClick={() => setShowLogoutModal(true)}
              disabled={isLoggingOut || isNavigating}
              className="p-2 rounded-lg bg-indigo-600/30 hover:bg-red-500/20 text-indigo-200 hover:text-red-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-indigo-500 disabled:opacity-50 group flex-shrink-0"
              title="ログアウト"
            >
              <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
