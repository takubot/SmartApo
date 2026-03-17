"""FreeSWITCH ESL を用いたテレフォニーサービス実装

FreeSWITCH の Inbound ESL 接続経由で
発信・保留・転送・切断・録音などの通話制御を行う。
"""

from __future__ import annotations

import re
import uuid
from logging import getLogger
from typing import Any, Optional

from ...common.env_config import get_settings
from ..interfaces.i_telephony_service import ITelephonyService
from .esl_client import ESLClient, get_esl_client

logger = getLogger(__name__)
settings = get_settings()


def _normalize(phone: str) -> str:
    """電話番号から不要文字を除去"""
    return re.sub(r"[\s\-\(\).]", "", phone)


def _to_e164(phone: str, default_country: str = "81") -> str:
    """電話番号をE.164形式に変換する（発信者番号表示用）"""
    digits = _normalize(phone)
    if digits.startswith("+"):
        return digits
    if digits.startswith("0"):
        return f"+{default_country}{digits[1:]}"
    return f"+{digits}"


def _to_domestic(phone: str) -> str:
    """電話番号を国内形式 (0XXXXXXXXX) に変換する（ブラステル発信用）

    ブラステル等の日本SIPプロバイダは国内番号形式で発信する。
    """
    digits = _normalize(phone)
    if digits.startswith("+81"):
        return f"0{digits[3:]}"
    if digits.startswith("81") and len(digits) > 10:
        return f"0{digits[2:]}"
    if digits.startswith("0"):
        return digits
    return digits


def _strip_plus(phone: str) -> str:
    """E.164の+を除去"""
    return phone.lstrip("+")


