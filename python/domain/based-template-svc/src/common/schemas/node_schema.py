from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import Field

from .base_schema import BaseSchema


# ================================================
# ノードタイプ定義
# ================================================
class FlowNodeType(str, Enum):
    """チャットフローのノード種別"""

    # 表示系ノード
    SHOW_CONTENTS = "SHOW_CONTENTS"  # コンテンツ表示（テキスト、ファイル、リンク、カード）

    # ユーザー入力待機ノード
    AWAIT_CHOICE = "AWAIT_CHOICE"  # 選択肢（ボタン）を提示し、ユーザーの選択を待つ
    AWAIT_FREETEXT = "AWAIT_FREETEXT"  # 自由テキストの入力を促し、ユーザーの回答を待つ

    # アクション系ノード
    ACTION_HANDOFF_BOT = "ACTION_HANDOFF_BOT"  # 特定のBotに応答を委譲


class FlowFileType(str, Enum):
    """チャットフローで扱うファイル種別"""

    FILE = "file"
    IMAGE = "image"
    SIMPLE_BOT = "simple_bot"


# ================================================
# 共通コンポーネントスキーマ
# ================================================
class LinkSchema(BaseSchema):
    """リンク情報"""

    id: str | None = Field(description="リンクID")
    text: str | None = Field(description="リンクの表示テキスト")
    url: str | None = Field(description="リンクのURL")
    description: str | None = Field(default=None, description="リンク説明")
    icon: str | None = Field(default=None, description="アイコン")
    target: str | None = Field(default="_blank", description="ターゲット")


class FileSchema(BaseSchema):
    """ファイル情報

    保存時は name と gcs_path だけでも受け入れるように緩和する。
    """

    id: str | None = Field(default=None, description="ファイルID")
    name: str | None = Field(default=None, description="ファイル名")
    url: str | None = Field(default=None, description="ファイルURL")
    gcs_path: str | None = Field(default=None, description="GCSパス")
    size: int | None = Field(default=None, description="ファイルサイズ")
    file_type: FlowFileType | None = Field(
        default=None,
        alias="fileType",
        description="ファイルタイプ(file | image | simple_bot)",
    )
    description: str | None = Field(default=None, description="ファイル説明")
    download_url: str | None = Field(default=None, description="ダウンロードURL")
    file: Any | None = Field(default=None, description="ファイルオブジェクト（フロントエンド用）")


class CardSchema(BaseSchema):
    """カード表示用コンテンツ"""

    id: str | None = Field(default=None, description="カードID")
    title: str | None = Field(default=None, description="カードのタイトル")
    description: str | None = Field(default=None, description="カードの説明")
    image_url: str | None = Field(default=None, description="画像URL")
    image_gcs_path: str | None = Field(default=None, description="画像GCSパス")
    image_alt: str | None = Field(default=None, description="画像代替テキスト")
    link_url: str | None = Field(default=None, description="カードのリンクURL")
    link_text: str | None = Field(default=None, description="リンクテキスト")
    image_file: Any | None = Field(default=None, description="画像ファイル（フロントエンド用）")
    style: dict[str, Any] | None = Field(default=None, description="スタイル情報")
    tags: list[str] | None = Field(default=None, description="タグリスト")


class InputSchema(BaseSchema):
    """自由入力フィールドの定義"""

    id: str = Field(description="フィールドの一意識別子")
    label: str = Field(description="フィールドのラベル")
    type: str = Field(description="フィールドタイプ（text, number, email, select, textarea）")
    required: bool = Field(default=True, description="必須項目かどうか")
    placeholder: str | None = Field(default=None, description="プレースホルダーテキスト")
    validation: str | None = Field(default=None, description="バリデーションルール")
    options: list[str] | None = Field(default=None, description="選択肢（selectタイプの場合）")
    default_value: str | None = Field(default=None, description="デフォルト値")
    min_length: int | None = Field(default=None, description="最小長")
    max_length: int | None = Field(default=None, description="最大長")


class ChoiceSchema(BaseSchema):
    """選択肢詳細"""

    id: str = Field(description="選択肢ID")
    text: str = Field(description="選択肢テキスト")
    value: str = Field(description="選択肢値")
    description: str | None = Field(default=None, description="選択肢説明")
    icon: str | None = Field(default=None, description="アイコン")
    color: str | None = Field(default=None, description="色")
    disabled: bool = Field(default=False, description="無効フラグ")
    is_selected: bool | None = Field(default=None, description="選択済みフラグ（履歴用）")


