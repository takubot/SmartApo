"""
IP制限関連の共通ユーティリティ
テナント、グループ、チャットエントリのIP制限チェックに使用
"""

import ipaddress
import logging
from typing import Any

import requests
from fastapi import Request

from ...models.tables.enum import IpRestrictionModeEnum

logger = logging.getLogger(__name__)


def get_client_ip(request: Request | None) -> str:
    """
    クライアントのIPアドレスを取得

    Args:
        request: FastAPIリクエストオブジェクト

    Returns:
        str: クライアントのIPアドレス
    """
    if not request:
        return "unknown"

    # X-Client-IP ヘッダーをチェック（フロントエンドAPIから）
    client_ip = request.headers.get("X-Client-IP")
    if client_ip and client_ip != "unknown":
        logger.info(f"IP取得: X-Client-IP = {client_ip}")
        return client_ip.strip()

    # X-Forwarded-For ヘッダーをチェック（プロキシ経由の場合）
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # 最初のIPアドレスを取得（複数ある場合）
        ip = forwarded_for.split(",")[0].strip()
        logger.info(f"IP取得: X-Forwarded-For = {ip}")
        return ip

    # X-Real-IP ヘッダーをチェック
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        logger.info(f"IP取得: X-Real-IP = {real_ip}")
        return real_ip.strip()

    # CF-Connecting-IP ヘッダーをチェック（Cloudflare）
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        logger.info(f"IP取得: CF-Connecting-IP = {cf_ip}")
        return cf_ip.strip()

    # 直接接続の場合
    if hasattr(request, "client") and request.client:
        client_host = request.client.host
        logger.info(f"IP取得: request.client.host = {client_host}")

        # ローカル環境での開発用: 127.0.0.1や::1の場合は実際の外部IPを使用
        if client_host in ["127.0.0.1", "::1", "localhost"]:
            logger.warning(f"ローカルIP検出: {client_host} - 開発環境での外部IP取得を試行")

            # 開発環境では実際の外部IPを取得
            try:
                response = requests.get("https://httpbin.org/ip", timeout=5)
                if response.status_code == 200:
                    external_ip = response.json().get("origin", "").split(",")[0].strip()
                    if external_ip:
                        logger.info(f"外部IP取得成功: {external_ip}")
                        return external_ip
            except Exception as e:
                logger.warning(f"外部IP取得失敗: {e}")

            # フォールバック: 開発環境用のデフォルトIP
            logger.info("開発環境用デフォルトIPを使用: 127.0.0.1")
            return "127.0.0.1"

        return client_host

    logger.warning("IP取得: unknown")
    return "unknown"


