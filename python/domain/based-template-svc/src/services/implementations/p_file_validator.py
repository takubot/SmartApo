import json
import logging
import subprocess
import tempfile
from io import BytesIO
from typing import IO

import docx
from fastapi import HTTPException

# PPTX用
from pptx import Presentation
from pydub import AudioSegment

# --- 追加ライブラリ ---
from PyPDF2 import PdfReader
from starlette import status

from ...services.interfaces.i_file_validator import IFileValidator

logger = logging.getLogger(__name__)

# --------------------------------------------------------
# 各シナリオごとに「一意のステータスコード」を定義
# --------------------------------------------------------
HTTP_415_UNSUPPORTED_TYPE = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE  # 415: 拡張子不明
HTTP_413_REQUEST_ENTITY_TOO_LARGE = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE  # 413: ファイルサイズ超
HTTP_423_PDF_PAGE_EXCEEDED = 423  # PDFのページ超過 (今回はPPTXも流用)
HTTP_424_WORD_PAGE_EXCEEDED = 424  # Wordのページ超過
HTTP_425_AUDIO_LENGTH_EXCEEDED = 425  # 音声の長さ超過
HTTP_426_FILE_READING_ERROR = 426  # ファイル読み込みエラー
HTTP_500_UNEXPECTED = status.HTTP_500_INTERNAL_SERVER_ERROR  # 500: 想定外エラー


