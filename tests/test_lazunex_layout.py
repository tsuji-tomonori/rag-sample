from app.apis.contracts import OPERATIONS
from tools.api_docs import DOCS_ROOT, render_outputs
from tools.operation_layout import REQUIRED_FILES, layout_errors, operation_dir


def test_every_operation_uses_lazunex_directory_contract() -> None:
    assert layout_errors() == []
    for contract in OPERATIONS:
        assert {
            str(path.relative_to(operation_dir(contract)))
            for path in operation_dir(contract).glob("**/*")
            if path.is_file()
        } >= set(REQUIRED_FILES)


def test_generated_api_documents_use_lazunex_paths_and_names() -> None:
    outputs = render_outputs()
    expected_names = {
        "if_gen.md",
        "detail-design_gen.md",
        "sequence_gen.md",
        "unit-test_gen.md",
        "messages_gen.md",
        "query_gen.md",
    }
    for contract in OPERATIONS:
        directory = DOCS_ROOT / contract.markdown_slug
        assert {path.name for path in outputs if path.parent == directory} == expected_names
    assert DOCS_ROOT / "apis_list_gen.md" in outputs
    assert DOCS_ROOT / "messages_index_gen.md" in outputs


def test_generated_documents_are_byte_identical_to_renderer() -> None:
    for path, content in render_outputs().items():
        assert path.read_text(encoding="utf-8") == content


def test_data_store_access_is_derived_into_sequences() -> None:
    outputs = render_outputs(("sequence", "query"))
    for slug in (
        "answers/generate_grounded_answer",
        "documents/ingest_document",
        "retrieval/search_evidence",
    ):
        sequence = outputs[DOCS_ROOT / slug / "sequence_gen.md"]
        query = outputs[DOCS_ROOT / slug / "query_gen.md"]
        assert "participant DB as DB: Chunk Store" in sequence
        assert "API->>DB:" in sequence
        assert "ChunkStorePort." in sequence
        assert "ChunkStorePort." in query
        assert "001_operation_boundary.sql" not in query
