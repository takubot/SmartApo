from abc import ABC, abstractmethod
from typing import Any


class IStripeService(ABC):
    """Stripe決済サービスのインターフェース"""

    @abstractmethod
    def create_product(self, name: str, description: str | None = None) -> str:
        """Stripeでプロダクトを作成し、Product IDを返す"""
        pass

    @abstractmethod
    def create_price(
        self, product_id: str, amount: int, currency: str = "jpy", recurring_interval: str = "month"
    ) -> str:
        """Stripeで価格を作成し、Price IDを返す"""
        pass

    @abstractmethod
    def create_customer(self, email: str, name: str | None = None, metadata: dict[str, Any] | None = None) -> str:
        """Stripeでカスタマーを作成し、Customer IDを返す"""
        pass

    @abstractmethod
    def create_subscription(
        self, customer_id: str, price_id: str, trial_days: int = 7, metadata: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Stripeでサブスクリプションを作成し、サブスクリプション情報を返す"""
        pass

    @abstractmethod
    def cancel_subscription(self, subscription_id: str) -> dict[str, Any]:
        """サブスクリプションをキャンセルする"""
        pass

    @abstractmethod
    def get_subscription(self, subscription_id: str) -> dict[str, Any]:
        """サブスクリプション情報を取得する"""
        pass

    @abstractmethod
    def create_checkout_session(
        self,
        price_id: str,
        customer_id: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """チェックアウトセッションを作成し、セッションURLを返す"""
        pass

    @abstractmethod
    def create_portal_session(self, customer_id: str, return_url: str) -> str:
        """カスタマーポータルセッションを作成し、セッションURLを返す"""
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload: bytes, signature: str, endpoint_secret: str) -> dict[str, Any]:
        """Webhook署名を検証し、イベントデータを返す"""
        pass
