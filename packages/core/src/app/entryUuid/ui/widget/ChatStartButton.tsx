"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

interface ChatStartButtonConfig {
  chatOpenTypeDesktop?: string;
  chatOpenLabelDesktop?: string | null;
  chatOpenLabelDesktopTranslations?: Record<string, string> | null;
  chatOpenImageUrlDesktop?: string | null;
  chatOpenImageWidthDesktop?: number;
  chatOpenTypeMobile?: string;
  chatOpenLabelMobile?: string | null;
  chatOpenLabelMobileTranslations?: Record<string, string> | null;
  chatOpenImageUrlMobile?: string | null;
  chatOpenImageWidthMobile?: number;
  chatButtonColor: string;
  translations?: any; // 後位互換性のために残す
}

interface ChatStartButtonProps {
  config: ChatStartButtonConfig;
  isInitialized: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onRemove: () => void;
  anchor?: string; // アンカー位置（"bottom-right", "bottom-left", etc.）
  overrideViewport?: { width: number; height: number };
  onImageAspectRatioChange?: (payload: {
    isMobile: boolean;
    aspectRatio: number | null;
  }) => void;
  onMeasuredSizeChange?: (size: { width: number; height: number }) => void;
}

const ChatStartButton: React.FC<ChatStartButtonProps> = ({
  config,
  isInitialized,
  isOpen,
  onToggle,
  onRemove,
  anchor = "bottom-right",
  overrideViewport,
  onImageAspectRatioChange,
  onMeasuredSizeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const resolvedViewportWidth =
    overrideViewport?.width ??
    (typeof window !== "undefined" ? window.innerWidth : 1024);

  // アンカーから「左右」を判定
  const isRightSide = !anchor.includes("left");

  // isMobileをstateからuseMemoに変更し、同期的に計算する
  const isMobile = useMemo(() => {
    return resolvedViewportWidth <= 768;
  }, [resolvedViewportWidth]);

  const [displayImageSrc, setDisplayImageSrc] = useState<string>("");
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const reportAspectRatioChange = useCallback(
    (ratio: number | null) => {
      if (typeof onImageAspectRatioChange === "function") {
        onImageAspectRatioChange({ isMobile, aspectRatio: ratio });
      }
    },
    [isMobile, onImageAspectRatioChange],
  );

  // 画像ソースの決定と更新 - mobile/desktop対応
  useEffect(() => {
    let imageSrc = "";
    let openType: string;

    if (isMobile) {
      openType = config.chatOpenTypeMobile || "BUTTON";
      if (
        openType === "IMAGE" &&
        config.chatOpenImageUrlMobile &&
        config.chatOpenImageUrlMobile.trim() !== ""
      ) {
        imageSrc = config.chatOpenImageUrlMobile;
      }
    } else {
      openType = config.chatOpenTypeDesktop || "BUTTON";
      if (
        openType === "IMAGE" &&
        config.chatOpenImageUrlDesktop &&
        config.chatOpenImageUrlDesktop.trim() !== ""
      ) {
        imageSrc = config.chatOpenImageUrlDesktop;
      }
    }

    setDisplayImageSrc(imageSrc);
  }, [
    config.chatOpenImageUrlDesktop,
    config.chatOpenImageUrlMobile,
    config.chatOpenTypeDesktop,
    config.chatOpenTypeMobile,
    isMobile,
  ]);

  // アスペクト比計算
  useEffect(() => {
    if (displayImageSrc) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        setImageAspectRatio(aspectRatio);
        reportAspectRatioChange(aspectRatio);
      };
      img.onerror = () => {
        setImageAspectRatio(null);
        reportAspectRatioChange(null);
      };
      img.src = displayImageSrc;
    } else {
      setImageAspectRatio(null);
      reportAspectRatioChange(null);
    }
  }, [displayImageSrc, reportAspectRatioChange]);

  const getDefaultLabel = useCallback(() => {
    if (typeof navigator === "undefined") {
      return "Start chat";
    }
    const locale = (navigator.language || "en").toLowerCase();
    if (locale.startsWith("ja")) return "チャットを開始";
    if (locale.startsWith("ko")) return "채팅 시작";
    if (locale.startsWith("zh-hant") || locale.startsWith("zh-tw")) {
      return "開始聊天";
    }
    if (locale.startsWith("zh")) return "开始聊天";
    if (locale.startsWith("es")) return "Iniciar chat";
    if (locale.startsWith("fr")) return "Démarrer le chat";
    if (locale.startsWith("de")) return "Chat starten";
    if (locale.startsWith("pt")) return "Iniciar chat";
    if (locale.startsWith("id")) return "Mulai chat";
    if (locale.startsWith("th")) return "เริ่มแชต";
    return "Start chat";
  }, []);

  const normalizeLabel = useCallback((value?: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "";
  }, []);

  const currentLabel = useMemo(() => {
    // ブラウザの言語を取得
    const browserLang =
      ((typeof navigator !== "undefined" ? navigator.language : "en") || "en")
        .toLowerCase()
        .split("-")[0] || "en";

    // デバイスに応じた翻訳データを選択
    const deviceTranslations = isMobile
      ? config.chatOpenLabelMobileTranslations
      : config.chatOpenLabelDesktopTranslations;

    // 1. デバイス別翻訳データがある場合は、まずそれを探す
    if (deviceTranslations && typeof deviceTranslations === "object") {
      const translated = deviceTranslations[browserLang];
      if (translated) return translated;
    }

    // 2. 互換性のために、古い config.translations も確認する
    if (
      config.translations &&
      typeof config.translations === "object" &&
      browserLang
    ) {
      const translated = (config.translations as Record<string, string>)[
        browserLang
      ];
      if (translated) return translated;
    }

    const mobileLabel = normalizeLabel(config.chatOpenLabelMobile);
    const desktopLabel = normalizeLabel(config.chatOpenLabelDesktop);
    const fallback = getDefaultLabel();

    if (isMobile) {
      return mobileLabel || desktopLabel || fallback;
    }
    return desktopLabel || mobileLabel || fallback;
  }, [
    config.chatOpenLabelDesktop,
    config.chatOpenLabelDesktopTranslations,
    config.chatOpenLabelMobile,
    config.chatOpenLabelMobileTranslations,
    config.translations,
    getDefaultLabel,
    isMobile,
    normalizeLabel,
  ]);

  const currentOpenType = useMemo(() => {
    if (isMobile) {
      return config.chatOpenTypeMobile || "BUTTON";
    }
    return config.chatOpenTypeDesktop || "BUTTON";
  }, [config.chatOpenTypeDesktop, config.chatOpenTypeMobile, isMobile]);

  // 実際のサイズを計測して親に伝える（iframeのサイズを最小化するため）
  useEffect(() => {
    if (!containerRef.current || isOpen || !isInitialized) return;

    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // 影やホバー時の拡大、アニメーションの揺れを考慮して、計測サイズに十分なバッファ（12px）を追加
        // これにより、iframeの境界で見切れることを物理的に防ぎます
        onMeasuredSizeChange?.({
          width: Math.ceil(rect.width) + 12,
          height: Math.ceil(rect.height) + 12,
        });
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    // 初期計測
    measure();

    return () => observer.disconnect();
  }, [isOpen, isInitialized, onMeasuredSizeChange, currentLabel, isMobile]);

  const hasImage =
    currentOpenType === "IMAGE" && displayImageSrc.trim().length > 0;
  // 画像がない場合のみ吹き出しを表示する（スマホでも表示する）
  const shouldShowLabelBubble = !hasImage && currentLabel.trim().length > 0;

  // ボタンのサイズを動的に計算（円形ボタンとして統一）
  const circleButtonSize = useMemo(() => {
    // ビューポートサイズ取得
    const viewportWidth =
      overrideViewport?.width ??
      (typeof window !== "undefined" ? window.innerWidth : 1024);

    if (isMobile) {
      // モバイル：ビューポート幅の18%〜22%程度（最小56px, 最大80px）
      const sizePx = (20 / 100) * viewportWidth;
      return Math.max(56, Math.min(sizePx, 80));
    } else {
      // デスクトップ：固定サイズに近いバランス（64px前後）
      return 64;
    }
  }, [isMobile, overrideViewport?.width]);

  // 画像の高さを計算（幅とアスペクト比から）- ピクセルで返す
  const calculatedImageHeightPx = useMemo(() => {
    const imageWidthPercent = isMobile
      ? config.chatOpenImageWidthMobile
      : config.chatOpenImageWidthDesktop;

    if (!imageWidthPercent) return 60;

    const viewportWidth =
      overrideViewport?.width ??
      (typeof window !== "undefined" ? window.innerWidth : 375);
    const widthInPixels = (imageWidthPercent / 100) * viewportWidth;
    const aspectRatio = imageAspectRatio || 1;
    return widthInPixels * aspectRatio;
  }, [
    imageAspectRatio,
    config.chatOpenImageWidthMobile,
    config.chatOpenImageWidthDesktop,
    isMobile,
    overrideViewport?.width,
  ]);

  const containerStyle = useMemo(() => {
    const style = {
      width: "auto", // 内容に合わせて伸縮
      height: "auto",
      pointerEvents: "auto" as const, // ResizeObserverでiframe自体を最小化するため、ここはautoでOK
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      position: "relative" as const,
      zIndex: 1000001,
      backgroundColor: "transparent",
      padding: "16px", // 影や×ボタン、ホバー時の拡大が絶対に収まるようにパディングを広めに確保
      margin: 0,
      overflow: "visible" as const,
    };

    return style;
  }, []);

  // アニメーションクラス
  const animationClass = isOpen ? "duration-300" : "";
  const visibilityClass =
    isInitialized && !isOpen
      ? "opacity-100 scale-100"
      : "opacity-0 scale-90 pointer-events-none";

  // 画像サイズ計算
  const imageSize = useMemo(() => {
    if (!hasImage) return null;
    const viewportWidth =
      overrideViewport?.width ??
      (typeof window !== "undefined" ? window.innerWidth : 375);

    const imageWidthPercent = isMobile
      ? config.chatOpenImageWidthMobile
      : config.chatOpenImageWidthDesktop;
    const imageWidthPx = ((imageWidthPercent ?? 5) / 100) * viewportWidth;

    return {
      widthPx: imageWidthPx,
      heightPx: calculatedImageHeightPx,
    };
  }, [
    hasImage,
    config.chatOpenImageWidthMobile,
    config.chatOpenImageWidthDesktop,
    isMobile,
    calculatedImageHeightPx,
    overrideViewport?.width,
  ]);

  // ボタンサイズ計算
  const buttonSize = useMemo(() => {
    if (hasImage && imageSize) {
      return {
        width: `${imageSize.widthPx}px`,
        height: `${imageSize.heightPx}px`,
      };
    }
    return {
      width: `${circleButtonSize}px`,
      height: `${circleButtonSize}px`,
    };
  }, [hasImage, imageSize, circleButtonSize]);

  const parseHexColor = useCallback((color: string) => {
    const hex = color.trim().replace("#", "");
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const normalized =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }, []);

  const mixColor = useCallback(
    (color: string, mixWith: string, amount: number) => {
      const base = parseHexColor(color);
      const mix = parseHexColor(mixWith);
      if (!base || !mix) return color;
      const clamp = (value: number) => Math.max(0, Math.min(255, value));
      const r = clamp(Math.round(base.r + (mix.r - base.r) * amount));
      const g = clamp(Math.round(base.g + (mix.g - base.g) * amount));
      const b = clamp(Math.round(base.b + (mix.b - base.b) * amount));
      return `rgb(${r}, ${g}, ${b})`;
    },
    [parseHexColor],
  );

  const buttonStyle = useMemo(() => {
    const primary = config.chatButtonColor || "#00AAFF";
    const accent = mixColor(primary, "#ffffff", 0.45);
    const accentDeep = mixColor(primary, "#000000", 0.2);
    const style = {
      width: buttonSize.width,
      height: buttonSize.height,
      minWidth: buttonSize.width,
      minHeight: buttonSize.height,
      border: "none",
      borderRadius: hasImage ? "20px" : "9999px",
      backgroundColor: hasImage ? "transparent" : primary,
      backgroundImage: hasImage
        ? "none"
        : `linear-gradient(135deg, ${accent} -20%, ${primary} 50%, ${accentDeep} 120%)`,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      cursor: "pointer",
      transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      boxSizing: "border-box" as const,
      boxShadow: hasImage
        ? "none"
        : `0 20px 40px -12px ${mixColor(primary, "#000000", 0.4)}, 0 0 20px ${mixColor(primary, "#ffffff", 0.3)} inset`,
      outline: "2px solid rgba(255,255,255,0.4)",
      outlineOffset: "-4px",
      position: "relative" as const,
    };

    return style;
  }, [buttonSize, config.chatButtonColor, hasImage, mixColor]);

  const labelMaxWidth = useMemo(() => {
    const max = isMobile ? 240 : 280;
    const min = 140;
    return Math.max(
      min,
      Math.min(max, Math.round(resolvedViewportWidth * 0.5)),
    );
  }, [isMobile, resolvedViewportWidth]);

  const renderContent = () => {
    if (hasImage && imageSize) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImageSrc}
            alt={currentLabel}
            style={{
              width: `${imageSize.widthPx}px`,
              height: `${imageSize.heightPx}px`,
              objectFit: "contain",
              borderRadius: "20px",
              transition:
                "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            className="group-hover:scale-110"
          />
        </div>
      );
    }

    // デフォルト：丸アイコンスタイル
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: "100%",
          height: "100%",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4), transparent 80%)",
        }}
        className="animate-glow"
      >
        <div style={{ position: "relative" }}>
          <ChatBubbleIcon size={isMobile ? 28 : 32} />
          <SparkleIcon
            size={isMobile ? 12 : 14}
            style={{
              position: "absolute",
              top: "-6px",
              right: "-8px",
              color: "#FFD700",
              filter: "drop-shadow(0 0 4px rgba(255,215,0,0.8))",
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.2); }
          50% { box-shadow: 0 0 40px rgba(255,255,255,0.5); }
        }
        .animate-glow {
          animation: glow 4s infinite ease-in-out;
        }
        .start-button-hover:hover {
          transform: translateY(-5px) scale(1.05);
          filter: brightness(1.1);
        }
        .start-button-active:active {
          transform: translateY(-2px) scale(0.98);
        }
        .remove-button-hover:hover {
          background-color: #ff4d4d !important;
          transform: scale(1.1);
          opacity: 1 !important;
          border-color: #fff !important;
        }
        .bubble-in-right {
          animation: bubble-in-right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .bubble-in-left {
          animation: bubble-in-left 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes bubble-in-right {
          from { opacity: 0; transform: translateX(10px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes bubble-in-left {
          from { opacity: 0; transform: translateX(-10px) scale(0.8); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
      <div
        ref={containerRef}
        className={`fixed z-50 pointer-events-auto transition-all ${animationClass} ${visibilityClass} group start-button-hover start-button-active`}
        style={containerStyle}
        suppressHydrationWarning={true}
      >
        <div
          style={{
            display: "flex",
            flexDirection: isRightSide ? "row" : "row-reverse", // 右配置なら吹き出しは左、左配置なら吹き出しは右
            alignItems: "center",
            gap: shouldShowLabelBubble ? (isMobile ? "8px" : "14px") : "0",
            justifyContent: isRightSide ? "flex-end" : "flex-start",
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
          }}
        >
          {shouldShowLabelBubble && (
            <LabelBubble
              label={currentLabel}
              maxWidth={labelMaxWidth}
              isRightSide={isRightSide}
              isMobile={isMobile}
              onClick={onToggle}
            />
          )}
          <button
            type="button"
            onClick={onToggle}
            style={buttonStyle}
            suppressHydrationWarning={true}
            aria-label={currentLabel}
          >
            {renderContent()}
          </button>
        </div>

        <button
          aria-label="ウィジェットを削除"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof onRemove === "function") {
              onRemove();
            }
          }}
          className={`absolute text-white flex items-center justify-center transition-all duration-300 remove-button-hover ${
            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            width: isMobile ? "24px" : "22px",
            height: isMobile ? "24px" : "22px",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: "9999px",
            top: isMobile ? "4px" : "8px", // スマホ時は少し外側に寄せる
            right: isMobile ? "4px" : "8px",
            zIndex: 51,
            cursor: "pointer",
            pointerEvents: "auto", // 確実にクリック可能に
            border: "1.5px solid rgba(255,255,255,0.4)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
          suppressHydrationWarning={true}
          title="ウィジェットを削除"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </>
  );
};

export default ChatStartButton;

const LabelBubble = ({
  label,
  maxWidth,
  isRightSide,
  isMobile,
  onClick,
}: {
  label: string;
  maxWidth: number;
  isRightSide: boolean;
  isMobile: boolean;
  onClick?: () => void;
}) => {
  return (
    <div
      style={{
        position: "relative",
        background: "rgba(15, 23, 42, 0.92)",
        backdropFilter: "blur(20px)",
        color: "#fff",
        borderRadius: isMobile ? "16px" : "20px",
        padding: isMobile ? "8px 14px" : "12px 20px",
        fontSize: isMobile ? "13px" : "15px",
        fontWeight: 700,
        lineHeight: 1.3,
        pointerEvents: "auto", // クリック可能に
        cursor: "pointer", // カーソルをポインターに
        boxShadow:
          "0 15px 35px -10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.15)",
        maxWidth: `${maxWidth}px`,
        minWidth: isMobile ? "80px" : "100px",
        marginLeft: isRightSide ? "0" : isMobile ? "8px" : "12px",
        marginRight: isRightSide ? (isMobile ? "8px" : "12px") : "0",
        whiteSpace: "normal",
        overflow: "visible", // 三角形をはみ出させるため
        textOverflow: "ellipsis",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        textAlign: "center",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical" as const,
        border: "1px solid rgba(255,255,255,0.2)",
        letterSpacing: "-0.01em",
      }}
      className={isRightSide ? "bubble-in-right" : "bubble-in-left"}
      onClick={onClick}
    >
      {label}
      <span
        style={{
          position: "absolute",
          right: isRightSide ? "-7px" : "auto",
          left: isRightSide ? "auto" : "-7px",
          top: "50%",
          width: "14px",
          height: "14px",
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          transform: "translateY(-50%) rotate(45deg)",
          borderRadius: "3px",
          borderRight: isRightSide ? "1px solid rgba(255,255,255,0.2)" : "none",
          borderTop: isRightSide ? "1px solid rgba(255,255,255,0.2)" : "none",
          borderLeft: isRightSide ? "none" : "1px solid rgba(255,255,255,0.2)",
          borderBottom: isRightSide
            ? "none"
            : "1px solid rgba(255,255,255,0.2)",
          zIndex: -1,
        }}
      />
    </div>
  );
};

const ChatBubbleIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path
      d="M21 11.5C21 16.1944 16.9706 20 12 20C10.5181 20 9.12462 19.6582 7.893 19.052L4 20L5 16.312C4.3642 14.9431 4 13.3191 4 11.5C4 6.80558 8.02944 3 12 3C15.9706 3 20 6.80558 20 11.5Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SparkleIcon = ({
  size = 16,
  style = {},
}: {
  size?: number;
  style?: React.CSSProperties;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block", ...style }}
  >
    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
  </svg>
);
