"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { LoadingScreen } from "../../../common/LoadingScreen";
import LineChatContainer from "../ui/LINE/LineChatContainer";
import type { ExternalConfigResponseType } from "@repo/api-contracts/based_template/zschema";

export default function LineChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [integratedConfig, setIntegratedConfig] =
    useState<ExternalConfigResponseType | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [accessResult, setAccessResult] = useState<unknown | null>(null);
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [accessError, setAccessError] = useState<Error | null>(null);
  const isRequestingRef = useRef(false);
  const hasRequestedRef = useRef<string | undefined>(undefined);

  // entryUuidをparamsから取得
  const entryUuid = useMemo(() => {
    const uuid = Array.isArray(params.entryUuid)
      ? params.entryUuid[0]
      : params.entryUuid;
    return uuid && typeof uuid === "string" && uuid.trim() !== ""
      ? uuid
      : undefined;
  }, [params.entryUuid]);

  // entryUuidが変更された場合、リクエストフラグをリセット
  useEffect(() => {
    if (hasRequestedRef.current !== entryUuid) {
      hasRequestedRef.current = undefined;
      isRequestingRef.current = false;
    }
  }, [entryUuid]);

  // searchParamsの値を文字列として抽出してメモ化（無限ループ防止）
  const headerColor = searchParams.get("headerColor");
  const headerText = searchParams.get("headerText");
  const headerTextColor = searchParams.get("headerTextColor");
  const initialGreeting = searchParams.get("initialGreeting");

  const urlParams = useMemo(() => {
    return {
      headerColor,
      headerText,
      headerTextColor,
      initialGreeting,
    };
  }, [headerColor, headerText, headerTextColor, initialGreeting]);

  // アクセスチェックと設定取得（API 直fetch）
  useEffect(() => {
    // entryUuidが未定義の場合は早期リターン
    if (!entryUuid) {
      setIsAccessLoading(false);
      setIsConfigLoading(false);
      setAccessError(new Error("entryUuidが取得できませんでした"));
      setConfigError(new Error("entryUuidが取得できませんでした"));
      return;
    }

    // 既にリクエストが実行中、またはこのentryUuidで既にリクエスト済みの場合は再実行しない
    if (isRequestingRef.current || hasRequestedRef.current === entryUuid) {
      return;
    }

    const abort = new AbortController();
    isRequestingRef.current = true;

    async function run() {
      try {
        setAccessError(null);
        setConfigError(null);
        setIsAccessLoading(true);
        setIsConfigLoading(true);

        // アクセスチェック
        try {
          const t = Date.now();
          const accessRes = await fetch(
            `/api/${entryUuid}/accessCheck?t=${t}`,
            {
              cache: "no-store",
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
                // ngrok経由でアクセスする場合、警告ページをバイパスするためのヘッダー
                "ngrok-skip-browser-warning": "true",
              },
              signal: abort.signal,
            },
          );
          if (!accessRes.ok) throw new Error("Access check failed");
          const accessJson = await accessRes.json();
          if (accessJson.status !== "success")
            throw new Error(accessJson.message || "Access denied");
          setAccessResult(accessJson.data || null);
        } catch (e) {
          // AbortErrorの場合は無視（クリーンアップ時の正常な動作）
          if (e instanceof Error && e.name === "AbortError") {
            return;
          }
          setAccessError(e as Error);
          setAccessResult(null);
        } finally {
          setIsAccessLoading(false);
        }

        // 設定取得
        try {
          const t = Date.now();
          const cfgRes = await fetch(`/api/${entryUuid}/config?t=${t}`, {
            cache: "no-store",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
              // ngrok経由でアクセスする場合、警告ページをバイパスするためのヘッダー
              "ngrok-skip-browser-warning": "true",
            },
            signal: abort.signal,
          });
          if (!cfgRes.ok) throw new Error("Config fetch failed");
          const cfgJson = await cfgRes.json();
          if (cfgJson.status !== "success" || !cfgJson.data)
            throw new Error(cfgJson.message || "Config fetch failed");
          setIntegratedConfig(cfgJson.data);
        } catch (e) {
          // AbortErrorの場合は無視（クリーンアップ時の正常な動作）
          if (e instanceof Error && e.name === "AbortError") {
            return;
          }
          setConfigError(e as Error);
          setIntegratedConfig(null);
        } finally {
          setIsConfigLoading(false);
          isRequestingRef.current = false;
          hasRequestedRef.current = entryUuid;
        }
      } catch {
        // 予期しないエラー
        isRequestingRef.current = false;
        hasRequestedRef.current = entryUuid;
      }
    }

    run();

    return () => {
      abort.abort();
      isRequestingRef.current = false;
    };
  }, [entryUuid]);

  const chatEntryConfig = useMemo(() => {
    if (!integratedConfig || !entryUuid) {
      return undefined;
    }

    // URLパラメータからデザイン設定を取得（優先度: URL > データベース）
    const urlHeaderColor = urlParams.headerColor;
    const urlHeaderText = urlParams.headerText;
    const urlHeaderTextColor = urlParams.headerTextColor;
    const urlInitialGreeting = urlParams.initialGreeting;

    // selectionTypeを型安全に変換
    const selectionType: "BOT" | "SUGGEST" | undefined =
      integratedConfig?.selectionType === "BOT" ||
      integratedConfig?.selectionType === "SUGGEST"
        ? (integratedConfig.selectionType as "BOT" | "SUGGEST")
        : undefined;

    return {
      entryUuid: entryUuid,
      headerText:
        urlHeaderText || integratedConfig?.themeConfig?.headerText || "Chat",
      headerColor:
        urlHeaderColor ||
        integratedConfig?.themeConfig?.headerColor ||
        "#ffffff",
      headerTextColor:
        urlHeaderTextColor ||
        integratedConfig?.themeConfig?.headerTextColor ||
        "#111827",
      showReferenceInfo: true,
      initialGreeting:
        urlInitialGreeting !== null
          ? urlInitialGreeting
          : (integratedConfig?.themeConfig?.initialGreeting ?? undefined),
      isMultiLanguage: integratedConfig?.themeConfig?.isMultiLanguage ?? false,
      initialGreetingTranslations:
        integratedConfig?.themeConfig?.initialGreetingTranslations ?? null,
      isGreetingStreamingEnabled:
        integratedConfig?.themeConfig?.isGreetingStreamingEnabled ?? false,
      autoOpenDelaySeconds:
        integratedConfig?.themeConfig?.autoOpenDelaySeconds ?? null,
      // サジェスト関連の設定を追加（zschemaから型安全に取得）
      selectionType,
      suggestId: integratedConfig?.suggestId,
      // LINE固有設定
      lineConfig: integratedConfig?.lineConfig,
      preChatCustomFormId: integratedConfig?.preChatCustomFormId,
      preChatCustomForm: integratedConfig?.preChatCustomForm,
      onDemandCustomFormIdList: integratedConfig?.onDemandCustomFormIdList,
      onDemandCustomFormList: integratedConfig?.onDemandCustomFormList,
      isBookingEnabled: integratedConfig?.isBookingEnabled,
      isHumanHandoffEnabled: integratedConfig?.isHumanHandoffEnabled,
      humanHandoffAvailabilitySlots:
        integratedConfig?.humanHandoffAvailabilitySlots ?? [],
      bookingButtonLabel: integratedConfig?.bookingButtonLabel,
    } as any;
  }, [integratedConfig, entryUuid, urlParams]);

  // 設定/アクセスチェック読み込み中
  if (isConfigLoading || isAccessLoading) {
    return (
      <LoadingScreen fullScreen message="アクセス確認と設定を読み込み中..." />
    );
  }

  // アクセス拒否
  const hasAccessAllowedFlag = (
    v: unknown,
  ): v is { accessAllowed: boolean } => {
    return (
      typeof v === "object" &&
      v !== null &&
      "accessAllowed" in (v as Record<string, unknown>) &&
      typeof (v as Record<string, unknown>).accessAllowed === "boolean"
    );
  };

  if (
    hasAccessAllowedFlag(accessResult) &&
    accessResult.accessAllowed === false
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">アクセスが拒否されました</p>
          <p className="text-gray-600 mt-2">
            IP制限またはアクセス制御により、このページにアクセスできません
          </p>
        </div>
      </div>
    );
  }

  // エラー
  if (configError || accessError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">
            エンドポイント設定またはアクセス確認に失敗しました
          </p>
          <p className="text-gray-600 mt-2">ページを再読み込みしてください</p>
        </div>
      </div>
    );
  }

  // 設定が取得できない場合
  if (!integratedConfig && !isConfigLoading && !isAccessLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">エンドポイント情報の取得に失敗しました</p>
          <p className="text-gray-600 mt-2">ページを再読み込みしてください</p>
        </div>
      </div>
    );
  }

  // チャットコンテナを表示
  return (
    <div
      className="w-full"
      style={{
        height: "100dvh",
        overflow: "hidden",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxSizing: "border-box",
      }}
    >
      <LineChatContainer chatEntry={chatEntryConfig} />
    </div>
  );
}
