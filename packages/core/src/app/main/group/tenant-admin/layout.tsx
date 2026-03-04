"use client";

import React from "react";
import Sidebar from "./sidebar";

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 items-stretch">
      <Sidebar />
      <section className="flex-1 min-w-0 h-full overflow-y-auto flex justify-center">
        <div className="w-full max-w-full px-4 md:px-6 py-4 md:py-6">
          {children}
        </div>
      </section>
    </div>
  );
}
