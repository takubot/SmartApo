from abc import ABC, abstractmethod
from typing import Generator, Any

from pydantic import Field
from ....common.schemas.base_schema import BaseSchema


# -------------------------------------------------------------
# 共通のファイル処理ユーティリティ
# -------------------------------------------------------------

# 画像ファイルの拡張子（全プロバイダー共通）
IMAGE_EXTENSIONS: set[str] = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif", ".svg"}

# 拡張子からMIMEタイプへのマッピング（全プロバイダー共通）
EXTENSION_TO_MIME_TYPE: dict[str, str] = {
    # 画像
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".svg": "image/svg+xml",
    # テキスト
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".xml": "text/xml",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    # その他
    ".pdf": "application/pdf",
    ".json": "application/json",
}


def get_file_extension(file_name: str) -> str:
    """
    ファイル名から拡張子を取得（小文字で返す、ドット付き）。
    
    Args:
        file_name: ファイル名
        
    Returns:
        拡張子（例: ".pdf", ".jpg"）。拡張子がない場合は空文字列
    """
    if "." not in file_name:
        return ""
    return f".{file_name.rsplit('.', 1)[-1].lower()}"


def is_image_file(file_name: str, mime_type: str | None = None) -> bool:
    """
    ファイルが画像形式かどうかを判定する。
    
    Args:
        file_name: ファイル名
        mime_type: MIMEタイプ（任意）
        
    Returns:
        画像ファイルの場合True
    """
    ext = get_file_extension(file_name)
    return ext in IMAGE_EXTENSIONS or (mime_type and mime_type.startswith("image/"))


def get_mime_type(file_name: str, mime_type: str | None = None) -> str:
    """
    MIMEタイプを取得（指定がない場合は拡張子から推測）。
    
    Args:
        file_name: ファイル名
        mime_type: 指定されたMIMEタイプ（任意）
        
    Returns:
        MIMEタイプ文字列
    """
    if mime_type:
        return mime_type
    ext = get_file_extension(file_name)
    return EXTENSION_TO_MIME_TYPE.get(ext, "application/octet-stream")


# -------------------------------------------------------------
# 各プロバイダーのサポートファイル形式定義
# -------------------------------------------------------------

# OpenAI Responses API (context stuffing) でサポートされているファイル拡張子
# エラーメッセージから取得（2025年1月時点）
# 参考: "Expected context stuffing file type to be a supported format: .art, .bat, ..."
# 注意: context stuffing (input_file) では画像ファイルはサポートされていないが、
# 画像はbase64エンコードしてinput_imageとして送ることができる
OPENAI_SUPPORTED_EXTENSIONS: set[str] = {
    # テキスト・コード系（context stuffingでサポート）
    ".art", ".bat", ".brf", ".c", ".cls", ".css", ".diff", ".eml", ".es", ".h", ".hs",
    ".htm", ".html", ".ics", ".ifb", ".java", ".js", ".json", ".ksh", ".ltx", ".mail",
    ".markdown", ".md", ".mht", ".mhtml", ".mjs", ".nws", ".patch", ".pdf", ".pl", ".pm",
    ".pot", ".py", ".rst", ".scala", ".sh", ".shtml", ".srt", ".sty", ".tex", ".text",
    ".txt", ".vcf", ".vtt", ".xml", ".yaml", ".yml",
    # 画像形式（input_imageとしてbase64エンコードで送信可能）
    ".jpg", ".jpeg", ".png", ".gif", ".webp",
}

# Claude Messages API (安定版、β無し) でサポートされているMIMEタイプ
# 参考: Claude API ドキュメント（安定版では base64/text で直接送信）
# - PDF: application/pdf
# - 画像: image/* (image/jpeg, image/png, image/gif, image/webp等)
# - テキスト: text/*, application/json, application/xml
CLAUDE_SUPPORTED_MIME_TYPES: set[str] = {
    # PDF
    "application/pdf",
    # 画像
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    "image/svg+xml",
    # テキスト
    "text/plain",
    "text/markdown",
    "text/html",
    "text/css",
    "text/javascript",
    "text/xml",
    "text/csv",
    "text/tsv",
    # その他テキスト系
    "application/json",
    "application/xml",
    "application/xhtml+xml",
}

# Claude でサポートされている拡張子（MIMEタイプから逆引き用）
CLAUDE_SUPPORTED_EXTENSIONS: set[str] = {
    # PDF
    ".pdf",
    # 画像
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif", ".svg",
    # テキスト
    ".txt", ".md", ".markdown", ".html", ".htm", ".css", ".js", ".mjs", ".xml",
    ".csv", ".tsv", ".json",
}

# Gemini API でサポートされているMIMEタイプ
# 参考: Google Gemini API ドキュメント（2025年1月時点）
# 一般的にPDF、画像、一部のテキスト形式をサポート
# 注意: Officeファイル（.xlsx, .pptx, .docx）は直接サポートされていない
GEMINI_SUPPORTED_MIME_TYPES: set[str] = {
    # PDF
    "application/pdf",
    # 画像
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    # テキスト（一部のモデルでサポート）
    "text/plain",
    "text/markdown",
    "text/html",
    "application/json",
}

# Gemini でサポートされている拡張子（MIMEタイプから逆引き用）
GEMINI_SUPPORTED_EXTENSIONS: set[str] = {
    # PDF
    ".pdf",
    # 画像
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".tif",
    # テキスト（一部のモデルでサポート）
    ".txt", ".md", ".markdown", ".html", ".htm", ".json",
}


