import pytest

from app.evaluation import EvaluationCase, EvaluationResult, evaluate


def test_evaluation_reports_retrieval_grounding_and_latency() -> None:
    cases = (
        EvaluationCase("answerable", frozenset({"policy", "faq"}), True),
        EvaluationCase("unknown", frozenset(), False),
    )
    results = (
        EvaluationResult("answerable", ("other", "policy"), "answered", ("policy",), 20),
        EvaluationResult("unknown", (), "insufficient_evidence", (), 100),
    )
    metrics = evaluate(cases, results)
    assert metrics.case_count == 2
    assert metrics.recall_at_k == 0.5
    assert metrics.mean_reciprocal_rank == 0.5
    assert metrics.answer_status_accuracy == 1
    assert metrics.abstention_recall == 1
    assert metrics.citation_precision == 1
    assert metrics.p50_latency_ms == 20
    assert metrics.p95_latency_ms == 100


def test_evaluation_rejects_mismatched_and_duplicate_ids() -> None:
    case = EvaluationCase("case", frozenset({"doc"}), True)
    result = EvaluationResult("other", (), "insufficient_evidence", (), 1)
    with pytest.raises(ValueError, match="ID mismatch"):
        evaluate((case,), (result,))
    with pytest.raises(ValueError, match="duplicate case ID"):
        evaluate((case, case), ())