class SimpleBotFileSchema(BaseSchema):
    """簡易ボットファイル情報"""

    name: str = Field(description="ファイル名")
    file: Any | None = Field(default=None, description="ファイルオブジェクト（フロントエンド用）")
    gcs_path: str | None = Field(default=None, description="GCSパス")
    file_size: int | None = Field(default=None, description="ファイルサイズ")
    file_type: str | None = Field(default=None, description="ファイルタイプ")
    upload_status: str | None = Field(default=None, description="アップロードステータス")


class BotHandoffDataSchema(BaseSchema):
    """ボットハンドオフデータ"""

    bot_id: int = Field(description="ボットID")
    bot_name: str = Field(description="ボット名")
    bot_description: str | None = Field(default=None, description="ボット説明")
    mode: str = Field(description="ハンドオフモード")
    system_prompt: str | None = Field(default=None, description="システムプロンプト")


# ================================================
# ノードコンテンツスキーマ（ノードタイプ別）
# ================================================
class ShowContentsPayloadSchema(BaseSchema):
    """コンテンツ表示ノードのペイロード"""

    # 共通フィールド
    display_text: str | None = Field(default=None, description="表示するテキスト")
    url: str | None = Field(default=None, description="URL（リンク、ファイル、カードのリンク用）")
    gcs_path: str | None = Field(default=None, description="GCSパス（ファイル、カードの画像用）")
    file_name: str | None = Field(default=None, description="ファイル名")
    description: str | None = Field(default=None, description="説明文")

    # レイアウト設定
    content_type: str = Field(default="text", description="コンテンツタイプ")
    layout_type: str | None = Field(default="vertical", description="レイアウトタイプ")


class AwaitChoicePayloadSchema(BaseSchema):
    """選択肢待機ノードのペイロード"""

    text: str | None = Field(default=None, description="選択肢を提示するメッセージ")
    choices: list[str] = Field(description="選択肢のリスト")


class AwaitFreetextPayloadSchema(BaseSchema):
    """自由入力待機ノードのペイロード"""

    text: str | None = Field(default=None, description="自由入力を促すメッセージ")
    fields: list[InputSchema] | None = Field(default=None, description="入力フィールドの定義リスト")
    # 代表フィールド（単一入力用の補助プロパティ; field_id は廃止）
    field_name: str | None = Field(default=None, description="代表フィールド名（ラベル）")
    placeholder: str | None = Field(default=None, description="代表フィールドのプレースホルダー")
    validation: str | None = Field(default=None, description="代表フィールドのバリデーションルール")
    default_value: str | None = Field(default=None, description="代表フィールドのデフォルト値")
    min_length: int | None = Field(default=None, description="代表フィールドの最小長")
    max_length: int | None = Field(default=None, description="代表フィールドの最大長")


class ActionHandoffBotPayloadSchema(BaseSchema):
    """Botハンドオフノードのペイロード"""

    text: str | None = Field(default=None, description="ハンドオフ時のメッセージ")
    mode: str = Field(description="ハンドオフモード（EXISTING_BOT, SIMPLE_BOT）")
    selected_bots: list[str] | None = Field(default=None, description="選択されたボットIDリスト")
    simple_bot_file: SimpleBotFileSchema | None = Field(default=None, description="簡易ボットファイル情報")
    system_text: str | None = Field(default=None, description="システムプロンプト")
    bot_info: BotHandoffDataSchema | None = Field(default=None, description="ボット情報")


"""
ACTION_END_FLOW は廃止
"""


# ================================================
# 統合ノードコンテンツスキーマ
# ================================================
class FlowNodePayloadSchema(BaseSchema):
    """統合ノードペイロードスキーマ（ノードタイプに応じて適切なスキーマを使用）"""

    # 共通フィールド
    node_type: FlowNodeType = Field(description="ノードタイプ")

    # ノードタイプ別のペイロード
    show_contents: ShowContentsPayloadSchema | None = Field(default=None, description="コンテンツ表示設定")
    await_choice: AwaitChoicePayloadSchema | None = Field(default=None, description="選択肢待機設定")
    await_freetext: AwaitFreetextPayloadSchema | None = Field(default=None, description="自由入力待機設定")
    action_handoff_bot: ActionHandoffBotPayloadSchema | None = Field(default=None, description="Botハンドオフ設定")
