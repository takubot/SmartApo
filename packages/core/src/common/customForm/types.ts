// 型定義とユーティリティ関数

export type CustomFormFieldType =
  | "string"
  | "text"
  | "url"
  | "select"
  | "multiselect"
  | "boolean";

export type CustomFormField = {
  key: string;
  label: string;
  type: CustomFormFieldType;
  required?: boolean;
  placeholder?: string | null;
  description?: string | null;
  options?: string[] | null;
};

export type CustomFormSection = {
  title: string;
  fields: CustomFormField[];
};

export const FIELD_TYPE_LABEL: Record<CustomFormFieldType, string> = {
  string: "短い回答",
  text: "長い回答",
  url: "URL",
  select: "選択肢（1つ）",
  multiselect: "選択肢（複数）",
  boolean: "はい/いいえ",
};

export const FIELD_TYPE_DESCRIPTION: Record<CustomFormFieldType, string> = {
  string: "店舗名や電話番号など、短い文字列を入力",
  text: "説明文や住所など、長い文章を入力",
  url: "ホームページのURLなどを入力",
  select: "あらかじめ用意した選択肢から1つ選択",
  multiselect: "あらかじめ用意した選択肢から複数選択",
  boolean: "「はい」か「いいえ」で答える質問",
};

// ラベルから内部keyを自動生成（ユーザー入力は不要）
export function generateKeyFromLabel(label: string): string {
  const raw = label.trim();
  if (!raw) return "";

  const ascii = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50);

  if (ascii) return ascii;

  // 日本語などASCII化できない場合でも安定して生成できるようにハッシュ化する
  let hash = 2166136261; // FNV-1a 32bit
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const base36 = (hash >>> 0).toString(36);
  return `q_${base36}`.substring(0, 50);
}

export function newField(): CustomFormField {
  return {
    key: "",
    label: "",
    type: "string",
    required: false,
    placeholder: "",
    description: "",
    options: [],
  };
}

export function newSection(): CustomFormSection {
  return {
    title: "",
    fields: [newField()],
  };
}
