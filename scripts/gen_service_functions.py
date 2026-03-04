#!/usr/bin/env python3
"""
Generate TypeScript service clients from a folder of OpenAPI specs.

Key features (parity with previous JS version)
──────────────────────────────────────────────
- Scan *SPEC_DIR* (or CLI‑supplied paths) for .yaml / .yml / .json specs.
- For each spec create `services/<serviceName>.ts` with
  - one function per path+method
  - proper template‑literal URLs (e.g., "/users/{id}" → f"/users/{id}")
  - request body type imports that match openapi‑zod‑client naming (`FooType`).
- Build a barrel `services/index.ts` that re‑exports every generated service.
- Optionally run *prettier* on emitted files if the binary is available.

Run examples
────────────
$ python3 generate_services_multi.py                # generate for all specs in SPEC_DIR
$ python3 generate_services_multi.py specs/user.yaml specs/order.yaml
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    raise SystemExit("PyYAML required: pip install pyyaml") from exc

# -------------------------------------------------------------------------
# Configuration — edit to match monorepo layout
# -------------------------------------------------------------------------
SPEC_DIR = Path("./packages/api-contracts/src/yaml")  # where specs live
SERVICE_OUT_DIR = Path("./packages/api-contracts/src/services")  # .ts output
SCHEMA_DIR = "../zod"  # import root for zod schemas
API_CLIENT_MODULE = "@app-alias/fetchclient"  # runtime fetch wrapper

# -------------------------------------------------------------------------
# Helper functions
# -------------------------------------------------------------------------


def op_id(method: str, path: str, override: str | None = None) -> str:
    """Infer function name from HTTP *method* and path if *override* not given."""
    if override:
        return override
    name = method.lower() + re.sub(
        r"__+",
        "_",
        re.sub(
            r"[{}]", "", re.sub(r"[/-]", "_", re.sub(r"/\{(\w+)}", r"_by_\1", path))
        ),
    )
    return name


def ref_to_type(ref: str | None) -> str | None:
    """Convert JSON Schema $ref → TS type produced by openapi‑zod‑client (suffix *Type*)."""
    if not ref:
        return None
    return ref.rsplit("/", 1)[-1] + "Type"


def path_params(path: str) -> list[str]:
    """Extract path parameter names from "/foo/{bar}" → ["bar"]."""
    return re.findall(r"{(\w+)}", path)


def pascal(s: str) -> str:
    return re.sub(r"[_-]", "", s.title())


def camel(s: str) -> str:
    p = pascal(s)
    return p[:1].lower() + p[1:]


# -------------------------------------------------------------------------
# Core generation logic
# -------------------------------------------------------------------------


def generate_service(spec_path: Path) -> dict[str, str]:
    """Generate one *service*.ts file from *spec_path*."""

    service_stem = spec_path.stem  # d_calendar_svc → d_calendar_svc
    service_var = camel(service_stem) + "Service"  # calendarService
    service_file = SERVICE_OUT_DIR / f"{service_stem}.ts"
    schema_import_path = f"{SCHEMA_DIR}/{service_stem}"

    # 1. Parse spec (no $ref deref needed)
    raw = spec_path.read_text(encoding="utf-8")
    api = (
        yaml.safe_load(raw)
        if spec_path.suffix in {".yml", ".yaml"}
        else json.loads(raw)
    )

    # 2. Prepare output directory & clean previous
    SERVICE_OUT_DIR.mkdir(parents=True, exist_ok=True)
    if service_file.exists():
        service_file.unlink()

    # 3. Build code blocks
    body_types: set[str] = set()
    func_blocks: list[str] = []
    func_names: list[str] = []

    for route, path_item in (api.get("paths") or {}).items():
        for method, op in (path_item or {}).items():
            func_name = op_id(method, route, op.get("operationId"))
            func_names.append(func_name)

            # parameters
            params = path_params(route)
            param_sig = ", ".join(f"{p}: string" for p in params)

            # request body type (supports application/json and multipart/form-data)
            content = op.get("requestBody", {}).get("content", {})
            is_form_data = "multipart/form-data" in content

            # Determine TS type for function signature
            if is_form_data:
                body_ts_type = "FormData"
                json_body_type: str | None = None
            else:
                ref = (
                    content
                    .get("application/json", {})
                    .get("schema", {})
                    .get("$ref")
                )
                json_body_type = ref_to_type(ref)
                body_ts_type = json_body_type

            # Collect import types only for JSON schema-based bodies
            if json_body_type:
                body_types.add(json_body_type)

            # template route
            tpl_route = re.sub(r"{(\w+)}", r"${\1}", route)

            # function block
            args = ", ".join(
                filter(None, [param_sig, f"body: {body_ts_type}" if body_ts_type else ""])
            )
            body_arg = ", { body }" if body_ts_type else ""
            # Emit different client call for FormData vs JSON
            if is_form_data and method.upper() == "POST":
                call_block = (
                    f"""export async function {func_name}({args}) {{
  const {{ data, error }} = await apiClient.POST_FORM_DATA(`{tpl_route}`, body);
  if (error) throw error;
  return data as any; // refine typing in consumer
}}"""
                )
            else:
                call_block = (
                    f"""export async function {func_name}({args}) {{
  const {{ data, error }} = await apiClient.{method.upper()}(`{tpl_route}`{body_arg});
  if (error) throw error;
  return data as any; // refine typing in consumer
}}"""
                )
            func_blocks.append(call_block)

    # 4. Compose file contents
    imports = (
        f'import type {{ {", ".join(sorted(body_types))} }} from "{schema_import_path}";\n'
        if body_types
        else ""
    )
    service_object = (
        f"\nexport const {service_var} = {{\n  {',\n  '.join(func_names)}\n}};\nexport default {service_var};\n"
        if func_names
        else ""
    )
    header = f'import apiClient from "{API_CLIENT_MODULE}";\n'
    content = header + imports + "\n\n".join(func_blocks) + service_object

    service_file.write_text(content, encoding="utf-8")
    print(f"OK generated {len(func_blocks)} functions -> {service_file.name}")

    # 5. prettier (optional, non‑fatal)
    try:
        subprocess.run(
            ["npx", "prettier", "--write", str(service_file)],
            check=False,
            stdout=subprocess.DEVNULL,
        )
    except FileNotFoundError:
        pass

    return {"serviceStem": service_stem, "serviceVar": service_var}


def main() -> None:  # pragma: no cover
    # Collect spec paths from CLI or fallback dir glob
    spec_paths: list[Path]
    if len(sys.argv) > 1:
        spec_paths = [Path(p) for p in sys.argv[1:]]
    else:
        spec_paths = (
            sorted(SPEC_DIR.glob("*.yml"))
            + sorted(SPEC_DIR.glob("*.yaml"))
            + sorted(SPEC_DIR.glob("*.json"))
        )
    if not spec_paths:
        sys.exit("No OpenAPI spec files found.")

    barrel_entries: list[str] = []
    for spec_path in spec_paths:
        info = generate_service(spec_path)
        barrel_entries.append(
            f'export {{ default as {info["serviceVar"]} }} from "./{info["serviceStem"]}";'
        )

    # Write barrel file
    barrel_file = SERVICE_OUT_DIR / "index.ts"
    barrel_file.write_text("\n".join(barrel_entries) + "\n", encoding="utf-8")
    print("OK barrel index.ts updated")


if __name__ == "__main__":
    main()
