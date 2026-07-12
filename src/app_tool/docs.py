import argparse
import json
from pathlib import Path

from app.main import app

ROOT = Path(__file__).resolve().parents[2]
OPENAPI = ROOT / "docs/generated/openapi.json"
API_LIST = ROOT / "docs/generated/api-list.md"


def render() -> dict[Path, str]:
    schema = app.openapi()
    rows = ["# API 一覧", "", "| Method | Path | Summary |", "|---|---|---|"]
    for path, operations in sorted(schema["paths"].items()):
        for method, operation in sorted(operations.items()):
            rows.append(f"| {method.upper()} | `{path}` | {operation.get('summary', '')} |")
    return {
        OPENAPI: json.dumps(schema, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        API_LIST: "\n".join(rows) + "\n",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate implementation-derived API design")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    generated = render()
    if args.check:
        stale = [
            str(path.relative_to(ROOT))
            for path, body in generated.items()
            if not path.exists() or path.read_text() != body
        ]
        if stale:
            raise SystemExit("stale generated docs: " + ", ".join(stale))
        return
    for path, body in generated.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body)
