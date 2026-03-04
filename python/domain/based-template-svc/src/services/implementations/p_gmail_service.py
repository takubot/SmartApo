import asyncio
import logging
import mimetypes
import smtplib
import ssl
from concurrent.futures import ThreadPoolExecutor
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from ...common.env_config import Settings
from ...services.interfaces.i_email_service import EmailAttachment, EmailData, IEmailService

logger = logging.getLogger(__name__)


class GmailService(IEmailService):
    """Gmail SMTPを使用したメール送信サービス"""

    def __init__(self, env_settings: Settings):
        self.env_settings = env_settings

    def _resolve_smtp_port(self, email_data: EmailData) -> int:
        if email_data.smtp_port is not None:
            return email_data.smtp_port
        try:
            return int(self.env_settings.SMTP_PORT)
        except (TypeError, ValueError):
            return 587

    def _create_message(self, email_data: EmailData) -> MIMEMultipart:
        """メールメッセージを作成"""
        message = MIMEMultipart("mixed")
        message["To"] = email_data.to
        message["From"] = email_data.sender_email or self.env_settings.GMAIL_SENDER_EMAIL
        message["Subject"] = email_data.subject

        if email_data.cc:
            message["Cc"] = ", ".join(email_data.cc)

        body_part = MIMEMultipart("alternative")
        text_part = MIMEText(email_data.body, "plain", "utf-8")
        body_part.attach(text_part)
        if email_data.html_body:
            html_part = MIMEText(email_data.html_body, "html", "utf-8")
            body_part.attach(html_part)
        message.attach(body_part)

        for attachment in email_data.attachments:
            message.attach(self._create_attachment_part(attachment))

        return message

    def _build_recipients(self, email_data: EmailData) -> list[str]:
        recipients = [email_data.to.strip()]
        if email_data.cc:
            recipients.extend([email.strip() for email in email_data.cc if email and email.strip()])
        if email_data.bcc:
            recipients.extend([email.strip() for email in email_data.bcc if email and email.strip()])
        return recipients

    def _create_attachment_part(self, attachment: EmailAttachment) -> MIMEBase:
        mime_type = attachment.mime_type or mimetypes.guess_type(attachment.file_name)[0] or "application/octet-stream"
        maintype, subtype = mime_type.split("/", 1) if "/" in mime_type else ("application", "octet-stream")

        part = MIMEBase(maintype, subtype)
        part.set_payload(attachment.content)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{attachment.file_name}"')
        return part

    def _send_message_sync(
        self,
        message: MIMEMultipart,
        recipients: list[str],
        sender_email: str,
        app_password: str,
        smtp_server: str,
        smtp_port: int,
    ) -> bool:
        """同期的にメッセージを送信（スレッドプール用）"""
        try:
            # 設定の事前チェック
            if not sender_email or not app_password:
                logger.error("Gmail credentials are not properly configured")
                return False

            logger.info(f"Attempting to send email to: {recipients}")
            logger.info(f"Using SMTP server: {smtp_server}:{smtp_port}")
            logger.info(f"Sender email: {sender_email}")

            # SSL context作成
            context = ssl.create_default_context()

            # SMTP接続とメール送信
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                # デバッグレベル設定（開発時のみ）
                server.set_debuglevel(0)  # 本番では0、デバッグ時は1

                logger.info("Establishing STARTTLS connection...")
                server.starttls(context=context)

                logger.info("Attempting SMTP login...")

                # ログイン詳細情報をログ出力
                login_email = sender_email
                logger.info(f"🔑 Login email: {login_email}")
                logger.info(f"🔑 App password length: {len(app_password)} chars")
                logger.info(
                    f"🔑 App password preview: {app_password[:4]}...{app_password[-4:]}"
                )

                server.login(login_email, app_password)
                logger.info("SMTP login successful")

                # メッセージ送信
                text = message.as_string()
                # 送信前の詳細ログ
                logger.info(f"📧 Sending from: {sender_email}")
                logger.info(f"📧 Sending to: {recipients}")
                logger.info(f"📧 Message size: {len(text)} bytes")
                logger.info(f"📧 Subject: {message.get('Subject', 'No Subject')}")

                refused = server.sendmail(sender_email, recipients, text)

                if refused:
                    logger.warning(f"❌ Some recipients were refused: {refused}")
                    return False

                # 送信後の追加情報
                logger.info("✅ SMTP sendmail completed without errors")
                logger.info(f"✅ Message sent successfully to: {recipients}")

                # 重要な注意メッセージ
                logger.info("🔍 IMPORTANT: SMTP success doesn't guarantee delivery!")
                logger.info("🔍 Check the following if emails don't arrive:")
                logger.info("   1. Recipient's spam/junk folder")
                logger.info("   2. Google Workspace domain verification")
                logger.info("   3. SPF/DKIM/DMARC records for mitradata.jp")
                logger.info("   4. Sender reputation")

            return True

        except smtplib.SMTPAuthenticationError as error:
            logger.error(f"🚫 SMTP Authentication failed: {error}")

            # エラーコードに基づく詳細な診断
            error_str = str(error)
            if "534" in error_str and "Application-specific password required" in error_str:
                logger.error("🔐 Error 534: Application-specific password required")
                logger.error("💡 This means you need to use an App Password, not your regular Gmail password")

                email_domain = (
                    sender_email.split("@")[1].lower()
                    if "@" in sender_email
                    else "unknown"
                )

                if email_domain == "gmail.com":
                    logger.error("📋 For Gmail accounts (@gmail.com):")
                    logger.error("   1. Go to Google Account Settings → Security")
                    logger.error("   2. Enable 2-factor authentication if not already enabled")
                    logger.error("   3. Go to Security → App passwords")
                    logger.error("   4. Generate a new App password for 'Mail'")
                    logger.error("   5. Use the 16-character App password (format: xxxx xxxx xxxx xxxx)")
                    logger.error("   6. Remove any spaces and set GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx")
                else:
                    logger.error("🏢 For Google Workspace accounts (custom domain):")
                    logger.error("   STEP 1: Domain Setup")
                    logger.error("   1.1. Go to admin.google.com")
                    logger.error("   1.2. Add mitradata.jp domain to Google Workspace")
                    logger.error("   1.3. Verify domain ownership via DNS records")
                    logger.error("")
                    logger.error("   STEP 2: User Setup")
                    logger.error("   2.1. Create user: noreply@mitradata.jp")
                    logger.error("   2.2. Enable 2-factor authentication for the user")
                    logger.error("   2.3. Go to Google Account Security for the user")
                    logger.error("   2.4. Generate App Password (16 characters)")
                    logger.error("")
                    logger.error("   STEP 3: SMTP Settings")
                    logger.error("   3.1. Enable SMTP in Google Workspace Admin Console")
                    logger.error("   3.2. Enable 'Less secure app access' if needed")
                    logger.error(f"   3.3. Current domain: {email_domain}")
                    logger.error("")
                    logger.error("   STEP 4: Billing")
                    logger.error("   4.1. Google Workspace requires paid subscription")
                    logger.error("   4.2. Free trial available for new domains")

            elif "535" in error_str:
                logger.error("🔐 Error 535: Username and Password not accepted")
                logger.error("💡 This typically means wrong email/password combination")
                logger.error("📋 Check:")
                logger.error("   1. Email address spelling")
                logger.error("   2. App password is correct (16 characters)")
                logger.error("   3. No spaces in the app password")

            logger.error("🔧 Current configuration:")
            logger.error(f"   📧 Email: {sender_email}")
            logger.error(
                f"   🔑 Password length: {len(app_password) if app_password else 0} characters"
            )
            logger.error(f"   🌐 SMTP Server: {smtp_server}:{smtp_port}")

            return False
        except smtplib.SMTPRecipientsRefused as error:
            logger.error(f"Recipients refused: {error}")
            return False
        except smtplib.SMTPServerDisconnected as error:
            logger.error(f"SMTP server disconnected: {error}")
            return False
        except smtplib.SMTPException as error:
            logger.error(f"SMTP error occurred: {error}")
            return False
        except OSError as error:
            if "getaddrinfo failed" in str(error):
                logger.error(f"🌐 DNS resolution failed: {error}")
                logger.error("💡 SMTP server not found. This means:")
                logger.error(f"   📧 Server '{smtp_server}' does not exist")
                logger.error("🔧 Possible solutions:")
                logger.error("   1. Use Google Workspace with smtp.gmail.com")
                logger.error("   2. Use Gmail alias feature")
                logger.error("   3. Contact mitradata.jp administrator for correct SMTP settings")
                logger.error("   4. Use a different email service provider")
                logger.error("")
                logger.error("📋 Recommended configuration for @mitradata.jp:")
                logger.error("   🏢 Google Workspace Configuration:")
                logger.error("     SMTP_SERVER=smtp.gmail.com")
                logger.error("     GMAIL_SENDER_EMAIL=noreply@mitradata.jp")
                logger.error("     GMAIL_APP_PASSWORD=<workspace-app-password>")
                logger.error("")
                logger.error("   🔧 Troubleshooting Checklist:")
                logger.error("   ✅ Domain mitradata.jp is added to Google Workspace")
                logger.error("   ✅ Domain ownership is verified")
                logger.error("   ✅ User noreply@mitradata.jp exists")
                logger.error("   ✅ 2-factor authentication is enabled")
                logger.error("   ✅ App Password is generated and copied correctly")
                logger.error("   ✅ Google Workspace billing is active")
            else:
                logger.error(f"🚫 Network error: {error}")
            return False
        except Exception as error:
            logger.error(f"🚫 An unexpected error occurred while sending email: {error}")
            return False

    async def send_email(self, email_data: EmailData) -> bool:
        """メールを送信する"""
        try:
            message = self._create_message(email_data)
            recipients = self._build_recipients(email_data)
            sender_email = email_data.sender_email or self.env_settings.GMAIL_SENDER_EMAIL
            app_password = email_data.app_password or self.env_settings.GMAIL_APP_PASSWORD
            smtp_server = email_data.smtp_server or self.env_settings.SMTP_SERVER
            smtp_port = self._resolve_smtp_port(email_data)

            # スレッドプールで同期処理を実行
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    self._send_message_sync,
                    message,
                    recipients,
                    sender_email,
                    app_password,
                    smtp_server,
                    smtp_port,
                )

            return result

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    async def send_password_reset_email(self, email: str, reset_link: str, user_name: str) -> bool:
        """パスワード設定用のメールを送信する（レガシー関数 - 互換性のため維持）"""
        return await self.send_user_credentials_email(email, user_name, None, reset_link, None)

    async def send_user_credentials_email(
        self, email: str, user_name: str, password: str = None, reset_link: str = None, frontend_url: str = None
    ) -> bool:
        """
        単一ユーザーにログイン情報（ID/パスワード）を送信する
        """

        # 件名にDOPPELサービスを明記
        subject = "【DOPPEL】AIチャットボット「DOPPEL」のログイン情報のご案内"

        # ログインURLの確定
        login_url = frontend_url or "https://mitra-datascience-dev-538567085.us-central1.run.app/login"

        # HTMLメールテンプレート（簡潔版）
        html_body = f"""
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DOPPEL ログイン情報</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
        }}
        .header {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo {{
            font-size: 24px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 20px;
        }}
        .welcome {{
            font-size: 20px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 10px;
        }}
        .user-info {{
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }}
        .info-label {{
            font-size: 14px;
            color: #666666;
            margin-bottom: 5px;
        }}
        .info-value {{
            font-size: 16px;
            color: #1a1a1a;
            font-weight: 500;
            margin-bottom: 15px;
            word-break: break-all;
        }}
        .button {{
            display: inline-block;
            background-color: #0066cc;
            color: #ffffff !important;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
            text-align: center;
            font-size: 16px;
        }}
        .button-container {{
            text-align: center;
            margin: 30px 0;
        }}
        .note {{
            font-size: 14px;
            color: #666666;
            margin-top: 20px;
            padding: 15px;
            border-left: 4px solid #e9ecef;
        }}
        .footer {{
            text-align: center;
            font-size: 12px;
            color: #999999;
            margin-top: 30px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">DOPPEL</div>
            <div class="welcome">ようこそ、{user_name}様</div>
            <p>AIチャットボット「DOPPEL」のログイン情報をお知らせいたします。</p>
        </div>

        <div class="user-info">
            <div class="info-label">ログインメールアドレス</div>
            <div class="info-value">{email}</div>
            
            {
            f'''
            <div class="info-label">初期パスワード</div>
            <div class="info-value">{password}</div>
            '''
            if password
            else ""
        }
        </div>

        <div class="button-container">
            {
            f'''
            <a href="{login_url}" class="button">ログインページへ</a>
            '''
            if not reset_link
            else f'''
            <a href="{reset_link}" class="button">パスワードを設定する</a>
            '''
        }
        </div>

        <div class="note">
            {
            '''
            <p><strong>【重要】初回ログイン時の手順</strong></p>
            <ol style="padding-left: 20px;">
                <li>上記のメールアドレスとパスワードでログインしてください。</li>
                <li>セキュリティのため、初回ログイン後にパスワードの変更をお願いいたします。</li>
            </ol>
            '''
            if password
            else '''
            <p><strong>【重要】パスワード設定時の注意事項</strong></p>
            <ol style="padding-left: 20px;">
                <li>パスワード設定リンクの有効期限は24時間です。</li>
                <li>セキュリティのため、十分に強度のあるパスワードを設定してください。</li>
            </ol>
            '''
        }
        </div>

        <div class="footer">
            <p>このメールは自動送信されています。返信はできませんのでご了承ください。</p>
            <p>© 2024 DOPPEL. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
"""

        # プレーンテキスト版（文字化け防止のため基本的な情報のみ）
        text_body = f"""
【DOPPEL】AIチャットボット「DOPPEL」のログイン情報のご案内

{user_name}様

ログイン情報をお知らせいたします。

■ログインメールアドレス
{email}

{f"■初期パスワード\n{password}\n" if password else ""}

■ログインURL
{reset_link or login_url}

※このメールは自動送信されています。返信はできませんのでご了承ください。
"""

        # メール送信
        email_data = EmailData(to=email, subject=subject, body=text_body, html_body=html_body)

        return await self.send_email(email_data)

    async def send_bulk_password_reset_emails(
        self, email_reset_data: dict[str, str], user_names: dict[str, str]
    ) -> dict[str, bool]:
        """パスワード設定用のメールを一括送信する（レガシー関数 - 互換性のため維持）"""
        return await self.send_bulk_user_credentials_emails(email_reset_data, user_names, None, None)

    async def send_bulk_user_credentials_emails(
        self,
        email_data: dict[str, str],
        user_names: dict[str, str],
        passwords: dict[str, str] = None,
        frontend_url: str = None,
    ) -> dict[str, bool]:
        """ユーザー認証情報用のメールを一括送信する"""
        results = {}

        # 並行処理でメールを送信
        tasks = []
        for email, data_value in email_data.items():
            user_name = user_names.get(email, email.split("@")[0])
            password = passwords.get(email) if passwords else None

            # data_valueはreset_linkまたはpasswordのどちらか
            if password:
                # パスワード直接送信の場合
                task = self.send_user_credentials_email(email, user_name, password, None, frontend_url)
            else:
                # リセットリンク送信の場合
                task = self.send_user_credentials_email(email, user_name, None, data_value, frontend_url)

            tasks.append((email, task))

        # 全てのタスクを実行
        for email, task in tasks:
            try:
                result = await task
                results[email] = result
                logger.info(f"User credentials email sent to {email}: {'success' if result else 'failed'}")
            except Exception as e:
                logger.error(f"Failed to send user credentials email to {email}: {e}")
                results[email] = False

        return results
