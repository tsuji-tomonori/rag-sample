# 要求トレーサビリティ

| 要求 | 設計 | 実装 | 検証 |
|---|---|---|---|
| REQ-001 | ARC-001, DES-001 | `app.apis.answers.generate_grounded_answer.functions` | `backend/tests/test_api.py::test_answer_has_citation_and_refuses_weak_evidence` |
| REQ-002 | ARC-001, DES-001 | `app.adapters.memory.InMemoryChunkStore.search` | `backend/tests/test_api.py::test_acl_is_applied_before_search` |
| REQ-003 | ARC-001 | `app.apis.retrieval.search_evidence.functions`, `app.adapters.local.InMemoryChunkStore` | `backend/tests/test_retrieval.py` |
| REQ-004 | ARC-001, DES-001 | `app.apis.documents.ingest_document.functions` | `backend/tests/test_api.py::test_ingest_and_search` |
| REQ-005 | ARC-002, DES-002 | `app.evaluation.evaluate` | `backend/tests/test_evaluation.py` |
| REQ-006 | ARC-003, DES-003 | `app.adapters.aws` | `backend/tests/test_aws_adapters.py` |
| REQ-007 | ARC-003, DES-004 | `app.auth.CognitoAuthenticator` | `backend/tests/test_auth.py` |
| REQ-008 | ARC-003 | `infra/scripts/bundle-api.mjs`, `infra/lib/rag-engineering-stack.ts` | `infra/test/bundle.test.ts` lock/version/path検証, `infra/test/stack.test.ts` |
| REQ-009 | DES-004 | `frontend/web/src/authClient.ts` | `frontend/web/src/runtimeConfig.test.ts`, `frontend/web/e2e/evidence-flow.spec.ts` |
| REQ-010 | ARC-003 | `infra/lib/rag-engineering-stack.ts`, `frontend/web/src/realtimeClient.ts` | `infra/test/stack.test.ts`, `frontend/web/src/realtimeClient.test.ts`, `backend/tests/test_api.py::test_ingest_requires_admin_group` |
| REQ-011 | OPS-003 | `infra/lib/rag-engineering-stack.ts` | `infra/test/stack.test.ts` observability test |
| REQ-012 | DES-005 | `tools.api_docs`, `tools.generate_*`, `tools/web-inventory.mjs`, `tools/infra-inventory/generate-infra-inventory.mjs` | `backend/tests/test_design_contract.py`, `backend/tests/test_lazunex_layout.py`, `task docs:check` |
| REQ-013 | ARC-004, DES-006, OPS-004 | `.github/workflows/deploy.yml` | `backend/tests/test_deploy_workflow.py`, `task verify` |
| REQ-014 | ARC-005, DES-007, OPS-001 | `backend/`, `frontend/`, `infra/`, `docs/`, `tools/` | `backend/tests/test_repository_layout.py`, `task verify`, `task e2e` |
