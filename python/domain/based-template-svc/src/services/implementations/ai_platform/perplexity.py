import logging
from typing import Generator, Any

from openai import OpenAI
from openai import APIStatusError, RateLimitError

from ....common.env_config import get_settings
from . import BaseAIService

logger = logging.getLogger(__name__)


class PerplexityService(BaseAIService):
    """
    Perplexity API を使用したAIサービス実装
    
    PerplexityはOpenAI互換のChat Completions APIを提供しています。
    サポートモデル:
    - sonar: 軽量な検索モデル
    - sonar-pro: 高度な検索モデル
    - sonar-reasoning: 推論機能付き検索モデル
    - sonar-reasoning-pro: 高度な推論機能付き検索モデル
    
    注意: Perplexityはファイル添付をサポートしていません。
    """

    def __init__(self, model: str = "sonar"):
        """
        PerplexityServiceを初期化
        
        Args:
            model: 使用するモデル名（デフォルト: "sonar"）
                  - "sonar": 軽量な検索モデル
                  - "sonar-pro": 高度な検索モデル
                  - "sonar-reasoning": 推論機能付き検索モデル
                  - "sonar-reasoning-pro": 高度な推論機能付き検索モデル
        """
        self.model = model
        settings = get_settings()
        if not settings.PERPLEXITY_API_KEY:
            raise ValueError("Perplexity API Key is not set")
        self.client = OpenAI(
            api_key=settings.PERPLEXITY_API_KEY,
            base_url="https://api.perplexity.ai"
        )
        self._last_citations = []  # 最後に取得したcitations情報を保存

    def _normalize_role(self, role: Any) -> str:
        """
        ロールを正規化（user/assistant/systemのみ許可）
        
        Args:
            role: ロール文字列
            
        Returns:
            正規化されたロール（"user", "assistant", "system"のいずれか）
        """
        if role in ("user", "assistant", "system"):
            return role
        return "user"

    def _sanitize_history(self, history: list[dict[str, str]]) -> list[dict[str, str]]:
        """
        履歴をPerplexity API用に正規化
        
        Args:
            history: チャット履歴
            
        Returns:
            正規化された履歴
        """
        sanitized: list[dict[str, str]] = []
        for h in history:
            role = self._normalize_role(h.get("role", "user"))
            content = h.get("content", "")
            
            # contentが文字列でない場合は文字列に変換
            if not isinstance(content, str):
                content = str(content)
            
            # 空のcontentはスキップ
            if not content.strip():
                continue
                
            sanitized.append({"role": role, "content": content})
        
        return sanitized

    def get_last_citations(self) -> list[str]:
        """
        最後に取得したcitations情報を返す
        
        Returns:
            citations URLのリスト
        """
        return self._last_citations.copy() if self._last_citations else []

    def generate_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        system_prompt: str | None = None,
        files: list[tuple[str, str | None, bytes]] | None = None,
    ) -> Generator[str, None, None]:
        """
        Perplexity APIを使用してストリーミング応答を生成
        
        Args:
            message: ユーザーからのメッセージ
            history: チャット履歴 [{"role": "user"|"assistant", "content": "..."}]
            system_prompt: システムプロンプト（任意）
            files: 添付ファイル（Perplexityはサポートしていないため無視される）
            
        Yields:
            生成されたテキストのチャンク
            
        Raises:
            ValueError: APIキーが設定されていない場合
            RuntimeError: API呼び出しエラー
        """
        # ファイル添付はPerplexityでサポートされていない
        if files:
            logger.warning(
                f"Perplexity does not support file attachments. "
                f"Ignoring {len(files)} file(s)."
            )

        # メッセージの構築
        messages: list[dict[str, str]] = []
        
        # システムプロンプトの追加
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        # 履歴の追加（正規化）
        sanitized_history = self._sanitize_history(history)
        messages.extend(sanitized_history)
        
        # 現在のメッセージの追加
        messages.append({"role": "user", "content": message})

        try:
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                temperature=0.7,
            )
            
            citations = []
            last_chunk = None
            
            for chunk in stream:
                last_chunk = chunk  # 最後のチャンクを保存
                
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
                    
                    # PerplexityのAPIレスポンスからcitations情報を取得
                    choice = chunk.choices[0]
                    
                    # finish_reasonが"stop"の場合、最後のチャンクなのでcitationsを取得
                    if hasattr(choice, "finish_reason") and choice.finish_reason == "stop":
                        # chunk.citationsからcitationsを取得（ログで確認済み）
                        if hasattr(chunk, "citations") and chunk.citations:
                            citations = chunk.citations
                            self._last_citations = citations  # インスタンス変数に保存
                            print(f"[Perplexity][DEBUG] Found citations: {len(citations)} URLs")
                        elif hasattr(choice, "citations") and choice.citations:
                            citations = choice.citations
                            self._last_citations = citations
                            print(f"[Perplexity][DEBUG] Found citations in choice: {len(citations)} URLs")
            
            # citations情報を保存
            if citations:
                self._last_citations = citations
                print(f"[Perplexity][DEBUG] Final citations: {len(citations)} URLs")
            else:
                print("[Perplexity][DEBUG] No citations found in Perplexity API response")

        except RateLimitError as e:
            logger.error(
                "Perplexity API Rate Limit Error: status=%s message=%s",
                getattr(e, "status_code", None),
                str(e),
            )
            raise RuntimeError(
                "Perplexity APIのレート制限に達しました。"
                "しばらく時間をおいて再度お試しください。"
            ) from e

        except APIStatusError as e:
            logger.error(
                "Perplexity API Status Error: status=%s request_id=%s message=%s",
                getattr(e, "status_code", None),
                getattr(e, "request_id", None),
                str(e),
            )
            raise RuntimeError(
                f"Perplexity API エラー: {str(e)}"
            ) from e

        except Exception as e:
            logger.exception("Perplexity API Error: %s", e)
            raise RuntimeError(
                f"Perplexity API で予期しないエラーが発生しました: {str(e)}"
            ) from e

