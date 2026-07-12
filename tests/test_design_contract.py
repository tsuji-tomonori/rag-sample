from app.apis.contracts import OPERATIONS
from app.main import create_app
from tools.api_analysis import analyze_operation


def test_every_runtime_operation_has_unique_design_contract() -> None:
    schema = create_app().openapi()
    runtime_ids = {
        operation["operationId"]
        for path_item in schema["paths"].values()
        for operation in path_item.values()
        if isinstance(operation, dict) and "operationId" in operation
    }
    contract_ids = {operation.operation_id for operation in OPERATIONS}
    assert len(contract_ids) == len(OPERATIONS)
    assert runtime_ids == contract_ids
    assert all(analyze_operation(operation).steps for operation in OPERATIONS)
