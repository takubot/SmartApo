# Predictive Dialer - セットアップガイド

PCからプレディクティブコール（自動架電）を行うには、Twilioアカウントの作成・番号の購入・Webhook設定が必要です。本ドキュメントではその手順を解説します。

---

## 目次

1. [Twilioアカウントの作成](#1-twilioアカウントの作成)
2. [電話番号の購入](#2-電話番号の購入)
3. [TwiML Appの作成](#3-twiml-appの作成)
4. [Webhookの設定](#4-webhookの設定)
5. [環境変数の設定](#5-環境変数の設定)
6. [アプリ内での設定](#6-アプリ内での設定)
7. [接続テスト](#7-接続テスト)
8. [ローカル開発での注意点](#8-ローカル開発での注意点)
9. [Google連携の設定](#9-google連携の設定)
10. [トラブルシューティング](#10-トラブルシューティング)

---

## 1. Twilioアカウントの作成

1. [Twilio公式サイト](https://www.twilio.com/ja-jp)にアクセス
2. 「無料で始める」からアカウントを作成
3. メール認証・電話番号認証を完了する
4. Twilioコンソールにログイン後、ダッシュボードで以下を確認
   - **Account SID** — `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` 形式
   - **Auth Token** — 「Show」をクリックで表示

> **注意**: トライアルアカウントでは認証済みの電話番号にしか発信できません。本番運用にはアカウントのアップグレード（クレジットカード登録）が必要です。

---

## 2. 電話番号の購入

プレディクティブコールの発信元番号（Caller ID）として、Twilio番号を少なくとも1つ購入する必要があります。

### 日本の番号を購入する場合

1. Twilioコンソール → **Phone Numbers** → **Buy a Number**
2. Country: **Japan (+81)** を選択
3. Capabilities: **Voice** にチェック
4. 番号を選んで「Buy」

> **日本の規制について**: 日本の電話番号を取得するには、Twilioの[Regulatory Bundle](https://www.twilio.com/docs/phone-numbers/regulatory)の提出が必要です。会社情報・住所証明書類を提出し、審査に通る必要があります（通常数営業日）。

### 米国の番号を購入する場合（テスト用）

テスト目的であれば米国番号（+1）が即座に購入可能です。日本への発信もできますが、国際通話料金がかかります。

### 購入した番号の確認

Twilioコンソール → **Phone Numbers** → **Manage** → **Active Numbers** で一覧を確認できます。

---

## 3. TwiML Appの作成

TwiML Appは、ブラウザからの発信を制御するために必要です。

1. Twilioコンソール → **Voice** → **TwiML** → **TwiML Apps**
2. 「Create new TwiML App」をクリック
3. 設定:
   - **Friendly Name**: `Predictive Dialer`（任意）
   - **Voice Request URL**: `https://<your-backend-domain>/v2/dialer/webhooks/twilio/voice`
   - **Voice Method**: `POST`
   - **Voice Status Callback URL**: `https://<your-backend-domain>/v2/dialer/webhooks/twilio/status`
   - **Voice Status Callback Method**: `POST`
4. 「Save」をクリック
5. 作成されたTwiML Appの **SID**（`APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`）を控える

---

## 4. Webhookの設定

### 購入した電話番号にWebhookを設定

1. Twilioコンソール → **Phone Numbers** → **Active Numbers** → 購入した番号をクリック
2. **Voice & Fax** セクション:
   - **A CALL COMES IN**: Webhook → `https://<your-backend-domain>/v2/dialer/webhooks/twilio/voice` → POST
   - **CALL STATUS CHANGES**: `https://<your-backend-domain>/v2/dialer/webhooks/twilio/status` → POST
3. 「Save」をクリック

### Webhookエンドポイント一覧

本システムが受け付けるTwilio Webhookは以下の4つです。

| エンドポイント                              | 用途                     |
| ------------------------------------------- | ------------------------ |
| `POST /v2/dialer/webhooks/twilio/voice`     | 発信/着信時のTwiML応答   |
| `POST /v2/dialer/webhooks/twilio/status`    | 通話ステータスの変更通知 |
| `POST /v2/dialer/webhooks/twilio/recording` | 録音完了通知             |
| `POST /v2/dialer/webhooks/twilio/fallback`  | エラー時のフォールバック |

---

## 5. 環境変数の設定

バックエンド（`python/domain/based-template-svc/src/common/.env`）に以下を追加します。

```env
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_DEFAULT_CALLER_ID=+81XXXXXXXXXX
TWILIO_WEBHOOK_BASE_URL=https://your-backend-domain.com
```

| 変数名                     | 説明                                   | 例                        |
| -------------------------- | -------------------------------------- | ------------------------- |
| `TWILIO_ACCOUNT_SID`       | Twilioダッシュボードの Account SID     | `ACxxxx...`               |
| `TWILIO_AUTH_TOKEN`        | Twilioダッシュボードの Auth Token      | `xxxx...`                 |
| `TWILIO_TWIML_APP_SID`     | 手順3で作成した TwiML App の SID       | `APxxxx...`               |
| `TWILIO_DEFAULT_CALLER_ID` | デフォルトの発信元番号（購入した番号） | `+81312345678`            |
| `TWILIO_WEBHOOK_BASE_URL`  | バックエンドの公開URL                  | `https://api.example.com` |

> **本番環境**: Google Secret Manager に設定値を格納してください。Secret名は `smartapo-config-{env}` です。

---

## 6. アプリ内での設定

環境変数とは別に、アプリのUI（設定 > Twilio設定）からもテナント単位で設定できます。

1. ログイン後、サイドバーの **設定** → **Twilio設定** を開く
2. 以下を入力:
   - **Account SID** — Twilioダッシュボードから取得
   - **Auth Token** — Twilioダッシュボードから取得
   - **デフォルト発信者番号** — 購入した番号（`+81XXXXXXXXXX` 形式）
   - **Webhook Base URL** — バックエンドの公開URL
3. 「保存」をクリック

UI経由の設定は `dialer_twilio_config` テーブルにテナント別で保存され、環境変数より優先されます。

---

## 7. 接続テスト

1. **設定 > Twilio設定** ページで「接続テスト」ボタンをクリック
2. 成功すると「接続成功」と表示され、Twilioアカウント名が返されます
3. 失敗する場合は Account SID / Auth Token が正しいか確認してください

### APIからの確認

```bash
# バックエンドが起動している状態で
curl -X POST http://localhost:8081/v2/dialer/settings/twilio/test \
  -H "Authorization: Bearer <your-firebase-token>"
```

---

## 8. ローカル開発での注意点

### ngrokでWebhookを受け取る

ローカル環境ではTwilioからのWebhookを受け取れないため、[ngrok](https://ngrok.com/)でトンネルを作ります。

```bash
# 1. ngrokをインストール
# macOS: brew install ngrok
# Windows: https://ngrok.com/download からダウンロード

# 2. バックエンドのポートをトンネル
ngrok http 8081
```

ngrokが表示するURLを控えます（例: `https://abc123.ngrok-free.app`）。

```
# 表示例
Forwarding  https://abc123.ngrok-free.app -> http://localhost:8081
```

この URL を以下に設定します:

- 環境変数 `TWILIO_WEBHOOK_BASE_URL=https://abc123.ngrok-free.app`
- TwiML App の Voice Request URL: `https://abc123.ngrok-free.app/v2/dialer/webhooks/twilio/voice`
- 電話番号の Webhook URL: 同上

> **注意**: ngrokの無料プランでは起動するたびにURLが変わります。URLが変わったらTwilioコンソール側も更新してください。

### テスト用クレデンシャル

本番番号を使わずにAPIの動作確認だけしたい場合、TwilioのTest Credentialsが使えます。

1. Twilioコンソール → ダッシュボード下部の **Test Credentials** セクション
2. Test Account SID / Test Auth Token をコピー
3. 環境変数に設定

Test Credentialsでは実際の通話は発生しませんが、APIの呼び出しパターンを検証できます。

---

## 9. Google連携の設定

### Google Cloud Console でのOAuthクライアント作成

Google Contacts / Sheets連携を使うには、OAuthクライアントIDが必要です。

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（またはプロジェクトを新規作成）
3. **APIとサービス** → **有効なAPIとサービス** で以下を有効化:
   - People API（Google Contacts用）
   - Google Sheets API
   - Google Calendar API（既存で設定済みなら不要）
   - Gmail API（既存で設定済みなら不要）
4. **APIとサービス** → **認証情報** → **認証情報を作成** → **OAuthクライアントID**
5. アプリケーションの種類: **ウェブアプリケーション**
6. 承認済みリダイレクトURI:
   - `https://<your-backend-domain>/v2/dialer/google/callback`
   - ローカル用: `http://localhost:8081/v2/dialer/google/callback`
7. 作成後、**クライアントID** と **クライアントシークレット** を控える

### 環境変数

```env
# Google Contacts
GOOGLE_CONTACTS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CONTACTS_CLIENT_SECRET=GOCSPX-xxxxx

# Google Sheets
GOOGLE_SHEETS_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_SHEETS_CLIENT_SECRET=GOCSPX-xxxxx
```

> 同じOAuthクライアントで複数のAPIスコープを要求できるため、Contacts用とSheets用のクライアントIDは同じものでも構いません。

### アプリ内での接続

1. サイドバーの **設定** → **Google連携** を開く
2. 連携したいサービス（Contacts / Calendar / Gmail / Sheets）の「接続」ボタンをクリック
3. Googleの認証画面でアカウントを選択し、権限を承認
4. 接続完了後、「同期」ボタンでデータ同期が可能に

---

## 10. トラブルシューティング

### Twilio関連

| 症状                              | 対処                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 接続テストで「接続失敗」          | Account SID / Auth Token が正しいか確認。トライアルアカウントは有効期限に注意                         |
| 発信しても呼び出し音が鳴らない    | 購入した番号にVoice機能があるか確認。Twilioコンソールで通話ログを確認                                 |
| Webhookが届かない                 | ngrokが起動しているか、URLが正しいか確認。Twilioコンソールのデバッガーでエラーを確認                  |
| 「+81」番号が購入できない         | Regulatory Bundleの審査が必要。書類を提出して承認を待つ                                               |
| トライアルで相手に繋がらない      | トライアルでは認証済み番号にしか発信できない。Twilioコンソール → Verified Caller IDs で相手番号を登録 |
| 「21215」エラー（Geo Permission） | Twilioコンソール → Voice → Settings → Geo Permissions で日本を有効化                                  |

### Google連携関連

| 症状                              | 対処                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| OAuth画面で「アクセスがブロック」 | Google Cloud ConsoleでOAuth同意画面を設定し、テストユーザーを追加 |
| 「redirect_uri_mismatch」エラー   | 承認済みリダイレクトURIがバックエンドのURLと一致しているか確認    |
| トークンの期限切れ                | 「切断」→「接続」で再認証                                         |

### 一般

| 症状                             | 対処                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| バックエンドが起動しない         | `ENV=local` で起動しているか確認。Secret Manager接続は自動でスキップされる    |
| フロントエンドにアクセスできない | `npm i` → `npm run dev:filter --filter=based-template-app` で起動。ポート3500 |

---

## 料金の目安（Twilio）

| 項目                         | 概算料金                 |
| ---------------------------- | ------------------------ |
| 日本の番号（月額）           | 約 $4.50/月/番号         |
| 日本国内の発信（固定電話宛） | 約 $0.0820/分 (約¥12/分) |
| 日本国内の発信（携帯電話宛） | 約 $0.1150/分 (約¥17/分) |
| 通話録音                     | 約 $0.0025/分            |

※ 料金は変動します。最新の価格は [Twilio Pricing](https://www.twilio.com/ja-jp/pricing) を参照してください。

---

## 開発コマンド

```bash
# フロントエンド起動
npm run dev:filter --filter=based-template-app

# バックエンド起動
npm run uv:dev:filter --uvdev=based-template-svc

# APIスキーマ生成（バックエンド変更後に実行）
npm run gen:openapi:all
```
