from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MessageContract:
    catalog_id: str
    message_id: str
    level: str
    summary: str
    when: str
    operator_action: str
    runbook: str
    output_fields: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class ApiContract:
    operation_id: str
    markdown_slug: str
    method: str
    path: str
    summary: str
    description: str
    auth_mode: str
    business_summary: str
    permissions: tuple[str, ...]
    sequence: tuple[str, ...]
    prerequisites: tuple[str, ...]
    resource_changes: tuple[str, ...]
    response_sources: tuple[tuple[str, str], ...]
    test_factors: tuple[str, ...]
    messages: tuple[MessageContract, ...]
    sql_summary: str
    sql_tables: tuple[str, ...]

    @property
    def domain(self) -> str:
        return self.markdown_slug.split("/", maxsplit=1)[0]

    @property
    def api(self) -> str:
        return self.markdown_slug.split("/", maxsplit=1)[1]
