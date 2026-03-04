import admin from "firebase-admin";
import type { TenantAwareAuth } from "firebase-admin/auth";
import type { Storage } from "firebase-admin/storage";

// すでに初期化されていないかチェック（Next.jsや他環境では二重初期化を防ぐため）
if (!admin.apps.length) {
  console.log("ENV", process.env.ENV);
  console.log("NODE_ENV", process.env.NODE_ENV);
  console.log("NEXT_PUBLIC_ENV", process.env.NEXT_PUBLIC_ENV);
  console.log("NEXT_PUBLIC_TENANT_ID", process.env.NEXT_PUBLIC_TENANT_ID);

  // 1) ローカル環境以外（production, dev等）で Firebaseを使う場合
  if (process.env.ENV !== "local") {
    admin.initializeApp();
  } else {
    // 2) ローカル環境でJSON ファイルを直接読み込むパターン
    const serviceAccount = require("../../../auth.json");

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

export const tenantAuthAdmin: TenantAwareAuth = admin
  .auth()
  .tenantManager()
  .authForTenant(process.env.TENANT_ID || "tenant");
export const dbAdmin = admin.firestore(); // Firestoreを使いたい場合
export const storageAdmin: Storage = admin.storage(); // Cloud Storageを使いたい場合
