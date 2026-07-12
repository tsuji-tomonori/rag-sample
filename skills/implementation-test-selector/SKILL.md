---
name: implementation-test-selector
description: Select and execute the smallest sufficient lint, type, test, build, design-drift, synth, and browser checks for a change.
---
# Implementation test selector

1. Map changed Python, contract, Web, infra, docs, and skills files to targeted checks.
2. Run targeted checks first, then `task verify` for shared contracts or cross-layer behavior.
3. Use `task e2e` for user-visible flows and `task synth` for infrastructure changes.
4. Classify failures as regression, stale expectation, dependency, sandbox, or external-state issue.
5. Report every skipped command and reason; a timeout or interrupted check is not a pass.