def get_supported_extensions_by_chat_type(chat_type: str) -> list[str]:
    """
    プロバイダー名からサポートされている拡張子リストを取得する。
    
    Args:
        chat_type: 会話種別 ("BOT_OPENAI", "BOT_ANTHROPIC", "BOT_GEMINI", "BOT_NANOBANANA" など)
    
    Returns:
        サポートされている拡張子のリスト（ソート済み）
    """
    if chat_type == "BOT_OPENAI":
        return sorted(OPENAI_SUPPORTED_EXTENSIONS)
    elif chat_type == "BOT_ANTHROPIC":
        return sorted(CLAUDE_SUPPORTED_EXTENSIONS)
    elif chat_type == "BOT_GEMINI":
        return sorted(GEMINI_SUPPORTED_EXTENSIONS)
    elif chat_type == "BOT_NANOBANANA":
        # nanobananaは画像生成モデルなので、画像ファイルの拡張子を返す
        return sorted([ext for ext in GEMINI_SUPPORTED_EXTENSIONS if ext in IMAGE_EXTENSIONS])
    else:
        # 不明なプロバイダーの場合は空リストを返す
        return []


class AIModelSchema(BaseSchema):
    """AIモデル情報"""

    display_name: str = Field(..., description="UI表示用のモデル名")
    api_model_name: str = Field(..., description="API呼び出し時に指定する正式なモデルID")
    chat_type: str = Field(..., description="会話種別 (BOT_OPENAI / BOT_ANTHROPIC / BOT_GEMINI など)")
    can_upload_file: bool = Field(
        ...,
        description="ファイルアップロード（添付）を伴うチャットをサポートするかどうか",
    )
    max_upload_bytes: int | None = Field(
        default=None,
        description="1ファイルあたりの最大アップロードサイズ（バイト単位、制限なしの場合はnull）",
    )
    supported_extensions: list[str] = Field(
        default_factory=list,
        description="このモデルでサポートされているファイル拡張子のリスト（例: ['.pdf', '.txt', '.jpg']）",
    )


class BaseAIService(ABC):
    """AIサービスの基底クラス"""

    @abstractmethod
    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
    ) -> Generator[str, None, None]:
        """
        ストリーミングレスポンスを生成する

        Args:
            message: ユーザーからのメッセージ
            history: チャット履歴 [{"role": "user"|"assistant", "content": "..."}]
            system_prompt: システムプロンプト (任意)
            files: (ファイル名, MIMEタイプ or None, バイナリ) のタプル一覧（任意）

        Yields:
            生成されたテキストのチャンク
        """
        pass


# -------------------------------------------------------------
# 利用可能なモデル一覧
# -------------------------------------------------------------
SUPPORTED_MODELS: list[AIModelSchema] = [
    AIModelSchema(
        display_name="gpt-5.2-thinking",
        api_model_name="gpt-5.2-2025-12-11",
        chat_type="BOT_OPENAI",
        can_upload_file=True,
        max_upload_bytes=512 * 1024 * 1024,  # 512MB
    ),
    AIModelSchema(
        display_name="gpt5-instant",
        api_model_name="gpt-5-nano-2025-08-07",
        chat_type="BOT_OPENAI",
        can_upload_file=True,
        max_upload_bytes=512 * 1024 * 1024,  # 512MB
    ),
    AIModelSchema(
        display_name="Claude Opus 4.5",
        api_model_name="claude-opus-4-5",
        chat_type="BOT_ANTHROPIC",
        can_upload_file=True,
        max_upload_bytes=500 * 1024 * 1024,  # 500MB
    ),
    AIModelSchema(
        display_name="Claude Sonnet 4.5",
        api_model_name="claude-sonnet-4-5",
        chat_type="BOT_ANTHROPIC",
        can_upload_file=True,
        max_upload_bytes=500 * 1024 * 1024,  # 500MB
    ),
    AIModelSchema(
        display_name="Gemini 3.0 Pro",
        api_model_name="gemini-3-pro-preview",
        chat_type="BOT_GEMINI",
        can_upload_file=True,
        max_upload_bytes=20 * 1024 * 1024,  # 20MB（保守的な上限）
    ),
    AIModelSchema(
        display_name="Gemini 2.5 Flash",
        api_model_name="gemini-2.5-flash",
        chat_type="BOT_GEMINI",
        can_upload_file=True,
        max_upload_bytes=20 * 1024 * 1024,  # 20MB（保守的な上限）
    ),
    # Perplexity Sonar モデル（Search）
    AIModelSchema(
        display_name="Perplexity Sonar",
        api_model_name="sonar",
        chat_type="BOT_PERPLEXITY",
        can_upload_file=False,  # Perplexityはファイル添付をサポートしていない
        max_upload_bytes=None,
    ),
    # Perplexity Sonar Reasoning モデル（Reasoning）
    AIModelSchema(
        display_name="Perplexity Sonar Reasoning",
        api_model_name="sonar-reasoning",
        chat_type="BOT_PERPLEXITY",
        can_upload_file=False,
        max_upload_bytes=None,
    ),
    # Gemini Nano Banana (画像生成)
    AIModelSchema(
        display_name="Gemini 3 Pro Image Preview",
        api_model_name="gemini-3-pro-image-preview",
        chat_type="BOT_NANOBANANA",
        can_upload_file=True,
        max_upload_bytes=20 * 1024 * 1024,  # 20MB（保守的な上限）
    ),
]

