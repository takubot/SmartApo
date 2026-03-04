"use client";

import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";
import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // 認証状態に依存しないため、テナント関連のロジックは削除

  // パスからページ情報を取得
  const getPageInfo = () => {
    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments.includes("group") && pathSegments.includes("home")) {
      return { title: "グループ一覧", isHome: true };
    }

    if (pathSegments.includes("group") && pathSegments.includes("new")) {
      return { title: "グループ作成", isHome: false };
    }

    return { title: "グループ管理", isHome: false };
  };

  const pageInfo = getPageInfo();

  // ロゴクリックでホームに遷移
  const handleLogoClick = () => {
    router.push("/main/group/home");
  };

  // ホームボタンクリック
  const handleHomeClick = () => {
    router.push("/main/group/home");
  };

  // ログインページと同一のロゴを使用

  return (
    <>
      <header className="bg-white shadow-sm">
        {/* メインヘッダー */}
        <div className="flex items-center justify-between h-16 px-4">
          {/* 左側: ロゴ */}
          <div
            className="flex min-w-64 max-w-64 min-h-16 p-2 items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={handleLogoClick}
            title="ホームに戻る"
          >
            <Image
              src={`/themeIcon/${process.env.NEXT_PUBLIC_LOGO_IMG_URL || "doppel_logo.png"}`}
              alt="doppel_logo"
              width={150}
              height={50}
              style={{ width: "auto", height: "auto" }}
              priority
            />
          </div>
        </div>

        {/* ブレッドクラム（ホーム以外で表示） */}
        {!pageInfo.isHome && (
          <div className="border-t border-gray-200 px-4 py-2 bg-gray-50">
            <Breadcrumbs
              size="sm"
              className="text-gray-600"
              separator={<ChevronRightIcon className="w-3 h-3 text-gray-400" />}
            >
              <BreadcrumbItem
                className="cursor-pointer hover:text-blue-600 transition-colors"
                onPress={handleHomeClick}
              >
                <div className="flex items-center space-x-1">
                  <HomeIcon className="w-3 h-3" />
                  <span>グループ一覧</span>
                </div>
              </BreadcrumbItem>
              <BreadcrumbItem className="text-gray-900 font-medium">
                {pageInfo.title}
              </BreadcrumbItem>
            </Breadcrumbs>
          </div>
        )}
      </header>
    </>
  );
}
