#!/usr/bin/env python3
"""
scripts/gen_redocly_config.py

* contracts/*.yaml を再帰的に探索
* ファイル名 (例: auth.yaml → app 名 'auth') ごとに
    redocly の `apis.` エントリを生成
* <repo-root>/redocly.yaml を上書き出力
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # <repo-root>
CONTRACTS_DIR = ROOT / "packages/api-contracts/src/yaml"  # ← 変更点
OUTPUT = ROOT / "redocly.yaml"


def main() -> None:
    apis: dict[str, dict[str, str]] = {}

    # contracts 配下の *.yaml / *.yml をすべて拾う
    for spec in CONTRACTS_DIR.glob("**/*.y*ml"):
        app = spec.stem  # 'auth', 'calendar' など
        key = f"{app}@v1"  # バージョンは適宜
        apis[key] = {
            "root": f"./{spec.relative_to(ROOT)}",
            "output": f"./packages/api-contracts/src/types/{app}.d.ts",
        }

    if not apis:
        raise SystemExit("ERROR: contracts/*.yaml not found.")

    # ────────────────── YAML を手書き生成 ──────────────────
    lines = ["extends:", "  - recommended", "apis:"]
    for name, cfg in sorted(apis.items()):
        indent = "  "
        lines += [
            f"{indent}{name}:",
            f"{indent * 2}root: {cfg['root']}",
            f"{indent * 2}x-openapi-ts:",
            f"{indent * 3}output: {cfg['output']}",
        ]

    OUTPUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"OK generated: {OUTPUT.relative_to(ROOT)} ({len(apis)} apis)")


if __name__ == "__main__":
    main()
