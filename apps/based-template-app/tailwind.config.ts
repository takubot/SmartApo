// tailwind config is required for editor support

import { heroui } from "@heroui/react";
import sharedConfig from "@repo/tailwind-config";
import type { Config } from "tailwindcss";

// 環境変数からプライマリカラーを取得
const primaryColor = process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#3845ff";
// 環境変数からサイドバーカラーを取得
const sidebarColor = process.env.NEXT_PUBLIC_SIDEBAR_COLOR || "#6366f1";

// グラデーション用の色を生成する関数
function generateGradientColors(baseColor: string) {
  // ベースカラーからHSL値を取得
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  // グラデーション用の色を生成
  return {
    50: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 95%)`,
    100: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 90%)`,
    200: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 80%)`,
    300: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 70%)`,
    400: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 60%)`,
    500: baseColor, // ベースカラー
    600: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 40%)`,
    700: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 30%)`,
    800: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 20%)`,
    900: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, 10%)`,
  };
}

const primaryGradientColors = generateGradientColors(primaryColor);

const config: Config = {
  content: [
    "./src/app/**/*.tsx",
    "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "../../packages/core/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [sharedConfig],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: sidebarColor,
        },
      },
      // タッチフレンドリーなサイズとレスポンシブ対応
      minHeight: {
        touch: "44px", // iOS Human Interface Guidelines推奨
        "touch-lg": "48px", // Material Design推奨
      },
      minWidth: {
        touch: "44px",
        "touch-lg": "48px",
      },
      spacing: {
        touch: "44px",
        "touch-lg": "48px",
      },
    },
  },
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: primaryGradientColors[500],
              foreground: "#ffffff",
              50: primaryGradientColors[50],
              100: primaryGradientColors[100],
              200: primaryGradientColors[200],
              300: primaryGradientColors[300],
              400: primaryGradientColors[400],
              500: primaryGradientColors[500],
              600: primaryGradientColors[600],
              700: primaryGradientColors[700],
              800: primaryGradientColors[800],
              900: primaryGradientColors[900],
            },
          },
        },
        dark: {
          colors: {
            primary: {
              DEFAULT: "#F5A524",
              foreground: "#ffffff",
              50: "hsl(38, 100%, 95%)",
              100: "hsl(38, 100%, 90%)",
              200: "hsl(38, 100%, 80%)",
              300: "hsl(38, 100%, 70%)",
              400: "hsl(38, 100%, 60%)",
              500: "#F5A524",
              600: "hsl(38, 100%, 40%)",
              700: "hsl(38, 100%, 30%)",
              800: "hsl(38, 100%, 20%)",
              900: "hsl(38, 100%, 10%)",
            },
          },
        },
      },
    }) as any,
    // カスタムユーティリティを追加
    function ({ addUtilities }: { addUtilities: any }) {
      const newUtilities = {
        ".touch-friendly": {
          minHeight: "44px",
          minWidth: "44px",
          padding: "8px",
        },
        ".scrollbar-hide": {
          /* IE and Edge */
          "-ms-overflow-style": "none",
          /* Firefox */
          "scrollbar-width": "none",
          /* Safari and Chrome */
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
        // グラデーション用のユーティリティクラス
        ".gradient-primary": {
          background: `linear-gradient(135deg, ${primaryGradientColors[400]}, ${primaryGradientColors[600]})`,
        },
        ".gradient-primary-hover": {
          background: `linear-gradient(135deg, ${primaryGradientColors[500]}, ${primaryGradientColors[700]})`,
        },
        ".gradient-primary-light": {
          background: `linear-gradient(135deg, ${primaryGradientColors[200]}, ${primaryGradientColors[400]})`,
        },
        ".gradient-primary-dark": {
          background: `linear-gradient(135deg, ${primaryGradientColors[600]}, ${primaryGradientColors[800]})`,
        },
        ".gradient-primary-radial": {
          background: `radial-gradient(circle, ${primaryGradientColors[300]}, ${primaryGradientColors[700]})`,
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;
