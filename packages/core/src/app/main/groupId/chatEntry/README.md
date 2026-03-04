# ChatEntry モジュール リファクタリング

## 概要

このモジュールは、URL管理機能を提供するチャットエントリ管理システムです。リファクタリングにより、安全性、保守性、型安全性が大幅に向上しました。

## 主な改善点

### 1. 安全性の向上

- **削除確認モーダルの追加**: URL削除時に確認モーダルを表示し、誤操作を防止
- **エラーハンドリングの強化**: 統一されたエラー処理とユーザーフレンドリーなメッセージ
- **ローディング状態の管理**: 各操作の進行状況を明確に表示

### 2. コード構造の改善

- **カスタムフックの分離**: 責務を明確に分離し、再利用性を向上
- **型安全性の強化**: TypeScriptの型定義を充実させ、コンパイル時エラーを防止
- **モジュール化**: 機能ごとにファイルを分割し、保守性を向上

### 3. ユーザーエクスペリエンスの向上

- **統一されたUI**: 一貫したデザインとインタラクション
- **分かりやすいメッセージ**: 操作結果を明確に表示
- **レスポンシブ対応**: 様々な画面サイズに対応

## ファイル構成

```
chatEntry/
├── hooks/                    # カスタムフック
│   ├── useUrlManageActions.ts    # URL操作アクション
│   ├── useUrlManageModals.ts     # モーダル状態管理
│   ├── useUrlManageList.ts       # URLリスト管理
│   └── useUrlLimit.ts            # URL制限管理
├── modals/                   # モーダルコンポーネント
│   ├── UrlManageModal.tsx        # URL管理モーダル
│   ├── DeleteConfirmModal.tsx    # 削除確認モーダル（新規）
│   ├── ScriptModal.tsx           # スクリプト表示モーダル
│   ├── FullChatUrlModal.tsx      # フルチャットURLモーダル
│   └── ImageCropModal.tsx        # 画像クロップモーダル
├── organisms/                # 有機的コンポーネント
│   ├── urlManageListDisplay.tsx  # URLリスト表示
│   ├── urlManageFormDisplay.tsx  # URL管理フォーム
│   └── urlManageBotLinkDisplay.tsx # Botリンク表示
├── lib/                      # ユーティリティ
│   └── errorHandler.ts           # エラーハンドリング
├── types/                    # 型定義
│   └── index.ts                  # 共通型定義
├── chatEntryTemplate/         # テンプレート
│   └── template.tsx              # メインテンプレート
└── page.tsx                   # ページコンポーネント
```

## 主要な機能

### URL管理

- **作成**: 新しいURLの作成（WEB/LINE対応）
- **編集**: 既存URLの設定変更
- **削除**: 削除確認モーダル付きの安全な削除
- **一覧表示**: 検索・フィルタリング機能付きリスト

### セキュリティ

- **削除確認**: 重要な操作の前に確認を要求
- **エラーハンドリング**: 適切なエラーメッセージとロールバック
- **型安全性**: TypeScriptによるコンパイル時チェック

### ユーザビリティ

- **ローディング表示**: 操作の進行状況を表示
- **成功/エラーメッセージ**: 操作結果を明確に通知
- **レスポンシブデザイン**: モバイル・デスクトップ対応

## 使用方法

### 基本的な使用例

```tsx
import { useUrlManageList } from "./hooks/useUrlManageList";
import { useUrlManageActions } from "./hooks/useUrlManageActions";

function MyComponent() {
  const { urlList, mutate } = useUrlManageList(groupId);
  const { handleCreate, handleDelete } = useUrlManageActions({
    groupId,
    mutate,
    // ... その他の設定
  });

  // URL作成
  const createUrl = async (data) => {
    const success = await handleCreate(data);
    if (success) {
      console.log("URL作成成功");
    }
  };

  // URL削除（確認モーダル付き）
  const deleteUrl = (urlId) => {
    // 削除確認モーダルが自動的に表示される
    handleDeleteConfirm(urlId);
  };
}
```

## 開発ガイドライン

### 新しい機能の追加

1. 型定義を `types/index.ts` に追加
2. カスタムフックを作成（必要に応じて）
3. コンポーネントを作成
4. エラーハンドリングを実装
5. テストを作成

### エラーハンドリング

- `lib/errorHandler.ts` の関数を使用
- ユーザーフレンドリーなメッセージを表示
- 適切なロールバック処理を実装

### 型安全性

- すべての関数に型定義を追加
- インターフェースを使用してデータ構造を定義
- コンパイル時エラーを解消

## 今後の改善予定

1. **パフォーマンス最適化**: 仮想スクロールの実装
2. **アクセシビリティ**: キーボードナビゲーションの改善
3. **国際化**: 多言語対応
4. **テスト**: ユニットテスト・E2Eテストの追加
5. **ドキュメント**: API仕様書の整備

## 注意事項

- URL削除は取り消し不可能な操作です
- 削除前に必ず確認モーダルが表示されます
- エラーが発生した場合は適切なメッセージが表示されます
- すべての操作はローディング状態で表示されます

## Hooksフォルダの作成規則

- できるだけ少ないhooksにまとめる
- 共通hooksはアプリルートのhooksフォルダにまとめる
- hooksからさらにhooksを呼び出したりしないようにする
