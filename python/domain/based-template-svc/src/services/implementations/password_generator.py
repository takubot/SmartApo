import secrets
import string


class PasswordGenerator:
    """複雑なパスワードを自動生成するクラス"""

    def __init__(self):
        # 文字セット定義
        self.uppercase = string.ascii_uppercase
        self.lowercase = string.ascii_lowercase
        self.digits = string.digits
        # HTMLメールで問題を起こさない安全な特殊文字のみ使用
        self.special_chars = "!@#$%*"

        # 類似文字を除外（見間違いやすい文字を除去）
        self.excluded_chars = "0OoI1l"

        # 最終文字セット（類似文字除外）
        self.safe_uppercase = "".join(c for c in self.uppercase if c not in self.excluded_chars)
        self.safe_lowercase = "".join(c for c in self.lowercase if c not in self.excluded_chars)
        self.safe_digits = "".join(c for c in self.digits if c not in self.excluded_chars)
        self.safe_special = self.special_chars

    def generate_password(self, length: int = 20) -> str:
        """
        複雑なパスワードを生成する

        Args:
            length: パスワードの長さ（最小16文字）

        Returns:
            生成されたパスワード
        """
        if length < 16:
            length = 16

        # 各文字種を最低1文字ずつ確保
        password_chars = [
            secrets.choice(self.safe_uppercase),  # 大文字1文字
            secrets.choice(self.safe_lowercase),  # 小文字1文字
            secrets.choice(self.safe_digits),  # 数字1文字
            secrets.choice(self.safe_special),  # 特殊文字1文字
        ]

        # 残りの文字数を全ての文字種からランダムに選択
        all_chars = self.safe_uppercase + self.safe_lowercase + self.safe_digits + self.safe_special

        for _ in range(length - 4):
            password_chars.append(secrets.choice(all_chars))

        # 文字順をシャッフル
        secrets.SystemRandom().shuffle(password_chars)

        return "".join(password_chars)

    def generate_multiple_passwords(self, count: int, length: int = 12) -> list[str]:
        """
        複数のパスワードを一括生成する

        Args:
            count: 生成するパスワード数
            length: パスワードの長さ

        Returns:
            生成されたパスワードのリスト
        """
        return [self.generate_password(length) for _ in range(count)]

    def validate_password_strength(self, password: str) -> dict:
        """
        パスワードの強度を検証する

        Args:
            password: 検証するパスワード

        Returns:
            検証結果の辞書
        """
        result = {
            "is_valid": False,
            "length_ok": len(password) >= 16,
            "has_uppercase": any(c in self.uppercase for c in password),
            "has_lowercase": any(c in self.lowercase for c in password),
            "has_digit": any(c in self.digits for c in password),
            "has_special": any(c in self.special_chars for c in password),
            "no_similar_chars": not any(c in self.excluded_chars for c in password),
        }

        result["is_valid"] = all(
            [
                result["length_ok"],
                result["has_uppercase"],
                result["has_lowercase"],
                result["has_digit"],
                result["has_special"],
            ]
        )

        return result
