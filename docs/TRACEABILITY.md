# 要求トレーサビリティ

| 要求 | 設計 | 実装 | 検証 |
|---|---|---|---|
| REQ-001 | ARC-001, DES-001 | `app.services.rag.RagService.answer` | `tests/test_api.py::test_answer_has_citation_and_refuses_weak_evidence` |
| REQ-002 | ARC-001, DES-001 | `app.adapters.memory.InMemoryChunkStore.search` | `tests/test_api.py::test_acl_is_applied_before_search` |
| REQ-003 | ARC-001 | `app.services.retrieval.HybridRetriever` | `tests/test_retrieval.py` |
| REQ-004 | ARC-001, DES-001 | `app.services.rag.RagService.ingest` | `tests/test_api.py::test_ingest_and_search` |
| REQ-005 | ARC-002, DES-002 | `app.evaluation.evaluate` | `tests/test_evaluation.py` |
| REQ-006 | ARC-003, DES-003 | `app.adapters.aws` | `tests/test_aws_adapters.py` |
| REQ-007 | ARC-003, DES-004 | `app.auth.CognitoAuthenticator` | `tests/test_auth.py` |
| REQ-008 | ARC-003 | `infra/lib/rag-engineering-stack.ts` | `infra/test/stack.test.ts` |
| REQ-009 | DES-004 | `apps/web/src/authClient.ts` | `apps/web/src/runtimeConfig.test.ts`, `apps/web/e2e/evidence-flow.spec.ts` |
