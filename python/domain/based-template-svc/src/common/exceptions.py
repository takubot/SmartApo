from fastapi import HTTPException, status


class CredentialsException(HTTPException):
    """認証エラー用のカスタム例外（HTTP 401 エラーとして扱う）"""

    def __init__(self, message: str = "認証エラーが発生しました。"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=message, headers={"WWW-Authenticate": "Bearer"}
        )


class FlowExecutionError(HTTPException):
    """フロー実行エラー用のカスタム例外（HTTP 500 エラーとして扱う）"""

    def __init__(self, message: str = "フロー実行中にエラーが発生しました。"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)


class BotHandoffError(HTTPException):
    """ボットハンドオフエラー用のカスタム例外（HTTP 500 エラーとして扱う）"""

    def __init__(self, message: str = "ボットハンドオフ中にエラーが発生しました。"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)
