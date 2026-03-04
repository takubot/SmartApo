import { Spinner } from "@heroui/react";
import { ExternalConfigResponseType } from "@repo/api-contracts/based_template/zschema";
import { useParams, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import ChatStartButton from "../ui/widget/ChatStartButton";
import WidgetContainer from "../ui/widget/Container";

interface ApiResponse {
  status: string;
  data?: unknown;
  message?: string;
}

// APIレスポンス型をバックエンドスキーマに準拠
interface ApiConfigResponse extends ApiResponse {
  data?: ExternalConfigResponseType;
}

function ChatScriptPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const entryUuid = useMemo(() => {
    const uuid = params.entryUuid;
    if (Array.isArray(uuid)) {
      return uuid[0] || "";
    }
    return uuid || "";
  }, [params.entryUuid]);

  // APIから設定を取得
  const [config, setConfig] = useState<ExternalConfigResponseType | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!entryUuid) return;

    const fetchConfig = async () => {
      try {
        setConfigError(null);

        // キャッシュを防ぐためのタイムスタンプ
        const timestamp = Date.now();

        // アクセスチェック
        const accessResponse = await fetch(
          `/api/${entryUuid}/accessCheck?t=${timestamp}`,
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );
        if (!accessResponse.ok) {
          setConfig(null);
          return;
        }
        const accessData: ApiResponse = await accessResponse.json();
        if (accessData.status !== "success") {
          setConfig(null);
          return;
        }

        // 設定取得
        const configResponse = await fetch(
          `/api/${entryUuid}/config?t=${timestamp}`,
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          },
        );
        if (!configResponse.ok) {
          setConfig(null);
          return;
        }
        const configData: ApiConfigResponse = await configResponse.json();
        if (configData.status !== "success") {
          setConfig(null);
          return;
        }

        // API設定がundefinedの場合はエラー
        if (!configData.data) {
          setConfig(null);
          return;
        }

        // APIレスポンスを直接使用（バックエンドスキーマ準拠）
        const apiConfig = configData.data;

        // isVisibleがfalseの場合は何も表示しない
        if (apiConfig.isVisible === false) {
          setConfig(null);
          return;
        }

        setConfig(apiConfig);
      } catch {
        // 予期しないエラーの場合は何も表示しない
        setConfig(null);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchConfig();
  }, [entryUuid]);

  const chatEntryConfig = useMemo(() => {
    const themeLocal = config?.themeConfig;
    if (!entryUuid) return undefined;

    // URL上書き（fullChat と同等の優先度: URL > DB）
    const urlHeaderColor = searchParams.get("headerColor");
    const urlHeaderText = searchParams.get("headerText");
    const urlHeaderTextColor = searchParams.get("headerTextColor");
    const urlInitialGreeting = searchParams.get("initialGreeting");

    // selectionTypeを型安全に変換
    const selectionType: "BOT" | "SUGGEST" | undefined =
      config?.selectionType === "BOT" || config?.selectionType === "SUGGEST"
        ? (config.selectionType as "BOT" | "SUGGEST")
        : undefined;

    return {
      entryUuid: entryUuid,
      headerText: urlHeaderText || themeLocal?.headerText || "ヘッダー",
      headerColor: urlHeaderColor || themeLocal?.headerColor || "#F1F1F1",
      headerTextColor:
        urlHeaderTextColor || themeLocal?.headerTextColor || "#000000",
      initialGreeting:
        urlInitialGreeting !== null
          ? urlInitialGreeting
          : (themeLocal?.initialGreeting ??
            "こんにちは！ご質問をお聞かせください。"),
      showReferenceInfo: true,
      isGreetingStreamingEnabled:
        themeLocal?.isGreetingStreamingEnabled ?? false,
      autoOpenDelaySeconds: themeLocal?.autoOpenDelaySeconds ?? null,
      isMultiLanguage: themeLocal?.isMultiLanguage ?? false,
      initialGreetingTranslations:
        themeLocal?.initialGreetingTranslations ?? null,
      // サジェスト関連の設定（zschema由来）
      selectionType,
      suggestId: config?.suggestId,
      preChatCustomFormId: config?.preChatCustomFormId,
      preChatCustomForm: config?.preChatCustomForm,
      onDemandCustomFormIdList: config?.onDemandCustomFormIdList,
      onDemandCustomFormList: config?.onDemandCustomFormList,
      isBookingEnabled: config?.isBookingEnabled,
      isHumanHandoffEnabled: config?.isHumanHandoffEnabled,
      humanHandoffAvailabilitySlots:
        config?.humanHandoffAvailabilitySlots ?? [],
      bookingButtonLabel: config?.bookingButtonLabel,
    } as any;
  }, [
    entryUuid,
    config?.themeConfig,
    config?.selectionType,
    config?.suggestId,
    config?.preChatCustomFormId,
    config?.preChatCustomForm,
    config?.onDemandCustomFormIdList,
    config?.onDemandCustomFormList,
    config?.isBookingEnabled,
    config?.isHumanHandoffEnabled,
    config?.humanHandoffAvailabilitySlots,
    config?.bookingButtonLabel,
    searchParams,
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [parentViewport, setParentViewport] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const handleMeasuredSizeChange = useCallback(
    (size: { width: number; height: number }) => {
      setMeasuredSize(size);
    },
    [],
  );

  // isMobileをstateからuseMemoに変更して、レンダリング時の不整合を防ぐ
  const isMobile = useMemo(() => {
    // parentViewportが未取得の場合はデスクトップ扱い（iframeの20px幅による誤判定防止）
    if (!parentViewport) return false;
    return parentViewport.width <= 768;
  }, [parentViewport]);

  const [imageAspectRatios, setImageAspectRatios] = useState<{
    mobile: number | null;
    desktop: number | null;
  }>({
    mobile: null,
    desktop: null,
  });
  const handleImageAspectRatioChange = useCallback(
    (payload: { isMobile: boolean; aspectRatio: number | null }) => {
      // nullの場合はそのままnullとして設定し、ロード未完了状態とする
      if (payload.aspectRatio === null) {
        setImageAspectRatios((prev) => ({
          ...prev,
          [payload.isMobile ? "mobile" : "desktop"]: null,
        }));
        return;
      }

      const normalizedAspectRatio =
        typeof payload.aspectRatio === "number" &&
        !Number.isNaN(payload.aspectRatio) &&
        payload.aspectRatio > 0
          ? payload.aspectRatio
          : 1;

      setImageAspectRatios((prev) => ({
        ...prev,
        [payload.isMobile ? "mobile" : "desktop"]: normalizedAspectRatio,
      }));
    },
    [],
  );
  const lastMetricsRef = useRef<{
    width: number;
    height: number;
    position: string;
    buttonHorizontalPosition: number;
    buttonVerticalPosition: number;
    widgetHorizontalPosition: number;
    widgetVerticalPosition: number;
    margin: number;
  } | null>(null);
  const autoOpenTimerRef = useRef<number | null>(null);
  const hasAutoOpenedRef = useRef(false);

  // iframe ドキュメントの背景や余白を完全に無くす
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    const prevMargin = body.style.margin;
    const prevOverflow = body.style.overflow;

    html.style.backgroundColor = "transparent";
    body.style.backgroundColor = "transparent";
    body.style.margin = "0";
    body.style.overflow = "hidden";

    return () => {
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
      body.style.margin = prevMargin;
      body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (!config) return;

    if (!isLoadingConfig && !isInitialized) {
      setIsInitialized(true);
    }
  }, [config, isLoadingConfig, isInitialized]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  // ESCキーでチャットを閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeChat();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // embed.jsまたはiframeからのメッセージを受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && typeof event.data === "object") {
        switch (event.data.type) {
          case "PARENT_VIEWPORT": {
            const p = event.data.payload || {};
            // ★visualViewport優先（キーボード/アドレスバーの影響を受けにくい）
            const wRaw =
              typeof p.visualWidth === "number"
                ? p.visualWidth
                : typeof p.width === "number"
                  ? p.width
                  : 0;
            const hRaw =
              typeof p.visualHeight === "number"
                ? p.visualHeight
                : typeof p.height === "number"
                  ? p.height
                  : 0;

            const w = wRaw > 0 ? wRaw : 0;
            const h = hRaw > 0 ? hRaw : 0;

            if (w > 0 && h > 0) setParentViewport({ width: w, height: h });
            break;
          }
          case "REQUEST_PARENT_VIEWPORT": {
            if (typeof window !== "undefined" && window.parent) {
              try {
                const vv = window.visualViewport;
                window.parent.postMessage(
                  {
                    type: "PARENT_VIEWPORT",
                    payload: {
                      width: window.innerWidth,
                      height: window.innerHeight,
                      visualWidth: vv?.width ?? window.innerWidth,
                      visualHeight: vv?.height ?? window.innerHeight,
                      offsetTop: vv?.offsetTop ?? 0,
                      offsetLeft: vv?.offsetLeft ?? 0,
                      scale: vv?.scale ?? 1,
                    },
                  },
                  "*",
                );
              } catch {
                // no-op
              }
            }
            break;
          }
          case "CLOSE_CHAT":
            setIsOpen(false);
            break;
          case "OPEN_CHAT":
            setIsOpen(true);
            break;
          case "TOGGLE_CHAT":
            setIsOpen((prev) => !prev);
            break;
          case "REMOVE_WIDGET":
            // ウィジェットを完全に削除
            if (typeof window !== "undefined" && window.parent) {
              try {
                window.parent.postMessage({ type: "REMOVE_WIDGET" }, "*");
              } catch {
                // no-op
              }
            }
            break;
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("message", handleMessage);
      // 親にビューポートを要求（初回のみ）
      try {
        if (window.parent) {
          window.parent.postMessage({ type: "REQUEST_PARENT_VIEWPORT" }, "*");
        }
      } catch {
        // no-op
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("message", handleMessage);
      }
    };
  }, []);

  const renderGuard = () => {
    if (!entryUuid) {
      return (
        <div
          className="absolute inset-0 flex items-center justify-center bg-white"
          style={{ zIndex: 1000002 }}
        >
          <div className="text-center">
            <p className="text-red-600 text-lg">
              エントリUUIDが指定されていません
            </p>
            <p className="text-gray-600 mt-2">URLを確認してください</p>
          </div>
        </div>
      );
    }

    // エラーや非表示条件がある場合は何も表示しない
    if (configError === "Widget is hidden" || config?.isVisible === false) {
      return null;
    }

    if (isLoadingConfig) {
      return null;
    }

    if (!isInitialized) return null;

    if (configError) {
      return null;
    }

    if (!config) return null;

    return null;
  };

  const theme = config?.themeConfig;

  const valueToPercent = (rawValue: number, base: number) => {
    if (typeof rawValue !== "number" || Number.isNaN(rawValue) || base <= 0) {
      return 0;
    }

    const percentCandidate =
      rawValue <= 100 ? rawValue : (rawValue / base) * 100;

    return Math.max(0, Math.min(100, percentCandidate));
  };

  useEffect(() => {
    const delaySeconds = theme?.autoOpenDelaySeconds ?? 0;
    if (
      !isInitialized ||
      isOpen ||
      delaySeconds <= 0 ||
      hasAutoOpenedRef.current
    ) {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    autoOpenTimerRef.current = window.setTimeout(() => {
      setIsOpen(true);
      hasAutoOpenedRef.current = true;
      autoOpenTimerRef.current = null;
    }, delaySeconds * 1000);

    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, [theme?.autoOpenDelaySeconds, isInitialized, isOpen]);

  // 安定したテーマ指定の論理サイズで親へ通知（揺れ防止）
  useEffect(() => {
    if (!isInitialized) return;
    if (!parentViewport) return;

    const viewportWidth = parentViewport.width;
    const viewportHeight = parentViewport.height;

    let widthValue: number = 0;
    let heightValue: number = 0;
    let isPercent = true;

    if (isOpen) {
      if (isMobile) {
        widthValue = 100;
        heightValue = 100;
      } else {
        widthValue = valueToPercent(theme?.chatWidth ?? 0, viewportWidth);
        heightValue = valueToPercent(theme?.chatHeight ?? 0, viewportHeight);
      }
    } else if (measuredSize) {
      // 計測されたピクセルサイズをそのまま使用（最も確実）
      widthValue = measuredSize.width;
      heightValue = measuredSize.height;
      isPercent = false;
    } else {
      // フォールバック：概算
      if (isMobile) {
        const buttonSizePx = Math.max(56, (20 / 100) * viewportWidth);
        const labelMaxWidth = Math.max(
          140,
          Math.min(240, Math.round(viewportWidth * 0.5)),
        );
        widthValue = buttonSizePx + labelMaxWidth + 32;
        heightValue = buttonSizePx + 20;
      } else {
        widthValue = 64 + 280 + 36;
        heightValue = 64 + 24;
      }
      isPercent = false;
    }

    const payload = {
      width: widthValue,
      height: heightValue,
      isPercent: isPercent,
      isWidgetOpen: isOpen,
      position:
        isMobile && isOpen
          ? "center"
          : isMobile
            ? (theme?.chatPositionAnchorMobile ?? "bottom-right")
            : (theme?.chatPositionAnchorDesktop ?? "bottom-right"),
      buttonHorizontalPosition: isMobile
        ? (theme?.chatButtonHorizontalPositionPercentageMobile ?? 0)
        : (theme?.chatButtonHorizontalPositionPercentageDesktop ?? 0),
      buttonVerticalPosition: isMobile
        ? (theme?.chatButtonVerticalPositionPercentageMobile ?? 0)
        : (theme?.chatButtonVerticalPositionPercentageDesktop ?? 0),
      widgetHorizontalPosition: isMobile
        ? 0
        : (theme?.chatWidgetHorizontalPositionPercentageDesktop ?? 0),
      widgetVerticalPosition: isMobile
        ? 0
        : (theme?.chatWidgetVerticalPositionPercentageDesktop ?? 0),
      margin: 20,
    } as const;

    const last = lastMetricsRef.current;
    // 比較ロジック（簡易化）
    if (JSON.stringify(last) !== JSON.stringify(payload)) {
      lastMetricsRef.current = payload as any;
      if (typeof window !== "undefined" && window.parent) {
        try {
          window.parent.postMessage({ type: "WIDGET_METRICS", payload }, "*");
        } catch {
          // no-op
        }
      }
    }
  }, [isInitialized, isOpen, theme, parentViewport, isMobile, measuredSize]);

  const guard = renderGuard();

  const shouldShowButton = useMemo(() => {
    return (
      !guard &&
      !isOpen &&
      isInitialized &&
      !isLoadingConfig &&
      config &&
      !configError &&
      parentViewport !== null
    );
  }, [
    guard,
    isOpen,
    isInitialized,
    isLoadingConfig,
    config,
    configError,
    parentViewport,
  ]);

  const chatPositionAnchor = useMemo(() => {
    if (isMobile) {
      return theme?.chatPositionAnchorMobile || "bottom-right";
    }
    return theme?.chatPositionAnchorDesktop || "bottom-right";
  }, [
    isMobile,
    theme?.chatPositionAnchorDesktop,
    theme?.chatPositionAnchorMobile,
  ]);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {shouldShowButton && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: chatPositionAnchor.includes("top")
              ? "flex-start"
              : "flex-end",
            justifyContent: chatPositionAnchor.includes("left")
              ? "flex-start"
              : "flex-end",
            padding: 0,
            margin: 0,
            pointerEvents: "none", // ここは透過させ、子要素(ChatStartButton)でautoにする
          }}
        >
          <ChatStartButton
            config={{
              chatOpenTypeDesktop: theme?.chatOpenTypeDesktop ?? "BUTTON",
              chatOpenLabelDesktop:
                theme?.chatOpenLabelDesktop ?? "チャット開始",
              chatOpenLabelDesktopTranslations:
                (theme as any)?.chatOpenLabelDesktopTranslations ?? null,
              chatOpenImageUrlDesktop: theme?.chatOpenImageUrlDesktop ?? null,
              chatOpenImageWidthDesktop: theme?.chatOpenImageWidthDesktop ?? 5,
              chatOpenTypeMobile: theme?.chatOpenTypeMobile ?? "BUTTON",
              chatOpenLabelMobile: theme?.chatOpenLabelMobile ?? "チャット開始",
              chatOpenLabelMobileTranslations:
                (theme as any)?.chatOpenLabelMobileTranslations ?? null,
              chatOpenImageUrlMobile: theme?.chatOpenImageUrlMobile ?? null,
              chatOpenImageWidthMobile: theme?.chatOpenImageWidthMobile ?? 5,
              chatButtonColor: theme?.chatButtonColor ?? "#00AAFF",
              translations: (theme as any)?.chatOpenLabelDesktopTranslations,
            }}
            isInitialized={isInitialized}
            isOpen={isOpen}
            onToggle={toggleChat}
            anchor={chatPositionAnchor}
            onRemove={() => {
              if (typeof window !== "undefined") {
                const message = { type: "REMOVE_WIDGET" };
                try {
                  if (window.top) {
                    window.top.postMessage(message, "*");
                  }
                  if (window.parent && window.parent !== window.top) {
                    window.parent.postMessage(message, "*");
                  }
                } catch {
                  // no-op
                }
              }
            }}
            overrideViewport={parentViewport || undefined}
            onImageAspectRatioChange={handleImageAspectRatioChange}
            onMeasuredSizeChange={handleMeasuredSizeChange}
          />
        </div>
      )}

      {!guard &&
        isOpen &&
        isInitialized &&
        !isLoadingConfig &&
        config &&
        !configError && (
          <div
            className="fixed z-40 pointer-events-auto transition-all duration-600 opacity-100 scale-100"
            data-chat-panel
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "transparent",
              borderRadius: "0",
              boxShadow: "0 12px 48px rgba(0,0,0,0.24)",
              overflow: "hidden",
              right: chatPositionAnchor.includes("right") ? 0 : "auto",
              left: chatPositionAnchor.includes("left") ? 0 : "auto",
              bottom: chatPositionAnchor.includes("bottom") ? 0 : "auto",
              top: chatPositionAnchor.includes("top") ? 0 : "auto",
              transform: "translateY(0)",
              zIndex: 1000000,
              transition: "all 0.6s ease-in-out",
            }}
          >
            <div
              className="w-full h-full"
              style={{
                backgroundColor: "white",
                borderRadius: isMobile ? "0" : "12px",
                overflow: "hidden",
              }}
            >
              <WidgetContainer
                chatEntry={chatEntryConfig}
                onClose={closeChat}
                isWidgetOpen={isOpen}
              />
            </div>
          </div>
        )}
      {guard}
    </div>
  );
}

export default function ChatScriptPage() {
  return (
    <Suspense
      fallback={
        <div
          className="absolute inset-0 flex items-center justify-center bg-white"
          style={{ zIndex: 1000002 }}
        >
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600">チャットを読み込み中...</p>
          </div>
        </div>
      }
    >
      <ChatScriptPageContent />
    </Suspense>
  );
}
