// app/(dialer)/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { DialerSidebar } from "@/components/dialer";
import { useAuth } from "../providers";

export default function DialerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DialerSidebar />
      <main className="flex-1 ml-60 p-6 transition-all duration-200">
        {children}
      </main>
    </div>
  );
}
