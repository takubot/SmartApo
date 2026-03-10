# Google連携 セットアップ手順書

本ドキュメントでは、SmartApo Dialer の Google Sheets / Gmail / Calendar 連携を有効化するために必要な **GCP設定** と **コード実装状況** をまとめる。

---

## 目次

1. [前提: GCP共通設定](#1-前提-gcp共通設定)
2. [Google Sheets 連携](#2-google-sheets-連携)
3. [Gmail 連携](#3-gmail-連携)
4. [Google Calendar 連携](#4-google-calendar-連携)
5. [環境変数一覧](#5-環境変数一覧)
6. [実装状況サマリ](#6-実装状況サマリ)
7. [残課題](#7-残課題)

---

## 1. 前提: GCP共通設定

すべてのOAuth連携で共通の手順。

### 1-1. GCPプロジェクト確認

- プロジェクト: `smartapo`（既存）
- コンソール: https://console.cloud.google.com/

### 1-2. OAuth同意画面の設定

1. **APIs & Services > OAuth consent screen** を開く
2. User Type: **External**（社外ユーザーにも使わせる場合）
3. アプリ名: `SmartApo`
4. サポート用メール: 管理者メールアドレス
5. **スコープの追加** （連携ごとに必要なスコープを追加）:

| 連携 | 必要なスコープ |
|------|---------------|
| Sheets | `https://www.googleapis.com/auth/spreadsheets` |
| Drive (Picker) | `https://www.googleapis.com/auth/drive.readonly` |
| Contacts | `https://www.googleapis.com/auth/contacts.readonly` |
| Calendar | `https://www.googleapis.com/auth/calendar.events` / `calendar.readonly` |
| Gmail (OAuth) | `https://www.googleapis.com/auth/gmail.send`（SMTP方式なら不要） |

6. テストユーザーに利用者のGoogleアカウントを追加（本番公開前はテストモード）
7. **本番移行時**: Google審査に申請する（OAuthスコープが sensitive/restricted の場合）

### 1-3. OAuth 2.0クライアントIDの作成

1. **APIs & Services > Credentials > Create Credentials > OAuth client ID**
2. Application type: **Web application**
3. Name: `SmartApo Web Client`

#### 承認済みの JavaScript 生成元 (Authorized JavaScript origins)

OAuthポップアップを開くフロントエンドのオリジンを全環境分登録する。

```
http://localhost:3500
https://based-template-app-1090554569112.asia-northeast1.run.app
https://based-template-app-638194985906.asia-northeast1.run.app
https://based-template-app-646682719623.asia-northeast1.run.app
```

| 環境 | URL |
|------|-----|
| ローカル | `http://localhost:3500` |
| Dev | `https://based-template-app-1090554569112.asia-northeast1.run.app` |
| Stg | `https://based-template-app-638194985906.asia-northeast1.run.app` |
| Prod | `https://based-template-app-646682719623.asia-northeast1.run.app` |

#### 承認済みのリダイレクト URI (Authorized redirect URIs)

OAuthの認可コードを受け取るコールバックページのURLを全環境分登録する。

```
http://localhost:3500/settings/google/callback
https://based-template-app-1090554569112.asia-northeast1.run.app/settings/google/callback
https://based-template-app-638194985906.asia-northeast1.run.app/settings/google/callback
https://based-template-app-646682719623.asia-northeast1.run.app/settings/google/callback
```

| 環境 | URL |
|------|-----|
| ローカル | `http://localhost:3500/settings/google/callback` |
| Dev | `https://based-template-app-1090554569112.asia-northeast1.run.app/settings/google/callback` |
| Stg | `https://based-template-app-638194985906.asia-northeast1.run.app/settings/google/callback` |
| Prod | `https://based-template-app-646682719623.asia-northeast1.run.app/settings/google/callback` |

> カスタムドメインを設定した場合は、そのドメインのオリジンとリダイレクトURIも追加すること。

4. 作成後、`Client ID` と `Client Secret` を控える

> **重要**: Sheets / Contacts / Calendar はすべて同じ OAuthクライアントID (`GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`) を共有する。各連携はAPIスコープで区別されるため、クライアントIDは1つで十分。

### 1-4. APIの有効化

GCPコンソール **APIs & Services > Library** から以下を有効化:

| API名 | 有効化URL | 用途 |
|--------|----------|------|
| Google Sheets API | https://console.cloud.google.com/apis/library/sheets.googleapis.com | スプシ読み書き |
| Google People API | https://console.cloud.google.com/apis/library/people.googleapis.com | 連絡先同期 |
| Google Calendar API | https://console.cloud.google.com/apis/library/calendar-json.googleapis.com | カレンダー連携 |
| Google Drive API | https://console.cloud.google.com/apis/library/drive.googleapis.com | Pickerでドライブ内を閲覧・選択 |
| Google Picker API | https://console.cloud.google.com/apis/library/picker.googleapis.com | スプシ選択ポップアップUI |
| Gmail API | https://console.cloud.google.com/apis/library/gmail.googleapis.com | Gmail OAuth連携（SMTP方式なら不要） |

> Sheets / Contacts / Calendar / Drive はすべてOAuth 2.0トークンでアクセスする。
> **Picker API のみ例外で、APIキー (`GOOGLE_PICKER_API_KEY`) が必須**（Google仕様: `setDeveloperKey` に渡す必要がある）。

---

## 2. Google Sheets 連携

### 実装状況: ✅ 完了

#### 概要

スプレッドシートからコールリストを一括インポート。再同期にも対応。

#### 仕組み

```
フロント: Google Pickerでドライブからスプシを選択 → シートタブ選択 → プレビュー → インポート
    ↓
バックエンド: Sheets API v4でデータ読み取り
    ↓
DB: DialerContact 作成/更新 + DialerCallList に紐付け
```

#### GCP手順

1. Google Sheets API / Google Drive API / Google Picker API を有効化（共通手順 1-4 参照）
2. OAuth クライアントID作成（共通手順の通り）
3. **APIキー作成**（Picker用）: APIs & Services > Credentials > Create Credentials > API key
   - 制限推奨: HTTP referrers で自環境のオリジンのみ許可
   - API restrictions で Google Picker API のみに制限
4. env に `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_PICKER_API_KEY` をセット

#### Secret Manager / .env に追加する値

```env
# 全Google連携で共通（1つだけ設定すればOK）
GOOGLE_OAUTH_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxx
# Picker用APIキー（Google仕様で必須）
GOOGLE_PICKER_API_KEY=AIzaSy-xxxx
```

#### 利用フロー

1. **設定 > Google連携** で「Google Sheets」の「接続」ボタン押下
2. OAuthポップアップでGoogleアカウントにログイン → 権限承認
3. ポップアップが自動的に閉じ、ステータスが「接続済み」に変わる
4. **コールリスト > 新規作成 > Google Sheetsタブ** を選択
5. 「Googleドライブからスプレッドシートを選択」ボタン → Pickerポップアップでファイルを選択
6. シートタブを選択 → プレビュー確認 → リスト名入力 → インポート
7. リスト詳細から「スプシから再同期」で差分更新も可能

#### スプシのフォーマット要件

- **1行目がヘッダー**（必須）
- 以下のヘッダーが自動認識される:

| スプシヘッダー | マッピング先 |
|---------------|-------------|
| 姓 / last_name | last_name |
| 名 / first_name | first_name |
| 電話番号 / 電話 / phone / phone_primary | phone_primary (必須) |
| 携帯 / 携帯電話 / phone_mobile | phone_mobile |
| メール / メールアドレス / email | email |
| 会社名 / 会社 / company / company_name | company_name |
| 部署 / department | department |
| 役職 / position | position |
| 備考 / メモ / notes | notes |

- `phone_primary`（電話番号）がないとスキップされる
- 同一テナント内で同じ電話番号のcontactはupsert（更新）される

#### コード所在

| 種別 | パス |
|------|------|
| Service Interface | `services/interfaces/i_sheets_service.py` |
| Service Impl | `services/implementations/p_google_sheets_service.py` |
| Router | `routers/dialer/dialer_call_lists_router.py` (sheets/* エンドポイント) |
| Schemas | `routers/dialer/schemas/call_list_schemas.py` |
| Frontend | `apps/based-template-app/src/app/(dialer)/call-lists/new/page.tsx` |

---

## 3. Gmail 連携

### 実装状況: ⚠️ SMTP送信のみ（OAuth未実装）

#### 現状

- **SMTP + アプリパスワード** による送信機能のみ実装済み
- Gmail API（OAuth）は **未実装**
- フロントの設定画面に「Gmail」ボタンが表示されるが、押しても **400エラー** になる（ルーター未対応）

#### 現状のSMTP方式で運用する場合の手順

GCPのOAuth設定は不要。Gmailアカウント側の設定のみ。

##### 個人Gmail (@gmail.com) の場合

1. https://myaccount.google.com/security にアクセス
2. **2段階認証** を有効化（まだの場合）
3. **アプリパスワード** を生成:
   - セキュリティ > 2段階認証プロセス > アプリパスワード
   - アプリ: 「メール」、デバイス: 「その他（カスタム名）」→ 「SmartApo」
   - 16文字のパスワードが表示される → これを控える
4. envに設定:

```env
GMAIL_SENDER_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

##### Google Workspace (@会社ドメイン) の場合

1. Google Workspace 管理コンソール (admin.google.com) にアクセス
2. **送信用ユーザー** を作成（例: `noreply@mitradata.jp`）
3. そのユーザーで2段階認証を有効化
4. アプリパスワードを生成
5. envに設定:

```env
GMAIL_SENDER_EMAIL=noreply@mitradata.jp
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

> **注意**: Google Workspace では管理者が「安全性の低いアプリのアクセス」をブロックしている場合がある。その場合はアプリパスワードを使う。

#### Gmail OAuth方式に移行する場合（未実装）

将来的にGmail API（受信トレイ連携・下書き作成等）が必要な場合は以下が必要:

1. GCPで Gmail API を有効化
2. OAuth同意画面に `gmail.send` スコープを追加
3. `dialer_google_router.py` に `"gmail"` のルーティングを追加
4. `ISheetsService` に倣って `IGmailOAuthService` インターフェースを作成
5. Gmail API v1 を使った実装クラスを作成
6. ルーターで認証フロー・トークン管理を追加

**現時点ではSMTP方式で十分なため、OAuth対応は後回しでOK。**

#### コード所在

| 種別 | パス |
|------|------|
| Service Interface | `services/interfaces/i_email_service.py` |
| Service Impl | `services/implementations/p_gmail_service.py` |
| DI | `services/implementations/di.py` → `get_email_service()` |

---

## 4. Google Calendar 連携

### 実装状況: ⚠️ サービス層は実装済み、ルーター未接続

#### 概要

コールバック予定をGoogleカレンダーに自動連携する機能。

#### 現状

- `ICalendarService` インターフェース: ✅ 定義済み
- `GoogleCalendarService` 実装: ✅ 完了（イベントCRUD、Webhook、差分同期すべて）
- `dialer_google_router.py`: ❌ **`calendar` タイプが未対応**
- フロント設定画面: ⚠️ 「Calendar」ボタンは表示されるが、押すと **400エラー**

#### 有効化に必要な手順

##### GCP設定

1. Google Calendar API を有効化
2. OAuth同意画面に `calendar.events` と `calendar.readonly` スコープを追加
3. （同じOAuthクライアントIDを使い回す場合は追加のクライアント作成不要）

##### Secret Manager / .env に追加する値

OAuth用の `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` は共通設定（Sheets設定時に設定済み）。

サービスアカウント方式を使う場合のみ追加（サーバー間通信、任意）:
```env
GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO={"type":"service_account","project_id":"smartapo",...}
```

##### コード変更（必要な実装）

**1. ルーターに `calendar` タイプを追加**

`dialer_google_router.py` の `get_auth_url` と `oauth_callback`:

```python
# 現状: contacts と sheets のみ
if integration_type in ("contacts",):
    svc = get_contact_sync_service()
elif integration_type in ("sheets",):
    svc = get_sheets_service()
else:
    raise HTTPException(400, ...)

# 修正後: calendar を追加
elif integration_type in ("calendar",):
    svc = get_calendar_service()
```

**2. カレンダーサービスの `fetch_token` を `exchange_code` にラップ**

`GoogleCalendarService` には `get_auth_url()` と `fetch_token()` があるが、ルーターのcallback処理は `exchange_code(code, redirect_uri)` を呼ぶ想定。`fetch_token` を `exchange_code` としてラップするか、ルーター側で `fetch_token` を直接呼ぶ。

**3. コールバック作成時にカレンダーイベントを自動作成**

`dialer_callbacks_router.py` でコールバック作成時に:
- テナントのCalendar連携が有効か確認
- 有効なら `GoogleCalendarService.create_event()` を呼び出し
- 返された `event_id` を `DialerCallbackModel.google_calendar_event_id` に保存

**4. コールバック更新・削除時にカレンダーイベントも同期**

#### コード所在

| 種別 | パス |
|------|------|
| Service Interface | `services/interfaces/i_calendar_service.py` |
| Service Impl (Google) | `services/implementations/p_google_calendar_service.py` |
| Service Impl (Outlook) | `services/implementations/p_outlook_calendar_service.py` |
| DI | `services/implementations/di.py` → `get_calendar_service()` |
| DB field | `DialerCallbackModel.google_calendar_event_id` |

---

## 5. 環境変数一覧

### Settings クラスに定義済み

| 変数名 | 用途 | 対象 |
|--------|------|------|
| `GOOGLE_OAUTH_CLIENT_ID` | OAuth クライアントID（共通） | Sheets / Contacts / Calendar / Picker |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth クライアントシークレット（共通） | Sheets / Contacts / Calendar / Picker |
| `GOOGLE_PICKER_API_KEY` | APIキー（Picker専用、Google仕様で必須） | Picker |
| `GOOGLE_CALENDAR_SERVICE_ACCOUNT_INFO` | SA JSON（任意、サーバー間通信用） | Calendar |
| `GMAIL_SENDER_EMAIL` | 送信元メール | Gmail(SMTP) |
| `GMAIL_APP_PASSWORD` | アプリパスワード(16文字) | Gmail(SMTP) |
| `SMTP_SERVER` | SMTPサーバー | Gmail(SMTP) |
| `SMTP_PORT` | SMTPポート (587) | Gmail(SMTP) |

> 以前は連携ごとに `GOOGLE_SHEETS_CLIENT_ID` / `GOOGLE_CONTACTS_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_ID` と分かれていたが、すべて `GOOGLE_OAUTH_CLIENT_ID` に統一済み。

### 設定場所

- ローカル: `python/domain/based-template-svc/src/common/.env`
- クラウド: Secret Manager `smartapo-config-{dev|stg|prod}`

---

## 6. 実装状況サマリ

| 連携 | Interface | 実装 | Router | Frontend | 状態 |
|------|-----------|------|--------|----------|------|
| **Sheets** | ✅ | ✅ 完了 | ✅ 接続済 | ✅ 動作 | **本番可** |
| **Contacts** | ✅ | ✅ 完了 | ✅ 接続済 | ✅ 動作 | **本番可** |
| **Calendar** | ✅ | ✅ 完了 | ❌ 未接続 | ⚠️ 400エラー | **ルーター接続が必要** |
| **Gmail** | ✅ | ✅ SMTP | ❌ 未接続 | ⚠️ 400エラー | **SMTP運用 or UI非表示** |

---

## 7. 残課題

### 優先度: 高

- [ ] **Calendar ルーター接続** — `dialer_google_router.py` に `calendar` タイプ追加
- [ ] **Gmail フロント整理** — SMTP方式のまま運用するなら、フロントの「Gmail」連携ボタンを非表示にする（ルーターが対応していないため400になる）
- [ ] **カレンダー ↔ コールバック同期** — コールバック作成/更新/削除時にGoogleカレンダーイベントを自動CRUD

### 優先度: 中

- [ ] **トークン自動更新** — `refresh_token` を使った自動更新ジョブ（現状は手動同期時に更新される）
- [ ] **エラーリカバリ** — sync中にジョブが失敗した場合の `syncing` → `error` ステータス遷移
- [ ] **トークン暗号化** — `access_token` / `refresh_token` が平文保存（コメントは「暗号化」だが未実装）

### 優先度: 低

- [ ] **Gmail OAuth対応** — 受信トレイ連携や下書き作成が必要になったとき
- [ ] **スコープ検証** — 付与されたスコープが要件を満たすか確認する仕組み
- [ ] **Webhook (Calendar)** — Googleカレンダーからのpush通知受信（リアルタイム同期）
