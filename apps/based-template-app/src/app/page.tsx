// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { addToast } from "@heroui/react";
import { Phone } from "lucide-react";
import { login } from "@/lib/auth";
import { useAuth } from "./providers";
import { getSetupStatus, isSetupComplete } from "@/lib/setupStatus";
import { useEffect } from "react";

function getRedirectPath() {
  return isSetupComplete(getSetupStatus()) ? "/dashboard" : "/setup";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace(getRedirectPath());
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push(getRedirectPath());
    } catch (err: unknown) {
      console.error("Login error:", err);
      const firebaseError = err as { code?: string; message?: string };
      addToast({
        title: firebaseError.code
          ? `ログインエラー: ${firebaseError.code}`
          : "メールアドレスまたはパスワードが正しくありません",
        color: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-2">
            <Phone size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Predictive Dialer
          </h1>
          <p className="text-sm text-gray-500">ログインしてください</p>
        </CardHeader>
        <CardBody className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="メールアドレス"
              placeholder="email@example.com"
              type="email"
              value={email}
              onValueChange={setEmail}
              isRequired
              autoFocus
            />
            <Input
              label="パスワード"
              placeholder="パスワードを入力"
              type="password"
              value={password}
              onValueChange={setPassword}
              isRequired
            />
            <Button
              type="submit"
              color="primary"
              size="lg"
              className="mt-2"
              isLoading={isSubmitting}
              isDisabled={!email || !password}
            >
              ログイン
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
