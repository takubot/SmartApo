#!/usr/bin/env python3
"""
Generate `exports` / `typesVersions` entries for
packages/api-contracts/package.json.

Assumed structure
repo-root/
  packages/
    api-contracts/
      src/
        types/
          d_calendar_svc.d.ts   # or *.ts
        zod/
          d_calendar_svc.ts
        services/
          d_calendar_svc.ts     # ← 追加。fetch 用サービス関数
      package.json
  scripts/
    gen_exports.py   ← this script
"""

from __future__ import annotations

import json
import sys
from pathlib import Path


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def collect_files(dir_path: Path, exts: tuple[str, ...]) -> dict[str, Path]:
    """
    Collect files (non-recursive) with suffix in *exts*.
    Returns a mapping {stem: Path}.
    """
    out: dict[str, Path] = {}
    for p in sorted(dir_path.iterdir()):
        if (
            p.is_file()
            and p.suffix in exts
            and p.stem != "index"  # index.ts はルート参照と競合しやすいので除外
        ):
            out[p.stem] = p
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    # repo paths --------------------------------------------------------------
    repo_root = Path(__file__).resolve().parent.parent
    pkg_json_path = repo_root / "packages" / "api-contracts" / "package.json"
    src_root = pkg_json_path.parent / "src"
    types_dir = src_root / "types"
    zod_dir = src_root / "zod"
    services_dir = src_root / "services"

    # sanity checks -----------------------------------------------------------
    for p in (pkg_json_path, types_dir, zod_dir, services_dir):
        if not p.exists():
            sys.exit(f"❌  Not found: {p}")

    # collect service ⇢ path mappings ----------------------------------------
    type_files = collect_files(types_dir, (".ts", ".d.ts"))
    zod_files = collect_files(zod_dir, (".ts",))
    svc_files = collect_files(services_dir, (".ts",))

    # load & mutate package.json ---------------------------------------------
    pkg = json.loads(pkg_json_path.read_text(encoding="utf-8"))
    pkg["exports"] = {}
    pkg.setdefault("typesVersions", {"*": {}})
    types_map: dict[str, list[str]] = pkg["typesVersions"]["*"]

    # --- type-only exports ---------------------------------------------------
    for svc_raw, path_obj in type_files.items():
        # Path.stem on "*.d.ts" ⇒ "<name>.d" なので末尾 ".d" を除去
        svc = svc_raw[:-2] if svc_raw.endswith(".d") else svc_raw

        ts_decl_path = f"./src/types/{path_obj.name}"
        export_key = f"./{svc}/type"

        pkg["exports"][export_key] = {
            "types": ts_decl_path,
            "default": ts_decl_path,
        }
        types_map[f"{svc}/type"] = [ts_decl_path.lstrip("./")]

    # --- zod schema exports --------------------------------------------------
    for svc, path_obj in zod_files.items():
        zschema_path = f"./src/zod/{path_obj.name}"
        export_key = f"./{svc}/zschema"  # Bブランチの変更を反映（zod -> zschema）

        pkg["exports"][export_key] = {
            "import": zschema_path,
            "require": zschema_path,
            "types": zschema_path,
            "default": zschema_path,
        }
        types_map[f"{svc}/zschema"] = [zschema_path.lstrip("./")]

    # --- fetch service exports ----------------------------------------------
    for svc, path_obj in svc_files.items():
        svc_path = f"./src/services/{path_obj.name}"
        export_key = f"./{svc}/service"

        # Bブランチのロジックを反映: 既存のキーを上書きしない
        if export_key in pkg["exports"]:
            # 既にzodのエントリがある場合、そこに追記する
            pkg["exports"][export_key].update(
                {
                    "import": svc_path,
                    "require": svc_path,
                    "types": svc_path,
                }
            )
        else:
            pkg["exports"][export_key] = {
                "import": svc_path,
                "require": svc_path,
                "types": svc_path,
                "default": svc_path,
            }
        types_map[f"{svc}/service"] = [svc_path.lstrip("./")]

    # write back --------------------------------------------------------------
    pkg_json_path.write_text(
        json.dumps(pkg, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(
        f"OK  Updated {pkg_json_path.relative_to(repo_root)} with "
        f"{len(pkg['exports'])} subpath export(s)."
    )


if __name__ == "__main__":
    main()
