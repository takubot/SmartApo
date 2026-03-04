# CLAUDE.md

DOPPELはRAGベースのマルチテナントAIチャットボット。現在はbased-templateテナントのみを開発対象とし、モノレポの中でも以下の3領域以外は触らない。

- `packages/api-contracts`
- `python/domain/based-template-svc`
- `apps/based-template-app`

## ルールの配置

詳細な実装ルールは `.cursor/rules` 配下に分散した。常に最新のルールを参照してから作業すること。

- 全体方針: `.cursor/rules/all/based-template.mdc`
- バックエンド専用: `.cursor/rules/backend/based-template.mdc`
- フロントエンド専用: `.cursor/rules/frontend/based-template.mdc`

## モデルとスキーマの所在

- テーブル定義: `python/domain/based-template-svc/src/models/tables/model_defs.py`
- Enum定義: `python/domain/based-template-svc/src/models/tables/enum.py`
- Declarative Base: `python/domain/based-template-svc/src/models/tables/declarative_base.py`

## スキーマ変更フロー

1. バックエンド（based-template-svc）でスキーマやエンドポイントを更新
2. `npm run gen:openapi:all` を実行
3. 生成された以下のファイルで型・クライアントを同期
   - `packages/api-contracts/src/zod/based_template.ts`
   - `packages/api-contracts/src/services/based_template.ts`
4. フロントエンドでは生成物をimportして互換性を担保する

自動生成物（`packages/api-contracts/src/{services,zod,types,yaml}`）は直接編集しない。

### マイグレーション運用

- Alembicでのマイグレーション作成・適用はチームから明示的な指示がある場合のみ実行する
- 既存マイグレーションを編集する場合も必ず合意を取ってから対応する

## 命名規則の要約

- フロントエンド: TypeScript/TSXはcamelCase（定数のみUPPER_SNAKE_CASE）
- バックエンド: Pythonはsnake_case（クラスはPascalCase）。`base_schema.py`でcamelCaseに変換してフロントへ返す

## コードレビュー時の注重点

- 責務分離・共通化・依存関係の整理で拡張性を確保
- 型安全性・エラーハンドリング・副作用管理でバグリスクを下げる
- API契約遵守（型定義とAPI呼び出しは `@repo/api-contracts/based_template` から）

## 開発コマンドのベースライン

```bash
npm install
npm run uv:package-install
npm run dev:filter --filter=based-template-app     # フロント
npm run uv:dev:filter --uvdev=based-template-svc   # バックエンド
npm run gen:openapi:all          # APIスキーマ生成（必須）
```

品質チェックやビルドは必要に応じて `npm run lint`, `npm run check-types`, `npm run build`, `npm run uv:lint:filter` などを実行する。

## 参考

詳細は前述のルールファイルで常に最新状態を確認すること。
