# scripts/gen_openapi.py
"""
pip install pyyaml を忘れずに
各 FastAPI サービスの OpenAPI (yaml / json) を一括生成するユーティリティ
使い方:
    # 既定 (=yaml) で contracts/doppel.yaml へ書き出し
    python scripts/gen_openapi.py

    # JSON 形式で contracts/doppel.json へ
    python scripts/gen_openapi.py --fmt json

    # 好きなディレクトリへ (例: specs/)
    python scripts/gen_openapi.py --outdir specs
"""

from __future__ import annotations

import argparse
import importlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

# ---------------------------------------------------------------------------
# 1) パス設定
# ---------------------------------------------------------------------------
HERE = Path(__file__).resolve()
ROOT = HERE.parent.parent
PYTHON_DIR = ROOT / "python"

for p in (ROOT, PYTHON_DIR):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)


# ---------------------------------------------------------------------------
# 0) Google Cloud ADC チェック
# ---------------------------------------------------------------------------
def ensure_google_adc() -> None:
    # Windows ターミナルのエンコーディング差異で文字化け/例外が出るため、ASCII のみを使用
    print("Google Cloud ADC check start...")
    gcloud = shutil.which("gcloud")
    if not gcloud:
        print("[WARN] gcloud not found. Install Google Cloud SDK: https://cloud.google.com/sdk")
        sys.exit(1)

    def _print_access_token() -> str | None:
        try:
            completed = subprocess.run(
                [gcloud, "auth", "application-default", "print-access-token"],
                check=False,
                capture_output=True,
                text=True,
            )
            if completed.returncode == 0:
                token = (completed.stdout or "").strip()
                return token if token else None
            return None
        except Exception:
            return None

    # 1) 既にトークンが取得できるなら OK
    token = _print_access_token()
    if token:
        print("Google Cloud ADC check done")
        return

    # 2) 未ログイン → ブラウザでのログインを促す
    print("ADC not configured. Starting browser login...")
    try:
        completed = subprocess.run(
            [gcloud, "auth", "application-default", "login"], check=False
        )
        if completed.returncode != 0:
            print(f"gcloud application-default login failed (exit={completed.returncode})")
            sys.exit(1)
    except subprocess.CalledProcessError as exc:
        print(f"gcloud application-default login failed: {exc}")
        sys.exit(1)

    # 3) 再確認
    token = _print_access_token()
    print("Google Cloud ADC check done")
    if not token:
        print("Failed to get ADC access token. Please try login again.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# 2) 対象サービス
#    (name, import path, FastAPI インスタンスの属性名)
#    AブランチとBブランチのサービスをマージ
# ---------------------------------------------------------------------------
APPS = [
    ("based_template", "python.domain.based-template-svc.src.main", "app"),
]

# ---------------------------------------------------------------------------
# 3) CLI 引数
# ---------------------------------------------------------------------------
parser = argparse.ArgumentParser()
parser.add_argument("--fmt", choices=("yaml", "json"), default="yaml")
parser.add_argument("--outdir", default=str(ROOT / "packages/api-contracts/src/yaml"))
# Bブランチで追加された引数
parser.add_argument(
    "--check", action="store_true", help="Check if generated files are up to date"
)
args = parser.parse_args()

outdir = Path(args.outdir)
outdir.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 4) 生成ループ
# ---------------------------------------------------------------------------
ensure_google_adc()
for name, import_path, attr in APPS:
    # FastAPI アプリを import
    module = importlib.import_module(import_path)
    fastapi_app = getattr(module, attr)

    # OpenAPI 生成
    spec = fastapi_app.openapi()

    # contracts/{name}.{fmt}
    outfile = outdir / f"{name}.{args.fmt}"

    with outfile.open("w", encoding="utf-8") as fp:
        if args.fmt == "json":
            json.dump(spec, fp, indent=2, ensure_ascii=False)
        else:
            yaml.safe_dump(spec, fp, sort_keys=False, allow_unicode=True)

    rel = outfile.relative_to(ROOT)
    print(f"OK {name}: wrote {rel}")

print("All specs generated")
