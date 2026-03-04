# 権限管理システム

このディレクトリには、tenantRoleとgroupRoleを効率的に管理するためのコンテキストプロバイダーが含まれています。

## アーキテクチャ

### 階層構造

```
TenantRoleProvider (最上位レイアウト)
├── GroupRoleProvider (グループレイアウト)
    └── 各コンポーネント
```

### データフロー

1. **TenantRoleProvider**: アプリケーション全体でtenantRoleを管理
2. **GroupRoleProvider**: グループ固有のgroupRoleを管理
3. **統合フック**: 両方の権限を簡単に取得

## 使用方法

### 基本的な使用

```tsx
import { useTenantRoleContext } from "../context/tenantRoleContext";
import { useGroupRoleContext } from "../context/groupRoleContext";
import { useRoleContext } from "../hooks/useRoleContext";

function MyComponent() {
  // 個別に取得
  const { tenantRole, userProfile } = useTenantRoleContext();
  const { groupRole, currentGroup } = useGroupRoleContext();

  // 統合フックで取得（推奨）
  const {
    tenantRole,
    groupRole,
    isTenantAdmin,
    isGroupOwner,
    hasTenantPermission,
    hasGroupPermission,
  } = useRoleContext();

  return (
    <div>
      {isTenantAdmin && <AdminPanel />}
      {isGroupOwner && <OwnerControls />}
    </div>
  );
}
```

### 権限チェック

```tsx
function ProtectedComponent() {
  const { hasTenantPermission, hasGroupPermission } = useRoleContext();

  // テナント管理者のみ表示
  if (!hasTenantPermission("TENANT_ADMIN")) {
    return <AccessDenied />;
  }

  // グループ管理者以上のみ表示
  if (!hasGroupPermission("GROUP_MANAGER")) {
    return <AccessDenied />;
  }

  return <AdminContent />;
}
```

### 条件付きレンダリング

```tsx
function MenuComponent() {
  const { isTenantAdmin, isGroupManager, groupRole } = useRoleContext();

  return (
    <nav>
      <MenuItem href="/dashboard" />
      <MenuItem href="/chat" />

      {/* グループ管理者以上のみ表示 */}
      {isGroupManager && (
        <>
          <MenuItem href="/member" />
          <MenuItem href="/settings" />
        </>
      )}

      {/* テナント管理者のみ表示 */}
      {isTenantAdmin && <MenuItem href="/tenant-settings" />}
    </nav>
  );
}
```

## パフォーマンス最適化

- **キャッシュ**: SWRを使用してAPIレスポンスをキャッシュ
- **重複排除**: 同じデータの重複取得を防止
- **階層管理**: 適切な階層でデータを管理し、不要な再レンダリングを防止

## エラーハンドリング

- 認証エラー時は自動的にログインページにリダイレクト
- ローディング状態とエラー状態を適切に管理
- フォールバック表示を提供

## 注意事項

1. **TenantRoleProvider**は最上位レイアウトでのみ使用
2. **GroupRoleProvider**はグループレイアウトでのみ使用
3. コンポーネント内では**useRoleContext**を使用することを推奨
4. 権限チェックは必ず適切な階層で実行
