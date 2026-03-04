#!/usr/bin/env python3
"""
sync_uv_to_local.py ― 同じ環境の pip を確実に参照して freeze → uv sync
================================================================

1. sys.executable -m pip freeze で all_pkgs.txt を出力（stdout 指定）
2. uv export → requirements.txt
3. uv pip sync requirements.txt
"""

import os
import subprocess
import sys
from pathlib import Path

PYTHON_DIR = Path(__file__).resolve().parent.parent / "python"


def run(cmd: list[str] | str, **kwargs) -> None:
    """
    サブプロセス実行 & エラーチェック
    **kwargs を受け取るようにして、stdout 等も渡せるようにします
    """
    if isinstance(cmd, list):
        print("\n$ " + " ".join(cmd))
    else:
        print(f"\n$ {cmd}")
    subprocess.run(cmd, check=True, **kwargs)


def main() -> None:
    # ① 仮想環境直下へ移動
    os.chdir(PYTHON_DIR)

    # ② freeze → all_pkgs.txt (sys.executable 経由)
    out_path = PYTHON_DIR / "all_pkgs.txt"
    with out_path.open("w", encoding="utf-8") as f:
        run([sys.executable, "-m", "pip", "freeze"], stdout=f)

    # ③ uv export → requirements.txt
    run(["uv", "export", "-o", "requirements.txt", "--no-hashes"])

    # ④ 同期
    run(["pip", "install", "-r", f"{PYTHON_DIR}/requirements.txt"])

    # ⑤ 完了後に all_pkgs.txt を削除
    try:
        if out_path.exists():
            out_path.unlink()
            print(f"✅ 削除しました: {out_path.name}")
    except Exception as e:
        print(f"⚠️ all_pkgs.txt の削除に失敗しました: {e}")

    print("\n✅ 完了しました。")


if __name__ == "__main__":
    # uv が無いと sync できない
    try:
        subprocess.run(["uv", "--version"], stdout=subprocess.DEVNULL, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        sys.exit("❌ uv が見つかりません。まず `pip install uv` してください。")

    try:
        main()
    except subprocess.CalledProcessError as e:
        sys.exit(f"❌ コマンド失敗: {e.cmd}")
