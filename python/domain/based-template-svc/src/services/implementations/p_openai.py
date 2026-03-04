# services/implementations/p_openai.py

import json
import logging
import time
from typing import Any, Generator

import numpy as np
import pandas as pd
from openai import OpenAI

from ...common.env_config import (
    OPENAI_EMBEDDING_MODEL,
    OPENAI_MODEL,
    TEMPERATURE,
    get_settings,
)

# ログの設定
logger = logging.getLogger(__name__)


class _SimpleObject:
    """属性アクセスしやすい薄いオブジェクトコンテナ"""

    def __init__(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, k, v)


class POpenAI:
    """
    OpenAI を用いてテキスト埋め込み、およびテキスト生成を行うシンプルなクラス。
    """

    def __init__(
        self,
        embedding_model_name: str = OPENAI_EMBEDDING_MODEL,
        chat_model_name: str = OPENAI_MODEL,
    ):
        env_vars = get_settings()

        # API KEYの設定
        api_key = env_vars.OPENAI_API_KEY
        if not api_key:
            logger.error("OpenAI API KEYが設定されていません")
            raise ValueError("OpenAI API KEYが設定されていません")

        # クライアント生成（新 Responses API を使用）
        self.client = OpenAI(api_key=api_key)

        self.embedding_model_name = embedding_model_name
        self.chat_model_name = chat_model_name

        # トークン使用量の管理
        self.input_token = 0
        self.output_token = 0

        logger.info(f"POpenAI初期化完了: embedding={embedding_model_name}, chat={chat_model_name}")

    def get_embedding(self, text: str, line_break: bool = True) -> np.ndarray:
        """
        テキストのエンベディングを取得する
        
        Args:
            text: エンベディング対象のテキスト
            line_break: 改行を空白に置換するかどうか
            
        Returns:
            エンベディングベクトル
        """
        if not text:
            logger.warning("get_embedding: 空のテキストが渡されました")
            return np.array([])

        if line_break:
            text = text.replace("\n", " ")

        logger.info(f"get_embedding開始: model={self.embedding_model_name}, text_length={len(text)}")

        try:
            start_time = time.time()
            response = self.client.embeddings.create(input=text, model=self.embedding_model_name)
            elapsed_time = time.time() - start_time
            
            logger.info(f"get_embedding成功: 所要時間={elapsed_time:.2f}秒")

            # トークン使用量を記録
            if hasattr(response, "usage") and hasattr(response.usage, "prompt_tokens"):
                self.input_token += response.usage.prompt_tokens
                logger.debug(f"get_embedding: トークン使用量={response.usage.prompt_tokens}")

            return np.array(response.data[0].embedding)

        except Exception as e:
            logger.error(f"get_embedding: エラー - {str(e)}")
            raise e

    def get_embedding_token(self, text: str, line_break: bool = True) -> tuple[np.ndarray, int]:
        """
        テキストのエンベディングとトークン数を取得する
        
        Args:
            text: エンベディング対象のテキスト
            line_break: 改行を空白に置換するかどうか
            
        Returns:
            (エンベディングベクトル, トークン数)のタプル
        """
        if not text:
            logger.warning("get_embedding_token: 空のテキストが渡されました")
            return np.array([]), 0

        if line_break:
            text = text.replace("\n", " ")

        logger.info(f"get_embedding_token開始: model={self.embedding_model_name}, text_length={len(text)}")

        try:
            start_time = time.time()
            response = self.client.embeddings.create(input=text, model=self.embedding_model_name)
            elapsed_time = time.time() - start_time
            
            logger.info(f"get_embedding_token成功: 所要時間={elapsed_time:.2f}秒")

            # トークン使用量を記録
            token_count = 0
            if hasattr(response, "usage") and hasattr(response.usage, "prompt_tokens"):
                token_count = response.usage.prompt_tokens
                self.input_token += token_count
                logger.debug(f"get_embedding_token: トークン使用量={token_count}")

            return np.array(response.data[0].embedding), token_count

        except Exception as e:
            logger.error(f"get_embedding_token: エラー - {str(e)}")
            raise e

    def cos_sim(self, v1: np.ndarray, v2: np.ndarray) -> float:
        """
        コサイン類似度を計算する
        
        Args:
            v1: ベクトル1
            v2: ベクトル2
            
        Returns:
            コサイン類似度
        """
        if len(v1) != len(v2):
            logger.warning("cos_sim: ベクトルの次元が異なります")
            return 0.0

        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)

        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0

        return float(np.dot(v1, v2) / (norm_v1 * norm_v2))

    def get_closest_embedding(self, embedding: np.ndarray, embedded_list: list[dict[str, Any]], key: str) -> str:
        """
        最も類似度の高いエンベディングを取得する
        
        Args:
            embedding: 比較対象のエンベディング
            embedded_list: エンベディングのリスト
            key: 取得するキー
            
        Returns:
            最も類似度の高いエンベディングの値
        """
        if not embedded_list:
            return ""

        emb_df = pd.DataFrame(embedded_list)
        emb_df["similarity"] = emb_df["embedding"].apply(lambda x: self.cos_sim(np.array(x), embedding))
        most_similar = emb_df.loc[emb_df["similarity"].idxmax()]
        return most_similar[key]

    def generate_response(
        self,
        messages: list[dict[str, str]],
        temperature: float = TEMPERATURE,
        stream: bool = False,
        json_schema: dict | None = None,
        model: str | None = "gpt-4o-mini",
        tools: list[dict[str, Any]] | None = None,
        tool_choice: Any | None = None,
        response_format: dict | str | None = None,
    ) -> Any:
        """
        OpenAI Responses API を呼び出す。

        - 構造化出力（Structured Outputs）: text.format で指定
          1) JSON Schema 厳格: response_format={"type":"json_schema", ...} または json_schema 引数
          2) 旧JSONモード: response_format="json_object" または {"type":"json_object"}

        Args:
            messages: チャットメッセージ
            temperature: 生成のランダム性
            stream: ストリーミング
            json_schema: {"name": str, "schema": {...}}（省略可）
            tools: ツール（省略可）
            tool_choice: ツール選択（省略可）
            model: 使用モデル（省略で既定）
            response_format: "json_object" もしくは {type: "json_schema"|"json_object", ...}

        Returns:
            OpenAI APIのレスポンス（簡易互換オブジェクト）
        """
        if model is None:
            model = self.chat_model_name

        logger.info(f"generate_response開始: model={model}, temperature={temperature}, stream={stream}")

        # Responses API: text.format を組み立て
        text_format: dict | None = None
        if isinstance(response_format, str) and response_format.lower() == "json_object":
            text_format = {"type": "json_object"}
        elif isinstance(response_format, dict):
            # 正規化: json_schema ネストをフラット化し、schema/name を直下に配置
            tf = dict(response_format)
            if tf.get("type") == "json_schema":
                js = tf.get("json_schema") or {}
                if "schema" not in tf:
                    tf["schema"] = js.get("schema", {})
                if "name" not in tf:
                    tf["name"] = js.get("name", "response")
                if "strict" not in tf:
                    tf["strict"] = True
                if "json_schema" in tf:
                    tf.pop("json_schema", None)
            text_format = tf
        elif response_format is None and json_schema is not None:
            _name = json_schema.get("name", "response")
            _schema = json_schema.get("schema", {})
            text_format = {
                "type": "json_schema",
                "name": _name,  # 一部API実装は format.name を必須とする
                "schema": _schema,
                "strict": True,
            }

        try:            
            # messages -> Responses API input へ変換
            def _to_responses_input(msgs: list[dict[str, Any]]) -> list[dict[str, Any]]:
                converted: list[dict[str, Any]] = []
                for m in msgs:
                    role = m.get("role")
                    content = m.get("content")
                    # assistant 過去発話は output_text、user/system は input_text
                    part_type_for_role = "output_text" if role == "assistant" else "input_text"
                    if isinstance(content, str):
                        converted.append({
                            "role": role,
                            "content": [{"type": part_type_for_role, "text": content}],
                        })
                    elif isinstance(content, list):
                        # 既に content パーツ形式の場合は型を補正
                        normalized_parts = []
                        for part in content:
                            if isinstance(part, dict) and part.get("type") == "text":
                                npart = dict(part)
                                npart["type"] = part_type_for_role
                                normalized_parts.append(npart)
                            else:
                                normalized_parts.append(part)
                        converted.append({
                            "role": role,
                            "content": normalized_parts,
                        })
                    else:
                        converted.append({
                            "role": role,
                            "content": [{"type": part_type_for_role, "text": str(content)}],
                        })
                return converted

            # 呼び出し側のメッセージをそのまま使用（使い勝手を優先し、追加注入はしない）
            responses_input = _to_responses_input(messages)

            tools_passthrough: list[dict[str, Any]] | None = tools if tools else None

            # tool_choice はそのまま通す
            effective_tool_choice: Any | None = tool_choice if tool_choice is not None else None

            if stream:
                # Responses APIのイベントを最小限に正規化して返す（呼び出し側の既存実装互換）
                def _normalize_stream() -> Generator[Any, None, None]:
                    try:
                        extra_kwargs = {}
                        if text_format is not None:
                            extra_kwargs["text"] = {"format": text_format}
                        gen = self.client.responses.create(
                            model=model,
                            input=responses_input,
                            temperature=temperature,
                            tools=tools_passthrough,
                            tool_choice=effective_tool_choice,
                            stream=True,
                            **extra_kwargs,
                        )
                        yielded = 0
                        for event in gen:
                            ev_type = getattr(event, "type", None)
                            text_delta = None
                            if isinstance(ev_type, str) and "delta" in ev_type:
                                text_delta = getattr(event, "delta", None)
                            if text_delta:
                                
                                yielded += 1
                                yield _SimpleObject(
                                    choices=[_SimpleObject(delta=_SimpleObject(content=text_delta))]
                                )
                    except Exception as e:
                        print(f"[POpenAI] stream:error {e}")
                        # 例外を再送出して呼び出し側でフォールバック処理（非ストリーム）へ
                        raise
                return _normalize_stream()
            else:
                # 非ストリーミング: Responses 
                extra_kwargs = {}
                if text_format is not None:
                    extra_kwargs["text"] = {"format": text_format}
                resp = self.client.responses.create(
                    model=model,
                    input=responses_input,
                    temperature=temperature,
                    tools=tools_passthrough,
                    tool_choice=effective_tool_choice,
                    **extra_kwargs,
                )

                # content 抽出
                content_text: str | None = getattr(resp, "output_text", None)
                if content_text is None:
                    try:
                        # 念のため dict 経由で参照
                        rd = resp.to_dict() if hasattr(resp, "to_dict") else {}
                        content_text = rd.get("output_text")
                    except Exception:
                        content_text = None

                # usage マッピング
                usage_src = getattr(resp, "usage", None)
                prompt_tokens = None
                completion_tokens = None
                if usage_src is not None:
                    # responses: input_tokens/output_tokens を旧フィールド名に合わせる
                    prompt_tokens = getattr(usage_src, "input_tokens", None) or getattr(usage_src, "prompt_tokens", None)
                    completion_tokens = getattr(usage_src, "output_tokens", None) or getattr(usage_src, "completion_tokens", None)

                choice_obj = _SimpleObject(message=_SimpleObject(content=content_text or ""))
                usage_obj = _SimpleObject()
                if prompt_tokens is not None:
                    setattr(usage_obj, "prompt_tokens", prompt_tokens)
                if completion_tokens is not None:
                    setattr(usage_obj, "completion_tokens", completion_tokens)

                wrapped = _SimpleObject(choices=[choice_obj], usage=usage_obj)

                # トークン使用量を記録
                if prompt_tokens is not None:
                    self.input_token += int(prompt_tokens)
                if completion_tokens is not None:
                    self.output_token += int(completion_tokens)

                return wrapped
            

        except Exception as e:
            logger.error(f"generate_response: エラー - {str(e)}")
            raise e

    def translate_greeting_bulk(
        self,
        *,
        text: str,
        languages: list[tuple[str, str]],
        model: str | None = "gpt-4o-mini",
    ) -> dict[str, str]:
        """
        1回の呼び出しで、指定言語（約80言語）へ挨拶文を翻訳する。

        - `languages` は [(language_code, language_name)] のリスト
        - "ja" は原文を採用するため、翻訳対象からは除外してよい（このメソッド側で必ず結果に入れる）
        """
        base = (text or "").strip()
        if not base:
            return {"ja": ""}

        requested_codes = [code for code, _ in languages]
        requested_set = set(requested_codes)

        # 翻訳対象（ja以外）
        targets = [(c, n) for c, n in languages if c != "ja"]
        target_lines = "\n".join([f"- {code}: {name}" for code, name in targets])

        schema = {
            "name": "greeting_translations",
            "schema": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "translations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "languageCode": {"type": "string"},
                                "text": {"type": "string"},
                            },
                            "required": ["languageCode", "text"],
                        },
                    }
                },
                "required": ["translations"],
            },
        }

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional translator. "
                    "Return ONLY valid JSON that strictly matches the provided JSON schema."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Translate the following Japanese greeting into each target language.\n"
                    "Rules:\n"
                    "- Keep meaning and polite tone.\n"
                    "- Natural, short, UI-friendly.\n"
                    "- Do not add quotes or explanations.\n"
                    "- Output translations only for the listed language codes.\n\n"
                    f"Japanese greeting:\n{base}\n\n"
                    f"Target languages:\n{target_lines}"
                ),
            },
        ]

        resp = self.generate_response(
            messages=messages,
            temperature=0,
            stream=False,
            json_schema=schema,
            model=model,
        )

        raw = resp.choices[0].message.content or "{}"
        parsed = json.loads(raw)
        items = parsed.get("translations") or []

        result: dict[str, str] = {"ja": base}
        for item in items:
            code = str(item.get("languageCode", "")).strip()
            translated = str(item.get("text", "")).strip()
            if not code or code == "ja":
                continue
            result[code] = translated

        # 必要言語の充足チェック（不足は不正な生成として扱う）
        missing = requested_set - set(result.keys())
        if missing:
            raise ValueError(f"Missing translations for: {sorted(missing)}")

        # 余分な言語が混入しても保存しない（確定した言語セットに絞る）
        return {code: result[code] for code in requested_codes}
