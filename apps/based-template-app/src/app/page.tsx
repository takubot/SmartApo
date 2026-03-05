// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Phone } from "lucide-react";
import { login, isAuthenticated } from "@/lib/auth";
import { getSetupStatus, isSetupComplete } from "@/lib/setupStatus";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getRedirectPath = () => {
    return isSetupComplete(getSetupStatus()) ? "/dashboard" : "/setup";
  };

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace(getRedirectPath());
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      if (login(userId, password)) {
        router.push(getRedirectPath());
      } else {
        setError("ログインIDまたはパスワードが正しくありません");
        setIsLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2 pt-8 pb-2">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white mb-2">
            <Phone size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Predictive Dialer</h1>
          <p className="text-sm text-gray-500">ログインしてください</p>
        </CardHeader>
        <CardBody className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="ログインID"
              placeholder="IDを入力"
              value={userId}
              onValueChange={setUserId}
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
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <Button
              type="submit"
              color="primary"
              size="lg"
              className="mt-2"
              isLoading={isLoading}
              isDisabled={!userId || !password}
            >
              ログイン
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
