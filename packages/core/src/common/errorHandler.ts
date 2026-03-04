import { addToast } from "@heroui/react";

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// --- Global Toast Configuration ---

const GLOBAL_TOAST_CONFIG = {
  402: {
    title: "制限超過",
    defaultMessage: "リミット超過エラーが発生しました",
  },
  403: {
    title: "権限がありません",
    defaultMessage: "権限がありません",
  },
} as const;

const GLOBAL_TOAST_STATUS_CODES = Object.keys(GLOBAL_TOAST_CONFIG).map(Number);

export function isGlobalToastStatus(status?: number): status is number {
  return (
    status !== undefined && GLOBAL_TOAST_STATUS_CODES.includes(status as any)
  );
}

// --- Global Event System ---

function dispatchGlobalErrorEvent(status: number, message: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("api-error", { detail: { status, message } }),
    );
  }
}

let isGlobalErrorToastInitialized = false;

export function initializeGlobalErrorToast(): void {
  if (typeof window === "undefined") return;

  // 重複登録を防ぐため、既存のリスナーがあれば削除したいところだが、
  // 無名関数で登録しているため削除できない。
  // 代わりにフラグチェックを厳密に行う。
  if (isGlobalErrorToastInitialized) return;

  const handleGlobalEvent = (event: Event) => {
    const { status, message } = (event as CustomEvent).detail ?? {};
    if (!status || !isGlobalToastStatus(status)) return;

    const config =
      GLOBAL_TOAST_CONFIG[status as keyof typeof GLOBAL_TOAST_CONFIG];
    if (!config) return;

    addToast({
      title: config.title,
      description: message || config.defaultMessage,
      color: "danger",
      timeout: 5000,
    });
  };

  window.addEventListener("api-error", handleGlobalEvent);
  isGlobalErrorToastInitialized = true;
}

// --- Error Parsing Logic ---

function parseErrorData(data: unknown): Record<string, any> {
  if (data && typeof data === "object") return data as Record<string, any>;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // ignore parsing error
    }
  }
  return {};
}

function extractApiError(error: any): ApiError {
  const defaultMessage = "エラーが発生しました";

  // 再帰的にエラーの実体を探す（ApiClientなどがラップしている場合があるため）
  // error.original があればそれを優先して解析する
  const actualError = error?.original || error?.error || error;

  // 1. Extract Data & Code
  const data = parseErrorData(actualError?.response?.data);
  const code = typeof data.code === "string" ? data.code : undefined;

  // 2. Extract Status
  let status = actualError?.response?.status;
  if (typeof status !== "number" && typeof actualError?.message === "string") {
    // Try to parse "402 Payment Required" style messages
    const maybeStatus = parseInt(actualError.message.split(" ")[0], 10);
    if (!isNaN(maybeStatus) && maybeStatus >= 400 && maybeStatus < 600) {
      status = maybeStatus;
    }
  }

  // 3. Extract Message
  let message = "";
  if (typeof data.detail === "string" && data.detail.trim()) {
    message = data.detail;
  } else if (typeof data.message === "string" && data.message.trim()) {
    message = data.message;
  } else if (
    typeof actualError?.message === "string" &&
    actualError.message.trim()
  ) {
    // Ignore status code messages like "402 Payment Required" unless it's the only info
    if (!/^\d+\s/.test(actualError.message)) {
      message = actualError.message;
    }
  }

  return {
    message: message || defaultMessage,
    status,
    code,
  };
}

// --- Public Handlers ---

/**
 * エラーを解析し、ログ出力とグローバルイベントの発火を行う基底関数
 * ※この関数は副作用（グローバルイベント発火）を伴います
 */
export function handleApiError(error: unknown, operation: string): ApiError {
  const apiError = extractApiError(error);

  if (isGlobalToastStatus(apiError.status)) {
    console.debug(`${operation}エラー(${apiError.status}):`, error);
    dispatchGlobalErrorEvent(apiError.status, apiError.message);
  } else {
    console.error(`${operation}エラー:`, error);
  }

  return apiError;
}

/**
 * APIエラー処理の完全版：解析、ログ、グローバルイベント、ローカルUI反映を一括で行う
 * アプリケーションコードからは原則としてこの関数を使用してください。
 *
 * @param onLocalError - ローカルのState更新等を行うコールバック（グローバルエラー時は呼ばれない）
 */
export function handleErrorWithUI(
  error: unknown,
  operation: string,
  onLocalError?: (message: string) => void,
): ApiError {
  // ここで解析＆グローバルイベント発火（必要な場合）
  const apiError = handleApiError(error, operation);

  // グローバル処理されたエラー以外はローカルで処理
  if (!isGlobalToastStatus(apiError.status)) {
    if (onLocalError) {
      onLocalError(apiError.message);
    }
    showErrorToast(apiError, operation);
  }

  return apiError;
}

// --- Toast Helpers ---

export function showErrorToast(error: ApiError, operation: string): void {
  // グローバル対象エラーはここでは表示しない（二重表示防止）
  if (isGlobalToastStatus(error.status)) return;

  addToast({
    title: operation,
    description: error.message,
    color: "danger",
  });
}

export function showSuccessToast(operation: string): void {
  addToast({ title: operation, color: "success" });
}

export function showLoadingToast(operation: string): void {
  addToast({ title: operation, color: "primary" });
}

// --- Fetch Response Handler ---

export async function handleResponseError(
  response: Response,
  options?: {
    redirectOn401?: string | false;
    redirectOnAuthError?: string | false;
  },
): Promise<void> {
  if (response.ok) return;

  const status = response.status;

  // エラー詳細の取得を試みる
  let errorData: any = {};
  try {
    // clone()してから読む（本体のストリームを消費しないため）
    const data = await response.clone().json();
    if (data && typeof data === "object") {
      errorData = data;
    }
  } catch {
    // JSONパース失敗時は無視
  }

  // Auth Errors (401)
  if (status === 401) {
    console.error("Authentication failed");
    const target = options?.redirectOnAuthError ?? options?.redirectOn401;
    if (target !== false) {
      window.location.href = typeof target === "string" ? target : "/login";
    }
  }

  // Recommendation APIログ
  if (response.url.includes("/get/recommendation/")) {
    try {
      const body = await response.clone().text();
      console.warn(
        `Recommendation API Error: ${status} ${response.statusText}`,
        body,
      );
    } catch (e) {
      console.warn(`Recommendation API Error: ${status} (read failed)`, e);
    }
  }

  // エラーオブジェクトを作成して投げる
  // extractApiError が解釈しやすいようにレスポンス情報を添付する
  const message =
    errorData.detail || errorData.message || `${status} ${response.statusText}`;
  const error = new Error(message);

  (error as any).response = {
    status: status,
    data: errorData,
  };

  // ApiClient 等でラップされることを想定し、original プロパティにも自身を入れておく
  // これにより extractApiError での探索が確実になる
  (error as any).original = error;

  throw error;
}
