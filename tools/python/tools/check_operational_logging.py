from app.apis.contracts import OPERATIONS
from tools.api_analysis import analyze_operation


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
        runtime_events = {
            call.event
            for call in analyze_operation(contract).integrations
            if call.resource == "audit_log" and call.event is not None
        }
        if seen != runtime_events:
            raise SystemExit(
                f"{contract.markdown_slug}: message drift "
                f"catalog={sorted(seen)}, runtime={sorted(runtime_events)}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
