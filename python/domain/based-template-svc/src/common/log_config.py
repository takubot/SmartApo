from __future__ import annotations

import functools
import logging
import time
from typing import Any


def get_logging_config_dict(service_name: str, log_level: str = "INFO") -> dict[str, Any]:
    """
    Uvicornに渡すためのロギング設定辞書を生成します。

    Uvicornのデフォルトフォーマッタを利用しつつ、
    アプリケーション固有のロガーも設定に含めています。

    Args:
        log_level (str): 出力するログのレベル。デフォルトは "INFO"。
    """
    # --- ↓↓↓ 変更 ↓↓↓ ---
    # 引数で受け取ったlog_levelを設定に使用する
    log_level = log_level.upper()

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "()": "uvicorn.logging.DefaultFormatter",
                "fmt": "%(levelprefix)s %(asctime)s - %(name)s - %(message)s",
                "use_colors": None,
            },
            "access": {
                "()": "uvicorn.logging.AccessFormatter",
                "fmt": '%(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": log_level, "propagate": False},
            "uvicorn.error": {"level": log_level},
            "uvicorn.access": {"handlers": ["access"], "level": log_level, "propagate": False},
            f"python.domain.{service_name}.src": {
                "handlers": ["default"],
                "level": log_level,
                "propagate": False,
            },
        },
    }


def autolog(func):
    """呼び出しを INFO ログに残す共通デコレータ"""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = logging.getLogger(func.__module__)
        logger.info("▶ %s()", func.__qualname__)
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            logger.info("◀ %s() done (%.3f s)", func.__qualname__, time.perf_counter() - start)

    return wrapper
