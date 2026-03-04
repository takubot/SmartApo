# gemini_prompt.py


class GeminiPrompts:
    """
    Gemini（Vertex AI）を利用する際の各種プロンプトをまとめたクラス。
    p_ocr_gemini.py で参照される。
    """

    @staticmethod
    def get_classify_file_status_system_message():
        return {
            "role": "system",
            "content": (
                "You are a classification function that must return JSON only. "
                "Classify the document into exactly one of the following categories: "
                "約款, プレゼン資料, 日報, 操作マニュアル, 議事録.\n\n"
                "Output ONLY in JSON format, e.g.:\n"
                '{ "file_status": "約款" }\n'
                "Do not include any extra keys, text or explanations."
            ),
        }

    @staticmethod
    def get_classify_file_status_user_message_for_images():
        return {
            "role": "user",
            "content": (
                "この画像は複数ページの文書です。"
                "文書の種類を、以下のいずれかで厳密に分類してください:\n"
                "・約款\n・プレゼン資料\n・日報\n・操作マニュアル\n・議事録\n\n"
                "絶対にJSON形式のみで返し、'file_status' キーに分類結果を代入してください。"
            ),
        }

    @staticmethod
    def get_has_table_system_message():
        return {
            "role": "system",
            "content": (
                "あなたは画像内に表が含まれているかを判定する専門家です。"
                "以下のフォーマットに従い、余計な文字を一切含まずに出力してください:\n"
                '{ "has_table": true } または { "has_table": false }'
            ),
        }

    @staticmethod
    def get_has_table_user_message():
        return {
            "role": "user",
            "content": (
                'この画像に表が含まれている場合は { "has_table": true }、'
                '含まれていない場合は { "has_table": false } と、余計な説明なしでJSON形式のみで出力してください。'
            ),
        }
