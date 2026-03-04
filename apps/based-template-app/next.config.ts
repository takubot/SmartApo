import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  onDemandEntries: {
    // ページが非アクティブになってから25秒後にメモリから削除
    maxInactiveAge: 25 * 1000,
    // 同時に保持するページ数を制限
    pagesBufferLength: 2,
  },
  env: {
    NEXT_PUBLIC_TENANT_ID: process.env.NEXT_PUBLIC_TENANT_ID,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIRESTORE_DATABASE_ID:
      process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID,
    NEXT_PUBLIC_LOGO_IMG_URL: process.env.NEXT_PUBLIC_LOGO_IMG_URL,
    NEXT_PUBLIC_PRIMARY_COLOR: process.env.NEXT_PUBLIC_PRIMARY_COLOR,
    NEXT_PUBLIC_SIDEBAR_COLOR: process.env.NEXT_PUBLIC_SIDEBAR_COLOR,
    NEXT_PUBLIC_CHAT_TITLE: process.env.NEXT_PUBLIC_CHAT_TITLE,
    NEXT_PUBLIC_FAVICON: process.env.NEXT_PUBLIC_FAVICON || "doppel.ico",
    NEXT_PUBLIC_META_TITLE: process.env.NEXT_PUBLIC_META_TITLE || "doppel",
    NEXT_PUBLIC_META_DESCRIPTION:
      process.env.NEXT_PUBLIC_META_DESCRIPTION || "doppel",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_OG_IMAGE_PATH: process.env.NEXT_PUBLIC_OG_IMAGE_PATH,
  },
};

export default nextConfig;
