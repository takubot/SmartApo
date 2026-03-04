"""
Gemini Nano Banana (画像生成) サービスの実装
gemini-3-pro-image-preview モデルを使用して画像を生成する
"""

import base64
import io
import json
import logging
import uuid
from datetime import datetime
from typing import Generator

from google import genai  # type: ignore
from google.genai import types  # type: ignore

from PIL import Image

from ....common.env_config import TENANT_NAME, get_settings
from . import BaseAIService

logger = logging.getLogger(__name__)

# 公開情報が限定的なため、保守的に 20MB / ファイル を上限とする
GEMINI_MAX_FILE_BYTES: int = 20 * 1024 * 1024


def _inline_data_to_bytes(inline_data: object) -> bytes:
    """
    google-genai の inline_data.data は SDK/レスポンス形状により
    base64文字列 / bytes / memoryview 等で返ることがあるため、bytesに正規化する。
    """
    data = getattr(inline_data, "data", None)
    if data is None:
        raise ValueError("inline_data.data is missing")
    if isinstance(data, bytes):
        return data
    if isinstance(data, memoryview):
        return data.tobytes()
    if isinstance(data, str):
        return base64.b64decode(data)
    # 想定外型でも bytes() を試す
    try:
        return bytes(data)
    except Exception as e:
        raise TypeError(f"Unsupported inline_data.data type: {type(data)}") from e


def _inline_data_to_pil_image(inline_data: object) -> Image.Image:
    """inline_data から必ず Pillow Image を作る（as_image() 依存を排除）"""
    raw = _inline_data_to_bytes(inline_data)
    img = Image.open(io.BytesIO(raw))
    # 遅延ロード対策（BytesIOの寿命に依存しないようにする）
    img.load()
    return img


