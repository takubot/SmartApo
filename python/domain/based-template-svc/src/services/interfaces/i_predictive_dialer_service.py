from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal

from sqlalchemy.orm import Session


class IPredictiveDialerService(ABC):
    """予測ダイヤラーサービスのインターフェース"""

    @abstractmethod
    def calculate_optimal_ratio(self, campaign_id: str, db: Session) -> Decimal:
        """応答率・放棄率から最適な予測発信比率を計算する"""
        ...

    @abstractmethod
    def get_next_contacts_to_dial(
        self, campaign_id: str, count: int, db: Session
    ) -> list[str]:
        """優先キューから次に発信すべき連絡先IDリストを取得する"""
        ...

    @abstractmethod
    def should_dial_next(
        self, campaign_id: str, available_agents: int, db: Session
    ) -> bool:
        """次の発信を実行すべきか判定する"""
        ...

    @abstractmethod
    def update_metrics(
        self, campaign_id: str, call_status: str, db: Session
    ) -> None:
        """通話結果をもとにキャンペーンの集計値を更新する"""
        ...

    @abstractmethod
    def check_abandon_rate(self, campaign_id: str, db: Session) -> Decimal:
        """直近15分の放棄率を計算する"""
        ...
