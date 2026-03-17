# Progressive Dialer - セットアップガイド

PCからプログレッシブコール（自動架電）を行うには、FreeSWITCH PBXの構築・SIPトランク契約・エージェントのSIP内線設定が必要です。本ドキュメントではその手順を解説します。

---

## 目次

1. [FreeSWITCH PBXのセットアップ](#1-freeswitch-pbxのセットアップ)
2. [SIPトランクの設定](#2-sipトランクの設定)
3. [環境変数の設定](#3-環境変数の設定)
4. [アプリ内での設定](#4-アプリ内での設定)
5. [接続テスト](#5-接続テスト)
6. [エージェントのSIP内線設定](#6-エージェントのsip内線設定)
7. [Google連携の設定](#7-google連携の設定)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. FreeSWITCH PBXのセットアップ

### FreeSWITCHのインストール

FreeSWITCHをサーバーにインストールします。推奨構成ファイルは `infra/freeswitch/conf/` に含まれています。

- **内部プロファイル** (`sip_profiles/internal.xml`): WebRTC WSS (ポート7443)、DTLS-SRTP
- **外部プロファイル** (`sip_profiles/external.xml`): SIPトランクゲートウェイ (ポート5080)
- **ESL設定** (`autoload_configs/event_socket.conf.xml`): ポート8021でESL接続
- **ダイヤルプラン** (`dialplan/default.xml`): 内線1000-1099、外線ルーティング
- **SIPアカウント** (`directory/default/agent_template.xml`): WebRTC対応SIPアカウント

### 必要なポート

| ポート      | プロトコル | 用途                      |
| ----------- | ---------- | ------------------------- |
| 7443        | WSS        | WebRTC SIP (ブラウザ接続) |
| 5060        | UDP/TCP    | SIP シグナリング (内部)   |
| 5080        | UDP/TCP    | SIP シグナリング (外部)   |
| 8021        | TCP        | ESL (バックエンド接続)    |
| 16384-32768 | UDP        | RTPメディア               |

---

## 2. SIPトランクの設定 (ブラステル My 050)

外線発信にはSIPプロバイダとの契約が必要です。開発環境では **ブラステル My 050** を使用します。

### ブラステル アカウント作成

1. [ブラステル My 050](https://www.brastel.com/personal/050-free/jpn) にアクセス
2. アカウント登録（初期費用550円、番号維持費550円/6ヶ月）
3. ログイン後 **SIPアカウント** ページで以下を確認:
   - **SIP ID** (8桁の数字)
   - **SIPパスワード** (8桁の英数字)
   - **SIPサーバー**: `softphone.spc.brastel.ne.jp`

### FreeSWITCH ゲートウェイ設定

`infra/freeswitch/conf/sip_profiles/external.xml` を編集し、ブラステルのSIP認証情報を設定:

```xml
<param name="username" value="あなたのSIP ID (8桁)"/>
<param name="password" value="あなたのSIPパスワード (8桁)"/>
```

設定後、FreeSWITCHを再起動してゲートウェイ登録を確認:

```bash
sudo /usr/local/freeswitch/bin/freeswitch -stop
sudo /usr/local/freeswitch/bin/freeswitch -nonat -nc
sleep 3
/usr/local/freeswitch/bin/fs_cli -x "sofia status gateway brastel"
# State: REGED なら成功
```

> **注意**: ブラステルの050番号が発信者番号として使用されます。

---

## 3. 環境変数の設定

バックエンド（`python/domain/based-template-svc/src/common/.env`）に以下を追加します。

```env
# FreeSWITCH + ブラステル
FREESWITCH_ESL_HOST=127.0.0.1
FREESWITCH_ESL_PORT=8021
FREESWITCH_ESL_PASSWORD=ClueCon
FREESWITCH_SIP_GATEWAY=brastel
FREESWITCH_WSS_URL=ws://localhost:5066
```

| 変数名                    | 説明                           | 例                    |
| ------------------------- | ------------------------------ | --------------------- |
| `FREESWITCH_ESL_HOST`     | FreeSWITCHサーバーのIPアドレス | `127.0.0.1`           |
| `FREESWITCH_ESL_PORT`     | ESLポート番号                  | `8021`                |
| `FREESWITCH_ESL_PASSWORD` | ESLパスワード                  | `ClueCon`             |
| `FREESWITCH_SIP_GATEWAY`  | 外線発信用ゲートウェイ名       | `brastel`             |
| `FREESWITCH_WSS_URL`      | WebRTC用WSSエンドポイント      | `ws://localhost:5066` |

> **本番環境**: Google Secret Manager に設定値を格納してください。Secret名は `smartapo-config-{env}` です。

---

## 4. アプリ内での設定

1. ログイン後、サイドバーの **設定** → **電話設定** を開く
2. FreeSWITCHの接続状態を確認:
   - **ESL接続**: 正常に接続されているか
   - **SIPゲートウェイ**: 設定済みのゲートウェイ名
   - **登録中エージェント**: SIP登録済みのエージェント数

---

## 5. 接続テスト

1. **設定 > 電話設定** ページで「接続テスト」ボタンをクリック
2. 成功すると「FreeSWITCH接続成功」と表示され、バージョン情報が返されます
3. 失敗する場合はESLホスト/ポート/パスワードが正しいか確認してください

### APIからの確認

```bash
# バックエンドが起動している状態で
curl -X POST http://localhost:8081/v2/dialer/settings/phone/test \
  -H "Authorization: Bearer <your-firebase-token>"
```

---

## 6. エージェントのSIP内線設定

各エージェントにSIP内線番号を割り当てます。

1. FreeSWITCHにSIPアカウントを作成（`directory/default/` 配下にXMLファイル）
2. アプリの **エージェント管理** ページでエージェントを登録
3. SIP内線番号フィールドに、作成したSIPアカウント番号を入力（例: `1001`）

### SIPアカウントの例

```xml
<!-- directory/default/1001.xml -->
<include>
  <user id="1001">
    <params>
      <param name="password" value="agent1001pass"/>
    </params>
    <variables>
      <variable name="user_context" value="default"/>
      <variable name="sip-force-expires" value="300"/>
      <variable name="media_webrtc" value="true"/>
      <variable name="rtp_secure_media" value="mandatory:AES_CM_128_HMAC_SHA1_80"/>
    </variables>
  </user>
</include>
```

### WebRTCクライアント（ブラウザ側）

エージェントがブラウザからSIP登録すると、FreeSWITCHからのINVITE（着信）を自動的に受け取ります。プログレッシブダイヤラーでは自動応答が有効になり、顧客が応答するとエージェントのブラウザに即座にブリッジされます。

---

## 7. Google連携の設定

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

## 8. トラブルシューティング

### FreeSWITCH関連

| 症状                           | 対処                                                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- |
| ESL接続テストで失敗            | ESLホスト・ポート・パスワードが正しいか確認。FreeSWITCHが起動しているか確認                     |
| WebRTCで登録できない           | FreeSWITCHのWSS設定（ポート7443）が正しいか確認。SSL証明書が有効か確認                          |
| 発信しても呼び出し音が鳴らない | SIPゲートウェイが正しく設定されているか確認。`fs_cli`でゲートウェイステータスを確認             |
| 音声が聞こえない               | ファイアウォールでRTPポート範囲（16384-32768）が開いているか確認。STUN/TURNサーバーの設定を確認 |
| 「GATEWAY_DOWN」               | ブラステルSIP認証情報を確認。`fs_cli -x "sofia status gateway brastel"` で状態確認              |
| 「NORMAL_TEMPORARY_FAILURE」   | SIPプロバイダへの接続を確認。ゲートウェイの認証情報を確認                                       |
| 「UNALLOCATED_NUMBER」         | 発信先番号が正しいか確認。SIPプロバイダの発信制限を確認                                         |

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

## 開発コマンド

### 毎回の起動手順

開発を始めるたびに以下の順で起動してください。

```bash
# 1. FreeSWITCH 起動 (WSL2ターミナルで実行、初回以降は毎回必要)
sudo /usr/local/freeswitch/bin/freeswitch -nonat -nc

# 2. バックエンド起動
npm run uv:dev:filter --uvdev=based-template-svc

# 3. フロントエンド起動
npm run dev:filter --filter=based-template-app
```

### FreeSWITCH 操作

```bash
# 状態確認
/usr/local/freeswitch/bin/fs_cli -x "status"

# 対話型CLI (デバッグ用)
/usr/local/freeswitch/bin/fs_cli

# 停止
sudo /usr/local/freeswitch/bin/freeswitch -stop

# SIP登録状況の確認
/usr/local/freeswitch/bin/fs_cli -x "sofia status profile internal reg"
```

### その他

```bash
# APIスキーマ生成（バックエンド変更後に実行）
npm run gen:openapi:all

# npm依存関係のインストール
npm install

# Python依存関係のインストール
npm run uv:package-install
```

### 初回セットアップ (FreeSWITCH未インストールの場合)

```bash
# ソースからビルド・インストール (10-20分)
bash infra/freeswitch/setup-local.sh
```
