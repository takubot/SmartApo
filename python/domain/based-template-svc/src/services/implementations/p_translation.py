"""
Cloud Translation API（Google Translation v2）を使った翻訳実装。

- APIキー方式（DOPPEL_TRANSLATION_API_KEY）で呼び出す
- greeting の多言語翻訳（約80言語）用途を想定
"""

from __future__ import annotations

import html
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Final

import httpx

from ...common.env_config import get_settings

logger = logging.getLogger(__name__)


# システム内で使用する「多言語対応の言語一覧」をここに集約する
# - Cloud Translation API v2 で実際にサポートされている言語コードを使用
# - "ja" は原文をそのまま採用するため必ず含める
# NOTE: 追加/削除する場合は、フロント/バックで一貫して同じセットを利用すること
SYSTEM_LANGUAGES: Final[list[tuple[str, str]]] = [
    # 基本言語
    ("ja", "Japanese"),
    ("en", "English"),
    ("zh", "Chinese"),
    ("zh-CN", "Chinese (China)"),
    ("zh-HK", "Chinese (Hong Kong)"),
    ("zh-Hans", "Chinese (Simplified)"),
    ("zh-TW", "Chinese (Taiwan)"),
    ("zh-Hant", "Chinese (Traditional)"),
    ("ko", "Korean"),
    ("es", "Spanish"),
    ("fr", "French"),
    ("de", "German"),
    ("it", "Italian"),
    ("pt", "Portuguese"),
    ("ru", "Russian"),
    ("ar", "Arabic"),
    ("ar-SA", "Arabic (Saudi Arabia)"),
    ("hi", "Hindi"),
    ("bn", "Bengali"),
    ("bn-IN", "Bengali (India)"),
    ("pa", "Punjabi"),
    ("pa-PK", "Punjabi (Pakistan)"),
    ("ur", "Urdu"),
    ("fa", "Persian"),
    ("tr", "Turkish"),
    ("vi", "Vietnamese"),
    ("th", "Thai"),
    ("id", "Indonesian"),
    ("ms", "Malay"),
    ("fil", "Filipino"),
    ("tl", "Tagalog"),
    ("sw", "Swahili"),
    ("zu", "Zulu"),
    ("ln", "Lingala"),
    ("ne", "Nepali"),
    ("ta", "Tamil"),
    ("te", "Telugu"),
    ("mr", "Marathi"),
    ("gu", "Gujarati"),
    ("kn", "Kannada"),
    ("ml", "Malayalam"),
    ("my", "Burmese"),
    ("km", "Khmer"),
    ("lo", "Lao"),
    ("uz", "Uzbek"),
    ("ky", "Kyrgyz"),
    ("he", "Hebrew"),
    ("el", "Greek"),
    ("nl", "Dutch"),
    ("nl-BE", "Dutch (Belgium)"),
    ("sv", "Swedish"),
    ("nb", "Norwegian (Bokmål)"),
    ("no", "Norwegian"),
    ("da", "Danish"),
    ("fi", "Finnish"),
    ("pl", "Polish"),
    ("cs", "Czech"),
    ("sk", "Slovak"),
    ("hu", "Hungarian"),
    ("ro", "Romanian"),
    ("bg", "Bulgarian"),
    ("uk", "Ukrainian"),
    ("hr", "Croatian"),
    ("sl", "Slovenian"),
    ("lt", "Lithuanian"),
    ("lv", "Latvian"),
    ("et", "Estonian"),
    # 追加の対応言語
    ("af", "Afrikaans"),
    ("sq", "Albanian"),
    ("az", "Azerbaijani"),
    ("be", "Belarusian"),
    ("bs", "Bosnian"),
    ("ca", "Catalan"),
    ("cy", "Welsh"),
    ("fy", "Frisian"),
    ("gl", "Galician"),
    ("gn", "Guarani"),
    ("is", "Icelandic"),
    ("ka", "Georgian"),
    ("mk", "Macedonian"),
    # 英語の地域変種
    ("en-AU", "English (Australia)"),
    ("en-CA", "English (Canada)"),
    ("en-NZ", "English (New Zealand)"),
    ("en-PH", "English (Philippines)"),
    ("en-ZA", "English (South Africa)"),
    ("en-GB", "English (United Kingdom)"),
    ("en-US", "English (United States)"),
    # フランス語の地域変種
    ("fr-CA", "French (Canada)"),
    ("fr-CH", "French (Switzerland)"),
    # ポルトガル語の地域変種
    ("pt-BR", "Portuguese (Brazil)"),
    ("pt-PT", "Portuguese (Portugal)"),
    # スペイン語の地域変種
    ("es-AR", "Spanish (Argentina)"),
    ("es-CL", "Spanish (Chile)"),
    ("es-CO", "Spanish (Colombia)"),
    ("es-CR", "Spanish (Costa Rica)"),
    ("es-EC", "Spanish (Ecuador)"),
    ("es-SV", "Spanish (El Salvador)"),
    ("es-GT", "Spanish (Guatemala)"),
    ("es-HT", "Spanish (Haiti)"),
    ("es-HN", "Spanish (Honduras)"),
    ("es-419", "Spanish (Latin America)"),
    ("es-MX", "Spanish (Mexico)"),
    ("es-NI", "Spanish (Nicaragua)"),
    ("es-PA", "Spanish (Panama)"),
    ("es-PY", "Spanish (Paraguay)"),
    ("es-PE", "Spanish (Peru)"),
    ("es-PR", "Spanish (Puerto Rico)"),
    ("es-ES", "Spanish (Spain)"),
    ("es-US", "Spanish (United States)"),
    ("es-UY", "Spanish (Uruguay)"),
    ("es-VE", "Spanish (Venezuela)"),
]


