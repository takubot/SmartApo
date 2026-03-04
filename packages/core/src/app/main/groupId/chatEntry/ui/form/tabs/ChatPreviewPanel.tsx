"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import type { ChatEntryThemeSchemaType } from "@repo/api-contracts/based_template/zschema";
import { gradientFrom } from "../../../../../../../common/colorUtils";

interface ChatPreviewPanelProps {
  themeConfig: Partial<ChatEntryThemeSchemaType> | null | undefined;
  activeDeviceTab: "desktop" | "mobile";
  urlType?: string;
}

// ストリーミング表示コンポーネント
const StreamingMessage = ({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, 30); // 30msごとに1文字表示（調整可能）

    return () => clearInterval(interval);
  }, [text, isStreaming]);

  return (
    <>
      <style>
        {`
          @keyframes blink {
            0%, 50% {
              opacity: 1;
            }
            51%, 100% {
              opacity: 0;
            }
          }
        `}
      </style>
      <span
        style={{
          wordWrap: "break-word",
          overflowWrap: "break-word",
          whiteSpace: "normal",
          display: "inline",
        }}
      >
        {displayedText}
        {isStreaming && !isComplete && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: "1em",
              backgroundColor: "#374151",
              marginLeft: "2px",
              animation: "blink 1s infinite",
              verticalAlign: "baseline",
            }}
          />
        )}
      </span>
    </>
  );
};

