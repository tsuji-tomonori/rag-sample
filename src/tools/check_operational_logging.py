from app.apis.contracts import OPERATIONS


def main() -> int:
    for contract in OPERATIONS:
        seen: set[str] = set()
        for message in contract.messages:
            if message.message_id in seen:
                raise SystemExit(f"{contract.markdown_slug}: duplicate {message.message_id}")
            seen.add(message.message_id)
            if not all(
                (
                    message.catalog_id,
                    message.level,
                    message.summary,
                    message.when,
                    message.operator_action,
                    message.runbook,
                    message.output_fields,
                )
            ):
                raise SystemExit(f"{contract.markdown_slug}: incomplete {message.message_id}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
