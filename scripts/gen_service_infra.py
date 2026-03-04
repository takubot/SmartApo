#!/usr/bin/env python3
"""Render Cloud Run/Cloud Build configs from templates (env-centric edition)."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, TypedDict

import jinja2


# ==============================
# Constants & Types
# ==============================

APP_NAME = "doppel"

TEMPLATE_DIR = Path("infra/templates")
SERVICE_DIR = Path("infra/services")
APP_DIR = Path("infra/apps")

ENVIRONMENTS: List[str] = ["dev", "stg", "prod"]

SPECS_DEFAULT: Dict[str, Any] = {
    "min_scale": "0",
    "max_scale": "10",
    "cpu_target": "75",
    "concurrency": 80,
    "timeout": 300,
    "cpu": "1000m",
    "memory": "2Gi",
}


class EnvConfig(TypedDict, total=False):
    target: str
    runtime_project: str
    build_args: Dict[str, Any]
    exec_account: str
    network: Dict[str, Any]  # vpc_access_egress / network_interfaces など
    env_vars: Dict[str, Any]  # 任意の環境変数ブロック
    cloud_sql_instance: str
    specs: Dict[str, Any]  # min_scale / max_scale ... を環境ごとに上書き
    ingress: str


class ServiceItem(TypedDict, total=False):
    # Required
    service_name: str
    # Optional
    type: str  # "services" | "apps"
    dockerfile: str
    opa_image: str
    opa_dockerfile: str
    pipeline: str
    health_path: str
    ingress: str
    envs: Dict[str, EnvConfig]  # すべての設定は env 側に集約（build_args/specs 等）


@dataclass(frozen=True)
class TemplatePaths:
    build: Path
    cloudrun: Path
    skaffold: Path
    job_migration: Path

    @staticmethod
    def default() -> "TemplatePaths":
        return TemplatePaths(
            build=TEMPLATE_DIR / "build.yaml.j2",
            cloudrun=TEMPLATE_DIR / "cloudrun.yaml.j2",
            skaffold=TEMPLATE_DIR / "skaffold.yaml.j2",
            job_migration=TEMPLATE_DIR / "job-migration.j2",
        )


# ==============================
# Jinja Environment
# ==============================


def create_jinja_env(template_dir: Path) -> jinja2.Environment:
    """Create a configured Jinja2 environment."""
    loader = jinja2.FileSystemLoader(template_dir)
    return jinja2.Environment(
        loader=loader,
        trim_blocks=False,  # keep line breaks after blocks
        lstrip_blocks=True,  # strip leading spaces before blocks
    )


# ==============================
# IO Utilities
# ==============================


def read_services(file_path: Path) -> List[ServiceItem]:
    """Read JSON list of services."""
    try:
        raw = file_path.read_text(encoding="utf-8-sig")
        data = json.loads(raw)
    except FileNotFoundError as e:
        raise SystemExit(f"[ERROR] Service file not found: {file_path}") from e
    except json.JSONDecodeError as e:
        raise SystemExit(f"[ERROR] Invalid JSON in {file_path}: {e}") from e

    if not isinstance(data, list):
        raise SystemExit(f"[ERROR] Root of {file_path} must be a list of services.")
    return data  # type: ignore[return-value]


def ensure_out_dir(svc_type: str, service_name: str) -> Path:
    """Return output directory path and ensure it exists."""
    base = APP_DIR if svc_type == "apps" else SERVICE_DIR
    out_dir = base / service_name
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def strip_empty_lines(text: str) -> str:
    """Remove lines that are entirely empty or all whitespace."""
    return "\n".join(line for line in text.splitlines() if line.strip())


# ==============================
# Mapping / Defaults
# ==============================


def base_mapping(app_name: str, svc: ServiceItem) -> Dict[str, Any]:
    """Construct base mapping (service-level, no env)."""
    service_name = svc.get("service_name")
    if not service_name:
        raise SystemExit("[ERROR] Each service item must have 'service_name'.")

    svc_type = svc.get("type", "services")

    return {
        "app_name": app_name,
        "service_name": service_name,
        "type": svc_type,
        "dockerfile": svc.get("dockerfile"),
        "opa_image": svc.get("opa_image"),
        "opa_dockerfile": svc.get("opa_dockerfile"),
        "pipeline": svc.get("pipeline", f"{app_name}-{service_name}-pipeline"),
        "health_path": svc.get("health_path", "/health"),
        "runtime_project": svc.get("runtime_project"),
    }


def resolve_runtime_project(
    app_name: str,
    env_name: str,
    env_cfg: EnvConfig,
    base: Dict[str, Any],
) -> str:
    """
    Decide runtime_project with priority:
      1) env_cfg.runtime_project
      2) base.runtime_project (service-level)
      3) default -> f"{app_name}-{env_name}"
    """
    return (
        env_cfg.get("runtime_project")
        or base.get("runtime_project")
        or f"{app_name}-{env_name}"
    )  # type: ignore[return-value]


def iter_target_services(
    data: List[ServiceItem],
    target: Optional[List[str]],
) -> Iterable[ServiceItem]:
    """Yield services filtered by --target-services (if provided)."""
    if not target:
        yield from data
        return

    wanted = set(target)
    filtered = [svc for svc in data if svc.get("service_name") in wanted]
    missing = wanted - {svc.get("service_name") for svc in filtered}
    if missing:
        print(
            f"[WARN] These services were not found and will be skipped: {sorted(missing)}"
        )

    print(
        f"[INFO] Processing only: {sorted({svc['service_name'] for svc in filtered})}"
    )
    yield from filtered


# ==============================
# Rendering
# ==============================


def render_env_files(
    jenv: jinja2.Environment,
    tpaths: TemplatePaths,
    base: Dict[str, Any],
    svc: ServiceItem,
) -> None:
    """Render per-environment templates and write to files."""
    service_name = base["service_name"]
    svc_type = base["type"]
    out_dir = ensure_out_dir(svc_type, service_name)

    # Prepare Skaffold env list
    envs_for_skaffold: List[Dict[str, Any]] = []

    env_cfgs: Dict[str, EnvConfig] = svc.get("envs", {})  # type: ignore[assignment]

    # Load templates once
    tmpl_build = jenv.get_template(tpaths.build.name)
    tmpl_cloudrun = jenv.get_template(tpaths.cloudrun.name)
    tmpl_job = jenv.get_template(tpaths.job_migration.name)

    for env_name in ENVIRONMENTS:
        env_cfg = env_cfgs.get(env_name, {})

        mapping: Dict[str, Any] = {
            **base,
            **env_cfg,  # exec_account / network / env_vars / cloud_sql_instance 等はそのまま渡す
            "env": env_name,
            "target": env_cfg.get("target", f"{APP_NAME}-{service_name}-{env_name}"),
            "build_args": {
                **env_cfg.get("build_args", {}),  # ← サービス側は使わない（env に集約）
            },
        }

        # specs は既定値に対して env_cfg.specs で上書き
        mapping["specs"] = {
            **SPECS_DEFAULT,
            **env_cfg.get("specs", {}),
        }

        ingress_value = (
            env_cfg.get("ingress")
            or svc.get("ingress")
            or ("internal" if svc_type == "services" else "all")
        )
        mapping["ingress"] = ingress_value

        # default runtime_project = APPNAME-ENV
        mapping["runtime_project"] = resolve_runtime_project(
            APP_NAME, env_name, env_cfg, base
        )

        envs_for_skaffold.append(
            {"name": env_name, "build_args": mapping["build_args"]}
        )

        # Render & write (build.yaml, cloudrun.yaml, job-migration.yaml)
        for name, template in (
            ("build.yaml", tmpl_build),
            ("cloudrun.yaml", tmpl_cloudrun),
            ("job-migration.yaml", tmpl_job),
        ):
            rendered = strip_empty_lines(template.render(mapping))
            out_path = out_dir / f"{env_name}-{name}"
            out_path.write_text(rendered, encoding="utf-8")
            print(f"[OK] Wrote {out_path}")

    # Render Skaffold (shared)
    tmpl_skaffold = jenv.get_template(tpaths.skaffold.name)
    rendered_skaffold = strip_empty_lines(
        tmpl_skaffold.render({**base, "envs": envs_for_skaffold})
    )
    (out_dir / "skaffold.yaml").write_text(rendered_skaffold, encoding="utf-8")
    print(f"[OK] Wrote {out_dir / 'skaffold.yaml'}")


# ==============================
# Orchestration
# ==============================


def generate(service_file: Path, target_services: Optional[List[str]] = None) -> None:
    services = read_services(service_file)
    jenv = create_jinja_env(TEMPLATE_DIR)
    tpaths = TemplatePaths.default()

    for svc in iter_target_services(services, target_services):
        base = base_mapping(APP_NAME, svc)
        render_env_files(jenv, tpaths, base, svc)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate service infra configs.")
    p.add_argument(
        "service_file",
        nargs="?",
        default="infra/services.json",
        help="Path to services.json",
    )
    p.add_argument(
        "--target-services", nargs="+", help="Only process specified services"
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    generate(Path(args.service_file), args.target_services)


if __name__ == "__main__":
    main()