def is_japan_ip(ip_address: str) -> bool:
    """
    IPアドレスが日本のものかチェック

    Args:
        ip_address: チェックするIPアドレス

    Returns:
        bool: 日本のIPアドレスの場合True
    """
    try:
        ip = ipaddress.ip_address(ip_address)

        # プライベートIPやローカルホストは許可
        if ip.is_private or ip.is_loopback:
            return True

        # 実際のGeoIPチェック（ip-api.comを使用）
        try:
            response = requests.get(
                f"http://ip-api.com/json/{ip_address}?fields=status,country,countryCode", timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    country_code = data.get("countryCode")
                    return country_code == "JP"
        except Exception as e:
            logger.warning(f"GeoIPチェック失敗: {e}")

        # フォールバック: 日本のIPレンジをチェック
        japan_ranges = [
            "1.0.0.0/8",  # APNIC
            "14.0.0.0/8",  # APNIC
            "27.0.0.0/8",  # APNIC
            "36.0.0.0/8",  # APNIC
            "39.0.0.0/8",  # APNIC
            "42.0.0.0/8",  # APNIC
            "49.0.0.0/8",  # APNIC
            "58.0.0.0/8",  # APNIC
            "59.0.0.0/8",  # APNIC
            "60.0.0.0/8",  # APNIC
            "61.0.0.0/8",  # APNIC
            "101.0.0.0/8",  # APNIC
            "103.0.0.0/8",  # APNIC
            "106.0.0.0/8",  # APNIC
            "110.0.0.0/8",  # APNIC
            "111.0.0.0/8",  # APNIC
            "112.0.0.0/8",  # APNIC
            "113.0.0.0/8",  # APNIC
            "114.0.0.0/8",  # APNIC
            "115.0.0.0/8",  # APNIC
            "116.0.0.0/8",  # APNIC
            "117.0.0.0/8",  # APNIC
            "118.0.0.0/8",  # APNIC
            "119.0.0.0/8",  # APNIC
            "120.0.0.0/8",  # APNIC
            "121.0.0.0/8",  # APNIC
            "122.0.0.0/8",  # APNIC
            "123.0.0.0/8",  # APNIC
            "124.0.0.0/8",  # APNIC
            "125.0.0.0/8",  # APNIC
            "126.0.0.0/8",  # APNIC
            "133.0.0.0/8",  # APNIC
            "153.0.0.0/8",  # APNIC
            "157.0.0.0/8",  # APNIC
            "160.0.0.0/8",  # APNIC
            "161.0.0.0/8",  # APNIC
            "162.0.0.0/8",  # APNIC
            "163.0.0.0/8",  # APNIC
            "164.0.0.0/8",  # APNIC
            "165.0.0.0/8",  # APNIC
            "166.0.0.0/8",  # APNIC
            "167.0.0.0/8",  # APNIC
            "168.0.0.0/8",  # APNIC
            "169.0.0.0/8",  # APNIC
            "170.0.0.0/8",  # APNIC
            "171.0.0.0/8",  # APNIC
            "172.0.0.0/8",  # APNIC
            "173.0.0.0/8",  # APNIC
            "174.0.0.0/8",  # APNIC
            "175.0.0.0/8",  # APNIC
            "176.0.0.0/8",  # APNIC
            "177.0.0.0/8",  # APNIC
            "178.0.0.0/8",  # APNIC
            "179.0.0.0/8",  # APNIC
            "180.0.0.0/8",  # APNIC
            "181.0.0.0/8",  # APNIC
            "182.0.0.0/8",  # APNIC
            "183.0.0.0/8",  # APNIC
            "184.0.0.0/8",  # APNIC
            "185.0.0.0/8",  # APNIC
            "186.0.0.0/8",  # APNIC
            "187.0.0.0/8",  # APNIC
            "188.0.0.0/8",  # APNIC
            "189.0.0.0/8",  # APNIC
            "190.0.0.0/8",  # APNIC
            "191.0.0.0/8",  # APNIC
            "192.0.0.0/8",  # APNIC
            "193.0.0.0/8",  # APNIC
            "194.0.0.0/8",  # APNIC
            "195.0.0.0/8",  # APNIC
            "196.0.0.0/8",  # APNIC
            "197.0.0.0/8",  # APNIC
            "198.0.0.0/8",  # APNIC
            "199.0.0.0/8",  # APNIC
            "200.0.0.0/8",  # APNIC
            "201.0.0.0/8",  # APNIC
            "202.0.0.0/8",  # APNIC
            "203.0.0.0/8",  # APNIC
            "204.0.0.0/8",  # APNIC
            "205.0.0.0/8",  # APNIC
            "206.0.0.0/8",  # APNIC
            "207.0.0.0/8",  # APNIC
            "208.0.0.0/8",  # APNIC
            "209.0.0.0/8",  # APNIC
            "210.0.0.0/8",  # APNIC
            "211.0.0.0/8",  # APNIC
            "212.0.0.0/8",  # APNIC
            "213.0.0.0/8",  # APNIC
            "214.0.0.0/8",  # APNIC
            "215.0.0.0/8",  # APNIC
            "216.0.0.0/8",  # APNIC
            "217.0.0.0/8",  # APNIC
            "218.0.0.0/8",  # APNIC
            "219.0.0.0/8",  # APNIC
            "220.0.0.0/8",  # APNIC
            "221.0.0.0/8",  # APNIC
            "222.0.0.0/8",  # APNIC
            "223.0.0.0/8",  # APNIC
            "224.0.0.0/8",  # APNIC
            "225.0.0.0/8",  # APNIC
            "226.0.0.0/8",  # APNIC
            "227.0.0.0/8",  # APNIC
            "228.0.0.0/8",  # APNIC
            "229.0.0.0/8",  # APNIC
            "230.0.0.0/8",  # APNIC
            "231.0.0.0/8",  # APNIC
            "232.0.0.0/8",  # APNIC
            "233.0.0.0/8",  # APNIC
            "234.0.0.0/8",  # APNIC
            "235.0.0.0/8",  # APNIC
            "236.0.0.0/8",  # APNIC
            "237.0.0.0/8",  # APNIC
            "238.0.0.0/8",  # APNIC
            "239.0.0.0/8",  # APNIC
            "240.0.0.0/8",  # APNIC
            "241.0.0.0/8",  # APNIC
            "242.0.0.0/8",  # APNIC
            "243.0.0.0/8",  # APNIC
            "244.0.0.0/8",  # APNIC
            "245.0.0.0/8",  # APNIC
            "246.0.0.0/8",  # APNIC
            "247.0.0.0/8",  # APNIC
            "248.0.0.0/8",  # APNIC
            "249.0.0.0/8",  # APNIC
            "250.0.0.0/8",  # APNIC
            "251.0.0.0/8",  # APNIC
            "252.0.0.0/8",  # APNIC
            "253.0.0.0/8",  # APNIC
            "254.0.0.0/8",  # APNIC
            "255.0.0.0/8",  # APNIC
        ]

        for ip_range in japan_ranges:
            if ip in ipaddress.ip_network(ip_range):
                return True

        return False
    except Exception as e:
        logger.error(f"IPアドレスチェックエラー: {e}")
        return False


def check_ip_restriction(ip_address: str, allowed_ips: list[str]) -> bool:
    """
    IP制限をチェック（CIDR形式のリストに対して）

    Args:
        ip_address: チェックするIPアドレス
        allowed_ips: 許可されたIPアドレス/CIDRのリスト

    Returns:
        bool: 許可されている場合True
    """
    if not allowed_ips:
        return True

    try:
        client_ip = ipaddress.ip_address(ip_address)
        for allowed_ip in allowed_ips:
            if client_ip in ipaddress.ip_network(allowed_ip):
                return True
        return False
    except Exception as e:
        logger.error(f"IP制限チェックエラー: {e}")
        return False


def evaluate_ip_restriction(
    mode: IpRestrictionModeEnum,
    client_ip: str,
    allowed_ips: list[str],
) -> tuple[bool, str]:
    """
    IP制限ロジックを統一的に評価するユーティリティ

    Args:
        mode: IP制限モード
        client_ip: クライアントのIPアドレス
        allowed_ips: 許可されたIPアドレス/CIDRのリスト（SPECIFIC_IPモードで使用）

    Returns:
        tuple[bool, str]: (許可されているか, 理由文字列)
    """
    if mode == IpRestrictionModeEnum.NONE:
        return True, "ip_restriction_disabled"

    if mode == IpRestrictionModeEnum.JAPAN_ONLY:
        allowed = is_japan_ip(client_ip)
        return (allowed, "japan_only_allowed") if allowed else (allowed, "japan_only_rejected")

    if mode == IpRestrictionModeEnum.SPECIFIC_IP:
        allowed = check_ip_restriction(client_ip, allowed_ips)
        return (allowed, "specific_ip_allowed") if allowed else (allowed, "specific_ip_rejected")

    # 不明なモードの場合
    logger.warning(f"不明なIP制限モード: {mode}")
    return False, "unknown_restriction_mode"

