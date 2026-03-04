import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@repo/api-contracts/based_template/type";
import { auth } from "./firebase";
import {
  createQueryHook,
  createImmutableHook,
  createInfiniteHook,
  createMutateHook,
} from "swr-openapi";
import { isMatch } from "lodash-es";
import { handleResponseError } from "../common/errorHandler";

const BFF_BASE_PATH = "/api/bff";

/**
 * JWTトークンの有効期限をチェック（5分以上の余裕がある場合のみ有効）
 */
function isTokenValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) return false;

    const payload = JSON.parse(atob(parts[1]));

    // expクレームの存在と型を確認（セキュリティ上重要）
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return false;
    }

    const exp = payload.exp * 1000; // 秒からミリ秒に変換
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5分のバッファ

    return exp > now + bufferTime;
  } catch {
    return false;
  }
}

/**
 * Firebase IDトークンを取得（優先順位: currentUser > localStorage）
 */
async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (user) {
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Failed to get ID token:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
      }
      return null;
    }
  }

  // ログイン処理中など、currentUserがnullの場合のフォールバック
  if (typeof window === "undefined") return null;

  const storedToken = localStorage.getItem("access_token");
  if (!storedToken) return null;

  if (isTokenValid(storedToken)) {
    return storedToken;
  }

  localStorage.removeItem("access_token");
  return null;
}

/**
 * CSRFトークンを取得
 */
async function getCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const getCookie = (name: string) =>
    document.cookie
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.split("=")[1];

  const decodeToken = (token: string | undefined): string | null => {
    if (!token) return null;
    try {
      return decodeURIComponent(token);
    } catch {
      // 不正なエンコーディングの場合は無視（セキュリティ上安全）
      return null;
    }
  };

  let csrfToken = getCookie("csrf_token");
  const decoded = decodeToken(csrfToken);
  if (decoded) return decoded;

  try {
    await fetch(`${BFF_BASE_PATH}/__csrf`, {
      method: "GET",
      credentials: "same-origin",
    });
    csrfToken = getCookie("csrf_token");
    return decodeToken(csrfToken);
  } catch {
    // CSRFトークン取得失敗は致命的ではない（バックエンドで検証される）
    return null;
  }
}

const createAuthMiddleware = (options?: {
  redirectOn401?: string | false;
  redirectOnAuthError?: string | false;
}): Middleware => ({
  async onRequest({ request }) {
    // CSRFトークン（変更系メソッドのみ）
    const method = request.method?.toUpperCase() ?? "GET";
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        request.headers.set("x-csrf-token", csrfToken);
      }
    }

    // 認証トークン
    const idToken = await getIdToken();
    if (idToken) {
      request.headers.set("Authorization", `Bearer ${idToken}`);
    }

    return request;
  },
  async onResponse({ response }) {
    await handleResponseError(response, options);
  },
});

const authMiddleware = createAuthMiddleware();

const baseClient = createClient<paths>({
  baseUrl: BFF_BASE_PATH,
  querySerializer: {
    array: { style: "form", explode: true },
  },
});
baseClient.use(authMiddleware);

const swrKeyPrefix = "based-template-api";
export const useQuery: any = createQueryHook(
  baseClient as any,
  swrKeyPrefix,
) as any;
export const useImmutable: any = createImmutableHook(
  baseClient as any,
  swrKeyPrefix,
) as any;
export const useInfinite: any = createInfiniteHook(
  baseClient as any,
  swrKeyPrefix,
) as any;
export const useMutate: any = createMutateHook(
  baseClient as any,
  swrKeyPrefix,
  isMatch,
) as any;

interface FetchResponse<T = any> {
  data?: T;
  error?: any;
}

class ApiClient {
  private client = baseClient;

  async GET<T = any>(path: string, options?: any): Promise<FetchResponse<T>> {
    try {
      const result = await this.client.GET(path as any, options);
      return result.error
        ? { error: result.error }
        : { data: result.data as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }

  async POST<T = any>(path: string, options?: any): Promise<FetchResponse<T>> {
    try {
      const result = await this.client.POST(
        path as any,
        {
          ...options,
          body: options?.body,
        } as any,
      );
      return (result as any).error
        ? { error: (result as any).error }
        : { data: (result as any).data as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }

  async POST_FORM_DATA<T = any>(
    path: string,
    body: FormData,
    options?: any,
  ): Promise<FetchResponse<T>> {
    try {
      // クエリパラメータ
      const params = new URLSearchParams();
      if (options?.params?.query) {
        Object.entries(options.params.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      const queryString = params.toString() ? `?${params.toString()}` : "";

      // ヘッダー
      const headers: HeadersInit = {};

      // CSRFトークン
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }

      // 認証トークン
      const idToken = await getIdToken();
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      // リクエスト送信
      const response = await fetch(`${BFF_BASE_PATH}${path}${queryString}`, {
        method: "POST",
        headers,
        body,
        credentials: "same-origin",
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          const text = await response.text();
          if (text) {
            try {
              errorData = JSON.parse(text);
            } catch {
              // JSONパース失敗時はテキストをそのまま使用（セキュリティ上安全）
              errorData = { message: text };
            }
          }
        } catch {
          // レスポンス読み取り失敗時はステータス情報のみ
          errorData = { message: `${response.status} ${response.statusText}` };
        }

        const error = new Error(
          errorData.detail ||
            errorData.message ||
            `${response.status} ${response.statusText}`,
        );
        (error as any).response = { status: response.status, data: errorData };
        throw error;
      }

      return { data: (await response.json()) as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }

  async PUT<T = any>(path: string, options?: any): Promise<FetchResponse<T>> {
    try {
      const result = await this.client.PUT(path as any, options);
      return result.error
        ? { error: result.error }
        : { data: result.data as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }

  async DELETE<T = any>(
    path: string,
    options?: any,
  ): Promise<FetchResponse<T>> {
    try {
      const result = await this.client.DELETE(path as any, options);
      return result.error
        ? { error: result.error }
        : { data: result.data as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }

  async PATCH<T = any>(path: string, options?: any): Promise<FetchResponse<T>> {
    try {
      const result = await this.client.PATCH(path as any, options);
      return result.error
        ? { error: result.error }
        : { data: result.data as T };
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : "Unknown error",
          original: error,
        },
      };
    }
  }
}

const apiClient = new ApiClient();
export default apiClient;
export { ApiClient };
