"use client";

import { Button, Card, CardBody, Input, Spinner } from "@heroui/react";
import { sendPasswordResetEmail } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { auth } from "../../lib/firebase";

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setInfo("パスワード再設定用のメールを送信しました。");
    } catch (err: any) {
      setError(err.message || "メール送信に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="text-center text-lg font-semibold mb-6">
            パスワード再設定
          </div>

          {info && (
            <div className="text-green-600 mb-4 text-center">{info}</div>
          )}
          {error && (
            <div className="text-red-600 mb-4 text-center">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <Input
              label="メールアドレス"
              placeholder="登録済みメールアドレスを入力"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              type="email"
            />

            <Button
              type="submit"
              color="primary"
              fullWidth
              disabled={isSubmitting}
              className={`w-full mt-2 focus:outline-non ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner color="white" size="sm" /> 送信中...
                </div>
              ) : (
                "リセットメールを送信"
              )}
            </Button>
          </form>

          {/* 戻るリンクを追加 */}
          <div className="mt-6">
            <Link
              href="/login"
              className="text-sm text-primary hover:underline"
            >
              ← ログインページへ戻る
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