class PFileValidator(IFileValidator):
    """
    拡張子とファイルサイズ、PDF/Wordページ数、音声ファイル長などを
    検証する具体クラス。

    ### バリデーション項目:
    1. サポート外拡張子の場合 -> 415
    2. ファイルサイズ上限(例:100MB)超過 -> 413
    3. PDF のページ数(例:300ページ)超過 -> 423
    4. Word(doc, docx) のページ数(例:300ページ)超過 -> 424
    5. 音声ファイル(wav, mp3, flac, aac)の長さ(例:600秒)超過 -> 425
    6. ファイル読み込みエラー -> 426
    7. 予期しないエラー -> 500

    ### pptx → PDF同様に 300ページ(スライド)超過を 423 エラーとみなす
    """

    MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100MB
    MAX_VIDEO_FILE_SIZE_BYTES = 1024 * 1024 * 1024  # 1GB (動画ファイル用)
    MAX_PAGE_COUNT = 300  # PDF/Word/PPTXのページ数上限
    MAX_AUDIO_DURATION_SEC = 7200.0  # 音声ファイルの最大長(秒) = 2時間
    MAX_VIDEO_DURATION_SEC = 7200.0  # 動画ファイルの最大長(秒) = 2時間
    
    # 動画ファイルの拡張子リスト
    VIDEO_EXTENSIONS = {
        "mp4",   # MPEG-4
        "avi",   # Audio Video Interleave
        "mov",   # QuickTime Movie
        "mkv",   # Matroska Video
        "webm",  # WebM
        "flv",   # Flash Video
        "wmv",   # Windows Media Video
        "m4v",   # iTunes Video
        "3gp",   # 3GPP
        "ogv",   # Ogg Video
        "mpg",   # MPEG-1/2
        "mpeg",  # MPEG-1/2
        "ts",    # MPEG Transport Stream
        "mts",   # MPEG Transport Stream (AVCHD)
    }

    def file_validate_check(self, file: IO, file_type: str) -> None:
        """
        ファイルバイナリおよび拡張子をもとにバリデーションを実施。

        1. 拡張子チェック -> 415
        2. ファイルサイズチェック -> 413
        3. PDF -> ページ数チェック -> 423
        4. PPTX -> スライド数チェック -> 423
        5. Word(doc, docx) -> ページ数チェック -> 424
        6. 音声ファイル -> 長さチェック -> 425
        7. ファイル読み込みエラー -> 426
        8. 想定外エラー -> 500
        """
        try:
            extension_lower = file_type.lower()

            # サポート拡張子
            SUPPORTED_EXTENSIONS = {
                "csv",
                "xlsx",
                "xls",  # スプレッドシート
                "pdf",  # PDF
                "doc",
                "docx",  # Word
                "pptx",  # PowerPoint
                "wav",
                "mp3",
                "flac",
                "aac",  # 音声ファイル
            } | self.VIDEO_EXTENSIONS  # 動画ファイル

            # 1) 拡張子サポートチェック -> 415
            if extension_lower not in SUPPORTED_EXTENSIONS:
                logger.debug(f"Unsupported file type: {file_type}")
                raise HTTPException(status_code=HTTP_415_UNSUPPORTED_TYPE, detail="対応していないファイル形式です")

            # 2) ファイルサイズチェック -> 413
            file_content = file.read()
            file_size = len(file_content)
            # 動画ファイルはより大きなサイズ制限を適用
            max_size = self.MAX_VIDEO_FILE_SIZE_BYTES if extension_lower in self.VIDEO_EXTENSIONS else self.MAX_FILE_SIZE_BYTES
            if file_size > max_size:
                max_size_mb = max_size / (1024 * 1024)
                raise HTTPException(
                    status_code=HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"ファイルサイズが大きすぎます (上限: {max_size_mb:.0f}MB)",
                )

            # 3) PDFページ数チェック -> 423
            if extension_lower == "pdf":
                page_count = self._get_pdf_page_count(file_content)
                if page_count > self.MAX_PAGE_COUNT:
                    raise HTTPException(
                        status_code=HTTP_423_PDF_PAGE_EXCEEDED,
                        detail=f"PDFのページ数が上限({self.MAX_PAGE_COUNT})を超えています",
                    )

            # 4) PPTXスライド数チェック -> 423 (PDFに準じて)
            if extension_lower == "pptx":
                slide_count = self._get_pptx_slide_count(file_content)
                if slide_count > self.MAX_PAGE_COUNT:
                    raise HTTPException(
                        status_code=HTTP_423_PDF_PAGE_EXCEEDED,  # 同じ423を流用
                        detail=f"PPTXのスライド数が上限({self.MAX_PAGE_COUNT})を超えています",
                    )

            # 5) Word(doc, docx)ページ数チェック -> 424
            if extension_lower in ["doc", "docx"]:
                page_count = self._get_word_page_count(file_content, extension_lower)
                if page_count > self.MAX_PAGE_COUNT:
                    raise HTTPException(
                        status_code=HTTP_424_WORD_PAGE_EXCEEDED,
                        detail=f"Wordファイルのページ数が上限({self.MAX_PAGE_COUNT})を超えています",
                    )

            # 6) 音声(wav, mp3, flac, aac)の長さチェック -> 425
            if extension_lower in ["wav", "mp3", "flac", "aac"]:
                audio_duration = self._get_audio_duration(file_content, extension_lower)
                if audio_duration > self.MAX_AUDIO_DURATION_SEC:
                    max_duration_hours = self.MAX_AUDIO_DURATION_SEC / 3600
                    raise HTTPException(
                        status_code=HTTP_425_AUDIO_LENGTH_EXCEEDED,
                        detail=f"音声の長さが上限({max_duration_hours:.0f}時間)を超えています",
                    )
            
            # 7) 動画ファイルの長さチェック -> 425
            if extension_lower in self.VIDEO_EXTENSIONS:
                video_duration = self._get_video_duration(file_content, extension_lower)
                if video_duration > self.MAX_VIDEO_DURATION_SEC:
                    max_duration_hours = self.MAX_VIDEO_DURATION_SEC / 3600
                    raise HTTPException(
                        status_code=HTTP_425_AUDIO_LENGTH_EXCEEDED,  # 同じ425を流用
                        detail=f"動画の長さが上限({max_duration_hours:.0f}時間)を超えています",
                    )

        except HTTPException:
            # 個別ステータスコードを割り振っているので再送出のみ
            raise
        except Exception as e:
            # ファイル読み込み/解析系エラーの可能性 -> 426
            logger.error(f"File reading/processing error: {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"ファイルの読み込み中にエラーが発生しました: {str(e)}"
            )
        finally:
            # ファイルポインタをリセット
            try:
                file.seek(0)
            except Exception as e:
                logger.error(f"Failed to reset file pointer: {str(e)}")

    # ----------------------------------------------------
    # (A) PDFのページ数取得 -> 423
    # ----------------------------------------------------
    def _get_pdf_page_count(self, file_content: bytes) -> int:
        try:
            with BytesIO(file_content) as file_io:
                pdf_reader = PdfReader(file_io)
                return len(pdf_reader.pages)
        except Exception as e:
            logger.error(f"PDF parsing error: {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"PDFファイルの解析に失敗しました: {str(e)}"
            )

    # ----------------------------------------------------
    # (B) PPTXのスライド数取得 -> 423
    # ----------------------------------------------------
    def _get_pptx_slide_count(self, file_content: bytes) -> int:
        """
        pptxを読み込み、スライド枚数をカウント
        """
        try:
            with BytesIO(file_content) as file_io:
                pres = Presentation(file_io)
                return len(pres.slides)
        except Exception as e:
            logger.error(f"PPTX parsing error: {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"PPTXファイルの解析に失敗しました: {str(e)}"
            )

    # ----------------------------------------------------
    # (C) Word(doc, docx)のページ数取得(簡易) -> 424
    # ----------------------------------------------------
    def _get_word_page_count(self, file_content: bytes, extension_lower: str) -> int:
        try:
            with BytesIO(file_content) as file_io:
                doc_obj = docx.Document(file_io)
        except Exception as e:
            logger.error(f"Word parsing error: {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"Wordファイルの解析に失敗しました: {str(e)}"
            )

        section_count = len(doc_obj.sections)
        page_break_count = sum("\f" in para.text for para in doc_obj.paragraphs)

        estimated_page_count = section_count + page_break_count
        if estimated_page_count < 1:
            estimated_page_count = 1

        return estimated_page_count

    # ----------------------------------------------------
    # (D) 音声ファイル(wav, mp3, flac, aac)の長さ取得 -> 425
    # ----------------------------------------------------
    def _get_audio_duration(self, file_content: bytes, extension_lower: str) -> float:
        try:
            with BytesIO(file_content) as file_io:
                audio = AudioSegment.from_file(file_io, format=extension_lower)
                return audio.duration_seconds
        except Exception as e:
            logger.error(f"Audio parsing error ({extension_lower}): {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"音声ファイルの解析に失敗しました: {str(e)}"
            )

    # ----------------------------------------------------
    # (E) 動画ファイルの長さ取得 -> 425
    # ----------------------------------------------------
    def _get_video_duration(self, file_content: bytes, extension_lower: str) -> float:
        """
        動画ファイルの長さを取得（ffprobeを使用）
        """
        try:
            # 一時ファイルに書き込んでffprobeで解析
            with tempfile.NamedTemporaryFile(suffix=f".{extension_lower}", delete=False) as tmp_file:
                tmp_file.write(file_content)
                tmp_file_path = tmp_file.name

            try:
                # ffprobeで動画の長さを取得
                cmd = [
                    "ffprobe",
                    "-v", "error",
                    "-show_entries", "format=duration",
                    "-of", "json",
                    tmp_file_path,
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode != 0:
                    logger.warning(f"ffprobe failed: {result.stderr}")
                    # ffprobeが利用できない場合は、長さチェックをスキップ（エラーにしない）
                    return 0.0
                
                data = json.loads(result.stdout)
                duration_str = data.get("format", {}).get("duration")
                if duration_str:
                    return float(duration_str)
                else:
                    logger.warning("Could not extract duration from ffprobe output")
                    return 0.0
            finally:
                # 一時ファイルを削除
                import os
                try:
                    os.unlink(tmp_file_path)
                except Exception:
                    pass
        except subprocess.TimeoutExpired:
            logger.error("ffprobe timeout")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail="動画ファイルの解析がタイムアウトしました"
            )
        except FileNotFoundError:
            # ffprobeがインストールされていない場合は、長さチェックをスキップ
            logger.warning("ffprobe not found, skipping video duration check")
            return 0.0
        except Exception as e:
            logger.error(f"Video parsing error ({extension_lower}): {str(e)}")
            raise HTTPException(
                status_code=HTTP_426_FILE_READING_ERROR, detail=f"動画ファイルの解析に失敗しました: {str(e)}"
            )
