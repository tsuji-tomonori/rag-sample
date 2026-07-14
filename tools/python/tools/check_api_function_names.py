import ast

from app.apis.contracts import OPERATIONS
from tools.operation_layout import operation_dir


def main() -> int:
    for contract in OPERATIONS:
        router = operation_dir(contract) / "router.py"
        tree = ast.parse(router.read_text(encoding="utf-8"), filename=str(router))
        endpoint = next(
            (node for node in tree.body if isinstance(node, ast.AsyncFunctionDef)), None
        )
        if endpoint is None:
            raise SystemExit(f"{router}: async endpoint is missing")
        calls = [
            node
            for node in ast.walk(endpoint)
            if isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "api_functions"
        ]
        if not calls:
            raise SystemExit(f"{router}: endpoint must call api_functions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