// デスクトップ/モバイル別のプレビューコンポーネント（インライン表示用）
const InlineDevicePreview = ({
  device,
  isOpen,
  setIsOpen,
  config,
  urlType,
}: {
  device: "desktop" | "mobile";
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: {
    chatOpenType: string;
    chatOpenLabel: string | null;
    chatOpenImageUrl: string | null;
    chatOpenButtonWidth: number;
    chatOpenButtonHeight: number;
    chatOpenImageWidth: number;
    chatOpenImageHeight?: number;
    chatButtonColor: string;
    chatWidth: number;
    chatHeight: number;
    positionAnchor: string;
    buttonHorizontalPosition: number;
    buttonVerticalPosition: number;
    widgetHorizontalPosition: number;
    widgetVerticalPosition: number;
    headerColor: string;
    headerTextColor: string;
    headerText: string | null;
    initialGreeting: string | null;
    isGreetingStreamingEnabled: boolean;
    themeImageFile?: string | null;
  };
  urlType?: string;
}) => {
  const isLineType = urlType === "LINE";
  const isMobileDevice = device === "mobile";

  // LINEタイプの場合は常に開いた状態にする（ボタンがないため）
  const actualIsOpen = isLineType ? true : isOpen;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      const panelElement = containerRef.current?.parentElement;
      if (panelElement) {
        setContainerSize({
          width: panelElement.clientWidth,
          height: panelElement.clientHeight,
        });
      }
    };

    const timer = setTimeout(updateSize, 100);

    let resizeObserver: ResizeObserver | null = null;
    const initObserver = () => {
      const panelElement = containerRef.current?.parentElement;
      if (panelElement) {
        resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(panelElement);
      }
    };

    const observerTimer = setTimeout(initObserver, 200);

    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timer);
      clearTimeout(observerTimer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const containerWidth = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return 0;
    }
    const availableWidth = containerSize.width;
    const availableHeight = containerSize.height;

    if (isMobileDevice) {
      const widthFromHeight = availableHeight * (9 / 16);
      const heightFromWidth = availableWidth * (16 / 9);
      if (heightFromWidth <= availableHeight) {
        return Math.max(availableWidth, 200);
      } else {
        return Math.max(Math.min(widthFromHeight, availableWidth), 200);
      }
    } else {
      return Math.max(availableWidth, 300);
    }
  }, [isMobileDevice, containerSize.width, containerSize.height]);

  const containerHeight = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      return 0;
    }
    const availableWidth = containerSize.width;
    const availableHeight = containerSize.height;

    if (isMobileDevice) {
      const heightFromWidth = availableWidth * (16 / 9);
      if (heightFromWidth <= availableHeight) {
        return Math.max(heightFromWidth, 300);
      } else {
        return Math.max(availableHeight, 300);
      }
    } else {
      const heightFromAspect = containerWidth * (3 / 4);
      return Math.max(Math.min(heightFromAspect, availableHeight), 250);
    }
  }, [
    isMobileDevice,
    containerWidth,
    containerSize.width,
    containerSize.height,
  ]);

  const displayImageUrl = useMemo(() => {
    if (config.themeImageFile) {
      return config.themeImageFile;
    }
    return config.chatOpenImageUrl || null;
  }, [config.themeImageFile, config.chatOpenImageUrl]);

  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (displayImageUrl) {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.height / img.width;
        setImageAspectRatio(aspectRatio);
      };
      img.onerror = () => {
        setImageAspectRatio(null);
      };
      img.src = displayImageUrl;
    } else {
      setImageAspectRatio(null);
    }
  }, [displayImageUrl]);

  const calculatedImageHeight = useMemo(() => {
    if (!imageAspectRatio || !config.chatOpenImageWidth) {
      return config.chatOpenImageHeight || config.chatOpenImageWidth;
    }
    const widthInPixels = (config.chatOpenImageWidth / 100) * containerWidth;
    const heightInPixels = widthInPixels * imageAspectRatio;
    return (heightInPixels / containerHeight) * 100;
  }, [
    imageAspectRatio,
    config.chatOpenImageWidth,
    config.chatOpenImageHeight,
    containerWidth,
    containerHeight,
  ]);

  const buttonPositionStyle = useMemo(() => {
    const anchor = config.positionAnchor || "bottom-right";
    const hOffset = config.buttonHorizontalPosition ?? 0;
    const vOffset = config.buttonVerticalPosition ?? 0;

    let right: string | undefined;
    let left: string | undefined;
    let top: string | undefined;
    let bottom: string | undefined;

    if (anchor === "bottom-right" || anchor === "top-right") {
      right = `${hOffset}%`;
    } else {
      left = `${hOffset}%`;
    }

    if (anchor === "bottom-right" || anchor === "bottom-left") {
      bottom = `${vOffset}%`;
    } else {
      top = `${vOffset}%`;
    }

    return {
      position: "absolute" as const,
      ...(right !== undefined && { right }),
      ...(left !== undefined && { left }),
      ...(top !== undefined && { top }),
      ...(bottom !== undefined && { bottom }),
      zIndex: 10,
    };
  }, [
    config.positionAnchor,
    config.buttonHorizontalPosition,
    config.buttonVerticalPosition,
  ]);

  const chatWidgetStyle = useMemo(() => {
    const anchor = config.positionAnchor || "bottom-right";
    const hOffset = config.widgetHorizontalPosition ?? 0;
    const vOffset = config.widgetVerticalPosition ?? 0;

    let right: string | undefined;
    let left: string | undefined;
    let top: string | undefined;
    let bottom: string | undefined;

    if (anchor === "bottom-right" || anchor === "top-right") {
      right = `${hOffset}%`;
    } else {
      left = `${hOffset}%`;
    }

    if (anchor === "bottom-right" || anchor === "bottom-left") {
      bottom = `${vOffset}%`;
    } else {
      top = `${vOffset}%`;
    }

    const baseStyle = {
      position: "absolute" as const,
      zIndex: 10,
      overflow: "hidden" as const,
      boxShadow: "0 4px 12px rgba(0,0,0,.15)",
      background: "white",
      display: "flex" as const,
      flexDirection: "column" as const,
      boxSizing: "border-box" as const,
      ...(right !== undefined && { right }),
      ...(left !== undefined && { left }),
      ...(top !== undefined && { top }),
      ...(bottom !== undefined && { bottom }),
    };

    if (isMobileDevice || isLineType) {
      return {
        ...baseStyle,
        width: "100%",
        height: "100%",
        borderRadius: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        maxWidth: "100%",
        maxHeight: "100%",
      };
    }

    return {
      ...baseStyle,
      width: `${(config.chatWidth / 100) * containerWidth}px`,
      height: `${(config.chatHeight / 100) * containerHeight}px`,
      borderRadius: "8px",
      maxWidth: `${(config.chatWidth / 100) * containerWidth}px`,
      maxHeight: `${(config.chatHeight / 100) * containerHeight}px`,
    };
  }, [isMobileDevice, isLineType, config, containerWidth, containerHeight]);

  const toggleChat = () => {
    if (!isLineType) {
      setIsOpen((prev) => !prev);
    }
  };

  const shouldUseMobileCircleButton =
    isMobileDevice && config.chatOpenType === "BUTTON";
  const shouldShowMobileBubbleButton =
    shouldUseMobileCircleButton && Boolean((config.chatOpenLabel || "").trim());

  const desktopButtonStyle = useMemo(
    () => ({
      backgroundColor: config.chatButtonColor || "#00AAFF",
      color: "#fff",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "bold",
      width: `${((config.chatOpenButtonWidth ?? 20) / 100) * containerWidth}px`,
      height: `${((config.chatOpenButtonHeight ?? 8) / 100) * containerHeight}px`,
      fontSize: "12px",
      padding: "6px 10px",
      boxSizing: "border-box" as const,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center" as const,
      lineHeight: "1.2",
      wordBreak: "break-word" as const,
      whiteSpace: "normal" as const,
      pointerEvents: "auto" as const,
      border: "none",
    }),
    [
      config.chatButtonColor,
      config.chatOpenButtonWidth,
      config.chatOpenButtonHeight,
      containerWidth,
      containerHeight,
    ],
  );

  const mobileCircleButtonStyle = useMemo(() => {
    const buttonSizePx = Math.max(48, (20 / 100) * containerWidth);
    return {
      width: `${buttonSizePx}px`,
      height: `${buttonSizePx}px`,
      borderRadius: "9999px",
      backgroundColor: config.chatButtonColor || "#00AAFF",
      color: "#fff",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
      pointerEvents: "auto" as const,
    };
  }, [config.chatButtonColor, containerWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: containerWidth > 0 ? `${containerWidth}px` : "100%",
        height: containerHeight > 0 ? `${containerHeight}px` : "100%",
        maxWidth: "100%",
        maxHeight: "100%",
        border: "2px solid #e5e7eb",
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: "#f9fafb",
        margin: "0 auto",
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      {/* チャット開始ボタン - LINEタイプ以外で表示 */}
      {!actualIsOpen && !isLineType && (
        <>
          {config.chatOpenType === "BUTTON" ? (
            <div
              style={{
                ...buttonPositionStyle,
                display: "inline-flex",
                alignItems: "center",
                gap: shouldShowMobileBubbleButton ? "10px" : "0",
                pointerEvents: "auto",
              }}
            >
              {shouldUseMobileCircleButton ? (
                <>
                  {shouldShowMobileBubbleButton && (
                    <PreviewLabelBubble
                      label={config.chatOpenLabel || "チャット開始"}
                    />
                  )}
                  <button
                    type="button"
                    onClick={toggleChat}
                    style={mobileCircleButtonStyle}
                  >
                    <ChatBubbleGlyph size={24} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={toggleChat}
                  style={desktopButtonStyle}
                >
                  {config.chatOpenLabel || "チャット開始"}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleChat}
              style={{
                ...buttonPositionStyle,
                background: "none",
                padding: 0,
                cursor: "pointer",
                borderRadius: "8px",
                overflow: "hidden",
                pointerEvents: "auto",
              }}
            >
              {displayImageUrl ? (
                <img
                  src={displayImageUrl}
                  alt="Open Chat"
                  style={{
                    width: `${(config.chatOpenImageWidth / 100) * containerWidth}px`,
                    height: `${(calculatedImageHeight / 100) * containerHeight}px`,
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${(config.chatOpenImageWidth / 100) * containerWidth}px`,
                    height: `${(calculatedImageHeight / 100) * containerHeight}px`,
                    backgroundColor: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    color: "#6b7280",
                    borderRadius: "8px",
                    border: "2px dashed #d1d5db",
                  }}
                >
                  画像なし
                </div>
              )}
            </button>
          )}
        </>
      )}
      {/* チャットウィジェット */}
      {actualIsOpen && (
        <div style={chatWidgetStyle}>
          {/* ヘッダー */}
          <div
            style={{
              background: gradientFrom(config.headerColor || "#F1F1F1"),
              color: config.headerTextColor || "#000000",
              padding: "10px 12px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "12px",
              fontWeight: "600",
              flexShrink: 0,
            }}
          >
            <span>{config.headerText || "チャット"}</span>
            {!isLineType && (
              <button
                onClick={toggleChat}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "16px",
                  color: config.headerTextColor || "#000000",
                  padding: "0",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            )}
          </div>

          <div
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowX: "hidden",
              minHeight: 0,
              boxSizing: "border-box",
            }}
          >
            {config.initialGreeting && (
              <div
                style={{
                  backgroundColor: "#f3f4f6",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  marginBottom: "12px",
                  maxWidth: "80%",
                  alignSelf: "flex-start",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  color: "#374151",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                  whiteSpace: "normal",
                  boxSizing: "border-box",
                }}
              >
                <StreamingMessage
                  text={config.initialGreeting}
                  isStreaming={config.isGreetingStreamingEnabled}
                />
              </div>
            )}
          </div>

          <div
            style={{
              padding: "12px",
              borderTop: "1px solid #e5e7eb",
              background: gradientFrom(config.headerColor || "#F1F1F1"),
              flexShrink: 0,
              minHeight: "60px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                minWidth: 0,
              }}
            >
              <input
                type="text"
                placeholder="メッセージを入力..."
                disabled
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: "16px",
                  fontSize: "12px",
                  backgroundColor: "#ffffff",
                  color: "#6b7280",
                  boxSizing: "border-box",
                }}
              />
              <button
                disabled
                style={{
                  backgroundColor: config.chatButtonColor || "#00AAFF",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  minWidth: "28px",
                  minHeight: "28px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "not-allowed",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatPreviewPanel: React.FC<ChatPreviewPanelProps> = ({
  themeConfig,
  activeDeviceTab,
  urlType,
}) => {
  const [isDesktopOpen, setIsDesktopOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const desktopConfig = useMemo(
    () => ({
      chatOpenType: themeConfig?.chatOpenTypeDesktop || "BUTTON",
      chatOpenLabel: themeConfig?.chatOpenLabelDesktop || "チャット開始",
      chatOpenImageUrl: themeConfig?.chatOpenImageUrlDesktop || null,
      chatOpenButtonWidth: themeConfig?.chatOpenButtonWidthDesktop || 25,
      chatOpenButtonHeight: themeConfig?.chatOpenButtonHeightDesktop || 10,
      chatOpenImageWidth: themeConfig?.chatOpenImageWidthDesktop || 5,
      chatButtonColor: themeConfig?.chatButtonColor || "#00AAFF",
      chatWidth: themeConfig?.chatWidth || 25,
      chatHeight: themeConfig?.chatHeight || 80,
      positionAnchor: themeConfig?.chatPositionAnchorDesktop || "bottom-right",
      buttonHorizontalPosition:
        themeConfig?.chatButtonHorizontalPositionPercentageDesktop ?? 0,
      buttonVerticalPosition:
        themeConfig?.chatButtonVerticalPositionPercentageDesktop ?? 0,
      widgetHorizontalPosition:
        themeConfig?.chatWidgetHorizontalPositionPercentageDesktop ?? 0,
      widgetVerticalPosition:
        themeConfig?.chatWidgetVerticalPositionPercentageDesktop ?? 0,
      headerColor: themeConfig?.headerColor || "#F1F1F1",
      headerTextColor: themeConfig?.headerTextColor || "#000000",
      headerText: themeConfig?.headerText || "ヘッダー",
      initialGreeting: themeConfig?.initialGreeting || null,
      isGreetingStreamingEnabled:
        themeConfig?.isGreetingStreamingEnabled ?? false,
      themeImageFile: (themeConfig as any)?.themeImageFileDesktop || null,
    }),
    [themeConfig],
  );

  const mobileConfig = useMemo(
    () => ({
      chatOpenType: themeConfig?.chatOpenTypeMobile || "BUTTON",
      chatOpenLabel: themeConfig?.chatOpenLabelMobile || "チャット開始",
      chatOpenImageUrl: themeConfig?.chatOpenImageUrlMobile || null,
      chatOpenButtonWidth: themeConfig?.chatOpenButtonWidthMobile || 25,
      chatOpenButtonHeight: themeConfig?.chatOpenButtonHeightMobile || 10,
      chatOpenImageWidth: themeConfig?.chatOpenImageWidthMobile || 5,
      chatButtonColor: themeConfig?.chatButtonColor || "#00AAFF",
      chatWidth: 375,
      chatHeight: 667,
      positionAnchor: themeConfig?.chatPositionAnchorMobile || "bottom-right",
      buttonHorizontalPosition:
        themeConfig?.chatButtonHorizontalPositionPercentageMobile ?? 0,
      buttonVerticalPosition:
        themeConfig?.chatButtonVerticalPositionPercentageMobile ?? 0,
      widgetHorizontalPosition: 0,
      widgetVerticalPosition: 0,
      headerColor: themeConfig?.headerColor || "#F1F1F1",
      headerTextColor: themeConfig?.headerTextColor || "#000000",
      headerText: themeConfig?.headerText || "ヘッダー",
      initialGreeting: themeConfig?.initialGreeting || null,
      isGreetingStreamingEnabled:
        themeConfig?.isGreetingStreamingEnabled ?? false,
      themeImageFile: (themeConfig as any)?.themeImageFileMobile || null,
    }),
    [themeConfig],
  );

  const activeConfig =
    activeDeviceTab === "desktop" ? desktopConfig : mobileConfig;
  const activeIsOpen =
    activeDeviceTab === "desktop" ? isDesktopOpen : isMobileOpen;
  const setActiveIsOpen =
    activeDeviceTab === "desktop" ? setIsDesktopOpen : setIsMobileOpen;

  return (
    <div
      className="h-full w-full flex items-center justify-center bg-gray-50 rounded-lg box-border"
      style={{
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <InlineDevicePreview
        device={activeDeviceTab}
        isOpen={activeIsOpen}
        setIsOpen={setActiveIsOpen}
        config={activeConfig}
        urlType={urlType}
      />
    </div>
  );
};

const PreviewLabelBubble = ({ label }: { label: string }) => (
  <div
    style={{
      position: "relative",
      backgroundColor: "#1f2937",
      color: "#fff",
      borderRadius: "9999px",
      padding: "8px 14px",
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1.2,
      pointerEvents: "none",
      boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
      maxWidth: "240px",
      minWidth: "96px",
      marginRight: "6px",
      whiteSpace: "normal",
      overflow: "visible",
      wordBreak: "break-word",
      textAlign: "left",
    }}
  >
    {label}
    <span
      style={{
        position: "absolute",
        right: "-7px",
        top: "50%",
        width: "12px",
        height: "12px",
        backgroundColor: "#1f2937",
        transform: "translateY(-50%) rotate(45deg)",
        borderRadius: "3px",
      }}
    />
  </div>
);

const ChatBubbleGlyph = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: "block" }}
  >
    <path
      d="M5 5.5C5 4.11929 6.11929 3 7.5 3H16.5C17.8807 3 19 4.11929 19 5.5V12.5C19 13.8807 17.8807 15 16.5 15H12L8 19V15H7.5C6.11929 15 5 13.8807 5 12.5V5.5Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="9.5" r="1" fill="currentColor" />
    <circle cx="12" cy="9.5" r="1" fill="currentColor" />
    <circle cx="15" cy="9.5" r="1" fill="currentColor" />
  </svg>
);
