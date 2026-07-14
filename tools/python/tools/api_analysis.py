from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import Path

from app.apis.contract import ApiContract

ROOT = Path(__file__).resolve().parents[3]
API_ROOT = ROOT / "backend/src/app/apis"


@dataclass(frozen=True, slots=True)
class IntegrationCall:
    resource: str
    method: str
    event: str | None = None


@dataclass(frozen=True, slots=True)
class FunctionAnalysis:
    name: str
    description: str
    arguments: tuple[str, ...]
    return_type: str
    integrations: tuple[IntegrationCall, ...]
    conditions: tuple[str, ...]
    raised_errors: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class SequenceStepAnalysis:
    function: FunctionAnalysis
    condition: str | None = None


@dataclass(frozen=True, slots=True)
class OperationAnalysis:
    contract: ApiContract
    steps: tuple[SequenceStepAnalysis, ...]
    functions: tuple[FunctionAnalysis, ...]

    @property
    def integrations(self) -> tuple[IntegrationCall, ...]:
        calls: list[IntegrationCall] = []
        for step in self.steps:
            for call in step.function.integrations:
                if call not in calls:
                    calls.append(call)
        return tuple(calls)

    @property
    def factors(self) -> tuple[str, ...]:
        factors = ["Bearer認証", "OpenAPI入力検証"] if self.contract.auth_mode != "public" else []
        for step in self.steps:
            if step.condition:
                factors.append(step.condition)
            factors.extend(step.function.conditions)
            factors.extend(f"{call.resource}.{call.method}" for call in step.function.integrations)
            factors.extend(step.function.raised_errors)
        return tuple(dict.fromkeys(factors or ["正常応答"]))


def operation_dir(contract: ApiContract) -> Path:
    return API_ROOT / contract.markdown_slug


def analyze_operation(contract: ApiContract) -> OperationAnalysis:
    directory = operation_dir(contract)
    functions = _function_analyses(directory / "functions.py")
    function_map = {function.name: function for function in functions}
    steps = tuple(
        SequenceStepAnalysis(function_map[name], condition)
        for name, condition in _router_calls(directory / "router.py")
        if name in function_map
    )
    if not steps:
        raise ValueError(f"{contract.markdown_slug}: router has no api_functions calls")
    return OperationAnalysis(contract, steps, tuple(functions))


def _function_analyses(path: Path) -> list[FunctionAnalysis]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    ports = _imported_ports(tree)
    analyses: list[FunctionAnalysis] = []
    for node in tree.body:
        if not isinstance(node, ast.AsyncFunctionDef | ast.FunctionDef) or node.name.startswith(
            "_"
        ):
            continue
        description = ast.get_docstring(node)
        if not description:
            raise ValueError(f"{path}:{node.name}: docstring is required")
        integration_arguments = _integration_arguments(node, ports)
        integrations: list[IntegrationCall] = []
        for call in (item for item in ast.walk(node) if isinstance(item, ast.Call)):
            integration = _integration_call(call, integration_arguments)
            if integration is not None and integration not in integrations:
                integrations.append(integration)
            audit_call = _audit_call(call)
            if audit_call is not None and audit_call not in integrations:
                integrations.append(audit_call)
        analyses.append(
            FunctionAnalysis(
                name=node.name,
                description=" ".join(description.split()),
                arguments=tuple(
                    f"{argument.arg}: {ast.unparse(argument.annotation)}"
                    for argument in (*node.args.args, *node.args.kwonlyargs)
                    if argument.annotation is not None
                ),
                return_type=ast.unparse(node.returns) if node.returns is not None else "None",
                integrations=tuple(integrations),
                conditions=tuple(
                    _condition_label(item.test)
                    for item in ast.walk(node)
                    if isinstance(item, ast.If)
                ),
                raised_errors=tuple(
                    _raised_error(item) for item in ast.walk(node) if isinstance(item, ast.Raise)
                ),
            )
        )
    return analyses


def _imported_ports(tree: ast.AST) -> dict[str, str]:
    ports: dict[str, str] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.ImportFrom):
            continue
        match = re.fullmatch(
            r"app\.integrations\.([A-Za-z_][A-Za-z0-9_]*)\.port", node.module or ""
        )
        if match is None:
            continue
        for alias in node.names:
            ports[alias.asname or alias.name] = match.group(1)
    return ports


