# Documentation structure

- `1_要求_REQ/`: one atomic, verifiable requirement per file with acceptance criteria.
- `2_アーキテクチャ_ARC/`: accepted architecture decisions, research evidence, and tradeoffs.
- `3_設計_DES/`: implementation design and generation contracts.
- `4_運用_OPS/`: local verification, runtime configuration, monitoring, and response procedures.
- `spec/40.apis/`: Lazunex-compatible implementation-derived API artifacts. Do not edit manually.
- `generated/`: Web/Infra inventoryの互換出力。API設計書はここへ出力しない。
- `TRACEABILITY.md`: requirement to design, implementation, and verification evidence.
- `reports/working/`: transient work evidence; not a durable product specification.

Confirmed facts, inferred decisions, conflicts, and open questions must be labeled in frontmatter or
text. A green generator is evidence only for the scope it derives from; it does not replace behavioral
tests or completion auditing.
