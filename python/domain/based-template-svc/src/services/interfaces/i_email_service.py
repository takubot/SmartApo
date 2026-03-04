from abc import ABC, abstractmethod


class EmailAttachment:
    """メール添付ファイルのデータクラス"""

    def __init__(self, file_name: str, content: bytes, mime_type: str | None = None):
        self.file_name = file_name
        self.content = content
        self.mime_type = mime_type


class EmailData:
    """メール送信用データクラス"""

    def __init__(
        self,
        to: str,
        subject: str,
        body: str,
        html_body: str | None = None,
        cc: list[str] | None = None,
        bcc: list[str] | None = None,
        sender_email: str | None = None,
        app_password: str | None = None,
        smtp_server: str | None = None,
        smtp_port: int | None = None,
        attachments: list[EmailAttachment] | None = None,
    ):
        self.to = to
        self.subject = subject
        self.body = body
        self.html_body = html_body
        self.cc = cc or []
        self.bcc = bcc or []
        self.sender_email = sender_email
        self.app_password = app_password
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.attachments = attachments or []


class IEmailService(ABC):
    """メール送信サービスのインターフェース"""

    @abstractmethod
    async def send_email(self, email_data: EmailData) -> bool:
        """
        メールを送信する

        Args:
            email_data: 送信するメールのデータ

        Returns:
            bool: 送信成功の場合True、失敗の場合False

        Raises:
            Exception: メール送信に失敗した場合
        """
        pass

    @abstractmethod
    async def send_password_reset_email(self, email: str, reset_link: str, user_name: str) -> bool:
        """
        パスワードリセット用のメールを送信する

        Args:
            email: 送信先メールアドレス
            reset_link: パスワードリセット用リンク
            user_name: ユーザー名

        Returns:
            bool: 送信成功の場合True、失敗の場合False

        Raises:
            Exception: メール送信に失敗した場合
        """
        pass

    @abstractmethod
    async def send_bulk_password_reset_emails(
        self, email_reset_data: dict[str, str], user_names: dict[str, str]
    ) -> dict[str, bool]:
        """
        パスワードリセット用のメールを一括送信する

        Args:
            email_reset_data: {email: reset_link}の辞書
            user_names: {email: user_name}の辞書

        Returns:
            dict[str, bool]: {email: 送信成功フラグ}の辞書
        """
        pass
