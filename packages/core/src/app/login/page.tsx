"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Input, Button, Card, CardBody, Spinner } from "@heroui/react";
import { EyeFilledIcon } from "./EyeFilledIcon";
import { EyeSlashFilledIcon } from "./EyeSlashFilledIcon";
import {
  signInWithEmailAndPassword,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../lib/firebase";

import {
  get_group_list_by_user_id_v2_group_list__user_id__get,
  validate_ip_restriction_v2_group_check_ip_restriction_post,
  validate_ip_restriction_v2_tenant_config_check_ip_restriction_post,
} from "@repo/api-contracts/based_template/service";
import type { GroupListResponseSchemaType } from "@repo/api-contracts/based_template/zschema";
import useSWR from "swr";

/* ===== LoadingScreen（変更なし） ===== */
const LoadingScreen: React.FC<{ message?: string }> = ({ message }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
    <div className="flex space-x-2">
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce" />
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce200" />
      <div className="w-4 h-4 bg-primary rounded-full animate-bounce400" />
    </div>
    <p className="mt-4 text-lg text-primary">
      {message || "ローディング中..."}
    </p>
  </div>
);

/* ===== エラーからHTTPステータスコードを抽出するヘルパー関数 ===== */
const getHttpStatusFromError = (err: unknown): number | null => {
  if (!err || typeof err !== "object") return null;

  // status または statusCode プロパティをチェック
  if ("status" in err && typeof err.status === "number") {
    return err.status;
  }
  if ("statusCode" in err && typeof err.statusCode === "number") {
    return err.statusCode;
  }

  // responseオブジェクト内のstatusをチェック
  if (
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "status" in err.response &&
    typeof err.response.status === "number"
  ) {
    return err.response.status as number;
  }

  // error.original をチェック（fetchclientのエラー形式）
  if ("original" in err && err.original && typeof err.original === "object") {
    const originalStatus = getHttpStatusFromError(err.original);
    if (originalStatus !== null) return originalStatus;
  }

  // メッセージからステータスコードを抽出（例: "401 Unauthorized" や "502 Bad Gateway"）
  if ("message" in err && typeof err.message === "string") {
    const message = err.message;
    const statusMatch = message.match(/\b(401|502|500|503|504)\b/);
    if (statusMatch && statusMatch[1]) {
      return parseInt(statusMatch[1], 10);
    }
  }

  return null;
};

const persistToken = (token: string) => {
  document.cookie = `access_token=${token}; path=/; SameSite=None; Secure;`;
  localStorage.setItem("access_token", token);
};

const clearPersistedToken = () => {
  document.cookie = "access_token=; path=/; Max-Age=0; SameSite=None; Secure;";
  localStorage.removeItem("access_token");
};

/**
 * ユーザーが所属するグループ一覧を取得するカスタムフック
 */
function useGroupListByUser(userId: string | null) {
  const { data, error, isLoading, mutate } =
    useSWR<GroupListResponseSchemaType>(
      userId ? `groupListByUser-${userId}` : null,
      userId
        ? () => get_group_list_by_user_id_v2_group_list__user_id__get(userId)
        : null,
      {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    );

  return {
    groupList: data?.groupList ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

const SignInPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingIp, setIsCheckingIp] = useState(false);

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);

  const fetchClientIp = async (): Promise<string> => {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip as string;
  };

  /* ----- 送信処理（リファクタリング済み） ----- */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isCheckingIp) return;
    setError(null);
    setIsSubmitting(true);
    setIsCheckingIp(true);
    try {
      // 必要なテナントIDを明示的に設定（Firebase多テナント対応）
      const firebaseTenantId =
        process.env.NEXT_PUBLIC_FIREBASE_TENANT_ID ||
        process.env.NEXT_PUBLIC_TENANT_ID ||
        "based-template-vbf6m";
      auth.tenantId = firebaseTenantId;

      // 前回のトークンをクリアしてから再ログイン
      clearPersistedToken();

      // Firebase認証を実行
      const { user } = await signInWithEmailAndPassword(auth, email, password);

      // 初期トークン取得と永続化
      const initialToken = await user.getIdToken();
      persistToken(initialToken);

      // auth state の反映を待つ
      await new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
          if (firebaseUser) {
            unsubscribe();
            resolve(null);
          }
        });
      });

      // カスタムクレーム反映済みの最新トークンを再取得し保存
      const finalToken = await user.getIdToken(true);
      persistToken(finalToken);

      // クライアントIPを取得
      const clientIp = await fetchClientIp();

      // テナントのIP制限チェック
      const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || "based-template";
      const tenantCheck =
        await validate_ip_restriction_v2_tenant_config_check_ip_restriction_post(
          {
            tenantId,
            ipAddress: clientIp,
          },
        );
      if (!tenantCheck.isAllowed) {
        clearPersistedToken();
        setError(`テナントのIP制限によりアクセスが拒否されました。`);
        setIsSubmitting(false);
        setIsCheckingIp(false);
        return;
      }

      // グループのIP制限チェック
      const groupData =
        await get_group_list_by_user_id_v2_group_list__user_id__get(user.uid);
      if (groupData.groupList && groupData.groupList.length > 0) {
        for (const group of groupData.groupList) {
          const groupCheck =
            await validate_ip_restriction_v2_group_check_ip_restriction_post({
              groupId: group.groupId,
              ipAddress: clientIp,
            });
          if (!groupCheck.isAllowed) {
            const groupName =
              "groupName" in group && typeof group.groupName === "string"
                ? group.groupName
                : group.groupId;
            clearPersistedToken();
            setError(
              `グループ「${groupName}」のIP制限によりアクセスが拒否されました。`,
            );
            setIsSubmitting(false);
            setIsCheckingIp(false);
            return;
          }
        }
      }

      setIsAuthenticated(true);
    } catch (err: unknown) {
      console.error("Login error:", err);
      // Firebaseエラーコードを日本語メッセージに変換
      let errorMessage = "ログイン中にエラーが発生しました。";

      // 502 Bad Gatewayまたは401 Unauthorizedエラーのチェック
      if (
        getHttpStatusFromError(err) === 502 ||
        getHttpStatusFromError(err) === 401
      ) {
        errorMessage = "不明なエラー";
        setError(errorMessage);
        setIsSubmitting(false);
        setIsCheckingIp(false);
        return;
      }

      if (err && typeof err === "object" && "code" in err) {
        const errorCode = err.code as string;
        // ログインIDまたはパスワードが違う場合
        if (
          errorCode === "auth/user-not-found" ||
          errorCode === "auth/wrong-password" ||
          errorCode === "auth/invalid-credential"
        ) {
          errorMessage = "ログインID,パスワードが違います";
        } else if (errorCode === "auth/invalid-email") {
          errorMessage = "メールアドレスの形式が正しくありません";
        } else if (errorCode === "auth/user-disabled") {
          errorMessage = "このアカウントは無効化されています";
        } else if (errorCode === "auth/too-many-requests") {
          errorMessage =
            "ログイン試行回数が多すぎます。しばらくしてから再度お試しください";
        } else if (errorCode === "auth/network-request-failed") {
          errorMessage =
            "ネットワークエラーが発生しました。接続を確認してください";
        } else if (errorCode === "auth/operation-not-allowed") {
          errorMessage = "このログイン方法は許可されていません";
        } else {
          errorMessage = "ログイン中にエラーが発生しました。";
        }
      } else if (err && typeof err === "object" && "message" in err) {
        // エラーコードがない場合はメッセージをそのまま使用（既に日本語の場合もある）
        errorMessage = String(err.message);
      }

      setError(errorMessage);
      setIsSubmitting(false);
      setIsCheckingIp(false);
    }
    setIsCheckingIp(false);
  };

  /* ----- 認証後リダイレクト（変更なし） ----- */
  if (isAuthenticated) return <GroupRedirector />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-6 bg-white shadow-md rounded-md">
        <CardBody className="flex flex-col items-center">
          <Image
            src={`/themeIcon/${process.env.NEXT_PUBLIC_LOGO_IMG_URL || "doppel_logo.png"}`}
            alt="doppel_logo"
            width={150}
            height={50}
            className="mb-8"
          />
          <div className="text-center text-lg font-semibold mb-6">ログイン</div>

          {error && (
            <div className="text-red-600 mb-4 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              label="ログインID"
              placeholder="ログインIDを入力してください"
              fullWidth
              required
              variant="bordered"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="パスワード"
              placeholder="パスワードを入力してください"
              fullWidth
              required
              value={password}
              variant="bordered"
              onChange={(e) => setPassword(e.target.value)}
              type={isPasswordVisible ? "text" : "password"}
              endContent={
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label="toggle password visibility"
                  className="focus:outline-none"
                >
                  {isPasswordVisible ? (
                    <EyeSlashFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  ) : (
                    <EyeFilledIcon className="text-2xl text-default-400 pointer-events-none" />
                  )}
                </button>
              }
            />

            {/* パスワードリセットへのリンク */}
            <div className="text-right">
              <Link
                href="/resetPassword"
                className="text-sm text-primary hover:underline"
              >
                パスワードを忘れた方はこちら →
              </Link>
            </div>

            <Button
              type="submit"
              color="primary"
              fullWidth
              disabled={isSubmitting}
              className="mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner color="white" size="sm" />
                  {"ログイン処理中..."}
                </div>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

/* ===== GroupRedirector（リファクタリング済み） ===== */
const GroupRedirector: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  const { groupList, isLoading, isError } = useGroupListByUser(
    user?.uid ?? null,
  );

  useEffect(() => {
    if (!isLoading && authChecked && user) {
      if (groupList.length === 0) window.location.href = "/main/group/new";
      else window.location.href = `/main/${groupList[0]?.groupId}/chat`;
    }
  }, [groupList, isLoading, authChecked, user]);

  if (!authChecked || isLoading)
    return <LoadingScreen message="システムを構成中..." />;
  if (isError) {
    // 502 Bad Gatewayまたは401 Unauthorizedエラーのチェック
    let errorMessage = "エラーが発生しました";
    if (isError && typeof isError === "object" && "message" in isError) {
      errorMessage = `エラーが発生しました: ${isError.message}`;
    }
    return <div>{errorMessage}</div>;
  }
  return null;
};

export default SignInPage;
