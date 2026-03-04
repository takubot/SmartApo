import io
import logging
from typing import Generator

import google.generativeai as genai

from ....common.env_config import get_settings
from . import (
    BaseAIService,
    GEMINI_SUPPORTED_MIME_TYPES,
    GEMINI_SUPPORTED_EXTENSIONS,
    get_file_extension,
    is_image_file,
)

logger = logging.getLogger(__name__)

# 公開情報が限定的なため、保守的に 20MB / ファイル を上限とする
GEMINI_MAX_FILE_BYTES: int = 20 * 1024 * 1024


class GeminiService(BaseAIService):
    def __init__(self, model: str = "gemini-2.5-pro"):
        self.model_name = model
        settings = get_settings()
        if not settings.GOOGLE_API_KEY:
            raise ValueError("Google API Key is not set")
        genai.configure(api_key=settings.GOOGLE_API_KEY)


    def _validate_files(self, files: list[tuple[str, str | None, bytes]] | None) -> None:
        """
        アップロード前にファイルサイズと形式を検証する。
        Gemini API でサポートされていない形式は事前に拒否する。
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
            
            # 形式検証
            mt = (mime_type or "application/octet-stream").lower()
            ext = get_file_extension(file_name)
            
            is_supported = (
                mt in GEMINI_SUPPORTED_MIME_TYPES
                or ext in GEMINI_SUPPORTED_EXTENSIONS
                or is_image_file(file_name, mime_type)  # 画像ファイルは広くサポート
            )
            
            if not is_supported:
                supported_extensions = ", ".join(sorted(GEMINI_SUPPORTED_EXTENSIONS))
                raise ValueError(
                    f"Geminiモデルでは、ファイル '{file_name}' の形式（MIME: {mime_type}, 拡張子: {ext}）はサポートされていません。\n"
                    f"サポートされている形式: {supported_extensions}\n"
                    f"Officeファイル（.xlsx, .pptx, .docx等）は直接アップロードできません。"
                    f"PDFやテキスト形式に変換してからアップロードしてください。"
                )

    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
    ) -> Generator[str, None, None]:
        """
        Gemini GenerativeModel を用いてストリーミング応答を生成する。
        files にバイナリを渡した場合は upload_file でアップロードし、parts として添付する。
        """

        # Gemini 用の履歴変換
        gemini_history: list[dict[str, object]] = []
        for h in history:
            role = "user" if h.get("role") == "user" else "model"
            gemini_history.append({"role": role, "parts": [h.get("content", "")]})

        # モデルのインスタンス化（システムプロンプトがある場合）
        if system_prompt:
            model = genai.GenerativeModel(self.model_name, system_instruction=system_prompt)
        else:
            model = genai.GenerativeModel(self.model_name)

        # 添付ファイルの検証とアップロード
        uploaded_files = []
        if files:
            self._validate_files(files)
            for _, mime_type, data in files:
                file_handle = io.BytesIO(data)
                # ライブラリのバージョン差異により、キーワード引数 file= を受け付けないケースがあるため
                # 位置引数 + mime_type で upload_file を呼び出す
                uploaded = genai.upload_file(file_handle, mime_type=mime_type or "application/octet-stream")
                uploaded_files.append(uploaded)

        chat = model.start_chat(history=gemini_history)

        # メッセージ + 添付ファイルを parts にまとめて送信
        parts: list[object] = [message]
        parts.extend(uploaded_files)

        try:
            response = chat.send_message(parts, stream=True)
            last_finish_reason = None
            
            for chunk in response:
                # finish_reasonをチェック
                if hasattr(chunk, "candidates") and chunk.candidates:
                    candidate = chunk.candidates[0]
                    finish_reason = getattr(candidate, "finish_reason", None)
                    
                    if finish_reason is not None:
                        last_finish_reason = finish_reason
                        
                        # finish_reasonの値: 0=UNSPECIFIED, 1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER
                        if finish_reason not in (0, 1):
                            reason_map = {
                                2: "MAX_TOKENS（トークン上限到達）",
                                3: "SAFETY（安全性フィルター）",
                                4: "RECITATION（引用の問題）",
                                5: "OTHER",
                            }
                            reason_name = reason_map.get(finish_reason, f"UNKNOWN({finish_reason})")
                            safety_info = ""
                            if hasattr(candidate, "safety_ratings") and candidate.safety_ratings:
                                blocked = [r for r in candidate.safety_ratings if getattr(r, "blocked", False)]
                                if blocked:
                                    categories = [getattr(r, "category", "UNKNOWN") for r in blocked]
                                    safety_info = f" ブロック理由: {', '.join(categories)}"
                            
                            error_msg = f"Gemini APIがコンテンツをブロックしました。 finish_reason={reason_name}{safety_info}"
                            logger.error(f"Gemini API Blocked: {error_msg}")
                            raise RuntimeError(error_msg)
                
                # テキストを取得（Partが存在しない場合はエラーになる）
                try:
                    if chunk.text:
                        yield chunk.text
                except (AttributeError, ValueError) as e:
                    # finish_reasonが1（STOP）の場合は正常終了
                    if last_finish_reason == 1:
                        break
                    # その他の場合はエラーを再発生
                    raise RuntimeError(
                        f"Gemini API: レスポンスにPartが含まれていません。 finish_reason={last_finish_reason}"
                    ) from e
                    
        except RuntimeError:
            raise
        except Exception as e:
            error_msg = str(e)
            if "finish_reason" in error_msg and "Part" in error_msg:
                logger.error(f"Gemini API: finish_reasonエラー - {error_msg}")
                raise RuntimeError(
                    "Gemini APIがコンテンツをブロックしたか、レスポンスの形式が不正です。別の質問を試してください。"
                ) from e
            logger.error(f"Gemini API Error: {error_msg}", exc_info=True)
            raise RuntimeError(f"Gemini API エラー: {error_msg}") from e