def _annotation_name(node: ast.AST | None) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    if isinstance(node, ast.Subscript):
        return _annotation_name(node.value)
    return None


def _integration_arguments(
    function: ast.AsyncFunctionDef | ast.FunctionDef, ports: dict[str, str]
) -> dict[str, str]:
    resources: dict[str, str] = {}
    for argument in (*function.args.args, *function.args.kwonlyargs):
        annotation = _annotation_name(argument.annotation)
        if annotation in ports:
            resources[argument.arg] = ports[annotation]
    return resources


def _integration_call(
    call: ast.Call, integration_arguments: dict[str, str]
) -> IntegrationCall | None:
    callee = call.func
    if not isinstance(callee, ast.Attribute) or not isinstance(callee.value, ast.Name):
        return None
    resource = integration_arguments.get(callee.value.id)
    return IntegrationCall(resource, callee.attr) if resource else None


def _audit_call(call: ast.Call) -> IntegrationCall | None:
    if not isinstance(call.func, ast.Name) or call.func.id != "audit" or not call.args:
        return None
    event = call.args[0]
    return (
        IntegrationCall("audit_log", "emit", event.value)
        if isinstance(event, ast.Constant) and isinstance(event.value, str)
        else None
    )


def _router_calls(path: Path) -> list[tuple[str, str | None]]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    endpoint = next(
        node
        for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef) and not node.name.startswith("_")
    )
    calls: list[tuple[str, str | None]] = []

    class Visitor(ast.NodeVisitor):
        condition: str | None = None

        def visit_IfExp(self, node: ast.IfExp) -> None:
            previous = self.condition
            self.condition = _condition_label(node.test)
            self.visit(node.body)
            self.condition = previous
            self.visit(node.orelse)

        def visit_If(self, node: ast.If) -> None:
            previous = self.condition
            self.condition = _condition_label(node.test)
            for child in node.body:
                self.visit(child)
            self.condition = previous
            for child in node.orelse:
                self.visit(child)

        def visit_Await(self, node: ast.Await) -> None:
            name = _api_function_name(node.value)
            if name is not None:
                calls.append((name, self.condition))
                return
            self.generic_visit(node)

    Visitor().visit(endpoint)
    return calls


def _api_function_name(node: ast.AST) -> str | None:
    if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
        return None
    owner = node.func.value
    if isinstance(owner, ast.Name) and owner.id == "api_functions":
        return node.func.attr
    return None


def _condition_label(node: ast.AST) -> str:
    text = ast.unparse(node)
    replacements = {
        "evidence": "閾値以上の認可済み根拠が存在する場合。",
        "answer is None": "生成回答が存在しない場合。",
        "'admin' not in actor.groups": "呼び出し元がadmin groupに所属しない場合。",
        "document.owner_subject != actor.subject": "文書所有者が認証主体と一致しない場合。",
        "unknown_groups": "許可groupに認証主体が所属しないgroupを含む場合。",
        "not normalized": "正規化後の本文が空の場合。",
        "current": "処理中のチャンクが存在する場合。",
    }
    return replacements.get(text, f"`{text}` が成立する場合。")


def _raised_error(node: ast.Raise) -> str:
    if isinstance(node.exc, ast.Call):
        name = ast.unparse(node.exc.func)
        detail = ast.literal_eval(node.exc.args[0]) if node.exc.args else ""
        return f"{name}: {detail}"
    return ast.unparse(node.exc) if node.exc is not None else "例外再送出"


def participant(resource: str) -> tuple[str, str]:
    mapping = {
        "chunk_store": ("DB", "DB: Chunk Store"),
        "embedder": ("R_embedder", "Resource: Embedder"),
        "answer_generator": ("R_answer_generator", "Resource: Answer Generator"),
        "audit_log": ("R_audit_log", "Resource: Audit Log"),
    }
    return mapping.get(resource, (f"R_{resource}", f"Resource: {resource}"))


def integration_implementation(resource: str) -> str:
    mapping = {
        "chunk_store": "Local InMemoryChunkStore / AWS Bedrock Knowledge Base + S3 Vectors",
        "embedder": "Local HashingEmbedder / AWS Knowledge Base managed embedding",
        "answer_generator": "Local ExtractiveAnswerGenerator / AWS Bedrock Converse",
        "audit_log": "Structured application audit logger",
    }
    return mapping.get(resource, resource)
