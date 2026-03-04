"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface NavigationState {
  isNavigating: boolean;
  navigatingTo: string | null;
  startNavigation: (path: string) => void;
  resetNavigation: () => void;
}

export function useNavigationState(): NavigationState {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const pathname = usePathname();

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

  const resetNavigation = () => {
    setIsNavigating(false);
    setNavigatingTo(null);
  };

  return {
    isNavigating,
    navigatingTo,
    startNavigation,
    resetNavigation,
  };
}
