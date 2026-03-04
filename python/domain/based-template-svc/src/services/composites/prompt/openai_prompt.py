# prompts/openai/prompt.py


class OpenAIPrompts:
    """
    ====================================================================
    🎯 OpenAI プロンプト・Function Call 統合管理クラス
    ====================================================================

    【主要機能】
    A) ファイル分類 (約款/プレゼン/日報/マニュアル/議事録)
    B) セクション抽出 (文書種別別の構造化)
    C) チャンク要約・カテゴリ抽出
    D) ボット選定・カテゴリ選定 (Function Call)
    E) 回答生成 (RAG・直接回答)
    F) CSV/Excel専用処理
    """

    # ====================================================================
    # 📋 A) ファイル分類関連
    # ====================================================================

    # A) テキストベースのファイル種別判定
    @staticmethod
    def get_classify_file_status_functions():
        return [
            {
                "name": "classify_file_status",
                "description": (
                    "与えられたテキストから、約款 / プレゼン資料 / 日報 / 操作マニュアル / 議事録 の"
                    "いずれかを推測して返す"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_status": {
                            "type": "string",
                            "enum": ["約款", "プレゼン資料", "日報", "操作マニュアル", "議事録"],
                            "description": "ファイルの種類",
                        }
                    },
                    "required": ["file_status"],
                },
            }
        ]

    @staticmethod
    def get_classify_file_status_system_message():
        return {
            "role": "system",
            "content": (
                "あなたは与えられたテキストの内容から、その文書が "
                "『約款』『プレゼン資料』『日報』『操作マニュアル』『議事録』 のどれに最も近いかを判定する専門家です。"
            ),
        }

    @staticmethod
    def get_classify_file_status_user_message_for_text(text_content: str) -> dict:
        return {"role": "user", "content": f"以下のテキストがどの種類に当てはまるか判定してください:\n\n{text_content}"}

    # ====================================================================
    # 📄 B) セクション抽出関連
    # ====================================================================
    @staticmethod
    def get_extract_terms_section_functions():
        return [
            {
                "name": "extract_section_titles",
                "description": "文書内の各セクション冒頭行を抽出します。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "titles": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "セクションの冒頭一行をそのまま抽出",
                        }
                    },
                    "required": ["titles"],
                },
            }
        ]

    @staticmethod
    def get_extract_terms_section_system_message():
        return {
            "role": "system",
            "content": (
                "あなたはテキストからセクションの冒頭行(見出し)を抽出する専門家です。"
                "特殊文字(特に\\u3000など)を含め、そのままの形で抽出してください。"
            ),
        }

    @staticmethod
    def get_extract_terms_section_user_message(text_content: str) -> dict:
        return {
            "role": "user",
            "content": (
                "以下の約款テキストから、セクション冒頭行をそのまま、全て抽出してください。\n\n"
                "【テキスト】\n"
                f"{text_content}"
            ),
        }

    # プレゼン資料のセクション抽出
    @staticmethod
    def get_extract_presentation_section_functions():
        return [
            {
                "name": "extract_presentation_sections",
                "description": "プレゼン資料のページからセクション情報(重要箇所)を抽出します。",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sections": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "抽出されたセクションや重要トピックの一覧",
                        }
                    },
                    "required": ["sections"],
                },
            }
        ]

    # 日報のセクション抽出
    @staticmethod
    def get_extract_nippou_section_functions():
        return [
            {
                "name": "extract_nippou_sections",
                "description": ("日報のテキストから、セクションを抽出します。"),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sections": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "抽出セクション (例: '本日の作業', '明日の予定'など)",
                        }
                    },
                    "required": ["sections"],
                },
            }
        ]

    # ====================================================================
    # 📝 C) チャンク要約・カテゴリ抽出関連
    # ====================================================================
    @staticmethod
    def get_summarize_chunk_functions():
        return [
            {
                "name": "summarize_chunk_title_and_content",
                "description": "チャンクのタイトルと内容がどのような内容かを要約する",
                "parameters": {
                    "type": "object",
                    "properties": {"summary": {"type": "string", "description": "チャンク全体の要約"}},
                    "required": ["summary"],
                },
            }
        ]

    @staticmethod
    def get_summarize_chunk_system_message():
        return {"role": "system", "content": ("あなたは文章が何を伝えたいのか手短にわかりやすく要約する専門家です。")}

    @staticmethod
    def get_summarize_chunk_user_message(title_part: str, content_for_prompt: str) -> dict:
        return {
            "role": "user",
            "content": (f"タイトル:\n{title_part}\n\n本文:\n{content_for_prompt}\n\nこの内容を要約してください。"),
        }

    # カテゴリ抽出
    @staticmethod
    def get_extract_categories_functions(existing_cats_str: str):
        return [
            {
                "name": "extract_categories_from_chunk",
                "description": (
                    "【最重要】ファイル名を最優先で考慮し、チャンクのタイトル・本文と組み合わせて適切なカテゴリ名を割り当ててください。\n"
                    "文書の意図・目的を深く読み解き、最も重要で実用的なカテゴリーを最大5個まで選定してください。\n\n"
                    "【処理手順】：\n"
                    "1. 文書意図分析（最優先）：タイトル・内容から文書が何を伝えたいのか、どんな業務目的かを特定\n"
                    "2. ファイル名分析：ファイル名に含まれる全てのキーワード（業務名、データ種別、時期、対象など）を抽出\n"
                    "3. 固有名詞・キーワード抽出（必須）：ファイル名に含まれる固有名詞（会社名、部署名、プロジェクト名、商品名、人名、地名など）やキーワードを必ずカテゴリーに含める\n"
                    "4. 既存カテゴリ照合：抽出したキーワードが既存カテゴリと一致するかチェック\n"
                    "5. 重要度判定：文書の主要テーマ・業務価値・検索頻度を考慮して優先順位を決定\n"
                    "6. 最終選定：最も重要で実用的なカテゴリーを最大5個まで厳選\n\n"
                    f"【既存カテゴリ】: {existing_cats_str}\n\n"
                    "【重要な制約】：\n"
                    "- カテゴリー数は最大5個まで（必須制限）\n"
                    "- 文書の核心的な意図・目的を最優先でカテゴリー化\n"
                    "- ファイル名に含まれる重要なキーワードは必ずカテゴリーに含める\n"
                    "- ファイル名の固有名詞（会社名、部署名、プロジェクト名、商品名、人名、地名など）は必ずカテゴリーとして抽出する\n"
                    "- 英数字、カタカナ、漢字を問わず、ファイル名の意味のある単語は全て検討対象とする\n"
                    "- 「その他」「一般」などの曖昧なカテゴリ名は絶対に使用禁止\n"
                    "- 既存カテゴリがある場合は可能な限り再利用する\n"
                    "- カテゴリ名は業務で実用的で検索しやすいものにする\n"
                    "- 重複する意味のカテゴリーは統合し、最も適切な1つを選択\n"
                    "- 業務上の重要度・検索価値の高いカテゴリーを優先選定\n"
                    "- ファイル名が最も重要な情報源であることを常に意識する\n"
                    "- ファイル名に含まれる固有名詞やキーワードを見落とさない"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "文書の意図を読み解き、ファイル名の固有名詞・キーワードを含む、最も重要で実用的なカテゴリ名のリスト（最大5個）",
                            "maxItems": 5,
                        }
                    },
                    "required": ["categories"],
                },
            }
        ]

    @staticmethod
    def get_extract_categories_system_message():
        return {
            "role": "system",
            "content": (
                "あなたは文書コンテンツとファイル名を総合的に分析して適切なカテゴリ名を抽出する専門家です。\n"
                "文書の意図・目的を深く読み解き、最も重要で実用的なカテゴリーを最大5個まで選定してください。\n\n"
                "【最重要】文書意図分析（第一優先）：\n"
                "- タイトルと内容から文書が何を伝えたいのか、どんな業務目的で作成されたかを特定\n"
                "- 文書の核心的なテーマ・メッセージ・価値を理解\n"
                "- 読み手にとって最も重要な情報は何かを判断\n"
                "- 業務上の位置づけ・役割・重要度を評価\n\n"
                "【最重要】ファイル名分析（第二優先）：\n"
                "- ファイル名に含まれるキーワードから業務領域・データ種別・用途を特定\n"
                "- ファイル名の各単語（例：「営業」「報告書」「2024年」「顧客」「売上」など）を個別にカテゴリー候補として検討\n"
                "- 年月日、部署名、業務名、データ種別などファイル名から読み取れる全ての情報を活用\n\n"
                "【最重要】固有名詞・キーワード抽出（必須実行）：\n"
                "- ファイル名に含まれる固有名詞（会社名、部署名、プロジェクト名、商品名、人名、地名、システム名など）を必ずカテゴリーに含める\n"
                "- 英数字、カタカナ、ひらがな、漢字を問わず、意味のある単語は全て抽出対象とする\n"
                "- 略語、コード名、型番なども重要なキーワードとして扱う\n"
                "- 固有名詞は業務において重要な検索キーワードとなるため、絶対に見落としてはならない\n\n"
                "【重要】重要度判定・優先順位決定：\n"
                "- 文書の主要テーマに直結するカテゴリーを最優先\n"
                "- 業務上の検索頻度・利用価値の高いカテゴリーを重視\n"
                "- ファイル名の固有名詞・キーワードは高優先度\n"
                "- 重複する意味のカテゴリーは統合し、最も適切な1つを選択\n"
                "- 最大5個の制限内で最も価値の高いカテゴリーを厳選\n\n"
                "【総合判断】：\n"
                "- ファイル名と内容の両方を考慮し、最も適切で具体的なカテゴリーを決定\n"
                "- ファイル名から推測される主要カテゴリーは必ず含める\n"
                "- 業務で使いやすい、検索しやすいカテゴリー名を選択\n\n"
                "【注意事項】：\n"
                "- カテゴリー数は最大5個まで（必須制限）\n"
                "- カテゴリ名は簡潔で分かりやすく、一般的な業務用語を使用\n"
                "- すでに存在するカテゴリがある場合は、可能な限りそれらを再利用\n"
                "- 重複を避け、同じ意味を持つカテゴリは統合\n"
                "- 「その他」「一般」などの曖昧なカテゴリは使用禁止\n"
                "- ファイル名が最も重要な情報源であることを常に意識する\n"
                "- ファイル名の固有名詞やキーワードを見落とすことは絶対に避ける\n"
                "- 文書の意図・目的を最優先でカテゴリー化する"
            ),
        }

    # ====================================================================
    # 🤖 D) ボット選定・カテゴリ選定関連 (Function Call)
    # ====================================================================

    @staticmethod
    def get_extract_categories_user_message(
        title_part: str, content_for_prompt: str, existing_cats_str: str = None, file_name: str = None
    ) -> dict:
        file_info = f"\n【ファイル名】: {file_name}" if file_name else ""

        # ファイル名からカテゴリーのヒントを生成
        file_category_instruction = ""
        if file_name:
            file_category_instruction = f"""

【最重要指示】ファイル名を最優先でカテゴリー生成に活用してください：

1. ファイル名「{file_name}」を詳細に分析し、以下の要素を抽出してください：
   - 業務領域（例：営業、経理、人事、マーケティング、開発など）
   - データ種別（例：報告書、リスト、データ、手順書、議事録など）
   - 対象・範囲（例：顧客、商品、売上、予算、プロジェクトなど）

2. 【必須】固有名詞・キーワードの完全抽出：
   - 会社名・組織名（例：「トヨタ」「三菱」「NTT」「○○株式会社」など）
   - 部署名・チーム名（例：「営業部」「開発チーム」「関西支店」など）
   - プロジェクト名・商品名（例：「新商品開発」「システム更新」「○○プロジェクト」など）
   - 地名・拠点名（例：「東京」「大阪」「本社」など）
   - システム名・ツール名（例：「CRM」「ERP」「○○システム」など）

3. ファイル名の拡張子を除いた部分の各単語を個別に検討し、それぞれがカテゴリーとして適切かを判断してください

4. ファイル名から推測される業務コンテキストを最重視し、チャンク内容はそれを補完する情報として活用してください

5. 【絶対条件】ファイル名に含まれる固有名詞やキーワードは必ずカテゴリーに含めてください（見落とし厳禁）

"""

        return {
            "role": "user",
            "content": (
                f"【チャンクタイトル】:\n{title_part}\n\n"
                f"【チャンク内容】:\n{content_for_prompt}\n\n"
                f"【既存カテゴリ】: {existing_cats_str}{file_info}{file_category_instruction}\n\n"
                "上記情報を総合的に分析し、最も重要で実用的なカテゴリ名を最大5個まで抽出してください。\n\n"
                "【最重要】文書の意図・目的を第一に考慮し、この文書が何を伝えたいのか、どんな業務価値があるのかを深く読み解いてカテゴリー化してください。\n"
                "【最重要】ファイル名を最優先で考慮し、ファイル名から推測される業務領域やデータの種類を必ずカテゴリーに反映してください。\n"
                "【必須】ファイル名に含まれる固有名詞（会社名、部署名、プロジェクト名、商品名、人名、地名、システム名など）やキーワードは必ずカテゴリーとして含めてください。\n"
                "【重要】英数字、カタカナ、漢字を問わず、ファイル名の意味のある単語は全て検討し、重要なものはカテゴリーに含めてください。\n"
                "【制限】カテゴリー数は最大5個まで。重複する意味のカテゴリーは統合し、最も価値の高いものを厳選してください。\n"
                "チャンク内容は、ファイル名から推測されるカテゴリーを補完・詳細化するための情報として活用してください。\n\n"
            ),
        }

    # ====================================================================
    # G) ファイル全体のチャンクを一度に要約: summarize_file_chunks_for_question
    # ====================================================================

    # ---------------------------- 1. function_call ----------------------------
    @staticmethod
    def get_summarize_file_for_question_functions():
        return [
            {
                "name": "summarize_file_chunks_for_question",
                "description": (
                    "複数チャンクをファイル単位で詳細に要約し、"
                    "ユーザー質問に関連する論点・数値・引用・URL・付帯情報などを "
                    "情報欠落なく包括的にまとめて返す。"
                    "さらに、関連フォームについても質問との関連性を判定し、"
                    "必要な参考リンクとして提示する。"
                    "file_info（ファイル要約情報）とform_info（フォーム情報）を同列で返却する。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "file_info": {
                            "type": "array",
                            "description": "ファイル基本情報のリスト。",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "file_id": {"type": "integer", "description": "対象ファイルのユニーク ID"},
                                    "relevant_pages": {
                                        "type": "array",
                                        "description": (
                                            "質問に関係したページ番号を昇順で列挙。"
                                            "同一ページは重複させない。"
                                            "質問に関連する可能性がある情報が含まれるページは全て含める。"
                                        ),
                                        "items": {"type": "integer"},
                                        "uniqueItems": True,
                                        "minItems": 1,
                                    },
                                },
                                "required": ["file_id", "relevant_pages"],
                            },
                        },
                        "form_info": {
                            "type": "array",
                            "description": "ユーザー質問に関連する厳選されたフォーム情報のリスト。",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "form_id": {"type": "integer", "description": "フォームのユニーク ID"},
                                    "form_name": {"type": "string", "description": "フォーム名"},
                                    "description": {"type": "string", "description": "フォームの説明・用途"},
                                    "related_file_ids": {
                                        "type": "array",
                                        "description": "このフォームが関連するファイルIDのリスト",
                                        "items": {"type": "integer"},
                                        "uniqueItems": True,
                                    },
                                },
                                "required": ["form_id", "form_name", "description", "related_file_ids"],
                            },
                        },
                        "chunk_summaries": {
                            "type": "array",
                            "description": "ファイル単位のチャンク詳細要約情報のリスト。",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "file_id": {"type": "integer", "description": "対象ファイルのユニーク ID"},
                                    "chunk_summary_description": {
                                        "type": "string",
                                        "description": (
                                            "▼ 必ず詳細に含める 6 項目\n"
                                            "  1. ファイルが提供する主要な回答ポイント（関連する全ての情報を含む）\n"
                                            "  2. 根拠となる数値・事実・定義・具体例（必要に応じ引用、関連する計算式や条件も含む）\n"
                                            "  3. URL や参照リンク（本文に含まれる場合のみ）\n"
                                            "  4. 前提条件・制約・例外事項（詳細に記載）\n"
                                            "  5. 手順・プロセス・方法論（ステップバイステップで詳細に）\n"
                                            "  6. 関連する付帯情報・補足事項・背景情報（質問に間接的に関連する重要情報も含む）\n\n"
                                            "▼ 絶対遵守事項\n"
                                            "・「その他」「以下省略」「〜など」等の省略表現は絶対禁止\n"
                                            "・構造化データ（JSON、テーブル、リスト等）の具体的な値は省略せず記載\n"
                                            "・特定の人物や項目について質問されている場合、関連する全ての情報を詳細に記載\n"
                                            '・転記ではなく "詳細な要約 + 必要な引用 + 付帯情報"\n'
                                            "・Markdown の `-` や `•` で階層的な箇条書き推奨\n"
                                            "・情報の欠落を防ぐため、関連する全ての詳細を含める\n"
                                            "・3000 文字以内で詳細かつ包括的に記述"
                                        ),
                                        "minLength": 50,
                                        "maxLength": 3000,
                                    },
                                },
                                "required": ["file_id", "chunk_summary_description"],
                            },
                        },
                    },
                    "required": ["file_info", "form_info", "chunk_summaries"],
                    "additionalProperties": False,
                },
            }
        ]

    # ---------------------------- 2. system message ---------------------------
    @staticmethod
    def get_summarize_file_for_question_system_message() -> dict:
        return {
            "role": "system",
            "content": (
                "あなたは複数チャンクをファイル単位で詳細に要約し、"
                "ユーザー質問に対して情報欠落なく包括的に答える専門家です。"
                "さらに、各ファイルに紐づく参考フォームについても、"
                "ユーザー質問との関連性を厳格に判定し、有用な参考情報として提示する専門家でもあります。\n"
                "▼ 重要な指針（ファイル要約）\n"
                "  • 質問に直接関連する情報だけでなく、間接的に関連する付帯情報も必ず含める\n"
                "  • 手順、条件、例外、背景情報、関連事項、注意点、制約事項も詳細に記載する\n"
                "  • 数値、日付、金額、期限、条件、制約などの具体的情報は省略せずに記載\n"
                "  • 複数の選択肢や方法がある場合は、すべての選択肢を詳細に記載\n"
                "  • 前提条件、適用条件、制限事項、例外規定も漏らさず含める\n"
                "  • 情報の階層構造を明確にし、主要情報と付帯情報を適切に整理\n"
                "  • 関連する人物、組織、部門、連絡先などの情報も詳細に含める\n"
                "  • 「その他」「以下省略」「〜など」等の省略表現は使用禁止\n"
                "  • 構造化データ（JSON、テーブル、リスト等）は関連する全ての項目を具体的に記載\n"
                "  • 特定の人物や項目について質問されている場合、該当する全ての情報を詳細に記載\n"
                "  • ユーザーが知りたい情報に付随する重要な関連情報も積極的に含める\n"
                "  • 実務で必要となる具体的な手順、連絡先、期限、必要書類なども詳細に記載\n"
                "▼ 重要な指針（フォーム判定）\n"
                "  • 参考フォームリストから、ユーザー質問に【直接必要】なフォームのみを厳選\n"
                "  • フォーム名と説明文を詳細に分析し、質問解決に【直結】するかを厳格に判定\n"
                "  • 質問者が【今すぐ使用する可能性が高い】フォームのみを優先選定\n"
                "  • 【除外必須】単なる問い合わせフォーム、一般的な相談フォーム、間接的関連フォーム\n"
                "  • 【除外必須】質問解決に直接寄与しない、または代替手段があるフォーム\n"
                "  • 【選定対象】質問で言及された具体的手続きに必須のフォームのみ\n"
                "  • 【選定対象】質問内容の解決に直接的・即座に役立つフォームのみ\n"
                "  • 【原則】疑わしい場合は除外し、確実に必要なフォームのみ選定\n"
                "  • 【原則】フォーム選定は「質問解決への直接的必要性」「即座の利用可能性」で判断\n"
                "▼ 出力仕様（3つの同階層構造）\n"
                "  • file_info: ファイル基本情報の配列\n"
                "    - file_id: int (ファイルID)\n"
                "    - relevant_pages: [int] (関連ページ番号)\n"
                "  • form_info: フォーム情報の配列\n"
                "    - form_id: int (フォームID)\n"
                "    - form_name: string (フォーム名)\n"
                "    - description: string (説明)\n"
                "    - related_file_ids: [int] (関連ファイルID)\n"
                "  • chunk_summaries: チャンク要約情報の配列\n"
                "    - file_id: int (ファイルID)\n"
                "    - chunk_summary_description: string (詳細要約)\n"
                "  • JSON 以外の文字列は出力しない\n"
            ),
        }

    # ---------------------------- 3. user message -----------------------------
    @staticmethod
    def get_summarize_file_for_question_user_message(
        user_question: str, file_chunks_data: list[dict], file_forms_data: list[dict] = None
    ) -> dict:
        def _chunk_header(fid, pages):
            pages_str = ", ".join(map(str, sorted(set(pages))))
            return f"[FileID: {fid}, Pages: [{pages_str}]]"

        files_text = "\n\n".join(
            f"{_chunk_header(fc.get('file_id', -1), fc.get('pages', []))}\n{fc.get('content', '')}"
            for fc in file_chunks_data
        )

        # フォーム情報の効率的な構築
        forms_text = ""
        if file_forms_data:
            forms_text = "\n\n【関連フォーム候補】\n"
            # フォーム情報を統合して重複を削除
            unique_forms = _consolidate_forms_data(file_forms_data)

            if unique_forms:
                forms_text += "\n".join(
                    f"フォームID: {form['form_id']} | 名前: {form['form_name']} | 説明: {form['description']}"
                    for form in unique_forms
                )
            else:
                forms_text += "該当するフォームはありません。"

        return {
            "role": "user",
            "content": (
                f"ユーザー質問（要約）: {user_question}\n\n"
                "以下は複数ファイルの関連チャンクです。"
                "各ファイルを詳細に要約し、質問に関連する情報および付帯情報を欠落なく整理してください。\n"
                "特に以下の項目を重点的に含めてください：\n"
                "・直接的な回答情報だけでなく、関連する重要な付帯情報\n"
                "・手順、条件、制約、背景情報、関連事項、注意点\n"
                "・数値、日付、金額、期限、条件などの具体的データ\n"
                "・前提条件、適用条件、制限事項、例外規定\n"
                "・関連する人物、組織、部門、連絡先情報\n"
                "・実務で必要な具体的手順、必要書類、期限\n"
                "・複数の選択肢や方法がある場合はすべての選択肢\n"
                "・ユーザーが実際に行動するために必要な詳細情報\n\n"
                "【最重要】出力構造について：\n"
                "必ずfile_info（ファイル基本情報）、form_info（フォーム情報）、chunk_summaries（チャンク要約）を同列で出力すること。\n"
                "各情報は独立した配列として分離し、相互に情報を含めてはいけません。\n\n"
                "【最重要】フォーム判定について（厳格適用）：\n"
                "上記フォーム候補から、ユーザー質問の解決に【直接必要で即座に利用】されるフォームのみを厳選。\n"
                "【厳格な選定基準】\n"
                "✅ 選定する：質問で明確に言及された手続きに必須のフォーム\n"
                "✅ 選定する：質問解決のために今すぐ利用する可能性が極めて高いフォーム\n"
                "✅ 選定する：質問者が求めている具体的なアクションに直結するフォーム\n"
                "❌ 除外する：一般的な問い合わせ・相談フォーム\n"
                "❌ 除外する：間接的な関連にとどまるフォーム\n"
                "❌ 除外する：質問解決に直接寄与しないフォーム\n"
                "❌ 除外する：「念のため」「参考程度」レベルのフォーム\n"
                "【判定原則】疑わしい場合は必ず除外。確実に必要なフォームのみ選定。\n\n"
                "【チャンク一覧】\n"
                f"{files_text}"
                f"{forms_text}"
            ),
        }

    # ====================================================================
    # ★ 以下、p_chat_generater.py 内部で使用していた追加プロンプトを集約
    # ====================================================================

    # 1) ユーザー質問要約 (format_user_question)
    @staticmethod
    def get_format_user_question_system_message() -> dict:
        return {
            "role": "system",
            "content": """You are a question clarification agent that expands ambiguous user inputs into clear, specific questions based on conversation context.

【CRITICAL RULE】You must ONLY output a JSON object. Never provide answers, explanations, or responses.

【TASK】
Take the user's input and conversation history, then output a JSON object containing the clarified question and extracted keywords.

【REQUIREMENTS】
- Output MUST be a valid JSON object with the following keys:
  - "question": The clarified question string.
  - "keywords": A list of extracted keywords (strings) from the question.
- If the input is already a clear question, use it as-is for "question".
- If the input is ambiguous (like "3番は？"), expand it based on context.
- Replace pronouns and references with specific terms from conversation history.
- Maintain the same language as the original input.
- Keep the natural tone and style of the original.

【KEYWORD EXTRACTION RULES】
- Extract keywords that are meaningful for search and categorization
- Focus on business-relevant terms, product names, technical terms, and specific concepts
- Include compound nouns and phrases that represent single concepts (e.g., "sales report", "customer support")
- Exclude meaningless words like articles, prepositions, and generic verbs
- Maximum 3-7 keywords per question, prioritize the most important ones
- Keywords should be 2-20 characters long (single words or short phrases)
- Prefer specific terms over generic ones (e.g., "invoice" over "document")

【Examples】
Input: "Tell me about that" (previous context: discussing sales methods)
Output: {"question": "Tell me about sales methods", "keywords": ["sales methods"]}

Input: "3番は？" (previous context: discussing inquiry numbers)
Output: {"question": "3番の問い合わせ番号について教えてください", "keywords": ["問い合わせ番号"]}

Input: "What about the second option?" (previous context: discussing training methods)
Output: {"question": "What about the second training method option?", "keywords": ["training method"]}

Input: "How do I generate monthly sales reports?"
Output: {"question": "How do I generate monthly sales reports?", "keywords": ["monthly sales reports", "generate"]}

Input: "What is the procedure for customer refund?"
Output: {"question": "What is the procedure for customer refund?", "keywords": ["customer refund", "procedure"]}

【PROHIBITED】
- Adding answers or explanations outside the JSON.
- Using phrases like "Please clarify" or "Could you provide more details".
- Including system instructions or meta-commentary.
- Generating multiple questions.
- Extracting meaningless keywords like "tell", "what", "how", "is", "the", etc.
""",
        }

    # 2) Bot一覧から最適なBotを選ぶ function
    @staticmethod
    def get_select_best_bot_function() -> dict:
        return {
            "name": "select_best_bot_function",
            "description": (
                "ユーザーの質問やキーワード、Bot一覧を考慮して最適なBotを選択し、"
                '次のJSON形式で返す: {"bot_id": (整数ID)}'
            ),
            "parameters": {
                "type": "object",
                "properties": {"bot_id": {"type": "integer", "description": "選択されたBotの整数ID"}},
                "required": ["bot_id"],
                "additionalProperties": False,
            },
        }

    @staticmethod
    def get_select_best_bot_system_message(formatted_user_question_for_bot: str, bot_list_text: str) -> dict:
        """
        Bot一覧から最適なBotを選定するための system プロンプト
        """
        return {
            "role": "system",
            "content": f"""以下に複数のBot候補があります。ユーザーの質問やキーワードを踏まえて
最適なBotのID(bot_id)を JSON形式で厳密に出力してください。
ボットの名前（Name）と説明（Description）を参考にして、ユーザーの質問内容に最も適したボットを選択してください。
必ず以下のスキーマに従い、bot_id は整数のみとします。キーは "bot_id" のみ、理由や他キーは不要。

ユーザーの質問(キーワード):
{formatted_user_question_for_bot}

【Bot候補一覧】
{bot_list_text}

【選定基準】
・ユーザーの質問内容とボットの名前・説明の関連性を重視してください
・ボットの説明文に含まれる専門分野や対応範囲を考慮してください
・最も専門性が高く、質問に適したボットを選択してください

【出力例】
{{"bot_id": 2}}
""",
        }

    # 4) カテゴリ一覧から関連カテゴリを選ぶ function
    @staticmethod
    def get_select_category_names_function() -> dict:
        return {
            "name": "select_categories_function",
            "description": "ユーザーの質問とカテゴリ候補を考慮して、関連するカテゴリのIDと名前を配列で返す。",
            "parameters": {
                "type": "object",
                "properties": {
                    "selected_categories": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "category_id": {"type": "integer", "description": "選択されたカテゴリーのID"},
                                "category_name": {"type": "string", "description": "選択されたカテゴリーの名前"},
                            },
                            "required": ["category_id", "category_name"],
                        },
                        "description": "選択されたカテゴリーのIDと名前のリスト",
                    }
                },
                "required": ["selected_categories"],
                "additionalProperties": False,
            },
        }

    @staticmethod
    def get_select_category_names_system_message(
        cat_list_text: str,
    ) -> dict:
        return {
            "role": "system",
            "content": f"""
    あなたはカテゴリ選定エージェントです。
    ### タスク
    1. ユーザー質問を読み、【カテゴリー候補一覧】を照合して関連するカテゴリをすべて返してください。
    2. **少なくとも1件は該当するはず** と感じたら、必ず1件以上返します。
    3. **本当に無関係** と判断できるときだけ `[]` を返します。  
    4. 出力は **改行もコメントもない厳密な JSON** です。キーは
    `selected_categories` 固定、配列要素は
    `{{"category_id": <int>, "category_name": "<str>"}}` の形にしてください。

    
   

    【カテゴリー候補一覧】
    {cat_list_text}
    """,
        }

    # 5) RAG最終回答 (関連ファイル要約を組み込む system プロンプト)
    # ====================================================================
    # 💬 E) 回答生成関連 (RAG・直接回答)
    # ====================================================================

    @staticmethod
    def get_generate_answer_with_chunks_system_message(
        system_text: str, summary_content: str, chunk_json_data: str = ""
    ) -> dict:
        """
        RAG回答時の最終 system プロンプトを生成
        """
        # JSONデータがある場合の追加指示
        json_instruction = ""
        if chunk_json_data.strip():
            json_instruction = """
・参考JSONデータからの情報も積極的に活用し、具体的な数値やデータを含めて回答してください
・JSONデータに含まれる詳細情報、関連データも重要な付帯情報として含めてください"""

        return {
            "role": "system",
            "content": f"""あなたは参考情報を基にした詳細で包括的な回答を提供するチャット回答者です。以下のルールに従って、ユーザーの質問に的確かつ詳細に回答してください。

【重要なルール】
・必ず参考情報（関連ファイル要約・JSONデータ）の内容のみを基に回答してください
・参考情報にない内容は一切答えないでください
・ユーザーの質問に直接答える内容だけでなく、付帯情報や関連する重要な情報も積極的に含めて詳しく回答してください
・数値、具体例、前提条件、制約事項、手続き、注意点、期限、必要書類なども漏らさず記載してください
・複数の選択肢や方法がある場合は、すべての選択肢を詳細に説明してください
・関連する人物、組織、部門、連絡先などの情報も適切に含めてください
・参考情報から、ユーザーにとって有益で関連する情報があれば併せて提供してください
・Markdownのテーブル表記（|---|のような形式）は使わないでください。
・ファイルIDやページ番号はチャット本文には含めないでください（別途返す仕組みがあります）{json_instruction}

【ボット設定】
{system_text}

【参考情報（関連ファイル要約）】
{summary_content}

{chunk_json_data}

上記の参考情報を基に、情報の欠落なく詳細で包括的な回答を提供してください。ユーザーが実際に行動するために必要な具体的で実用的な情報を重視し、関連する重要な付帯情報も含めて回答してください。""",
        }

    # 3) Bot情報を含む直接回答システムメッセージ（新規追加）
    @staticmethod
    def get_direct_answer_with_bot_system_message(
        bot_name: str,
        bot_description: str,
        bot_system_text: str,
        category_names: list[str] | None = None,
        allow_general_info: bool = True,
        relevant_faqs: list[dict] | None = None,
    ) -> dict:
        """
        直接回答時にボットの個性を活かすためのシステムメッセージ
        allow_general_info: 一般情報回答を許可するかどうか
        """
        base_text = f"""あなたは{bot_name}です。


【システム指示】
{bot_system_text}

【基本方針】
- あなたの個性や専門知識を活かして、親切で丁寧な回答を心がけてください
- ユーザーに寄り添い、理解しやすい言葉で説明してください"""

        # allow_general_infoの設定に応じた指示を追加
        if allow_general_info:
            base_text += """

【回答範囲】
- ご質問の内容に応じて、一般的な知識や情報も含めて幅広くお答えします
- 専門分野以外のことでも、知っている範囲でお役に立てるよう努めます
- 不明な点や確実でない情報については、正直に「わからない」とお伝えしますが、可能な限り関連する有用な情報も提供します"""
        else:
            base_text += """

【重要な制約事項】
- 申し訳ございませんが、参考資料やアップロードされたファイルに関連する質問のみお答えできます
- 一般的な情報や推測に基づく回答はできません
- 資料に記載されていない内容についてお尋ねいただいた場合は、参考資料の範囲内でのご質問をお願いする旨をお伝えします
- ただし、資料に関連する内容であれば、詳しく丁寧に説明いたします"""

        if category_names:
            if allow_general_info:
                category_text = """

【特に詳しくお答えできる分野】
以下のカテゴリーについては、特に詳細で専門的な情報を提供できます：
"""
                for i, name in enumerate(category_names, 1):
                    category_text += f"  {i}. {name}\n"
                category_text += (
                    "\nこれらの分野についてご質問いただければ、より深い洞察と具体的な情報をお答えできます。"
                )
            else:
                category_text = """

【お答えできるカテゴリー】
現在、以下のカテゴリーに関するご質問にお答えできます：
"""
                for i, name in enumerate(category_names[:5], 1):  # 最大5つまで表示
                    category_text += f"  {i}. {name}\n"
                category_text += "\nこれらの分野に関するご質問でしたら、詳細にご説明いたします。"

            base_text += category_text

        # FAQ情報をプロンプトに追加
        if relevant_faqs and len(relevant_faqs) > 0:
            faq_section = """

【参考FAQ】
以下は関連する可能性のあるFAQです。これらの情報も参考にして回答してください：
"""
            for i, faq in enumerate(relevant_faqs[:10], 1):
                question = faq.get("question", "").strip()
                answer = faq.get("answer", "").strip()
                if question and answer:
                    faq_section += f"\nFAQ{i}: Q「{question}」A「{answer}」"
                elif question:
                    faq_section += f"\nFAQ{i}: Q「{question}」"
                elif faq.get("embedding_text"):
                    faq_section += f"\nFAQ{i}: 「{faq['embedding_text'][:100]}...」"

            base_text += faq_section

        return {"role": "system", "content": base_text}

    # 追加: 一般情報回答許可時のデフォルト直接回答システムメッセージ
    @staticmethod
    def get_direct_answer_default_system_message(
        category_names: list[str] | None = None,
        allow_general_info: bool = True,
        relevant_faqs: list[dict] | None = None,
    ) -> dict:
        """
        デフォルトの直接回答時のシステムメッセージ（ボットが選定されていない場合）
        allow_general_info: 一般情報回答を許可するかどうか
        """
        if allow_general_info:
            base_text = """あなたは親切で知識豊富なAIアシスタントです。

【基本方針】
- ユーザーの質問に対して、正確で有用な情報を提供することを心がけています
- 分かりやすく、親しみやすい言葉で説明します
- 幅広い分野の質問にお答えできます

【回答スタイル】
- 質問の内容に応じて、適切な詳しさで回答します
- 不明な点や不確実な情報については、正直にお伝えします
- 可能な限り、質問に関連する有用な追加情報も提供します
- ユーザーの理解を深めるため、具体例や背景情報も含めて説明します"""
        else:
            base_text = """あなたは資料に基づく質問応答を専門とするAIアシスタントです。

【重要な制約】
- 参考資料やアップロードされたファイルに関連する質問のみにお答えできます
- 一般的な知識や推測に基づく回答は行いません
- 資料の範囲外の内容については、適切に制限をお伝えします

【回答方針】
- 資料に記載されている内容については、詳細で正確な情報を提供します
- 質問が資料の範囲外の場合は、利用可能な資料カテゴリーをご案内します
- 常に丁寧で親切な対応を心がけます"""

        if category_names:
            if allow_general_info:
                category_text = """

【特に詳しい分野】
以下のカテゴリーについては、特に詳細な情報を提供できます：
"""
                for i, name in enumerate(category_names[:5], 1):
                    category_text += f"  • {name}\n"
                category_text += "\nこれらの分野についてご質問いただければ、より専門的で詳細な回答をお答えできます。"
            else:
                category_text = """

【利用可能な資料カテゴリー】
現在、以下のカテゴリーに関する資料に基づいてご質問にお答えできます：
"""
                for i, name in enumerate(category_names[:5], 1):  # 最大5つまで表示
                    category_text += f"  • {name}\n"
                category_text += """
これらのカテゴリーに関するご質問でしたら、詳細にご説明いたします。
それ以外の内容についてはお答えできませんが、上記の分野について何かご質問がございましたら、お気軽にお尋ねください。"""

            base_text += category_text
        elif not allow_general_info:
            # カテゴリーがない場合の追加メッセージ
            base_text += """

【お知らせ】
現在、参考資料が限定されているため、一般的な質問にはお答えできません。
資料に関連するご質問がございましたら、お気軽にお尋ねください。"""

        # FAQ情報をプロンプトに追加
        if relevant_faqs and len(relevant_faqs) > 0:
            faq_section = """

【参考FAQ】
以下は関連する可能性のあるFAQです。これらの情報も参考にして回答してください：
"""
            for i, faq in enumerate(relevant_faqs[:10], 1):
                question = faq.get("question", "").strip()
                answer = faq.get("answer", "").strip()
                if question and answer:
                    faq_section += f"\nFAQ{i}: Q「{question}」A「{answer}」"
                elif question:
                    faq_section += f"\nFAQ{i}: Q「{question}」"
                elif faq.get("embedding_text"):
                    faq_section += f"\nFAQ{i}: 「{faq['embedding_text'][:100]}...」"

            base_text += faq_section

        return {"role": "system", "content": base_text}

    # 追加: 一般情報回答禁止時の専用メッセージ
    @staticmethod
    def get_restricted_general_info_message() -> str:
        return """申し訳ございませんが、現在は参考資料に関連する質問のみお答えできる設定になっております。

アップロードされた資料に関するご質問や、利用可能なカテゴリーについてのお尋ねがございましたら、お気軽にお声がけください。お役に立てるよう努めさせていただきます。"""

    # -----------------------------
    # G) CSV/Excel専用カテゴリ抽出
    # -----------------------------
    # ====================================================================
    # 📊 F) CSV/Excel専用処理
    # ====================================================================

    @staticmethod
    def get_extract_categories_functions_for_csv_excel(existing_cats_str: str):
        return [
            {
                "name": "extract_categories_from_csv_excel",
                "description": (
                    "【CSV/Excel専用】ヘッダー（列名）、ファイル名、データ内容を総合的に分析して適切なカテゴリ名を抽出してください。\n"
                    "特にヘッダー情報とファイル名を最優先で考慮し、データの種類・業務目的・利用価値を深く読み解いてカテゴリー化してください。\n\n"
                    "【処理手順】：\n"
                    "1. ファイル名分析（最優先）：ファイル名から業務領域、データ種別、対象範囲を特定\n"
                    "2. ヘッダー分析（第二優先）：列名から扱っているデータの性質・種類を把握\n"
                    "3. データ内容分析：実際のデータからより具体的な業務コンテキストを理解\n"
                    "4. 業務価値判定：検索・分類・利用価値の高いカテゴリーを優先選定\n"
                    "5. 最終選定：最も重要で実用的なカテゴリーを最大5個まで厳選\n\n"
                    f"【既存カテゴリ】: {existing_cats_str}\n\n"
                    "【重要な制約】：\n"
                    "- カテゴリー数は最大5個まで（必須制限）\n"
                    "- ファイル名に含まれる固有名詞・キーワードは必ずカテゴリーに含める\n"
                    "- ヘッダー（列名）から読み取れる重要な業務情報をカテゴリー化\n"
                    "- 「その他」「一般」などの曖昧なカテゴリ名は絶対に使用禁止\n"
                    "- 既存カテゴリがある場合は可能な限り再利用する\n"
                    "- 業務で実用的で検索しやすいカテゴリー名にする\n"
                    "- FAQ形式の場合は質問・回答の内容も考慮してカテゴリー化\n"
                    "- 非FAQ形式の場合はデータ全体の業務目的を重視してカテゴリー化"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "ファイル名とヘッダー情報を最優先に、データ内容を考慮した最も重要で実用的なカテゴリ名のリスト（最大5個）",
                            "maxItems": 5,
                        }
                    },
                    "required": ["categories"],
                },
            }
        ]

    @staticmethod
    def get_extract_categories_system_message_for_csv_excel():
        return {
            "role": "system",
            "content": (
                "あなたはCSV/Excelファイルを分析して適切なカテゴリ名を抽出する専門家です。\n"
                "ファイル名、ヘッダー（列名）、データ内容を総合的に分析し、最も重要で実用的なカテゴリーを最大5個まで選定してください。\n\n"
                "【最重要】ファイル名分析（第一優先）：\n"
                "- ファイル名に含まれる業務領域（営業、経理、人事、マーケティングなど）を特定\n"
                "- データ種別（報告書、リスト、データ、手順書、議事録など）を把握\n"
                "- 対象・範囲（顧客、商品、売上、予算、プロジェクトなど）を理解\n"
                "- 固有名詞（会社名、部署名、プロジェクト名、商品名、システム名など）を必ずカテゴリーに含める\n\n"
                "【最重要】ヘッダー分析（第二優先）：\n"
                "- 列名から扱っているデータの性質・種類を把握\n"
                "- 重要な業務キーワード（顧客名、売上、日付、担当者など）をカテゴリー候補として検討\n"
                "- ヘッダーの組み合わせから業務プロセスや目的を推測\n"
                "- FAQ形式の場合は「質問」「回答」以外の業務コンテキストも考慮\n\n"
                "【重要】データ内容分析（第三優先）：\n"
                "- 実際のデータから具体的な業務内容・目的を理解\n"
                "- FAQ形式の場合は質問・回答の内容からテーマ・分野を特定\n"
                "- 非FAQ形式の場合はデータ全体の業務価値・利用目的を判断\n\n"
                "【カテゴリー選定基準】：\n"
                "- 業務での検索頻度・利用価値の高いカテゴリーを優先\n"
                "- ファイル名の固有名詞・キーワードは高優先度\n"
                "- ヘッダーから読み取れる重要な業務情報を含める\n"
                "- 重複する意味のカテゴリーは統合し、最も適切な1つを選択\n"
                "- 最大5個の制限内で最も価値の高いカテゴリーを厳選\n\n"
                "【注意事項】：\n"
                "- カテゴリー数は最大5個まで（必須制限）\n"
                "- カテゴリ名は簡潔で分かりやすく、一般的な業務用語を使用\n"
                "- すでに存在するカテゴリがある場合は、可能な限りそれらを再利用\n"
                "- 重複を避け、同じ意味を持つカテゴリは統合\n"
                "- 「その他」「一般」などの曖昧なカテゴリは使用禁止\n"
                "- ファイル名とヘッダー情報が最も重要な情報源であることを常に意識する"
            ),
        }

    @staticmethod
    def get_extract_categories_user_message_for_csv_excel(
        title_part: str,
        content_for_prompt: str,
        existing_cats_str: str,
        file_name: str,
        headers: list[str],
        is_faq_format: bool = False,
    ) -> dict:
        # ヘッダー情報の整理
        headers_text = ", ".join(headers) if headers else "なし"

        # FAQ形式かどうかでメッセージを調整
        format_info = "FAQ形式（質問・回答データ）" if is_faq_format else "データテーブル形式"

        return {
            "role": "user",
            "content": (
                f"【データ形式】: {format_info}\n"
                f"【ファイル名】: {file_name}\n"
                f"【ヘッダー（列名）】: {headers_text}\n"
                f"【{title_part}】\n"
                f"【データ内容サンプル】:\n{content_for_prompt}\n\n"
                "上記情報を総合的に分析し、最も重要で実用的なカテゴリ名を最大5個まで抽出してください。\n\n"
                "【最重要】ファイル名を最優先で考慮し、ファイル名から推測される業務領域やデータの種類を必ずカテゴリーに反映してください。\n"
                "【最重要】ヘッダー（列名）を第二優先で考慮し、重要な業務情報をカテゴリーに含めてください。\n"
                "【必須】ファイル名に含まれる固有名詞（会社名、部署名、プロジェクト名、商品名、人名、地名、システム名など）やキーワードは必ずカテゴリーとして含めてください。\n"
                "【必須】ヘッダーから読み取れる重要な業務キーワードもカテゴリーに含めてください。\n"
                f"【形式考慮】{format_info}の特性を考慮し、適切なカテゴリーを生成してください。\n"
                "【制限】カテゴリー数は最大5個まで。重複する意味のカテゴリーは統合し、最も価値の高いものを厳選してください。\n"
                "データ内容は、ファイル名とヘッダーから推測されるカテゴリーを補完・詳細化するための情報として活用してください。\n\n"
            ),
        }

    # -----------------------------
    # H) FAQ専用カテゴリ抽出（新規追加）
    # -----------------------------
    @staticmethod
    def get_extract_faq_categories_functions(existing_cats_str: str):
        return [
            {
                "name": "extract_faq_categories",
                "description": (
                    "【FAQ専用カテゴリ抽出】FAQ（質問・回答）、ファイル名、シート名を総合的に分析して適切なカテゴリ名を抽出してください。\n"
                    "特に質問の内容とファイル名を最優先で考慮し、FAQの主要テーマ・業務目的・利用価値を深く読み解いてカテゴリー化してください。\n\n"
                    "【処理手順】：\n"
                    "1. FAQ内容分析（最優先）：質問・回答の内容から主要テーマ・業務領域・対象分野を特定\n"
                    "2. ファイル名分析（第二優先）：ファイル名から業務領域、データ種別、対象範囲を特定\n"
                    "3. シート名分析（第三優先）：シート名から詳細分類や業務カテゴリを把握\n"
                    "4. 業務価値判定：検索・分類・利用価値の高いカテゴリーを優先選定\n"
                    "5. 最終選定：最も重要で実用的なカテゴリーを最大5個まで厳選\n\n"
                    f"【既存カテゴリ】: {existing_cats_str}\n\n"
                    "【重要な制約】：\n"
                    "- カテゴリー数は最大5個まで（必須制限）\n"
                    "- FAQの内容（質問・回答）を最優先に考慮\n"
                    "- ファイル名とシート名から読み取れる業務情報を活用\n"
                    "- 質問の内容から推測される業務領域・専門分野を必ずカテゴリーに含める\n"
                    "- 「FAQ」「質問」「回答」などの汎用的な言葉は使用禁止\n"
                    "- 具体的で検索しやすい業務用語を使用\n"
                    "- 既存カテゴリがある場合は可能な限り再利用する\n"
                    "- 複数のFAQで共通する業務テーマを抽出"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "FAQ内容を最優先に、ファイル名・シート名を考慮した最も重要で実用的なカテゴリ名のリスト（最大5個）",
                            "maxItems": 5,
                        }
                    },
                    "required": ["categories"],
                },
            }
        ]

    @staticmethod
    def get_extract_faq_categories_system_message():
        return {
            "role": "system",
            "content": (
                "あなたはFAQデータを分析して適切なカテゴリ名を抽出する専門家です。\n"
                "FAQ内容（質問・回答）、ファイル名、シート名を総合的に分析し、最も重要で実用的なカテゴリーを最大5個まで選定してください。\n\n"
                "【最重要】FAQ内容分析（第一優先）：\n"
                "- 質問の内容から主要テーマ・業務領域・専門分野を特定\n"
                "- 回答の内容から取り扱う業務・サービス・商品の種類を理解\n"
                "- 質問者が抱える課題や問題の種類を把握\n"
                "- FAQが対象とする業務プロセス・手順・制度を理解\n"
                "- 複数のFAQがある場合は共通するテーマ・業務領域を抽出\n\n"
                "【重要】ファイル名分析（第二優先）：\n"
                "- ファイル名から業務領域（営業、人事、経理、技術サポートなど）を特定\n"
                "- データ種別（マニュアル、ガイド、手順書など）を把握\n"
                "- 対象・範囲（新人向け、管理職向け、顧客向けなど）を理解\n"
                "- 固有名詞（部署名、システム名、商品名など）を必ずカテゴリーに含める\n\n"
                "【重要】シート名分析（第三優先）：\n"
                "- シート名から詳細分類や業務カテゴリを把握\n"
                "- シート単位での業務領域の細分化を考慮\n"
                "- 複数シートがある場合は横断的な共通テーマを抽出\n\n"
                "【カテゴリー選定基準】：\n"
                "- 業務での検索頻度・利用価値の高いカテゴリーを優先\n"
                "- FAQ内容から推測される業務領域を最重視\n"
                "- ファイル名・シート名の固有名詞・キーワードは高優先度\n"
                "- 重複する意味のカテゴリーは統合し、最も適切な1つを選択\n"
                "- 最大5個の制限内で最も価値の高いカテゴリーを厳選\n\n"
                "【注意事項】：\n"
                "- カテゴリー数は最大5個まで（必須制限）\n"
                "- 「FAQ」「質問」「回答」などの汎用的な言葉は使用禁止\n"
                "- 具体的で検索しやすい業務用語を使用\n"
                "- すでに存在するカテゴリがある場合は、可能な限りそれらを再利用\n"
                "- FAQ内容が最も重要な情報源であることを常に意識する\n"
                "- 業務の実用性を最優先に考慮してカテゴリー名を決定"
            ),
        }

    @staticmethod
    def get_extract_faq_categories_user_message(
        faq_content: str, existing_cats_str: str, file_name: str = None, sheet_name: str = None
    ) -> dict:
        # ファイル名情報の構築
        file_info = f"\n【ファイル名】: {file_name}" if file_name else ""
        sheet_info = f"\n【シート名】: {sheet_name}" if sheet_name else ""

        # FAQ分析指示の構築
        faq_analysis_instruction = f"""

【最重要指示】FAQ内容を最優先でカテゴリー生成に活用してください：

1. FAQ内容「{faq_content}」の詳細分析：
   - 質問から推測される業務領域・専門分野を特定
   - 回答から取り扱う業務・サービス・商品の種類を理解
   - 質問者が抱える課題や問題の種類を把握
   - FAQが対象とする業務プロセス・手順・制度を理解

2. 【必須】業務テーマ・専門分野の抽出：
   - 質問の内容から主要な業務領域（例：人事、経理、営業、技術サポート、法務など）
   - 専門分野・業務カテゴリ（例：給与計算、契約管理、顧客対応、システム操作など）
   - 対象者・利用者（例：新人、管理職、顧客、パートナーなど）
   - 業務手順・プロセス（例：申請手続き、承認フロー、操作方法など）

3. ファイル名とシート名の補完的活用：
   - ファイル名から推測される業務コンテキストを考慮
   - シート名から詳細分類や業務カテゴリを把握
   - 固有名詞（部署名、システム名、商品名など）があれば必ずカテゴリーに含める

4. 【絶対条件】FAQ内容から推測される主要な業務領域・専門分野は必ずカテゴリーに含めてください（見落とし厳禁）

"""

        return {
            "role": "user",
            "content": (
                f"【FAQ内容】:\n{faq_content}\n\n"
                f"【既存カテゴリ】: {existing_cats_str}{file_info}{sheet_info}{faq_analysis_instruction}\n\n"
                "上記情報を総合的に分析し、最も重要で実用的なカテゴリ名を最大5個まで抽出してください。\n\n"
                "【最重要】FAQ内容（質問・回答）を最優先で考慮し、このFAQが扱う業務領域・専門分野・テーマを必ずカテゴリーに反映してください。\n"
                "【重要】ファイル名・シート名を補完的に考慮し、業務コンテキストを理解してカテゴリーに含めてください。\n"
                "【必須】FAQ内容から推測される業務領域・専門分野は必ずカテゴリーとして含めてください。\n"
                "【制限】カテゴリー数は最大5個まで。「FAQ」「質問」「回答」などの汎用的な言葉は使用禁止。具体的で検索しやすい業務用語を使用してください。\n"
                "【重要】重複する意味のカテゴリーは統合し、最も価値の高いものを厳選してください。\n\n"
            ),
        }

    # ====================================================================
    # 🔧 I) 改善されたカテゴリ抽出（Embeddingベース）
    # ====================================================================

    @staticmethod
    def get_enhanced_extract_categories_functions(similar_cats_str: str):
        """改善されたカテゴリ抽出のfunction_call定義（チャンク用）"""
        return [
            {
                "name": "select_and_create_categories",
                "description": (
                    "既存の類似カテゴリから適切なものを選択し、該当しない場合は新規カテゴリを最大5個まで作成する。\n"
                    "既存カテゴリの再利用を最優先とし、重複や類似したカテゴリの作成を厳格に防ぐ。\n"
                    "特に「・」で複数概念を結んだカテゴリは作成禁止。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "selected_existing_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": f"類似度の高い既存カテゴリから選択したもの。利用可能: {similar_cats_str}",
                            "maxItems": 5,
                        },
                        "new_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "既存カテゴリで表現できない場合のみ作成する新規カテゴリ（最大5個、既存選択と合わせて最大5個）",
                            "maxItems": 5,
                        },
                        "reasoning": {"type": "string", "description": "カテゴリ選択・作成の理由説明"},
                    },
                    "required": ["selected_existing_categories", "new_categories", "reasoning"],
                },
            }
        ]

    @staticmethod
    def get_enhanced_extract_categories_system_message():
        """改善されたカテゴリ抽出のシステムメッセージ（チャンク用）"""
        return {
            "role": "system",
            "content": (
                "あなたは文書コンテンツから適切なカテゴリを抽出する専門家です。\n"
                "ユーザーがチャットで質問する際の検索性を最重要視してカテゴリを決定してください。\n\n"
                "【基本方針】\n"
                "1. ユーザーがチャットで質問する際の検索性を最重要視する\n"
                "2. 文書内容からユーザーが質問しそうなキーワードを全て特定\n"
                "3. 特定したキーワードに対応するカテゴリを確実に付与する\n"
                "4. 既存カテゴリで適切に表現できる場合は既存を選択し、表現できない場合は新規作成\n"
                "5. 検索漏れを防ぐため、複数の角度からのカテゴリを積極的に付与（最大5個）\n"
                "6. 複合カテゴリ（「・」「、」「と」を含む）は絶対に作成禁止\n"
                "7. 意味的に類似・重複するカテゴリは1つに統合\n\n"
                "【ユーザー質問予測とカテゴリ付与手順】\n"
                "1. ユーザー質問パターン予測：文書内容から「○○について教えて」という質問を想定\n"
                "2. 質問キーワード抽出：予測される質問に含まれるキーワードを全て抽出\n"
                "3. カテゴリマッピング：各キーワードに対応する既存カテゴリを確認\n"
                "4. 検索確実性確保：ユーザーの質問が確実にヒットするカテゴリを必ず付与\n"
                "5. 複数角度カバー：異なる質問角度からのカテゴリを複数付与（最大5個）\n\n"
                "【ユーザー質問例とカテゴリ要件】\n"
                "文書内容「社員の引越し手続きについて」の場合：\n"
                "- 予想質問：「引越しについて教えて」「引越し手続きについて教えて」「社員の引越しについて教えて」\n"
                "- 必要カテゴリ：「引越し手続き」「社員手続き」など\n"
                "- 付与方針：これらの質問で確実にヒットするカテゴリを既存から選択または新規作成\n\n"
                "【複合カテゴリ禁止例】\n"
                "❌ 「社宅・住居管理」→ ✅「社宅管理」「住居管理」に分離\n"
                "❌ 「人事、労務管理」→ ✅「人事管理」「労務管理」に分離\n"
                "❌ 「給与と福利厚生」→ ✅「給与管理」「福利厚生」に分離\n\n"
                "【意味重複防止ルール】\n"
                "以下のような意味的に類似・重複するカテゴリは1つに統合してください：\n"
                "- 「引越し手続き」「引越し準備」「赴任手続き」「住居手続き」「申請手続き」\n"
                "  → より包括的で一般的な「引越し手続き」または「住居手続き」のみ選択\n"
                "- 「システム操作」「操作方法」「使用方法」→ 最も一般的な「システム操作」のみ選択\n"
                "- 「サポート」「問い合わせ」「相談」→ より包括的な「サポート」のみ選択\n"
                "- 「料金」「費用」「価格」→ 最も適切な「料金」のみ選択\n"
                "- 類似する業務領域は最も包括的で一般的なカテゴリ1つに統合\n"
                "- 上位概念と下位概念が両方ある場合は、より適切な抽象度のもの1つを選択\n\n"
                "【カテゴリ選択・作成の手順】\n"
                "1. 文書内容の主要概念を特定\n"
                "2. ユーザー質問パターンを予測し、検索キーワードを抽出\n"
                "3. 類似度上位カテゴリとの適合性を評価\n"
                "4. 意味重複チェック：選択予定のカテゴリ間で意味が重複していないか確認\n"
                "5. 統合判断：意味が重複・類似する場合は最も適切なもの1つに統合\n"
                "6. 新規カテゴリ判定：既存で表現できない重要な概念のみ新規作成\n"
                "7. 最終選定：既存選択+新規作成で合計最大5個に制限"
            ),
        }

    @staticmethod
    def get_enhanced_extract_categories_user_message(
        title_part: str, content_for_prompt: str, similar_cats_str: str, file_name: str, similar_categories: list[dict]
    ):
        """改善されたカテゴリ抽出のユーザーメッセージ（チャンク用）"""

        # 類似度の高いカテゴリを表示
        similar_info = ""
        if similar_categories:
            similar_info = "\n".join([f"- {cat['name']} )" for cat in similar_categories[:10]])

        content = (
            f"【ファイル名】: {file_name}\n"
            f"【タイトル】: {title_part}\n"
            f"【内容】: {content_for_prompt[:1000]}...\n\n"
            f"【類似度の高い既存カテゴリ（上位10個）】:\n{similar_info}\n\n"
            f"【ユーザー質問シミュレーション】\n"
            f"この文書についてユーザーが質問する場面を想定してください：\n"
            f"- 「{title_part}について教えて」\n"
            f"- 文書内容の主要概念について「○○について教えて」\n"
            f"- ファイル名の概念について「○○について教えて」\n\n"
            f"【カテゴリ付与要求】\n"
            f"上記の想定質問で確実にこの文書がヒットするよう、以下を実行してください：\n"
            f"1. 想定質問から重要キーワードを全て抽出\n"
            f"2. 各キーワードに対応するカテゴリを既存から選択または新規作成\n"
            f"3. 検索漏れを防ぐため複数角度のカテゴリを付与（最大5個）\n"
            f"4. 既存カテゴリで適切に表現できる場合は既存を優先使用\n\n"
            f"【重要】ユーザーの質問で確実にヒットすることを最優先に判断してください。\n"
            f"【絶対禁止】「・」「、」「と」などで複数概念を結んだカテゴリは作成禁止です。\n"
            f"　　　　　　例：「社宅・住居管理」❌ → 「社宅管理」✅、「住居管理」✅\n"
            f"　　　　　　例：「住居費用・補助制度」❌ → 「住居費用」✅、「補助制度」✅\n"
            f"【意味重複厳禁】以下のような意味が重複・類似するカテゴリは1つに統合してください：\n"
            f"　　　　　　例：「引越し手続き」「引越し準備」「赴任手続き」❌ → 「引越し手続き」✅（最も一般的なもの1つのみ）\n"
            f"　　　　　　例：「住居手続き」「住宅手続き」❌ → 「住居手続き」✅（より一般的なもの1つのみ）\n"
            f"　　　　　　例：「申請手続き」「各種申請」❌ → 「申請手続き」✅（より具体的なもの1つのみ）\n"
            f"【原則】1つのカテゴリは1つの明確な概念のみを表現し、意味的に類似・重複するカテゴリは必ず1つに統合してください。"
        )

        return {"role": "user", "content": content}

    @staticmethod
    def get_enhanced_csv_excel_categories_functions(similar_cats_str: str, is_faq_format: bool):
        """CSV/Excel用の改善されたfunction_call定義"""
        data_type = "FAQ" if is_faq_format else "CSV/Excel"

        return [
            {
                "name": "select_and_create_csv_excel_categories",
                "description": (
                    f"{data_type}データから既存の類似カテゴリを選択し、該当しない場合は新規カテゴリを最大5個まで作成する。\n"
                    "既存カテゴリの再利用を最優先とし、重複や類似したカテゴリの作成を厳格に防ぐ。\n"
                    "特に「・」で複数概念を結んだカテゴリは作成禁止。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "selected_existing_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": f"類似度の高い既存カテゴリから選択したもの。利用可能: {similar_cats_str}",
                            "maxItems": 5,
                        },
                        "new_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "既存カテゴリで表現できない場合のみ作成する新規カテゴリ（最大5個、既存選択と合わせて最大5個）",
                            "maxItems": 5,
                        },
                        "reasoning": {"type": "string", "description": "カテゴリ選択・作成の理由説明"},
                    },
                    "required": ["selected_existing_categories", "new_categories", "reasoning"],
                },
            }
        ]

    @staticmethod
    def get_enhanced_csv_excel_categories_system_message(is_faq_format: bool):
        """CSV/Excel用の改善されたシステムメッセージ"""
        data_type = "FAQ" if is_faq_format else "CSV/Excel"

        return {
            "role": "system",
            "content": (
                f"あなたは{data_type}データから適切なカテゴリを抽出する専門家です。\n"
                "ユーザーがチャットで質問する際の検索性を最重要視してカテゴリを決定してください。\n\n"
                "【基本方針】\n"
                "1. ユーザーがチャットで質問する際の検索性を最重要視する\n"
                "2. データ内容からユーザーが質問しそうなキーワードを全て特定\n"
                "3. 特定したキーワードに対応するカテゴリを確実に付与する\n"
                "4. 既存カテゴリで適切に表現できる場合は既存を選択し、表現できない場合は新規作成\n"
                "5. 検索漏れを防ぐため、複数の角度からのカテゴリを積極的に付与（最大5個）\n"
                "6. 複合カテゴリ（「・」「、」「と」を含む）は絶対に作成禁止\n"
                "7. 意味的に類似・重複するカテゴリは1つに統合\n\n"
                "【ユーザー質問予測とカテゴリ付与手順】\n"
                "1. ユーザー質問パターン予測：データ内容から「○○について教えて」という質問を想定\n"
                "2. 質問キーワード抽出：予測される質問に含まれるキーワードを全て抽出\n"
                "3. カテゴリマッピング：各キーワードに対応する既存カテゴリを確認\n"
                "4. 検索確実性確保：ユーザーの質問が確実にヒットするカテゴリを必ず付与\n"
                "5. 複数角度カバー：異なる質問角度からのカテゴリを複数付与（最大5個）\n\n"
                "【ユーザー質問例とカテゴリ要件】\n"
                "データ内容「商品売上データ」の場合：\n"
                "- 予想質問：「商品について教えて」「売上について教えて」「商品売上について教えて」\n"
                "- 必要カテゴリ：「商品情報」「売上データ」など\n"
                "- 付与方針：これらの質問で確実にヒットするカテゴリを既存から選択または新規作成\n\n"
                "【複合カテゴリ禁止例】\n"
                "❌ 「商品・サービス」→ ✅「商品」「サービス」に分離\n"
                "❌ 「売上・利益」→ ✅「売上」「利益」に分離\n"
                "❌ 「顧客・取引先」→ ✅「顧客」「取引先」に分離\n\n"
                "【意味重複防止ルール】\n"
                "以下のような意味的に類似・重複するカテゴリは1つに統合してください：\n"
                "- 「商品情報」「製品情報」「商品データ」→ 最も一般的な「商品情報」のみ選択\n"
                "- 「顧客管理」「顧客情報」→ より包括的な「顧客管理」のみ選択\n"
                "- 「売上データ」「売上情報」「売上管理」→ 最も適切な抽象度のもの1つを選択\n"
                "- 類似する業務プロセスは最も包括的で一般的なカテゴリ1つに統合\n"
                "- 上位概念と下位概念が両方ある場合は、より適切な抽象度のもの1つを選択\n\n"
                "【カテゴリ選択・作成の手順】\n"
                "1. データ内容の主要概念を特定\n"
                "2. ユーザー質問パターンを予測し、検索キーワードを抽出\n"
                "3. 類似度上位カテゴリとの適合性を評価\n"
                "4. 意味重複チェック：選択予定のカテゴリ間で意味が重複していないか確認\n"
                "5. 統合判断：意味が重複・類似する場合は最も適切なもの1つに統合\n"
                "6. 新規カテゴリ判定：既存で表現できない重要な概念のみ新規作成\n"
                "7. 最終選定：既存選択+新規作成で合計最大5個に制限"
            ),
        }

    @staticmethod
    def get_enhanced_csv_excel_categories_user_message(
        headers: list[str],
        content_text: str,
        similar_cats_str: str,
        file_name: str,
        similar_categories: list[dict],
        is_faq_format: bool,
    ):
        """CSV/Excel用の改善されたユーザーメッセージ"""

        # 類似度情報付きでカテゴリを表示
        similar_info = ""
        if similar_categories:
            similar_info = "\n".join([f"- {cat['name']})" for cat in similar_categories[:10]])

        data_type = "FAQ" if is_faq_format else "CSV/Excel"

        content = (
            f"【{data_type}ファイル名】: {file_name}\n"
            f"【データ項目/ヘッダー】: {', '.join(headers)}\n"
            f"【サンプル内容】: {content_text[:500]}...\n\n"
            f"【類似度の高い既存カテゴリ（上位10個）】:\n{similar_info}\n\n"
            f"【ユーザー質問シミュレーション】\n"
            f"このデータについてユーザーが質問する場面を想定してください：\n"
            f"- 「{file_name}について教えて」\n"
            f"- ヘッダーの各項目について「○○について教えて」\n"
            f"- データ内容の主要概念について「○○について教えて」\n\n"
            f"【カテゴリ付与要求】\n"
            f"上記の想定質問で確実にこのデータがヒットするよう、以下を実行してください：\n"
            f"1. 想定質問から重要キーワードを全て抽出\n"
            f"2. 各キーワードに対応するカテゴリを既存から選択または新規作成\n"
            f"3. 検索漏れを防ぐため複数角度のカテゴリを付与（最大5個）\n"
            f"4. 既存カテゴリで適切に表現できる場合は既存を優先使用\n\n"
            f"【重要】ユーザーの質問で確実にヒットすることを最優先に判断してください。\n"
            f"【絶対禁止】「・」「、」「と」などで複数概念を結んだカテゴリは作成禁止です。\n"
            f"　　　　　　例：「売上・利益」❌ → 「売上」✅、「利益」✅\n"
            f"　　　　　　例：「顧客・取引先」❌ → 「顧客」✅、「取引先」✅\n"
            f"【意味重複厳禁】以下のような意味が重複・類似するカテゴリは1つに統合してください：\n"
            f"　　　　　　例：「商品情報」「製品情報」「商品データ」❌ → 「商品情報」✅（最も一般的なもの1つのみ）\n"
            f"　　　　　　例：「顧客管理」「顧客情報」❌ → 「顧客管理」✅（より包括的なもの1つのみ）\n"
            f"　　　　　　例：「売上データ」「売上情報」❌ → 「売上データ」✅（より具体的なもの1つのみ）\n"
            f"【原則】1つのカテゴリは1つの明確な概念のみを表現し、意味的に類似・重複するカテゴリは必ず1つに統合してください。"
        )

        return {"role": "user", "content": content}

    @staticmethod
    def get_enhanced_faq_categories_functions(similar_cats_str: str):
        """FAQ用の改善されたfunction_call定義"""
        return [
            {
                "name": "select_and_create_faq_categories",
                "description": (
                    "FAQの質問・回答内容から既存の類似カテゴリを選択し、該当しない場合は新規カテゴリを最大5個まで作成する。\n"
                    "既存カテゴリの再利用を最優先とし、重複や類似したカテゴリの作成を厳格に防ぐ。\n"
                    "特に「・」で複数概念を結んだカテゴリは作成禁止。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "selected_existing_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": f"類似度の高い既存カテゴリから選択したもの。利用可能: {similar_cats_str}",
                            "maxItems": 5,
                        },
                        "new_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "既存カテゴリで表現できない場合のみ作成する新規カテゴリ（最大5個、既存選択と合わせて最大5個）",
                            "maxItems": 5,
                        },
                        "reasoning": {"type": "string", "description": "カテゴリ選択・作成の理由説明"},
                    },
                    "required": ["selected_existing_categories", "new_categories", "reasoning"],
                },
            }
        ]

    @staticmethod
    def get_enhanced_faq_categories_system_message():
        """FAQ用の改善されたシステムメッセージ"""
        return {
            "role": "system",
            "content": (
                "あなたはFAQ（よくある質問）を分析し、既存カテゴリを最大限活用しながら適切なカテゴリを選定する専門家です。\n\n"
                "【最重要原則】\n"
                "1. 既存カテゴリの再利用を最優先する（重複防止）\n"
                "2. 質問・回答の主要テーマを深く読み解く\n"
                "3. ユーザーが求めている情報の種類を特定\n"
                "4. 合計カテゴリ数は最大5個まで（厳格制限）\n"
                "5. 曖昧なカテゴリ名（「その他」「一般」等）は絶対禁止\n"
                "6. **「・」で複数概念を結んだカテゴリは絶対作成禁止**（例：「手続き・申請」→「手続き」と「申請」に分割）\n"
                "7. **意味的に重複・類似するカテゴリの重複選択を絶対禁止**\n\n"
                "【処理手順】\n"
                "1. 質問意図分析：質問が何を求めているかを特定\n"
                "2. 回答内容分析：回答が扱っているトピック・領域を特定\n"
                "3. 既存カテゴリ適合性チェック：類似度の高い既存カテゴリから最適なものを選択\n"
                "4. 重複・類似チェック：選択予定カテゴリ間で意味重複がないか厳格確認\n"
                "5. 新規カテゴリ判定：既存で表現できない重要な概念のみ新規作成\n"
                "6. 最終選定：既存選択+新規作成で合計最大5個に制限\n\n"
                "【意味重複防止ルール】\n"
                "以下のような意味的に類似・重複するカテゴリは1つに統合してください：\n"
                "- 「システム操作」「操作方法」「使用方法」→ 最も一般的な「システム操作」のみ選択\n"
                "- 「サポート」「問い合わせ」「相談」→ より包括的な「サポート」のみ選択\n"
                "- 「料金」「費用」「価格」→ 最も適切な「料金」のみ選択\n"
                "- 類似する業務領域は最も包括的で一般的なカテゴリ1つに統合\n"
                "- 上位概念と下位概念が両方ある場合は、より適切な抽象度のもの1つを選択\n\n"
                "【カテゴリ名規則】\n"
                "- 単一概念のみ表現（「・」「、」「と」等での複合禁止）\n"
                "- 具体的で検索しやすい業務用語を使用\n"
                "- 既存カテゴリがFAQ内容の80%以上を表現できる場合は必ず選択\n"
                "- 業務分野・サービス名・機能名は既存に同じものがあれば必ず選択\n"
                "- 新規作成は既存で絶対に表現できない重要概念のみ\n"
                "- FAQ検索時の実用性・発見しやすさを重視\n"
                "- 意味が重複するカテゴリは必ず1つに統合（重複選択厳禁）"
            ),
        }

    @staticmethod
    def get_enhanced_faq_categories_user_message(
        faq_content: str, similar_cats_str: str, file_name: str, sheet_name: str, similar_categories: list[dict]
    ):
        """FAQ用の改善されたユーザーメッセージ"""

        # 類似度情報付きでカテゴリを表示
        similar_info = ""
        if similar_categories:
            similar_info = "\n".join([f"- {cat['name']})" for cat in similar_categories[:10]])

        # ファイル名とシート名情報
        file_info = f"【ファイル名】: {file_name}"
        if sheet_name:
            file_info += f"\n【シート名】: {sheet_name}"

        content = (
            f"{file_info}\n"
            f"【FAQ内容】:\n{faq_content}\n\n"
            f"【類似度の高い既存カテゴリ（上位10個）】:\n{similar_info}\n\n"
            "【重要】上記の既存カテゴリから適切なものを選択し、どうしても既存で表現できない重要な概念がある場合のみ新規カテゴリを作成してください。\n"
            "【厳格制限】合計で最大5個までという制限を厳守し、重複や類似を避けてください。\n"
            "【絶対禁止】「・」「、」「と」などで複数概念を結んだカテゴリは作成禁止です。\n"
            "　　　　　　例：「人事・労務」❌ → 「人事」✅、「労務」✅\n"
            "　　　　　　例：「システム・操作」❌ → 「システム」✅、「操作」✅\n"
            "【意味重複厳禁】以下のような意味が重複・類似するカテゴリは1つに統合してください：\n"
            "　　　　　　例：「システム操作」「操作方法」「使用方法」❌ → 「システム操作」✅（最も一般的なもの1つのみ）\n"
            "　　　　　　例：「サポート」「問い合わせ」「相談」❌ → 「サポート」✅（より包括的なもの1つのみ）\n"
            "　　　　　　例：「料金」「費用」「価格」❌ → 「料金」✅（最も適切なもの1つのみ）\n"
            "【原則】1つのカテゴリは1つの明確な概念のみを表現し、意味的に類似・重複するカテゴリは必ず1つに統合してください。\n"
            "FAQの質問・回答の主要テーマと、ユーザーが検索時に使いそうなキーワードを重視してください。"
        )

        return {"role": "user", "content": content}

    # ====================================================================
    # 📊 統一ファイルカテゴリ抽出関連（非FAQのCSV/Excel用）
    # ====================================================================
    @staticmethod
    def get_unified_file_categories_functions(similar_cats_str: str):
        """
        非FAQのCSV/Excelファイル全体に適用する統一カテゴリ抽出用のfunction call
        ファイル名とヘッダーから統一カテゴリを決定し、同一ファイルの全行に適用
        """
        return [
            {
                "name": "select_and_create_unified_categories",
                "description": (
                    "ファイル名とヘッダー情報から、このファイル全体に適用する統一カテゴリを決定します。\n"
                    "類似度上位カテゴリの適合性とファイル固有概念の重要性を総合的に判断してください。\n"
                    "適合する既存カテゴリがある場合は積極的に選択し、固有概念が重要な場合は積極的に新規作成してください。\n"
                    "同じ内容のファイルには一貫したカテゴリを、固有の内容には固有のカテゴリを付与し、最大3個まで選択してください。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "selected_existing_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": f"既存カテゴリから選択: {similar_cats_str}",
                            "maxItems": 3,
                        },
                        "new_categories": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "新規作成するカテゴリ名（複合語を避け、単一概念で）",
                            "maxItems": 2,
                        },
                    },
                    "required": ["selected_existing_categories", "new_categories"],
                },
            }
        ]

    @staticmethod
    def get_unified_file_categories_system_message():
        """統一ファイルカテゴリ抽出のシステムメッセージ"""
        return {
            "role": "system",
            "content": (
                "あなたはCSV/Excelファイルのファイル名とヘッダー情報から、"
                "そのファイル全体に適用する統一カテゴリを決定する専門家です。\n\n"
                "【最重要原則：ファイル名・ヘッダー優先】\n"
                "1. ファイル名に含まれる固有名詞・業務用語は必ず新規カテゴリとして作成する\n"
                "2. ヘッダーに含まれる重要な業務キーワードは必ず新規カテゴリとして作成する\n"
                "3. 既存カテゴリは補完的な位置づけとし、ファイル固有性を最優先とする\n"
                "4. ユーザーがファイル名やヘッダーの単語で検索した際に確実にヒットさせる\n"
                "5. 新規カテゴリ作成を積極的に行い、既存カテゴリへの統合は慎重に判断する\n\n"
                "【ユーザー質問予測とカテゴリ付与戦略】\n"
                "1. ファイル名から重要単語を抽出：「○○管理.xlsx」→「○○管理」「○○」\n"
                "2. ヘッダーから業務領域を抽出：「顧客コード」「商品名」「売上金額」→「顧客管理」「商品管理」「売上管理」\n"
                "3. 予想される質問パターンに対応：\n"
                "   - 「○○について教えて」（ファイル名の単語）\n"
                "   - 「○○データについて教えて」（ヘッダーの内容）\n"
                "   - 「○○管理について教えて」（業務領域）\n\n"
                "【新規カテゴリ作成の判断基準】\n"
                "1. ファイル名に含まれる意味のある単語（2文字以上）は必ず新規作成対象\n"
                "2. ヘッダーから推測される業務領域は必ず新規作成対象\n"
                "3. 既存カテゴリで80%以上の意味を表現できても、ファイル固有性が重要な場合は新規作成\n"
                "4. 検索時の利便性を最重視：ユーザーが直感的に使いそうな単語は必ず新規作成\n\n"
                "【意味重複の厳格防止】\n"
                "以下の場合のみ、意味重複として統合を検討：\n"
                "- 完全に同義語：「顧客」と「お客様」\n"
                "- 上位・下位概念で明確に包含関係：「営業管理」と「営業」\n"
                "- 表記ゆれのみ：「売上げ」と「売上」\n"
                "それ以外は別概念として扱い、積極的に新規作成する\n\n"
                "【既存カテゴリ選択の制限的適用】\n"
                "既存カテゴリは以下の場合のみ選択：\n"
                "1. ファイル名・ヘッダーから抽出された重要単語と完全一致\n"
                "2. 補完的な業務カテゴリとして意味がある場合（最大1個まで）\n"
                "3. 新規カテゴリ作成だけでは不十分な場合の補助として\n\n"
                "【出力ルール】\n"
                "- 新規カテゴリ：0-2個（ファイル名・ヘッダーから必須抽出）\n"
                "- 既存カテゴリ：0-2個（補完的な選択のみ）\n"
                "- 合計最大3個（ファイル全体適用のため控えめに）\n"
                "- 複合語（「・」「、」「と」）は絶対禁止\n"
                "- 検索性を最重視した実用的なカテゴリ名を選択\n\n"
                "【重要】既存カテゴリの適合性よりも、ファイル固有性と検索利便性を最優先で判断してください。"
            ),
        }

    @staticmethod
    def get_unified_file_categories_user_message(
        file_name: str, headers: list[str], similar_cats_str: str, similar_categories: list[dict]
    ):
        """統一ファイルカテゴリ抽出のユーザーメッセージ"""

        # 類似カテゴリ情報の構築
        similar_info = ""
        if similar_categories:
            similar_info = "\n【参考：既存の類似カテゴリ】\n"
            for i, cat in enumerate(similar_categories[:5], 1):
                similar_info += f"{i}. {cat['name']}\n"
            similar_info += "※既存カテゴリは補完的用途のみ。ファイル固有性を最優先してください。\n"

        # ヘッダー情報の整理
        headers_info = f"データ列: {', '.join(headers)}" if headers else "ヘッダー情報なし"

        # ファイル名から抽出すべき重要単語の指示
        content = (
            f"【ファイル名】\n{file_name}\n\n"
            f"【{headers_info}】\n\n"
            f"{similar_info}\n"
            f"【ヘッダー分析指示】\n"
            f"以下のヘッダーから業務領域・管理対象を特定し、新規カテゴリとして作成してください：\n"
            f"- {', '.join(headers[:10])}\n"
            f"- 予想される業務カテゴリ：ヘッダーの内容から「○○管理」形式で抽出\n"
            f"- 重要な固有名詞・業務用語があれば必ず新規カテゴリに含める\n\n"
            f"【カテゴリ付与指示】\n"
            f"1. 【優先度1】ファイル名からの新規カテゴリ作成（必須0-1個程度）\n"
            f"2. 【優先度2】ヘッダーからの業務領域カテゴリ作成（必須0-1個程度）\n"
            f"3. 【優先度3】既存カテゴリからの補完選択（0-2個、任意）\n\n"
            f"【重要】このファイルについて以下の質問で確実にヒットするカテゴリを作成してください：\n"
            f"- 「{file_name}について教えて」\n"
            f"- ファイル名の各単語について「○○について教えて」\n"
            f"- ヘッダーの内容について「○○データについて教えて」\n\n"
            f"【絶対禁止】\n"
            f"- 複合語（「・」「、」「と」）での新規作成\n"
            f"- 重要単語の既存カテゴリへの安易な統合\n"
            f"- ファイル固有性の軽視\n\n"
            f"【期待する出力】\n"
            f"- 新規カテゴリ：ファイル名・ヘッダーから抽出した重要単語（0-2個）\n"
            f"- 既存カテゴリ：必要に応じて補完的に選択（0-2個）\n"
            f"- 合計最大3個で、検索利便性を最重視した構成\n\n"
            f"ファイル名とヘッダーの重要単語を見落とさず、必ず新規カテゴリとして作成してください。"
        )

        return {"role": "user", "content": content}

    # ====================================================================
    # H) chunk_jsonファイルの関連フォーム選定: select_relevant_forms_for_chunk_json_files
    # ====================================================================

    @staticmethod
    def get_select_relevant_forms_for_chunk_json_files_functions():
        return [
            {
                "name": "select_relevant_forms_for_chunk_json_files",
                "description": (
                    "chunk_jsonに紐づくファイルから、ユーザー質問に関連する"
                    "フォーム情報を厳選して選定する。"
                    "JSONデータの内容とユーザー質問を分析し、"
                    "実際に必要となるフォームのみを選定する。"
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "selected_forms": {
                            "type": "array",
                            "description": "ユーザー質問に関連する厳選されたフォーム情報のリスト。",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "form_id": {"type": "integer", "description": "フォームのユニーク ID"},
                                    "form_name": {"type": "string", "description": "フォーム名"},
                                    "description": {"type": "string", "description": "フォームの説明・用途"},
                                    "relevance_reason": {
                                        "type": "string",
                                        "description": "このフォームがユーザー質問に関連する理由",
                                    },
                                    "related_file_ids": {
                                        "type": "array",
                                        "description": "このフォームが関連するファイルIDのリスト",
                                        "items": {"type": "integer"},
                                        "uniqueItems": True,
                                    },
                                },
                                "required": [
                                    "form_id",
                                    "form_name",
                                    "description",
                                    "relevance_reason",
                                    "related_file_ids",
                                ],
                            },
                        }
                    },
                    "required": ["selected_forms"],
                    "additionalProperties": False,
                },
            }
        ]

    @staticmethod
    def get_select_relevant_forms_for_chunk_json_files_system_message() -> dict:
        return {
            "role": "system",
            "content": (
                "あなたはchunk_json（JSONデータ）に関連するファイルから、"
                "ユーザー質問に直接関連するフォーム情報を厳選する専門家です。\n\n"
                "▼ 重要な判定基準\n"
                "  • ユーザー質問で言及された具体的な手続き・申請に【直接必要】なフォームのみ選定\n"
                "  • JSONデータの内容とフォームの用途を詳細に照合し、実用性を厳格に判定\n"
                "  • 質問者が【今すぐ使用する可能性が高い】フォームのみを優先選定\n"
                "  • FAQ形式のJSONデータの場合、回答に含まれる手続きに必要なフォームを選定\n"
                "  • 表形式のJSONデータの場合、データに関連する申請・手続きフォームを選定\n\n"
                "▼ 除外すべきフォーム\n"
                "  • 単なる問い合わせフォーム、一般的な相談フォーム\n"
                "  • 質問解決に直接寄与しない、または代替手段があるフォーム\n"
                "  • 間接的な関連しかないフォーム\n"
                "  • 将来的に必要になる可能性があるが、現在は不要なフォーム\n\n"
                "▼ 選定すべきフォーム\n"
                "  • 質問で言及された具体的手続きに必須のフォーム\n"
                "  • JSONデータで紹介されている手続きに直接使用するフォーム\n"
                "  • 質問内容の解決に直接的・即座に役立つフォーム\n"
                "  • 申請、届出、手続き等で実際に提出が必要なフォーム\n\n"
                "▼ 判定プロセス\n"
                "  1. ユーザー質問の具体的な要求を特定\n"
                "  2. JSONデータの内容から関連する手続き・情報を抽出\n"
                "  3. 各フォームの用途とユーザーの要求を照合\n"
                "  4. 「直接必要性」「即座の利用可能性」で最終判定\n"
                "  5. 疑わしい場合は除外し、確実に必要なフォームのみ選定\n\n"
                "【原則】フォーム選定は「質問解決への直接的必要性」で判断すること"
            ),
        }

    @staticmethod
    def get_select_relevant_forms_for_chunk_json_files_user_message(
        user_question: str, chunk_json_data: list[dict], available_forms: list[dict]
    ) -> dict:
        """
        Args:
            user_question: ユーザーの質問
            chunk_json_data: chunk_jsonの情報リスト
            available_forms: 利用可能なフォーム情報のリスト
        """

        # chunk_jsonデータの整形
        chunk_json_section = ""
        if chunk_json_data:
            chunk_json_section = "\n\n【参考JSONデータ】\n"
            for i, cj_info in enumerate(chunk_json_data, 1):
                file_name = cj_info.get("file_name", "不明")
                sheet_info = f" (シート: {cj_info.get('sheet_name', '')})" if cj_info.get("sheet_name") else ""
                row_info = f" (行: {cj_info.get('row_number', '')})" if cj_info.get("row_number") else ""
                json_content = cj_info.get("json_content", "")

                chunk_json_section += f"\n{i}. ファイル: {file_name}{sheet_info}{row_info}\n"
                chunk_json_section += f"   JSON内容: {json_content}\n"

        # フォーム情報の整形
        forms_section = ""
        if available_forms:
            forms_section = "\n\n【利用可能なフォーム】\n"
            for i, form in enumerate(available_forms, 1):
                form_id = form.get("form_id", 0)
                form_name = form.get("form_name", "不明")
                description = form.get("description", "")
                forms_section += f"\n{i}. フォームID: {form_id}\n"
                forms_section += f"   フォーム名: {form_name}\n"
                forms_section += f"   説明: {description}\n"

        return {
            "role": "user",
            "content": (
                f"【ユーザー質問】\n{user_question}\n"
                f"{chunk_json_section}"
                f"{forms_section}\n\n"
                "上記の情報を総合的に分析し、ユーザー質問の解決に直接必要なフォームのみを厳選してください。\n\n"
                "【重要な判定基準】\n"
                "1. ユーザー質問で具体的に言及された手続き・申請に直接必要なフォームか？\n"
                "2. JSONデータの内容と関連し、実際に使用する可能性が高いフォームか？\n"
                "3. 質問解決に即座に役立つ実用的なフォームか？\n"
                "4. 単なる問い合わせではなく、具体的な手続きに使用するフォームか？\n\n"
                "【除外対象】\n"
                "- 一般的な問い合わせフォーム\n"
                "- 間接的な関連しかないフォーム\n"
                "- 将来的に必要になる可能性があるが現在は不要なフォーム\n\n"
                "疑わしい場合は除外し、確実に必要なフォームのみを選定してください。"
            ),
        }


def _consolidate_forms_data(file_forms_data: list[dict]) -> list[dict]:
    """フォーム情報を統合し、重複を削除する効率的な関数"""
    seen_forms = {}

    for file_data in file_forms_data:
        forms = file_data.get("forms", [])
        for form in forms:
            form_id = form.get("form_id")
            if form_id and form_id not in seen_forms:
                seen_forms[form_id] = {
                    "form_id": form_id,
                    "form_name": form.get("form_name", ""),
                    "description": form.get("description", ""),
                }

    return list(seen_forms.values())
