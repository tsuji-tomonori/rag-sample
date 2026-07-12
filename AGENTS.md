# Repository operating rules

## Source of truth

- Product requirements live in `docs/1_要求_REQ/`, architecture decisions in
  `docs/2_アーキテクチャ_ARC/`, designs in `docs/3_設計_DES/`, and operations
  in `docs/4_運用_OPS/`.
- Every requirement is atomic, has acceptance criteria, and is linked from
  `docs/TRACEABILITY.md` to implementation and verification evidence.
- `docs/rag-engineering-guide.pdf` is the product-domain source. `.workspace/`
  contains read-only references and must never be committed.

## Work discipline

- Put active work in `tasks/do/` before implementation. Move it to
  `tasks/done/` only after every acceptance criterion has evidence.
- Append decisions, commands, outcomes, and unresolved risks to a report in
  `reports/working/` while working. Never claim an unexecuted check passed.
- Keep domain policy independent of frameworks and providers. External systems
  are ports with production and local adapters.
- Authorization is a retrieval hard filter. Content outside the caller's ACL
  must not enter ranking, prompts, logs, or responses.
- Do not add benchmark answers, fixture-specific branches, demo fallbacks, or
  silent degradation to production paths.
- Do not deploy. Synthesis and local emulation are allowed; deployment commands
  require explicit user approval.

## Coding conventions

- Python 3.12, strict typing, Ruff, Pyright, pytest, and Pydantic v2.
- Public functions and API operations require concise descriptions. Keep route
  functions thin and put policy in services.
- Use immutable domain records where practical. Return structured errors with a
  stable code, message, and request ID. Emit structured audit events.
- Tests mirror module boundaries and cover success, denial, invalid input, and
  failure behavior. Generated design artifacts must be reproducible.

## Completion gates

- Run `uv run pre-commit run --all-files`, `uv run pytest`,
  `uv run pyright`, and `uv run app-docs --check` for backend changes.
- Update requirements, designs, traceability, task status, and work report in
  the same change as behavior.
- Use Japanese Git commit messages in the form
  `<emoji> <type>(<scope>): <日本語の要約>`.

