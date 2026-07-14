from typing import cast

from app.apis.contracts import OPERATIONS
from app.main import app
from tools.api_analysis import analyze_operation
from tools.operation_layout import assert_layout


def main() -> int:
    assert_layout()
    schema = app.openapi()
    paths = cast(dict[str, object], schema["paths"])
    runtime_ids: set[str] = set()
    for path_item_value in paths.values():
        if not isinstance(path_item_value, dict):
            continue
        path_item = cast(dict[str, object], path_item_value)
        for operation_value in path_item.values():
            if not isinstance(operation_value, dict):
                continue
            operation = cast(dict[str, object], operation_value)
            operation_id = operation.get("operationId")
            if isinstance(operation_id, str):
                runtime_ids.add(operation_id)
    contract_ids = {contract.operation_id for contract in OPERATIONS}
    if runtime_ids != contract_ids:
        runtime = sorted(runtime_ids)
        contracts = sorted(contract_ids)
        raise SystemExit(f"operation contract drift: runtime={runtime}, contract={contracts}")
    for contract in OPERATIONS:
        analysis = analyze_operation(contract)
        if not analysis.steps:
            raise SystemExit(f"{contract.markdown_slug}: implementation-derived sequence is empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
