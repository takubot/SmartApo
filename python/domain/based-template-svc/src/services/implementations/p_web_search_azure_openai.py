from __future__ import annotations

import logging
from typing import Any

from openai import OpenAI

from ...common.env_config import get_settings

logger = logging.getLogger(__name__)


class PWebSearchAzureOpenAI:
    """
    Azure OpenAI Responses API 経由で web_search_preview を実行する薄いラッパー。

    - Microsoft Learn 推奨に従い、base_url は `{AZURE_OPENAI_ENDPOINT}/openai/v1/` を使用
    - 入力プロンプト（system/user）は呼び出し側が組み立てたものをそのまま渡す
    """

    def __init__(self) -> None:
        settings = get_settings()

        api_key = getattr(settings, "AZURE_OPENAI_API_KEY", "") or ""
        endpoint = getattr(settings, "AZURE_OPENAI_ENDPOINT", "") or ""
        deployment = getattr(settings, "AZURE_OPENAI_DEPLOYMENT", "") or ""

        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY が設定されていません")
        if not endpoint:
            raise ValueError("AZURE_OPENAI_ENDPOINT が設定されていません")
        if not deployment:
            raise ValueError("AZURE_OPENAI_DEPLOYMENT が設定されていません")

        self.deployment = deployment
        self.client = OpenAI(
            api_key=api_key,
            base_url=f"{endpoint}/openai/v1/",
        )

    def web_search_preview(
        self,
        *,
        inputs: list[dict[str, Any]] | str,
        user_location_country: str = "JP",
    ) -> tuple[str, list[dict[str, Any]]]:
        """
        web_search_preview ツールを利用して検索し、モデル出力テキストと citations を返す。
        """
        response = self.client.responses.create(
            model=self.deployment,
            tools=[
                {
                    "type": "web_search_preview",
                    "user_location": {"type": "approximate", "country": user_location_country},
                }
            ],
            input=inputs,
        )

        output_text = getattr(response, "output_text", "") or ""
        citations = self._extract_url_citations(response)
        return output_text, citations

    def _extract_url_citations(self, resp: Any) -> list[dict[str, Any]]:
        """
        サンプルコードのロジックに沿って url_citation annotations を抽出する。
        """
        citations: list[dict[str, Any]] = []

        output_list = getattr(resp, "output", []) or []
        for item in output_list:
            item_dict: dict[str, Any] = {}
            try:
                if hasattr(item, "model_dump"):
                    item_dict = item.model_dump()
                elif hasattr(item, "dict"):
                    item_dict = item.dict()
                elif isinstance(item, dict):
                    item_dict = item
            except Exception:
                continue

            if item_dict.get("type") == "message":
                for c in item_dict.get("content", []) or []:
                    if c.get("type") == "output_text":
                        for ann in c.get("annotations", []) or []:
                            if ann.get("type") == "url_citation":
                                citations.append(
                                    {
                                        "title": ann.get("title"),
                                        "url": ann.get("url"),
                                        "start_index": ann.get("start_index"),
                                        "end_index": ann.get("end_index"),
                                    }
                                )

        # URLで重複排除（サンプル同様）
        seen: set[str] = set()
        uniq: list[dict[str, Any]] = []
        for x in citations:
            u = x.get("url")
            if isinstance(u, str) and u and u not in seen:
                uniq.append(x)
                seen.add(u)
        return uniq

