import logging
from datetime import datetime
from typing import Any

import stripe

from ...common.env_config import Settings
from ...services.interfaces.i_stripe_service import IStripeService


class PStripeService(IStripeService):
    """Stripe決済サービスの実装"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.stripe = stripe
        self.stripe.api_key = settings.STRIPE_SECRET_KEY

        # ログ設定
        self.logger = logging.getLogger(__name__)

    def create_product(self, name: str, description: str | None = None) -> str:
        """Stripeでプロダクトを作成し、Product IDを返す"""
        try:
            product_data = {"name": name, "description": description or f"Product: {name}"}

            product = self.stripe.Product.create(**product_data)
            self.logger.info(f"Stripe product created: {product.id}")
            return product.id

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe product creation failed: {e}")
            raise Exception(f"Failed to create Stripe product: {e}")

    def create_price(
        self, product_id: str, amount: int, currency: str = "jpy", recurring_interval: str = "month"
    ) -> str:
        """Stripeで価格を作成し、Price IDを返す"""
        try:
            price_data = {
                "product": product_id,
                "unit_amount": amount,
                "currency": currency,
                "recurring": {"interval": recurring_interval},
            }

            price = self.stripe.Price.create(**price_data)
            self.logger.info(f"Stripe price created: {price.id}")
            return price.id

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe price creation failed: {e}")
            raise Exception(f"Failed to create Stripe price: {e}")

    def create_customer(self, email: str, name: str | None = None, metadata: dict[str, Any] | None = None) -> str:
        """Stripeでカスタマーを作成し、Customer IDを返す"""
        try:
            customer_data = {"email": email, "name": name, "metadata": metadata or {}}

            customer = self.stripe.Customer.create(**customer_data)
            self.logger.info(f"Stripe customer created: {customer.id}")
            return customer.id

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe customer creation failed: {e}")
            raise Exception(f"Failed to create Stripe customer: {e}")

    def create_subscription(
        self, customer_id: str, price_id: str, trial_days: int = 7, metadata: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Stripeでサブスクリプションを作成し、サブスクリプション情報を返す"""
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "trial_period_days": trial_days,
                "metadata": metadata or {},
            }

            subscription = self.stripe.Subscription.create(**subscription_data)
            self.logger.info(f"Stripe subscription created: {subscription.id}")

            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "trial_start": datetime.fromtimestamp(subscription.trial_start) if subscription.trial_start else None,
                "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
            }

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe subscription creation failed: {e}")
            raise Exception(f"Failed to create Stripe subscription: {e}")

    def cancel_subscription(self, subscription_id: str) -> dict[str, Any]:
        """サブスクリプションをキャンセルする"""
        try:
            subscription = self.stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
            self.logger.info(f"Stripe subscription canceled: {subscription_id}")

            return {
                "id": subscription.id,
                "status": subscription.status,
                "canceled_at": datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
            }

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe subscription cancellation failed: {e}")
            raise Exception(f"Failed to cancel Stripe subscription: {e}")

    def get_subscription(self, subscription_id: str) -> dict[str, Any]:
        """サブスクリプション情報を取得する"""
        try:
            subscription = self.stripe.Subscription.retrieve(subscription_id)

            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "trial_start": datetime.fromtimestamp(subscription.trial_start) if subscription.trial_start else None,
                "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
                "canceled_at": datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
            }

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe subscription retrieval failed: {e}")
            raise Exception(f"Failed to retrieve Stripe subscription: {e}")

    def create_checkout_session(
        self,
        price_id: str,
        customer_id: str,
        success_url: str,
        cancel_url: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """チェックアウトセッションを作成し、セッションURLを返す"""
        try:
            session_data = {
                "customer": customer_id,
                "payment_method_types": ["card"],
                "line_items": [{"price": price_id, "quantity": 1}],
                "mode": "subscription",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "metadata": metadata or {},
            }

            session = self.stripe.checkout.Session.create(**session_data)
            self.logger.info(f"Stripe checkout session created: {session.id}")
            return session.url

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe checkout session creation failed: {e}")
            raise Exception(f"Failed to create Stripe checkout session: {e}")

    def create_portal_session(self, customer_id: str, return_url: str) -> str:
        """カスタマーポータルセッションを作成し、セッションURLを返す"""
        try:
            session = self.stripe.billing_portal.Session.create(customer=customer_id, return_url=return_url)
            self.logger.info(f"Stripe portal session created: {session.id}")
            return session.url

        except stripe.error.StripeError as e:
            self.logger.error(f"Stripe portal session creation failed: {e}")
            raise Exception(f"Failed to create Stripe portal session: {e}")

    def verify_webhook_signature(self, payload: bytes, signature: str, endpoint_secret: str) -> dict[str, Any]:
        """Webhook署名を検証し、イベントデータを返す"""
        try:
            event = self.stripe.Webhook.construct_event(payload, signature, endpoint_secret)
            self.logger.info(f"Stripe webhook verified: {event.type}")
            return event

        except ValueError as e:
            self.logger.error(f"Invalid payload: {e}")
            raise Exception("Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            self.logger.error(f"Invalid signature: {e}")
            raise Exception("Invalid signature")
