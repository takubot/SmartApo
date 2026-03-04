from abc import ABC

import pydantic
from pydantic import BaseModel


def to_camel(string: str) -> str:
    """スネークケースをキャメルケースに変換"""
    components = string.split("_")
    return components[0] + "".join(x.capitalize() for x in components[1:])


class BaseSchema(BaseModel, ABC):
    model_config = pydantic.ConfigDict(
        frozen=True,
        extra="forbid",
        from_attributes=True,
        populate_by_name=True,
        alias_generator=to_camel,
        revalidate_instances="always",
        # camelCaseエイリアスを確実に生成するための設定
        validate_by_name=True,
        # フィールド名とエイリアスの両方を受け入れる
        populate_by_alias=True,
    )
