import argparse
from pathlib import Path

from app.apis.contracts import OPERATIONS
from tools.operation_layout import ROOT, operation_dir

TEMPLATE = """from pathlib import Path

# This file is generated from SQL files in the sibling sql directory.
# Do not edit generated models by hand.
SQL_DIR = Path(__file__).parents[1] / "sql"
OPERATION_BOUNDARY_SQL = SQL_DIR / "001_operation_boundary.sql"
"""


def outputs() -> dict[Path, str]:
    return {operation_dir(contract) / "generated/queries.py": TEMPLATE for contract in OPERATIONS}


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate operation query wrappers from sibling SQL."
    )
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = outputs()
    if args.check:
        stale = [
            str(path.relative_to(ROOT))
            for path, content in rendered.items()
            if not path.exists() or path.read_text(encoding="utf-8") != content
        ]
        if stale:
            raise SystemExit("stale generated queries: " + ", ".join(stale))
        return 0
    for path, content in rendered.items():
        path.write_text(content, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
