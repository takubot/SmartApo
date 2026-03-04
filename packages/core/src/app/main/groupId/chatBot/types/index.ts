// 権限レベルの型定義（GROUP_OWNERとGROUP_MEMBERのみ）
export type PermissionLevel = "GROUP_OWNER" | "GROUP_MEMBER";

// 権限レベルの表示名マッピング
export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  GROUP_OWNER: "オーナー",
  GROUP_MEMBER: "メンバー",
};

// 権限レベルの表示名マッピング（モーダル用）
export const PERMISSION_LEVEL_MODAL_LABELS: Record<PermissionLevel, string> = {
  GROUP_OWNER: "オーナーのみ",
  GROUP_MEMBER: "誰でも",
};

// 権限レベルの階層（数値が大きいほど高い権限）
export const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  GROUP_OWNER: 2,
  GROUP_MEMBER: 1,
};

/**
 * ユーザーが指定した権限レベル以上の権限を持っているかチェック
 */
export function hasPermissionLevel(
  userLevel: PermissionLevel,
  requiredLevel: PermissionLevel,
): boolean {
  return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
}

// テーブルアイテムの型定義
export type ChunkTableItem = {
  templateId: number;
  templateName: string;
  isAssociated: boolean;
};

// ファイルアイテムの型定義
export type FileItem = {
  fileId: number;
  fileName: string;
  isAssociated: boolean;
};

// 共通のアソシエーションアイテム型
export type AssociationItem = {
  id: number;
  name: string;
  isAssociated: boolean;
};

// アソシエーション管理の共通フック型
export type AssociationManagement<T extends AssociationItem> = {
  // 状態
  listForEdit: T[];
  isLoading: boolean;

  // 操作
  fetchForCreate: () => Promise<T[]>;
  openEditModal: (bot: any) => Promise<void>;
  closeEditModal: () => void;
  handleSaveEdit: (list: T[]) => Promise<void>;
};
