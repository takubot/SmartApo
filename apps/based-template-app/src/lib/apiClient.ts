// lib/apiClient.ts
// Firebase Auth 付き Axios クライアント

import axios from "axios";
import { auth } from "./firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/v2/dialer`,
  headers: { "Content-Type": "application/json" },
});

// リクエストインターセプター: Firebase ID Token を自動付与
apiClient.interceptors.request.use(async (config) => {
  if (typeof window === "undefined") return config;

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// レスポンスインターセプター: 401 → / リダイレクト（Google トークン切れは除外）
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const detail: string = error.response?.data?.detail ?? "";
      // Google OAuth トークン切れは呼び出し元でハンドリングさせる
      if (!detail.includes("Google")) {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;

/** SWR 用の汎用フェッチャー */
export const swrFetcher = async <T>(url: string): Promise<T> => {
  const res = await apiClient.get<T>(url);
  return res.data;
};
