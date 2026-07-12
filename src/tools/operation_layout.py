from pathlib import Path

from app.apis.contract import ApiContract
from app.apis.contracts import OPERATIONS

ROOT = Path(__file__).resolve().parents[2]
API_ROOT = ROOT / "src/app/apis"
REQUIRED_FILES = (
    "__init__.py",
    "contract.py",
    "functions.py",
    "message_catalog.py",
    "queries.py",
    "router.py",
    "samples.py",
    "schemas.py",
    "generated/__init__.py",
    "generated/queries.py",
    "sql/001_operation_boundary.sql",
)


def operation_dir(contract: ApiContract) -> Path:
    return API_ROOT / contract.markdown_slug


def layout_errors() -> list[str]:
    errors: list[str] = []
    for contract in OPERATIONS:
        directory = operation_dir(contract)
        for relative in REQUIRED_FILES:
            if not (directory / relative).is_file():
                errors.append(f"{contract.markdown_slug}: missing {relative}")
        generated = directory / "generated/queries.py"
        if generated.is_file():
            content = generated.read_text(encoding="utf-8")
            if "typed integration ports in functions.py" not in content:
                errors.append(f"{contract.markdown_slug}: data-access marker is missing")
            if 'SQL_DIR = Path(__file__).parents[1] / "sql"' not in content:
                errors.append(f"{contract.markdown_slug}: SQL_DIR contract is missing")
    return errors


def assert_layout() -> None:
    errors = layout_errors()
    if errors:
        raise SystemExit("\n".join(errors))
