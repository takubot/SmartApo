#!/usr/bin/env python3
"""Render Cloud Run Job & Cloud Build configs for multiple jobs and environments (JSON context)."""

from __future__ import annotations

import argparse
import copy
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import jinja2

# Allowed envs
ENVIRONMENTS: List[str] = ["dev", "stg", "prod"]

# Template locations
TEMPLATE_DIR = Path("infra/jobs_template")
RUN_JOB_TEMPLATE = TEMPLATE_DIR / "run-job.yaml.j2"
CLOUDBUILD_TEMPLATE = TEMPLATE_DIR / "build.yaml.j2"

# Output base (Jobs)
JOBS_BASE_DIR = Path("infra/jobs")


# ------------- Jinja env -------------
def create_jinja_env(template_dir: Path) -> jinja2.Environment:
    loader = jinja2.FileSystemLoader(template_dir)
    return jinja2.Environment(
        loader=loader,
        trim_blocks=False,
        lstrip_blocks=True,
    )


# ------------- Helpers -------------
def read_json(path: Path) -> Dict[str, Any]:
    try:
        raw = path.read_text(encoding="utf-8-sig")
        return json.loads(raw)
    except FileNotFoundError as e:
        raise SystemExit(f"[ERROR] Context file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise SystemExit(f"[ERROR] Invalid JSON in {path}: {e}") from e


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"[OK] Wrote {path}")


def strip_empty_lines(text: str) -> str:
    return "\n".join(line for line in text.splitlines() if line.strip())


def iter_envs(requested: Optional[List[str]]) -> Iterable[str]:
    if not requested:
        yield from ENVIRONMENTS
        return
    unknown = set(requested) - set(ENVIRONMENTS)
    if unknown:
        raise SystemExit(
            f"[ERROR] Unknown env(s): {sorted(unknown)} (allowed: {ENVIRONMENTS})"
        )
    yield from requested


# ------------- Planning -------------
@dataclass(frozen=True)
class PlanItem:
    env: str
    job: Dict[str, Any]
    run_job_out: Path
    cloudbuild_out: Path


def plan_for_job(
    root_ctx: Dict[str, Any], job: Dict[str, Any], envs: Iterable[str]
) -> List[PlanItem]:
    job_dir = job.get("job_dir")
    if not job_dir:
        raise SystemExit("[ERROR] Each job must have 'job_dir'")

    out_base = JOBS_BASE_DIR / job_dir
    out_base.mkdir(parents=True, exist_ok=True)

    plans: List[PlanItem] = []
    for env in envs:
        run_job_out = out_base / f"{env}-run-job.yaml"
        cloudbuild_out = out_base / f"{env}-build.yaml"
        plans.append(
            PlanItem(
                env=env, job=job, run_job_out=run_job_out, cloudbuild_out=cloudbuild_out
            )
        )
    return plans


# ------------- Merging logic -------------
def deep_merge(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    """Shallow merge with dict-recursive behavior for dict values (b overrides a)."""
    out = copy.deepcopy(a)
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)  # type: ignore[index]
        else:
            out[k] = copy.deepcopy(v)
    return out


def build_context(
    root_ctx: Dict[str, Any], job: Dict[str, Any], env: str
) -> Dict[str, Any]:
    """
    Final context for rendering = (root defaults) + (job override) + {"env": env}
    - env_vars: if job has its own env_vars, merge with root env_vars[env] (job overrides root).
    - runtime_project, service_account, vpc_connector: maps indexed by env (job can override root map).
    """
    ctx = deep_merge(root_ctx, job)
    ctx["env"] = env

    # Resolve maps by env
    for map_key in ("runtime_project", "service_account", "vpc_connector"):
        if map_key not in ctx or not isinstance(ctx[map_key], dict):
            raise SystemExit(
                f"[ERROR] Missing or invalid '{map_key}' map in context/jobs for job_dir={job.get('job_dir')}"
            )
        # keep as map (templates index with [env])
        # but ensure this env has value
        if env not in ctx[map_key]:
            raise SystemExit(
                f"[ERROR] '{map_key}' has no entry for env='{env}' (job_dir={job.get('job_dir')})"
            )

    # env_vars merge (root -> job)
    env_vars_root = root_ctx.get("env_vars", {})
    env_vars_job = job.get("env_vars", {})
    if not (isinstance(env_vars_root, dict) and isinstance(env_vars_job, dict)):
        raise SystemExit(
            "[ERROR] 'env_vars' must be dict at root/job level if provided."
        )

    env_block_root = (
        env_vars_root.get(env, {})
        if isinstance(env_vars_root.get(env, {}), dict)
        else {}
    )
    env_block_job = (
        env_vars_job.get(env, {}) if isinstance(env_vars_job.get(env, {}), dict) else {}
    )
    env_block_final = {**env_block_root, **env_block_job}  # job overrides root
    ctx["env_vars"] = {env: env_block_final}

    # defaults (only if not already set)
    defaults = root_ctx.get("defaults", {})
    if isinstance(defaults, dict):
        for k, v in defaults.items():
            ctx.setdefault(k, v)

    # sanity checks
    required_keys = [
        "region",
        "project_cd",
        "repo_name",
        "image_name",
        "job_name",
        "dockerfile_path",
        "build_context",
        "short_sha",
    ]
    missing = [k for k in required_keys if k not in ctx]
    if missing:
        raise SystemExit(
            f"[ERROR] Missing required keys in context for job_dir={job.get('job_dir')}: {missing}"
        )

    return ctx


# ------------- Rendering -------------
def render_template(
    jenv: jinja2.Environment, template_path: Path, context: Dict[str, Any]
) -> str:
    tmpl = jenv.get_template(template_path.name)
    return strip_empty_lines(tmpl.render(context))


def render_configs(context_path: Path, envs: Optional[List[str]] = None) -> None:
    root_ctx = read_json(context_path)

    jobs = root_ctx.get("jobs")
    if not isinstance(jobs, list) or not jobs:
        raise SystemExit("[ERROR] jobs.json must contain a non-empty 'jobs' array.")

    jenv = create_jinja_env(TEMPLATE_DIR)

    for job in jobs:
        plans = plan_for_job(root_ctx, job, iter_envs(envs))
        for plan in plans:
            ctx = build_context(root_ctx, job, plan.env)

            # Render Run Job
            rendered_job = render_template(jenv, RUN_JOB_TEMPLATE, ctx)
            write_text(plan.run_job_out, rendered_job)

            # Render Cloud Build
            rendered_cb = render_template(jenv, CLOUDBUILD_TEMPLATE, ctx)
            write_text(plan.cloudbuild_out, rendered_cb)


# ------------- CLI -------------
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Generate Cloud Run Job & Cloud Build configs from jobs.json."
    )
    p.add_argument(
        "--context",
        "-c",
        type=Path,
        default=Path("infra/jobs.json"),
        help="Path to jobs.json (default: jobs.json)",
    )
    p.add_argument(
        "--envs",
        "-e",
        nargs="+",
        help=f"Target environments (subset of {ENVIRONMENTS}); default: all",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    render_configs(args.context, args.envs)


if __name__ == "__main__":
    main()
