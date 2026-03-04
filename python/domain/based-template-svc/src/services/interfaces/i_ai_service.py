# services/interfaces/i_ai_service.py

from abc import ABC, abstractmethod
from typing import Any

import numpy as np


class IAiService(ABC):
    """
    ユーザーの質問を整形し、RAG (Retrieval-Augmented Generation) 等を含めた
    チャット応答を生成するための抽象インターフェース。

    テキスト埋め込みおよびチャット生成 (OpenAI 等を想定) を行うためのインターフェース。
    """

    @abstractmethod
    def get_embedding(self, text: str, line_break: bool = True) -> np.ndarray:
        """
        テキストをベクトル埋め込みに変換する。
        返り値は np.ndarray。
        """
        pass

    @abstractmethod
    def cos_sim(self, v1: np.ndarray, v2: np.ndarray) -> float:
        """
        2つのベクトル間のコサイン類似度を計算する。
        """
        pass

    @abstractmethod
    def get_closest_embedding(self, embedding: np.ndarray, embedded_list: list[dict[str, Any]], key: str) -> str:
        """
        指定した埋め込みベクトルに最も近い要素の `key`値を返す。
        embedded_list: [{"embedding": [...], key: ...}, ... ] の形式を想定。
        """
        pass

    @abstractmethod
    def get_embedding_token(self, text: str, line_break: bool = True) -> tuple[np.ndarray, int]:
        """
        テキストを埋め込みに変換し、その際のトークン数も取得する。
        戻り値: (ベクトル, トークン数)
        """
        pass

    @abstractmethod
    def generate_response(
        self, messages: list[dict[str, str]], temperature: float = 0.0, stream: bool = False
    ) -> Any:
        """
        LLM (OpenAIなど) のResponses API相当を呼び出す共通メソッド。
        stream=True の場合はジェネレータを返し、部分的に応答を取得できる。
        """
        pass

    # -------------------------------------------------------------------------
    # 以下は「チャット履歴を扱い、ユーザー質問を整形する」ための抽象メソッド
    # -------------------------------------------------------------------------
    @abstractmethod
    def set_chat_history(self, chat_history: list[dict[str, str]]) -> None:
        """
        直近のチャット履歴を設定する。
        chat_historyは [{"role": "user"/"assistant", "content": "…"}] の形式を想定。
        """
        pass

    @abstractmethod
    def format_user_question(self) -> tuple[str, int]:
        """
        ユーザーの質問文を再構築し、(整形結果, 使用トークン数) を返す。
        例: 「質問を1～2文に要約する」「敬体を常体に変換する」など。
        """
        pass

    # -------------------------------------------------------------------------
    # チャンクベースのRAG応答生成 (DocumentChunkModel向け)
    # -------------------------------------------------------------------------