class PFreeSwitchService(ITelephonyService):
    """FreeSWITCH ESL による発信・通話制御"""

    def __init__(
        self,
        esl_host: str | None = None,
        esl_port: int | None = None,
        esl_password: str | None = None,
        sip_gateway: str | None = None,
    ) -> None:
        self._esl_host = esl_host or settings.FREESWITCH_ESL_HOST
        self._esl_port = esl_port or settings.FREESWITCH_ESL_PORT
        self._esl_password = esl_password or settings.FREESWITCH_ESL_PASSWORD
        self._sip_gateway = sip_gateway or settings.FREESWITCH_SIP_GATEWAY

    @property
    def esl(self) -> ESLClient:
        """ESLクライアントを遅延取得する"""
        return get_esl_client(self._esl_host, self._esl_port, self._esl_password)

    # ── 発信 ─────────────────────────────────────────────────

    def initiate_call(
        self,
        to: str,
        from_: str,
        voice_url: str,  # FreeSWITCHでは未使用（互換性のため残す）
        status_callback_url: str,  # FreeSWITCHではESLイベントで代替
        ring_timeout: int = 30,
        record: bool = True,
        machine_detection: str = "Enable",  # FreeSWITCH AMD未使用
    ) -> dict[str, Any]:
        """外線に発信する（顧客側のみ。ブリッジは別途）

        FreeSWITCH originate コマンドで SIP gateway 経由の発信を行う。
        発信後は park して待機状態にし、顧客が応答したら
        dial_and_bridge() でオペレーターへブリッジする。
        """
        to_domestic = _to_domestic(to)
        from_e164 = _to_e164(from_)
        call_uuid = str(uuid.uuid4())

        # originate変数を組み立て
        vars_list = [
            f"origination_uuid={call_uuid}",
            f"origination_caller_id_number={_strip_plus(from_e164)}",
            f"origination_caller_id_name=SmartApo",
            f"originate_timeout={ring_timeout}",
            "ignore_early_media=true",
        ]
        if record:
            vars_list.append("media_bug_answer_req=true")

        vars_str = ",".join(vars_list)
        dial_string = f"sofia/gateway/{self._sip_gateway}/{to_domestic}"

        # originate → &park（応答後に待機させる）
        cmd = f"originate {{{vars_str}}}{dial_string} &park()"
        result = self.esl.api(cmd)

        if result.startswith("-ERR"):
            logger.error("発信失敗: %s → %s", cmd, result)
            raise RuntimeError(f"FreeSWITCH originate失敗: {result}")

        logger.info("通話開始: uuid=%s to=%s", call_uuid, to_domestic)

        # 録音開始
        if record:
            rec_path = f"/var/lib/freeswitch/recordings/{call_uuid}.wav"
            self.esl.api(f"uuid_record {call_uuid} start {rec_path}")

        return {
            "call_sid": call_uuid,
            "status": "dialing",
            "direction": "outbound-api",
        }

    def dial_and_bridge(
        self,
        to: str,
        from_: str,
        user_extension: str,
        ring_timeout: int = 30,
        record: bool = True,
    ) -> dict[str, Any]:
        """外線発信し、応答後にオペレーターのSIP内線へブリッジする

        プログレッシブダイヤラーのコアフロー:
        1. sofia/gateway 経由で顧客に発信
        2. 顧客応答後、自動的にオペレーターの内線(user/xxxx)へブリッジ
        """
        to_domestic = _to_domestic(to)
        from_e164 = _to_e164(from_)
        call_uuid = str(uuid.uuid4())

        vars_list = [
            f"origination_uuid={call_uuid}",
            f"origination_caller_id_number={_strip_plus(from_e164)}",
            f"origination_caller_id_name=SmartApo",
            f"originate_timeout={ring_timeout}",
            "ignore_early_media=true",
        ]
        if record:
            rec_path = f"/var/lib/freeswitch/recordings/{call_uuid}.wav"
            vars_list.append(f"execute_on_answer=uuid_record {call_uuid} start {rec_path}")

        vars_str = ",".join(vars_list)
        dial_string = f"sofia/gateway/{self._sip_gateway}/{to_domestic}"

        # originate → 応答時に user_extension へブリッジ
        cmd = f"originate {{{vars_str}}}{dial_string} &bridge(user/{user_extension})"
        result = self.esl.api(cmd)

        if result.startswith("-ERR"):
            logger.error("発信失敗: %s → %s", cmd, result)
            raise RuntimeError(f"FreeSWITCH originate失敗: {result}")

        logger.info(
            "プログレッシブ発信: uuid=%s to=%s → user=%s",
            call_uuid,
            to_domestic,
            user_extension,
        )
        return {
            "call_sid": call_uuid,
            "status": "dialing",
            "direction": "outbound-api",
            "user_extension": user_extension,
        }

    # ── 終了 ─────────────────────────────────────────────────

    def end_call(self, call_sid: str) -> bool:
        """通話を終了する (uuid_kill)"""
        result = self.esl.api(f"uuid_kill {call_sid}")
        logger.info("通話終了: uuid=%s result=%s", call_sid, result)
        return "+OK" in result

    # ── 保留 ─────────────────────────────────────────────────

    def hold_call(self, call_sid: str, hold_music_url: Optional[str] = None) -> bool:
        """通話を保留にする (uuid_hold)"""
        result = self.esl.api(f"uuid_hold {call_sid}")
        logger.info("通話保留: uuid=%s result=%s", call_sid, result)
        return "+OK" in result

    def resume_call(self, call_sid: str) -> bool:
        """保留を解除する (uuid_hold off)"""
        result = self.esl.api(f"uuid_hold off {call_sid}")
        logger.info("保留解除: uuid=%s result=%s", call_sid, result)
        return "+OK" in result

    # ── 転送 ─────────────────────────────────────────────────

    def transfer_call(self, call_sid: str, target: str) -> dict[str, Any]:
        """通話を転送する (uuid_transfer)

        target は内線番号 (e.g. "1002") または外線番号
        """
        if target.startswith("0") or target.startswith("+"):
            # 外線転送 (国内番号形式で発信)
            target_domestic = _to_domestic(target)
            dest = f"sofia/gateway/{self._sip_gateway}/{target_domestic}"
        else:
            # 内線転送
            dest = f"user/{target}"

        result = self.esl.api(f"uuid_transfer {call_sid} {dest}")
        logger.info("通話転送: uuid=%s → %s result=%s", call_sid, target, result)
        return {"call_sid": call_sid, "transferred_to": target}

    # ── ステータス / 録音 ────────────────────────────────────

    def get_call_status(self, call_sid: str) -> dict[str, Any]:
        """通話ステータスを取得する (uuid_dump)"""
        result = self.esl.api(f"uuid_dump {call_sid}")
        if result.startswith("-ERR"):
            return {"call_sid": call_sid, "status": "not_found"}

        # uuid_dump の結果をパース
        data: dict[str, str] = {}
        for line in result.split("\n"):
            if ": " in line:
                k, v = line.split(": ", 1)
                data[k] = v

        return {
            "call_sid": call_sid,
            "status": data.get("Channel-Call-State", "unknown").lower(),
            "duration": data.get("variable_billsec", "0"),
            "start_time": data.get("variable_start_stamp"),
            "end_time": data.get("variable_end_stamp"),
        }

    def get_recording(self, recording_sid: str) -> dict[str, Any]:
        """録音メタデータを取得する

        FreeSWITCHではrecording_sid = call_uuid として
        ファイルパスから情報を構築する。
        """
        rec_path = f"/var/lib/freeswitch/recordings/{recording_sid}.wav"
        return {
            "recording_sid": recording_sid,
            "duration": None,
            "url": rec_path,
            "status": "completed",
        }

    def delete_recording(self, recording_sid: str) -> bool:
        """録音を削除する（ファイルシステム上の削除）"""
        import os

        rec_path = f"/var/lib/freeswitch/recordings/{recording_sid}.wav"
        try:
            os.remove(rec_path)
            logger.info("録音削除: %s", rec_path)
            return True
        except FileNotFoundError:
            logger.warning("録音ファイルが見つかりません: %s", rec_path)
            return False

    # ── ユーティリティ ───────────────────────────────────────

    def bridge_channels(self, uuid_a: str, uuid_b: str) -> bool:
        """2つのチャネルをブリッジする"""
        result = self.esl.api(f"uuid_bridge {uuid_a} {uuid_b}")
        logger.info("チャネルブリッジ: %s ↔ %s result=%s", uuid_a, uuid_b, result)
        return "+OK" in result

    def get_registered_users(self) -> list[dict[str, str]]:
        """FreeSWITCHに登録中のSIPユーザー一覧を取得"""
        result = self.esl.api("show registrations as json")
        import json

        try:
            data = json.loads(result)
            return data.get("rows", [])
        except (json.JSONDecodeError, TypeError):
            return []
