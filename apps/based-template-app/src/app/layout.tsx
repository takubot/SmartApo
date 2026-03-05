// app/layout.tsx

import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_META_TITLE || "Dialer",
  description: process.env.NEXT_PUBLIC_META_DESCRIPTION || "Predictive Dialer SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
