import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const metaTitle =
    process.env.NEXT_PUBLIC_META_TITLE ||
    "DOPPEL｜自社データ学習型AIチャットボットで業務を自動化";
  const metaDescription =
    process.env.NEXT_PUBLIC_META_DESCRIPTION ||
    "DOPPEL（ドッペル）は、マニュアルやFAQなどの自社データを学習し、高精度な回答を実現するAIチャットボットです。24時間365日の自動応答で、カスタマーサポートの工数削減や社内のナレッジ共有を効率化。組織の生産性を最大化します。";
  const faviconPath =
    "/favicon/" + (process.env.NEXT_PUBLIC_FAVICON || "doppel.ico");

  // サイトURLを環境変数から取得
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
  const metadataBase = new URL(siteUrl);
  const baseUrl = siteUrl.replace(/\/$/, "");

  // OG画像のパスとURL（環境変数はファイル名のみ、/ogImage/は固定）
  const ogImageFileName =
    process.env.NEXT_PUBLIC_OG_IMAGE_PATH || "doppel-og.png";
  const ogImagePath = `/ogImage/${ogImageFileName}`;
  const ogImageUrl = `${baseUrl}${ogImagePath}`;
  const ogImageSecureUrl = siteUrl.startsWith("https://")
    ? ogImageUrl
    : undefined;

  // OG画像のサイズ（LINE推奨: 1200x628で正方形トリミングを防止）
  const ogImageWidth = 1200;
  const ogImageHeight = 628;

  // 画像タイプをファイル拡張子から自動判定
  const getImageType = (path: string): string => {
    const ext = path.toLowerCase().split(".").pop() || "png";
    return (
      {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
      }[ext] || "image/png"
    );
  };
  const ogImageType = getImageType(ogImagePath);

  return {
    metadataBase,
    title: metaTitle,
    description: metaDescription,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: metaTitle,
    },
    icons: {
      icon: faviconPath,
      shortcut: faviconPath,
      apple: "/themeIcon/DOPPEL_ICON.png",
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: siteUrl,
      siteName: metaTitle,
      locale: "ja_JP",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: ogImageWidth,
          height: ogImageHeight,
          alt: metaTitle,
          type: ogImageType,
          ...(ogImageSecureUrl && { secureUrl: ogImageSecureUrl }),
        },
      ],
    },
    twitter: {
      card: "summary_large_image", // 大きな画像カードを使用
      title: metaTitle,
      description: metaDescription,
      images: [
        {
          url: ogImageUrl, // 絶対URLを直接指定
          alt: metaTitle,
        },
      ],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Material+Icons"
        />
        <link rel="apple-touch-icon" href="/themeIcon/DOPPEL_ICON.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
