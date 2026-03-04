import base64
import io
import logging
from typing import Generator

from openai import OpenAI

from ....common.env_config import get_settings
from . import (
    BaseAIService,
    OPENAI_SUPPORTED_EXTENSIONS,
    get_file_extension,
    is_image_file,
    get_mime_type,
)

logger = logging.getLogger(__name__)

# OpenAI Files API の上限値
OPENAI_MAX_FILE_BYTES: int = 512 * 1024 * 1024  # 512MB
OPENAI_MAX_IMAGE_BYTES: int = 50 * 1024 * 1024  # 50MB（画像ファイルの制限）


class OpenAIService(BaseAIService):
    def __init__(self, model: str = "gpt-4o"):
        self.model = model
        settings = get_settings()
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API Key is not set")
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)


    def _validate_files(self, files: list[tuple[str, str | None, bytes]] | None) -> None:
        """
        アップロード前にファイルサイズと形式を検証する。
        
        Args:
            files: (ファイル名, MIMEタイプ, バイナリデータ) のタプルリスト
            
        Raises:
            ValueError: ファイルサイズまたは形式が不正な場合
        """
        if not files:
            return
        
        for idx, (file_name, mime_type, data) in enumerate(files):
            file_size = len(data)
            is_image = is_image_file(file_name, mime_type)
            
            # サイズ検証
            max_size = OPENAI_MAX_IMAGE_BYTES if is_image else OPENAI_MAX_FILE_BYTES
            if file_size > max_size:
                file_type = "画像" if is_image else "ファイル"
                size_mb = max_size / (1024 * 1024)
                raise ValueError(
                    f"OpenAI{file_type} '{file_name}' が大きすぎます: "
                    f"{file_size:,} bytes > {max_size:,} bytes (最大{size_mb:.0f}MB)"
                )
            
            # 形式検証（画像以外のファイルのみ）
            if not is_image:
                ext = get_file_extension(file_name)
                if ext and ext not in OPENAI_SUPPORTED_EXTENSIONS:
                    supported_list = ", ".join(sorted(OPENAI_SUPPORTED_EXTENSIONS))
                    raise ValueError(
                        f"OpenAIモデルでは、ファイル '{file_name}' の形式{ext}はサポートされていません。\n"
                        f"サポートされている形式: {supported_list}\n"
                        f"Officeファイル（.xlsx, .pptx, .docx等）は直接アップロードできません。"
                        f"PDFやテキスト形式に変換してからアップロードしてください。"
                    )

    @staticmethod
    def _to_input_block(text: str) -> list[dict[str, str]]:
        """テキストをinput_textブロックに変換。"""
        return [{"type": "input_text", "text": text}]

    @staticmethod
    def _to_output_block(text: str) -> list[dict[str, str]]:
        """テキストをoutput_textブロックに変換。"""
        return [{"type": "output_text", "text": text}]

    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
    ) -> Generator[str, None, None]:
        """
        OpenAI Responses API 形式でストリーミング応答を生成する。
        
        Args:
            message: ユーザーからのメッセージ
            history: チャット履歴
            system_prompt: システムプロンプト（任意）
            files: 添付ファイルのリスト（任意）
            
        Yields:
            生成されたテキストのチャンク
        """

        inputs: list[dict[str, object]] = []

        # 添付ファイルの処理
        # 画像: base64エンコードしてinput_imageとして送信
        # その他: Files APIにアップロードしてinput_fileとして送信
        uploaded_file_ids: list[str] = []
        image_blocks: list[dict[str, str]] = []
        
        if files:
            self._validate_files(files)
            
            # ファイルを画像とその他に分類
            image_files: list[tuple[str, str | None, bytes]] = []
            other_files: list[tuple[str, str | None, bytes]] = []
            
            for file_name, mime_type, data in files:
                if is_image_file(file_name, mime_type):
                    image_files.append((file_name, mime_type, data))
                else:
                    other_files.append((file_name, mime_type, data))
            
            # 画像ファイルをbase64エンコードしてinput_imageブロックを作成
            for file_name, mime_type, data in image_files:
                mime = get_mime_type(file_name, mime_type)
                base64_data = base64.b64encode(data).decode("utf-8")
                image_blocks.append({
                    "type": "input_image",
                    "image_url": f"data:{mime};base64,{base64_data}",
                })
            
            # テキスト/PDF等のファイルをFiles APIにアップロード
            for file_name, _, data in other_files:
                file_handle = io.BytesIO(data)
                uploaded = self.client.files.create(
                    file=(file_name, file_handle),
                    purpose="assistants",
                )
                uploaded_file_ids.append(uploaded.id)

        # システムプロンプトの追加
        if system_prompt:
            inputs.append({"role": "system", "content": self._to_input_block(system_prompt)})

        # 履歴の変換
        for past in history:
            role = past.get("role", "user")
            content = past.get("content", "")
            
            if role == "assistant":
                inputs.append({"role": "assistant", "content": self._to_output_block(content)})
            else:
                inputs.append({"role": "user", "content": self._to_input_block(content)})

        # ユーザー発話と添付ファイルを組み立て
        # 推奨順序: 画像 → テキスト → ファイル
        user_content_blocks: list[dict[str, str | object]] = []
        user_content_blocks.extend(self._to_input_block(message))
        user_content_blocks.extend(image_blocks)
        user_content_blocks.extend(
            {"type": "input_file", "file_id": file_id} for file_id in uploaded_file_ids
        )
        inputs.append({"role": "user", "content": user_content_blocks})

        # モデルに応じてreasoning effortを調整
        reasoning = self._get_reasoning_effort()

        try:
            stream = self.client.responses.create(
                model=self.model,
                input=inputs,
                stream=True,
                reasoning=reasoning,
            )

            for event in stream:
                if event.type == "response.output_text.delta":
                    yield event.delta
                elif event.type == "response.error":
                    # OpenAI側からのエラーイベント
                    msg = str(event.error)
                    # Cloudflare 経由の 5xx (特に 502 Bad Gateway) などは HTML が返ることがある
                    if "502" in msg or "Bad gateway" in msg:
                        logger.error("OpenAI API 502 Bad Gateway: %s", msg[:500])
                        raise RuntimeError(
                            "OpenAI API側で一時的なエラー(502 Bad Gateway)が発生しました。"
                            "しばらく時間をおいて再度お試しください。"
                        )
                    logger.error("OpenAI API Error event: %s", msg[:500])
                    raise RuntimeError(msg)

        except Exception as e:
            msg = str(e)
            if "502" in msg or "Bad gateway" in msg:
                # HTML全文をログに載せるとノイズが大きいので先頭だけ残す
                logger.error("OpenAI API 502 Bad Gateway: %s", msg[:500])
                raise RuntimeError(
                    "OpenAI API側で一時的なエラー(502 Bad Gateway)が発生しました。"
                    "しばらく時間をおいて再度お試しください。"
                ) from e
            logger.error("OpenAI API Error: %s", msg, exc_info=True)
            raise

    def _get_reasoning_effort(self) -> dict[str, str] | None:
        """
        モデルに応じたreasoning effortを取得。
        
        Returns:
            reasoning設定の辞書、またはNone（デフォルト）
        """
        model_lower = self.model.lower()
        
        if "gpt-5.2" in model_lower:
            return {"effort": "high"}
        elif any(x in model_lower for x in ["nano", "instant", "mini"]):
            return {"effort": "low"}
        elif "o1" in model_lower and "mini" not in model_lower:
            return {"effort": "high"}
        
        return None


