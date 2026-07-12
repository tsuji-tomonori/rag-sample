import argparse
import json
from pathlib import Path
from typing import Any, cast

from app.evaluation import EvaluationCase, EvaluationResult, evaluate


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate retrieval and grounded answer artifacts")
    parser.add_argument("--cases", type=Path, required=True)
    parser.add_argument("--results", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    cases = tuple(_case(value) for value in _read_jsonl(args.cases))
    results = tuple(_result(value) for value in _read_jsonl(args.results))
    metrics = evaluate(cases, results)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps({"schema_version": 1, "metrics": metrics.as_dict()}, indent=2, sort_keys=True)
        + "\n",
        encoding="utf-8",
    )


def _read_jsonl(path: Path) -> tuple[dict[str, Any], ...]:
    values: list[dict[str, Any]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        value: object = json.loads(line)
        if not isinstance(value, dict):
            raise ValueError(f"{path}:{line_number}: each line must be a string-keyed object")
        object_map = cast("dict[object, object]", value)
        if not all(isinstance(key, str) for key in object_map):
            raise ValueError(f"{path}:{line_number}: each line must be a string-keyed object")
        values.append(cast("dict[str, Any]", object_map))
    return tuple(values)


def _case(value: dict[str, Any]) -> EvaluationCase:
    return EvaluationCase(
        case_id=str(value["case_id"]),
        expected_document_ids=frozenset(str(item) for item in value["expected_document_ids"]),
        answerable=bool(value["answerable"]),
    )


def _result(value: dict[str, Any]) -> EvaluationResult:
    return EvaluationResult(
        case_id=str(value["case_id"]),
        retrieved_document_ids=tuple(str(item) for item in value["retrieved_document_ids"]),
        status=str(value["status"]),
        cited_document_ids=tuple(str(item) for item in value["cited_document_ids"]),
        latency_ms=float(value["latency_ms"]),
    )
