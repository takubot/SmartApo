// lib/firebase.ts (TypeScript例)

import { initializeApp, getApps, FirebaseOptions } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    "AIzaSyB26jmyy9GqgOtkC8NLxfaMir9bFgZXvnw",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    "doppel-dev-461016.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "doppel-dev-461016",
};

// Firebase アプリの初期化
const existingApp = getApps()[0];
export const app = existingApp ?? initializeApp(firebaseConfig);

// Auth の初期化
const auth = getAuth(app);
auth.languageCode = "ja";
export const tenantId = (
  process.env.NEXT_PUBLIC_TENANT_ID ?? "based-template-vbf6m"
).trim();

// tenantId の設定
auth.tenantId = tenantId;

// ローカル環境でのエミュレータ接続（必要に応じて）
if (process.env.ENV === "local" && typeof window !== "undefined") {
  // エミュレータ設定がある場合のみ接続
  // connectAuthEmulator(auth, "http://localhost:9099");
}

export { auth };
const firestoreDatabaseId =
  process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID ?? "doppel-dev-firestore-db";
export const db = getFirestore(app, firestoreDatabaseId.trim());

// export function setTenantByEmail(email: string): void {
//   if (email.endsWith("@vertex.com")) {
//     auth.tenantId = "gouda-kankou-3y82w";
//   } else if (email.endsWith("@mitradata.jp")) {
//     auth.tenantId = "mitra-datascience-tf2db";
//   } else {
//     auth.tenantId = "defaultTenantId";
//   }
// }
