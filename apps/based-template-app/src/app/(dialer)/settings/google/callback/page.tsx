// app/(dialer)/settings/google/callback/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@heroui/react";

export default function GoogleOAuthCallbackPage() {
  const searchParams = useSearchParams();
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code) {
      window.close();
      return;
    }

    if (window.opener) {
      window.opener.postMessage(
        { type: "google-oauth-callback", code, state },
        window.location.origin,
      );
    }

    setTimeout(() => window.close(), 1000);
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500">認証処理中...</p>
      <p className="text-xs text-gray-400">このウィンドウは自動的に閉じます</p>
    </div>
  );
}
