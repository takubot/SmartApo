# Goda Kanko Shoji アプリケーション設計書

## アプリケーション概要

このアプリケーションは、Next.js 15をベースにしたチャットボット機能を持つウェブアプリケーションです。Firebase認証、データテーブル、ファイル管理、グループ管理などの機能を提供します。

## 技術スタック

- **フロントエンド**: Next.js 15, React 19, TailwindCSS
- **認証**: Firebase Authentication
- **状態管理**: React Context, SWR
- **UI/UXライブラリ**: Framer Motion, React Toastify
- **その他**: Axios, React Hook Form, TypeScript

## プロジェクト構造

### ディレクトリ構成

```
src/
  ├── app/                     # Next.jsのApp Router構造
  │   ├── api/                 # APIルート
  │   ├── chatEmbed/           # チャット埋め込み機能
  │   ├── login/               # ログイン関連ページ
  │   └── main/                # メインアプリケーション
  │       ├── [groupId]/       # グループページ
  │       │   ├── chat/        # チャット機能
  │       │   ├── chatBot/     # チャットボット設定
  │       │   ├── dataTable/   # データテーブル
  │       │   ├── file/        # ファイル管理
  │       │   ├── member/      # メンバー管理
  │       │   └── org-member/  # 組織メンバー管理
  │       └── group/           # グループ管理
  ├── common/                  # 共通コンポーネント
  ├── context/                 # Reactコンテキスト
  ├── hooks/                   # カスタムフック
  └── lib/                     # ユーティリティライブラリ
      ├── firebase.ts          # Firebase設定
      └── firebaseAdmin.ts     # Firebase Admin設定
```

### 主要機能

1. **認証システム**
   - Firebase認証を使用したログイン/ログアウト機能
   - ユーザー管理とグループロール管理

2. **チャット機能**
   - リアルタイムチャット
   - チャットボット統合
   - 外部サイトへの埋め込み可能なチャットウィジェット

3. **グループ管理**
   - グループの作成・編集
   - メンバー招待とロール設定
   - グループ単位のデータアクセス制御

4. **データ管理**
   - データテーブル機能
   - ファイルアップロード・管理機能
   - URL管理

5. **API統合**
   - 各種機能のためのRESTful API

## API一覧

アプリケーションは以下のAPIエンドポイントを提供しています：

- `/api/category` - カテゴリ管理
- `/api/chat` - チャット機能
- `/api/chatBot` - チャットボット設定
- `/api/chunkData` - データチャンク管理
- `/api/dataTable` - データテーブル操作
- `/api/embed` - 埋め込みウィジェット
- `/api/file` - ファイル管理
- `/api/group` - グループ管理
- `/api/groupRole` - グループロール管理
- `/api/login` - 認証関連
- `/api/proxy` - プロキシ設定
- `/api/tenantConfig` - テナント設定
- `/api/urlManage` - URL管理
- `/api/user` - ユーザー管理
- `/api/userToGroup` - ユーザーとグループの関連付け
- `/api/verify` - 検証機能

## アーキテクチャパターン

このアプリケーションは、Next.jsのApp Routerに基づいたコンポーネントベースのアーキテクチャを採用しています。また、以下の設計原則に従っています：

- **Atomic Design** - UIコンポーネントは分子(molecule)、有機体(organism)などの単位で構成
- **ページごとのコンポーネント分割** - 各機能ごとに独立したコンポーネント構造
- **API Routes** - サーバーサイド機能はNext.jsのAPI Routesで実装

## 開発環境セットアップ

```bash
# 依存関係のインストール
yarn install

# 開発サーバーの起動（Turbopackを使用）
yarn dev

# ビルド
yarn build

# 本番サーバーの起動
yarn start

# リントチェック
yarn lint

# 型チェック
yarn check-types
```
