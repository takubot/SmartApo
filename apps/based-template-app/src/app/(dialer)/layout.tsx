// app/(dialer)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DialerSidebar } from "@/components/dialer";
import { isAuthenticated, logout } from "@/lib/auth";

export default function DialerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DialerSidebar />
      <main className="flex-1 ml-60 p-6 transition-all duration-200">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => { logout(); router.replace("/"); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ログアウト
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
