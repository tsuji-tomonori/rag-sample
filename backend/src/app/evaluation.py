from dataclasses import dataclass
from math import ceil


@dataclass(frozen=True, slots=True)
class EvaluationCase:
    case_id: str
    expected_document_ids: frozenset[str]
    answerable: bool

    def __post_init__(self) -> None:
        if not self.case_id.strip():
            raise ValueError("case_id must not be empty")
        if self.answerable and not self.expected_document_ids:
            raise ValueError("answerable cases require expected documents")


@dataclass(frozen=True, slots=True)
class EvaluationResult:
    case_id: str
    retrieved_document_ids: tuple[str, ...]
    status: str
    cited_document_ids: tuple[str, ...]
    latency_ms: float

    def __post_init__(self) -> None:
        if self.status not in {"answered", "insufficient_evidence"}:
            raise ValueError("result status is invalid")
        if self.latency_ms < 0:
            raise ValueError("latency_ms must be non-negative")


@dataclass(frozen=True, slots=True)
class EvaluationMetrics:
    case_count: int
    recall_at_k: float
    mean_reciprocal_rank: float
    answer_status_accuracy: float
    abstention_recall: float
    citation_precision: float
    p50_latency_ms: float
    p95_latency_ms: float

    def as_dict(self) -> dict[str, int | float]:
        return {
            "case_count": self.case_count,
            "recall_at_k": self.recall_at_k,
            "mean_reciprocal_rank": self.mean_reciprocal_rank,
            "answer_status_accuracy": self.answer_status_accuracy,
            "abstention_recall": self.abstention_recall,
            "citation_precision": self.citation_precision,
            "p50_latency_ms": self.p50_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
        }


def evaluate(
    cases: tuple[EvaluationCase, ...], results: tuple[EvaluationResult, ...]
) -> EvaluationMetrics:
    if not cases:
        raise ValueError("evaluation dataset must not be empty")
    case_map = _unique_by_id(cases, "case")
    result_map = _unique_by_id(results, "result")
    missing = sorted(set(case_map).difference(result_map))
    unexpected = sorted(set(result_map).difference(case_map))
    if missing or unexpected:
        raise ValueError(f"case/result ID mismatch: missing={missing}, unexpected={unexpected}")

    recalls: list[float] = []
    reciprocal_ranks: list[float] = []
    status_matches = 0
    abstention_total = 0
    abstention_matches = 0
    citation_hits = 0
    citation_total = 0
    latencies: list[float] = []

    for case_id, case in case_map.items():
        result = result_map[case_id]
        retrieved = result.retrieved_document_ids
        if case.expected_document_ids:
            retrieved_expected = case.expected_document_ids.intersection(retrieved)
            recalls.append(len(retrieved_expected) / len(case.expected_document_ids))
            reciprocal_ranks.append(_reciprocal_rank(retrieved, case.expected_document_ids))

        predicted_answerable = result.status == "answered"
        status_matches += int(predicted_answerable == case.answerable)
        if not case.answerable:
            abstention_total += 1
            abstention_matches += int(not predicted_answerable)

        citation_total += len(result.cited_document_ids)
        citation_hits += sum(
            document_id in case.expected_document_ids for document_id in result.cited_document_ids
        )
        latencies.append(result.latency_ms)

    return EvaluationMetrics(
        case_count=len(cases),
        recall_at_k=_mean(recalls),
        mean_reciprocal_rank=_mean(reciprocal_ranks),
        answer_status_accuracy=status_matches / len(cases),
        abstention_recall=abstention_matches / abstention_total if abstention_total else 1.0,
        citation_precision=citation_hits / citation_total if citation_total else 1.0,
        p50_latency_ms=_percentile(latencies, 0.50),
        p95_latency_ms=_percentile(latencies, 0.95),
    )


def _unique_by_id[T: EvaluationCase | EvaluationResult](
    values: tuple[T, ...], label: str
) -> dict[str, T]:
    indexed: dict[str, T] = {}
    for value in values:
        if value.case_id in indexed:
            raise ValueError(f"duplicate {label} ID: {value.case_id}")
        indexed[value.case_id] = value
    return indexed


def _reciprocal_rank(retrieved: tuple[str, ...], expected: frozenset[str]) -> float:
    for rank, document_id in enumerate(retrieved, start=1):
        if document_id in expected:
            return 1 / rank
    return 0.0


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 1.0


def _percentile(values: list[float], quantile: float) -> float:
    ordered = sorted(values)
    return ordered[max(0, ceil(len(ordered) * quantile) - 1)]