class GeminiNanoBananaService(BaseAIService):
    """
    Gemini Nano Banana (画像生成) サービスの実装
    
    gemini-3-pro-image-preview モデルを使用して画像を生成します。
    リファレンス: https://ai.google.dev/gemini-api/docs/image-generation
    """
    
    def __init__(self, model: str = "gemini-3-pro-image-preview"):
        """
        GeminiNanoBananaServiceを初期化
        
        Args:
            model: 使用するモデル名（デフォルト: "gemini-3-pro-image-preview"）
        """
        self.model_name = model
        settings = get_settings()
        if not settings.GOOGLE_API_KEY:
            raise ValueError("Google API Key is not set")
        
        # 新しいSDKではClientを使用
        try:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        except Exception as e:
            logger.error(f"Gemini Nano Banana SDKの初期化に失敗しました: {e}")
            raise RuntimeError(
                "Gemini 画像生成 SDKの初期化に失敗しました。"
                "APIキーが正しく設定されているか確認してください。"
            ) from e

    def _validate_files(self, files: list[tuple[str, str | None, bytes]] | None) -> None:
        """
        アップロード前にファイルサイズを検証する。
        画像生成モデルでは、入力画像として使用できるファイルを検証する。
        """
        if not files:
            return
        for idx, (file_name, mime_type, data) in enumerate(files):
            # サイズ検証
            if len(data) > GEMINI_MAX_FILE_BYTES:
                raise ValueError(
                    f"Gemini file #{idx} exceeds max size: "
                    f"{len(data)} bytes > {GEMINI_MAX_FILE_BYTES} bytes"
                )

    def _image_to_base64_data_uri(self, image: Image.Image, format: str = "PNG") -> str:
        """
        PIL Imageをbase64エンコードしたdata URIに変換
        
        Args:
            image: PIL Imageオブジェクト
            format: 画像フォーマット（デフォルト: "PNG"）
            
        Returns:
            data URI形式の文字列（例: "data:image/png;base64,..."）
        """
        buffer = io.BytesIO()
        # keyword引数 format は、型がPillow Image以外の場合に落ちることがあるため位置引数で渡す
        image.save(buffer, format)
        image_bytes = buffer.getvalue()
        base64_data = base64.b64encode(image_bytes).decode("utf-8")
        mime_type = f"image/{format.lower()}"
        return f"data:{mime_type};base64,{base64_data}"

    def _build_message_with_history(self, message: str, history: list[dict[str, str]]) -> str:
        """
        チャット履歴を考慮してプロンプトを構築する
        
        画像生成APIは履歴を直接サポートしていないため、履歴の内容をプロンプトに含める。
        これにより、会話の文脈を考慮した画像生成が可能になる。
        
        Args:
            message: 現在のメッセージ
            history: チャット履歴 [{"role": "user"|"assistant", "content": "..."}]
            
        Returns:
            履歴を考慮したプロンプト
        """
        if not history:
            return message
        
        # 履歴の最後の数件を取得（画像生成では長すぎる履歴は不要）
        # 最新の会話ペア（ユーザー→アシスタント）を最大3組まで含める
        recent_history = history[-6:] if len(history) > 6 else history
        
        # 履歴をテキスト形式に変換
        history_text_parts = []
        for h in recent_history:
            role = h.get("role", "user")
            content = h.get("content", "").strip()
            if not content:
                continue
            
            if role == "user":
                history_text_parts.append(f"ユーザー: {content}")
            elif role == "assistant":
                history_text_parts.append(f"アシスタント: {content}")
        
        # 履歴がある場合のみ、プロンプトに含める
        if history_text_parts:
            history_context = "\n".join(history_text_parts)
            enhanced_message = f"""以下の会話履歴を参考に、画像を生成してください。

【会話履歴】
{history_context}

【現在のリクエスト】
{message}"""
            return enhanced_message
        
        return message

    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
        *,
        file_storage=None,
        group_id: str | None = None,
    ) -> Generator[str, None, None]:
        """
        Gemini 3 Pro Image Preview を用いて画像を生成し、GCSに保存して署名付きURLを返す。
        
        Args:
            message: 画像生成のプロンプト
            history: チャット履歴（会話の文脈を考慮して画像生成を行う）
            system_prompt: システムプロンプト（画像生成では使用されないが、インターフェース互換性のため）
            files: 入力画像（画像編集やスタイル転送に使用可能）
            file_storage: ファイルストレージクライアント（GCS保存用）
            group_id: グループID（GCSパス生成用）
            
        Yields:
            生成された画像の署名付きURL（JSON形式）
        """
        # ファイルの検証（既存のgemini.pyと同じパターン）
        if files:
            self._validate_files(files)
        
        try:
            # 画像生成のリクエストを構築
            # リファレンス: https://ai.google.dev/gemini-api/docs/image-generation
            contents: list = []
            
            # チャット履歴を考慮してプロンプトを構築
            # 画像生成APIは履歴を直接サポートしていないため、履歴の内容をプロンプトに含める
            enhanced_message = self._build_message_with_history(message, history)
            
            # 入力画像がある場合は追加（画像編集やスタイル転送用）
            if files:
                for file_name, mime_type, data in files:
                    try:
                        # 画像データをPIL Imageに変換
                        image = Image.open(io.BytesIO(data))
                        # 画像をbase64エンコード
                        buffer = io.BytesIO()
                        # 元の画像形式を保持、またはPNGに変換
                        image_format = "PNG"
                        if mime_type:
                            if "jpeg" in mime_type.lower() or "jpg" in mime_type.lower():
                                image_format = "JPEG"
                            elif "webp" in mime_type.lower():
                                image_format = "WEBP"
                        
                        image.save(buffer, format=image_format)
                        image_bytes = buffer.getvalue()
                        base64_data = base64.b64encode(image_bytes).decode("utf-8")
                        
                        # InlineDataを作成してPartに追加
                        inline_data = types.InlineData(
                            mime_type=mime_type or f"image/{image_format.lower()}",
                            data=base64_data,
                        )
                        contents.append(types.Part(inline_data=inline_data))
                    except Exception as e:
                        logger.warning(f"画像 '{file_name}' の処理に失敗しました: {e}")
                        # 画像の処理に失敗しても続行（テキストプロンプトのみで生成を試みる）
            
            # 履歴を考慮したテキストプロンプトを追加
            contents.append(enhanced_message)
            
            # 画像生成の実行
            # リファレンス: https://ai.google.dev/gemini-api/docs/image-generation
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
            )
            
            # レスポンスから画像を取得
            generated_images = []
            gcs_urls = []
            parts_info = []
            
            for part in response.parts:
                # テキストレスポンスがある場合はそのまま返す
                if hasattr(part, "text") and part.text is not None:
                    parts_info.append(f"text: {part.text[:100]}...")
                    yield part.text
                
                # 画像データを取得
                if hasattr(part, "inline_data") and part.inline_data is not None:
                    parts_info.append("inline_data: present")
                    image = _inline_data_to_pil_image(part.inline_data)
                    
                    # GCSに保存して署名付きURLを生成
                    if file_storage and group_id:
                        # 画像をPNG形式でバイトデータに変換
                        image_buffer = io.BytesIO()
                        image.save(image_buffer, "PNG")
                        image_bytes = image_buffer.getvalue()
                        
                        # ファイル名を生成（タイムスタンプ + UUID）
                        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
                        unique_id = str(uuid.uuid4())[:8]
                        file_name = f"generated_image_{timestamp}_{unique_id}.png"
                        
                        # GCSパスを生成
                        settings = get_settings()
                        file_path = f"{TENANT_NAME}/{group_id}/generated_images/{file_name}"
                        bucket_name = f"doppel-{settings.env}-chat-bucket"
                        
                        # GCSにアップロード
                        image_file_obj = io.BytesIO(image_bytes)
                        gcs_path = file_storage.upload_file(
                            file_obj=image_file_obj,
                            file_path=file_path,
                            file_name=file_name,
                            bucket_name=bucket_name,
                        )
                        
                        # 署名付きURLを生成（30分有効）
                        signed_url = file_storage.generate_signed_url(
                            gcs_path=gcs_path,
                            expiration_minutes=30,
                        )
                        
                        gcs_urls.append(gcs_path)
                        
                        # JSON形式で返す
                        image_json = json.dumps({
                            "type": "image",
                            "gcs_url": gcs_path,
                            "signed_url": signed_url,
                        }, ensure_ascii=False)
                        generated_images.append(image_json)
                        yield image_json
                    else:
                        # file_storageが提供されていない場合はbase64エンコードしたdata URIを返す
                        data_uri = self._image_to_base64_data_uri(image)
                        image_json = json.dumps({
                            "type": "image",
                            "data_uri": data_uri,
                        }, ensure_ascii=False)
                        generated_images.append(image_json)
                        yield image_json
                else:
                    # 画像データがないpartの情報を記録
                    part_attrs = [attr for attr in dir(part) if not attr.startswith("_")]
                    parts_info.append(f"part without inline_data (attrs: {', '.join(part_attrs[:5])})")
            
            # 画像が生成されなかった場合の詳細ログ
            if not generated_images:
                logger.warning(
                    f"画像が生成されませんでした。レスポンスのparts数: {len(response.parts)}, "
                    f"parts情報: {parts_info}"
                )
                raise RuntimeError(
                    f"画像が生成されませんでした。レスポンスに画像データが含まれていません。"
                    f" parts数: {len(response.parts)}, parts情報: {parts_info}"
                )
            
            # GCS URLを保存するために属性として設定
            self._generated_image_gcs_urls = gcs_urls
                
        except RuntimeError:
            raise
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Gemini Nano Banana API Error: {error_msg}", exc_info=True)
            raise RuntimeError(f"Gemini 画像生成 API エラー: {error_msg}") from e


# 後方互換性のためのエイリアス
GeminiService = GeminiNanoBananaService

__all__ = ["GeminiNanoBananaService", "GeminiService", "GEMINI_MAX_FILE_BYTES"]
