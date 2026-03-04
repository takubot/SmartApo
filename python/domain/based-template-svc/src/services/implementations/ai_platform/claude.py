import base64
import logging
from typing import Any, Generator, Mapping

import anthropic

from ....common.env_config import get_settings
from . import (
    BaseAIService,
    CLAUDE_SUPPORTED_MIME_TYPES,
    CLAUDE_SUPPORTED_EXTENSIONS,
    get_file_extension,
    is_image_file,
)

logger = logging.getLogger(__name__)

# PDF support: Maximum request size 32MB (payload total) :contentReference[oaicite:4]{index=4}
MAX_REQUEST_BYTES = 32 * 1024 * 1024

# base64 は 4/3 に膨らむので、PDF を base64 で送る場合の「生データ上限」を安全側で見積もる
# 32MB * 0.74 ≒ 23.7MB（JSON等のオーバーヘッド分も見て少し余裕）
MAX_INLINE_BINARY_BYTES = int(MAX_REQUEST_BYTES * 0.70)


class ClaudeService(BaseAIService):
    def __init__(self, model: str = "claude-3-5-sonnet-20240620"):
        self.model = model
        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("Anthropic API Key is not set")
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    # -----------------------------
    # Content block helpers
    # -----------------------------
    def _normalize_role(self, role: Any) -> str:
        return role if role in ("user", "assistant") else "user"

    def _b64(self, data: bytes) -> str:
        # Claude docs の例と同様、改行なしの base64 文字列を作る :contentReference[oaicite:5]{index=5}
        return base64.b64encode(data).decode("ascii")

    def _image_block_from_bytes(self, data: bytes, mime_type: str) -> dict[str, Any]:
        # Vision: image block + source(base64) :contentReference[oaicite:6]{index=6}
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": mime_type,
                "data": self._b64(data),
            },
        }

    def _pdf_block_from_bytes(self, data: bytes, title: str | None = None) -> dict[str, Any]:
        # PDF support: document block + source(base64, application/pdf) :contentReference[oaicite:7]{index=7}
        block: dict[str, Any] = {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": self._b64(data),
            },
        }
        if title:
            block["title"] = title
        return block

    def _text_document_block(self, text: str, title: str | None = None, media_type: str = "text/plain") -> dict[str, Any]:
        # document(source:text) の公式例 :contentReference[oaicite:8]{index=8}
        block: dict[str, Any] = {
            "type": "document",
            "source": {"type": "text", "media_type": media_type, "data": text},
        }
        if title:
            block["title"] = title
        return block

    def _sanitize_history_blocks(self, blocks: list[Any]) -> list[dict[str, Any]]:
        """
        β無し安定運用のため、history 内の以下を除去：
        - {"type": "file", ...} （そもそも Messages API の許容 type に無い）
        - {"type":"document","source":{"type":"file","file_id":...}} （Files API が必要でβが要る）:contentReference[oaicite:9]{index=9}
        """
        out: list[dict[str, Any]] = []

        for b in blocks:
            if b is None:
                continue

            if isinstance(b, str):
                out.append({"type": "text", "text": b})
                continue

            if not isinstance(b, Mapping):
                out.append({"type": "text", "text": str(b)})
                continue

            block = dict(b)
            btype = block.get("type")

            # 完全に無効な旧形式：type="file"
            if btype == "file":
                logger.warning("Dropping legacy invalid content block (type='file') from history: %s", block)
                continue

            # βが必要な Files API 参照（source.type="file"）も安定版では落とす
            if btype in ("document", "image"):
                src = block.get("source")
                if isinstance(src, Mapping) and src.get("type") == "file":
                    logger.warning("Dropping file_id-based attachment from history (requires Files API beta): %s", block)
                    continue

            # text ブロックの整形
            if btype == "text":
                out.append({"type": "text", "text": str(block.get("text", ""))})
                continue

            # その他（thinking/tool_* など）はそのまま
            out.append(block)

        if not out:
            out.append({"type": "text", "text": ""})

        return out

    def _validate_inline_file(self, file_name: str, mime_type: str | None, data: bytes) -> None:
        """
        β無し（base64 で直接送る）運用ではリクエスト 32MB 制限が支配的。:contentReference[oaicite:10]{index=10}
        そこで “生データ” を安全側の上限で弾く。
        """
        if len(data) > MAX_INLINE_BINARY_BYTES:
            raise ValueError(
                f"File '{file_name}' is too large to send inline (base64) safely. "
                f"bytes={len(data)} > {MAX_INLINE_BINARY_BYTES}. "
                "Use a URL-based PDF, reduce file size, or (if you accept beta) use Files API."
            )

        # PDFは特に制約が明示されているので、mime がPDFならより強く注意
        if (mime_type or "").lower() == "application/pdf" and len(data) > MAX_INLINE_BINARY_BYTES:
            raise ValueError(
                f"PDF '{file_name}' is too large for inline base64 under the 32MB request limit."
            )


    def _attachment_blocks_from_files(self, files: list[tuple[str, str | None, bytes]]) -> list[dict[str, Any]]:
        blocks: list[dict[str, Any]] = []

        for file_name, mime_type, data in files:
            mt = (mime_type or "application/octet-stream").lower()
            ext = get_file_extension(file_name)

            self._validate_inline_file(file_name, mt, data)

            # MIMEタイプまたは拡張子でサポート形式をチェック
            is_supported = (
                mt in CLAUDE_SUPPORTED_MIME_TYPES
                or ext in CLAUDE_SUPPORTED_EXTENSIONS
                or is_image_file(file_name, mime_type)  # 画像ファイルは広くサポート
            )

            if not is_supported:
                supported_extensions = ", ".join(sorted(CLAUDE_SUPPORTED_EXTENSIONS))
                raise ValueError(
                    f"Claudeモデルでは、ファイル '{file_name}' の形式（MIME: {mime_type}, 拡張子: {ext}）はサポートされていません。\n"
                    f"サポートされている形式: {supported_extensions}\n"
                    f"Officeファイル（.xlsx, .pptx, .docx等）は直接アップロードできません。"
                    f"PDFやテキスト形式に変換してからアップロードしてください。"
                )

            if mt == "application/pdf":
                blocks.append(self._pdf_block_from_bytes(data, title=file_name))
                continue

            if mt.startswith("image/"):
                blocks.append(self._image_block_from_bytes(data, mt))
                continue

            # テキスト系は document(source:text) にして安定運用
            if mt.startswith("text/") or mt in ("application/json", "application/xml", "application/xhtml+xml"):
                try:
                    text = data.decode("utf-8")
                except UnicodeDecodeError:
                    text = data.decode("utf-8", errors="replace")
                blocks.append(self._text_document_block(text, title=file_name, media_type="text/plain"))
                continue

            # 上記のチェックでサポートされていない形式は既にエラーになっているはずだが、
            # 万が一ここに到達した場合は不明な形式としてエラー
            raise ValueError(
                f"Claudeモデルで処理できないファイル形式です: mime_type={mime_type!r}, file={file_name!r}"
            )

        return blocks

    # -----------------------------
    # Public API
    # -----------------------------
    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
    ) -> Generator[str, None, None]:
        """
        安定版（βヘッダ無し）で動く Messages API ストリーミング。
        - history から無効な type='file' と、β必須の source.type='file' を除去
        - files は PDF/画像/テキストのみを base64/text で添付
        """

        messages: list[dict[str, Any]] = []

        # history を Claude 形式に変換しつつ、無効ブロックを除去
        for h in history:
            role = self._normalize_role(h.get("role", "user"))
            content = h.get("content", "")

            if isinstance(content, list):
                messages.append({"role": role, "content": self._sanitize_history_blocks(content)})
            else:
                messages.append({"role": role, "content": [{"type": "text", "text": str(content)}]})

        # 添付（安定版：base64/text）
        attachment_blocks: list[dict[str, Any]] = []
        if files:
            attachment_blocks = self._attachment_blocks_from_files(files)

        # “文書/画像 → 質問テキスト” の順が推奨（PDF/vision系のガイド例もこの並び）:contentReference[oaicite:11]{index=11}
        user_content: list[dict[str, Any]] = []
        user_content.extend(attachment_blocks)
        user_content.append({"type": "text", "text": message})

        messages.append({"role": "user", "content": user_content})

        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 4096,
            "temperature": 0.7,
            "messages": messages,
        }
        if system_prompt:
            kwargs["system"] = system_prompt

        try:
            with self.client.messages.stream(**kwargs) as stream:
                for text in stream.text_stream:
                    yield text

        except anthropic.APIStatusError as e:
            # 400 の原因追跡をしやすくする
            logger.error(
                "Claude API Status Error: status=%s request_id=%s message=%s",
                getattr(e, "status_code", None),
                getattr(e, "request_id", None),
                str(e),
            )
            raise

        except Exception as e:
            logger.exception("Claude API Error: %s", e)
            raise