class UnsupportedTargetLanguageError(ValueError):
    def __init__(self, target_language: str) -> None:
        super().__init__(f"Unsupported target language: {target_language}")
        self.target_language = target_language


class PTranslation:
    """
    Google Cloud Translation API(v2) を用いた簡易翻訳クライアント。

    - APIキーは `DOPPEL_TRANSLATION_API_KEY` を利用
    - REST: https://translation.googleapis.com/language/translate/v2
    """

    _BASE_URL = "https://translation.googleapis.com/language/translate/v2"
    _LANGUAGES_URL = "https://translation.googleapis.com/language/translate/v2/languages"

    # Google Translation API 側の言語コード差異を吸収するためのエイリアス
    # NOTE: ここにないコードでも API が受け付けない場合があるため、実行時にフォールバックも行う
    _LANGUAGE_ALIASES: dict[str, list[str]] = {
        # Filipino (ISO 639-1: tl) は API 側で fil のみ許可されることがある
        "tl": ["fil"],
        # Chinese は API 側で zh-CN/zh-TW を期待することがある
        "zh": ["zh-CN", "zh-TW"],
        # Norwegian は no より nb/nn が通りやすいことがある
        "no": ["nb", "nn"],
    }

    def __init__(
        self,
        *,
        timeout_seconds: float = 10.0,
        max_workers: int = 12,
        max_retries: int = 2,
    ) -> None:
        env_vars = get_settings()
        api_key = getattr(env_vars, "DOPPEL_TRANSLATION_API_KEY", "") or ""
        if not api_key:
            logger.error("Cloud Translation API KEY（DOPPEL_TRANSLATION_API_KEY）が設定されていません")
            raise ValueError("Cloud Translation API KEY（DOPPEL_TRANSLATION_API_KEY）が設定されていません")

        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.max_workers = max_workers
        self.max_retries = max_retries

        self._client = httpx.Client(timeout=self.timeout_seconds)
        logger.info(
            "PTranslation初期化完了: provider=google-translation-v2, timeout=%.1fs, max_workers=%d, retries=%d",
            self.timeout_seconds,
            self.max_workers,
            self.max_retries,
        )

    def _post_translate(
        self,
        *,
        text: str,
        target_language: str,
        source_language: str | None = None,
    ) -> str:
        """
        単一ターゲット言語への翻訳を行う。
        """
        if not text:
            return ""
        if not target_language:
            raise ValueError("target_language が空です")

        params = {"key": self.api_key}
        data: dict[str, str] = {
            "q": text,
            "target": target_language,
            "format": "text",
        }
        if source_language:
            data["source"] = source_language

        last_exc: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._client.post(self._BASE_URL, params=params, data=data)
                resp.raise_for_status()
                payload = resp.json()
                translated = (
                    payload.get("data", {})
                    .get("translations", [{}])[0]
                    .get("translatedText", "")
                )
                # v2 は HTML entity を含むことがある
                return html.unescape(str(translated))
            except httpx.HTTPStatusError as e:
                last_exc = e
                status_code = e.response.status_code
                # 400 の target 不正（Bad language pair）だけは「未対応言語」として上位で処理する
                if status_code == 400:
                    try:
                        err_json = e.response.json()
                        message = (err_json.get("error") or {}).get("message") or ""
                        if "Bad language pair" in str(message) or "Target language" in str(message):
                            raise UnsupportedTargetLanguageError(target_language) from e
                    except UnsupportedTargetLanguageError:
                        raise
                    except Exception:
                        # JSON 解析できない場合は通常エラーとして扱う
                        pass
                # 軽いリトライ（429/5xx）
                if status_code in {429, 500, 502, 503, 504} and attempt < self.max_retries:
                    sleep_s = 0.3 * (2**attempt)
                    time.sleep(sleep_s)
                    continue
                detail = e.response.text
                logger.error(
                    "Cloud Translation API エラー: status=%s, target=%s, detail=%s",
                    status_code,
                    target_language,
                    detail,
                )
                raise
            except Exception as e:
                last_exc = e
                if attempt < self.max_retries:
                    sleep_s = 0.2 * (2**attempt)
                    time.sleep(sleep_s)
                    continue
                logger.error("Cloud Translation API 呼び出し失敗: target=%s, error=%s", target_language, e, exc_info=True)
                raise

        # 通常到達しないが、型的に残しておく
        raise RuntimeError(f"Cloud Translation API failed: {last_exc}")

    def _translate_with_aliases(
        self,
        *,
        text: str,
        requested_language: str,
        source_language: str | None,
    ) -> tuple[str, str]:
        """
        requested_language に対して、エイリアスも含めて翻訳を試す。

        Returns:
            (used_language_code, translated_text)
        Raises:
            UnsupportedTargetLanguageError: すべての候補が未対応
        """
        candidates = [requested_language] + self._LANGUAGE_ALIASES.get(requested_language, [])
        last_unsupported: UnsupportedTargetLanguageError | None = None
        for cand in candidates:
            try:
                return cand, self._post_translate(text=text, target_language=cand, source_language=source_language)
            except UnsupportedTargetLanguageError as e:
                last_unsupported = e
                continue
        raise last_unsupported or UnsupportedTargetLanguageError(requested_language)

    def translate_greeting_bulk(
        self,
        *,
        text: str,
        languages: list[tuple[str, str]],
        source_language: str | None = None,
    ) -> dict[str, str]:
        """
        指定言語（約80言語）へ挨拶文を翻訳する（同期 + スレッド並列）。

        - `languages` は [(language_code, language_name)] のリスト
        - "ja" は原文を採用するため、翻訳対象から除外してよい（このメソッド側で必ず結果に入れる）
        """
        base = (text or "").strip()
        if not base:
            return {"ja": ""}

        requested_codes = [code for code, _ in languages]
        requested_set = set(requested_codes)

        targets = [code for code, _ in languages if code != "ja"]
        result: dict[str, str] = {"ja": base}

        # 未対応言語が混ざっても落とさないため、英語をフォールバックとして準備しておく
        fallback_en: str | None = None

        # ターゲットごとに1リクエストだが、OpenAIより十分速いので軽く並列化
        max_workers = min(self.max_workers, max(1, len(targets)))
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            future_map = {
                ex.submit(
                    self._translate_with_aliases,
                    text=base,
                    requested_language=code,
                    source_language=source_language,
                ): code
                for code in targets
            }
            for fut in as_completed(future_map):
                code = future_map[fut]
                try:
                    _used_code, translated = fut.result()
                    result[code] = (translated or "").strip()
                except UnsupportedTargetLanguageError:
                    # 例: ks など API 側で未対応な言語コード
                    if fallback_en is None:
                        try:
                            fallback_en = self._post_translate(
                                text=base,
                                target_language="en",
                                source_language=source_language,
                            ).strip()
                        except Exception:
                            fallback_en = ""
                    logger.warning("未対応言語コードのため英語へフォールバックします: language=%s", code)
                    result[code] = fallback_en or ""
                except Exception as e:
                    logger.error("翻訳失敗: language=%s, error=%s", code, e, exc_info=True)
                    raise

        missing = requested_set - set(result.keys())
        if missing:
            raise ValueError(f"Missing translations for: {sorted(missing)}")

        # 余分な言語が混入しても保存しない（確定した言語セットに絞る）
        return {code: result[code] for code in requested_codes}

