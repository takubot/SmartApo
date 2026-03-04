// backend recognize_chunk_type/excel.py と整合する拡張子一覧

export const questionHeaderPatterns: string[] = [
  // 日本語
  "質問",
  "問い",
  "疑問",
  "問い合わせ",
  "クエスチョン",
  // 英語（小文字運用）
  "question",
  "questions",
  "q",
  "inquiry",
  "query",
];

export const answerHeaderPatterns: string[] = [
  // 日本語
  "回答",
  "返答",
  "解答",
  "応答",
  "アンサー",
  // 英語（小文字運用）
  "answer",
  "answers",
  "a",
  "response",
  "reply",
];

// バックエンドの processor.detect_file_type に合わせた許容拡張子
export const allowedExtensions: string[] = [
  ".txt",
  ".csv",
  ".xlsx",
  ".xls",
  ".pdf",
  ".pptx",
  ".doc",
  ".docx",
  // AUDIO/VIDEO
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".flac",
  ".ogg",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  ".mkv",
];

// ファイルタイプ関連の型定義
export type FileTypeCategory =
  | "csv"
  | "excel"
  | "pdf"
  | "doc"
  | "docx"
  | "pptx"
  | "txt"
  | "audio"
  | "video"
  | "other";

export interface FileTypeInfo {
  extension: string;
  displayName: string;
  color: "primary" | "success" | "danger" | "warning" | "secondary" | "default";
  icon: string; // React Iconsのコンポーネント名
  previewable: boolean;
  category: FileTypeCategory;
}

export const SUPPORTED_FILE_TYPES: { [key: string]: FileTypeInfo } = {
  csv: {
    extension: "csv",
    displayName: "CSV",
    color: "primary",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "csv",
  },
  xlsx: {
    extension: "xlsx",
    displayName: "EXCEL",
    color: "success",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "excel",
  },
  xls: {
    extension: "xls",
    displayName: "EXCEL",
    color: "success",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "excel",
  },
  pdf: {
    extension: "pdf",
    displayName: "PDF",
    color: "danger",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "pdf",
  },
  doc: {
    extension: "doc",
    displayName: "WORD",
    color: "primary",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "doc",
  },
  docx: {
    extension: "docx",
    displayName: "WORD",
    color: "primary",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "docx",
  },
  pptx: {
    extension: "pptx",
    displayName: "POWERPOINT",
    color: "warning",
    icon: "DocumentTextIcon",
    previewable: true,
    category: "pptx",
  },
  txt: {
    extension: "txt",
    displayName: "TEXT",
    color: "default",
    icon: "DocumentTextIcon",
    previewable: false,
    category: "txt",
  },
  // 音声ファイル
  mp3: {
    extension: "mp3",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  wav: {
    extension: "wav",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  m4a: {
    extension: "m4a",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  aac: {
    extension: "aac",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  flac: {
    extension: "flac",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  ogg: {
    extension: "ogg",
    displayName: "AUDIO",
    color: "secondary",
    icon: "MusicalNoteIcon",
    previewable: false,
    category: "audio",
  },
  // 動画ファイル
  mp4: {
    extension: "mp4",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  avi: {
    extension: "avi",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  mov: {
    extension: "mov",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  wmv: {
    extension: "wmv",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  flv: {
    extension: "flv",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  webm: {
    extension: "webm",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
  mkv: {
    extension: "mkv",
    displayName: "VIDEO",
    color: "secondary",
    icon: "VideoCameraIcon",
    previewable: false,
    category: "video",
  },
};

// ファイル拡張子とアイコンのマッピング
export type FileIconMap = {
  [key: string]: {
    icon: string; // React Iconsのコンポーネント名
    color: string; // Tailwind CSSの色クラス
    tooltip: string; // ツールチップ用のテキスト
    isPreviewable?: boolean; // プレビュー対応かどうか
  };
};

export const fileIconMap: FileIconMap = {
  // ドキュメント
  pdf: {
    icon: "FaFilePdf",
    color: "text-red-500",
    tooltip: "PDFプレビュー",
    isPreviewable: true,
  },
  csv: {
    icon: "FaFileCsv",
    color: "text-green-500",
    tooltip: "CSVダウンロード",
  },
  xlsx: {
    icon: "FaFileExcel",
    color: "text-green-700",
    tooltip: "Excelダウンロード",
  },
  xls: {
    icon: "FaFileExcel",
    color: "text-green-700",
    tooltip: "Excelダウンロード",
  },
  docx: {
    icon: "FaFileWord",
    color: "text-blue-500",
    tooltip: "Wordダウンロード",
  },
  doc: {
    icon: "FaFileWord",
    color: "text-blue-500",
    tooltip: "Wordダウンロード",
  },
  pptx: {
    icon: "FaFilePowerpoint",
    color: "text-orange-500",
    tooltip: "PowerPointダウンロード",
  },
  txt: {
    icon: "FaFileAlt",
    color: "text-gray-600",
    tooltip: "テキストプレビュー",
    isPreviewable: true,
  },
  // 音声
  mp3: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  wav: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  m4a: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  aac: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  flac: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  ogg: {
    icon: "FaFileAudio",
    color: "text-purple-600",
    tooltip: "音声ダウンロード",
  },
  // 動画
  mp4: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  avi: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  mov: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  wmv: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  flv: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  webm: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  mkv: {
    icon: "FaFileVideo",
    color: "text-purple-500",
    tooltip: "動画ダウンロード",
  },
  // デフォルト
  default: {
    icon: "FaFileAlt",
    color: "text-gray-500",
    tooltip: "ダウンロード",
  },
};
