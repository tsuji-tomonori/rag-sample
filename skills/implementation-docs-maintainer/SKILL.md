---
name: implementation-docs-maintainer
description: Keep requirements, design, operations, generated contracts, and user guidance synchronized with behavior changes.
---
# Implementation docs maintainer

1. Identify user-visible, operator-visible, API, configuration, or security behavior changed.
2. Update the smallest durable REQ/ARC/DES/OPS document and `docs/TRACEABILITY.md`.
3. Regenerate implementation-derived OpenAPI, Web inventory, and infra inventory as applicable.
4. Run `task docs:check`; never claim an unexecuted check passed.
5. Put transient decisions and constraints in `reports/working/`, not durable specifications.
