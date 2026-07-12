# 要求トレーサビリティ

| 要求 | 設計 | 実装 | 検証 |
|---|---|---|---|
| REQ-001 | ARC-001, DES-001 | `app.apis.answers.generate_grounded_answer.functions` | `tests/test_api.py::test_answer_has_citation_and_refuses_weak_evidence` |
| REQ-002 | ARC-001, DES-001 | `app.adapters.memory.InMemoryChunkStore.search` | `tests/test_api.py::test_acl_is_applied_before_search` |
| REQ-003 | ARC-001 | `app.apis.retrieval.search_evidence.functions`, `app.adapters.local.InMemoryChunkStore` | `tests/test_retrieval.py` |
| REQ-004 | ARC-001, DES-001 | `app.apis.documents.ingest_document.functions` | `tests/test_api.py::test_ingest_and_search` |
| REQ-005 | ARC-002, DES-002 | `app.evaluation.evaluate` | `tests/test_evaluation.py` |
| REQ-006 | ARC-003, DES-003 | `app.adapters.aws` | `tests/test_aws_adapters.py` |
| REQ-007 | ARC-003, DES-004 | `app.auth.CognitoAuthenticator` | `tests/test_auth.py` |
| REQ-008 | ARC-003 | `infra/lib/rag-engineering-stack.ts` | `infra/test/stack.test.ts` |
| REQ-009 | DES-004 | `apps/web/src/authClient.ts` | `apps/web/src/runtimeConfig.test.ts`, `apps/web/e2e/evidence-flow.spec.ts` |
| REQ-010 | ARC-003 | `infra/lib/rag-engineering-stack.ts`, `apps/web/src/realtimeClient.ts` | `infra/test/stack.test.ts`, `apps/web/src/realtimeClient.test.ts`, `tests/test_api.py::test_ingest_requires_admin_group` |
| REQ-011 | OPS-003 | `infra/lib/rag-engineering-stack.ts` | `infra/test/stack.test.ts` observability test |
| REQ-012 | DES-005 | `tools.api_docs`, `tools.generate_*`, `tools/web-inventory.mjs`, `infra/scripts/generate-inventory.ts` | `tests/test_design_contract.py`, `tests/test_lazunex_layout.py`, `task docs:check` |
