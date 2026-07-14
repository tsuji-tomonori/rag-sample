from app.adapters.local import HashingEmbedder, InMemoryChunkStore
from app.domain import Chunk, Principal


def test_hybrid_search_deduplicates_identical_chunks() -> None:
    embedder = HashingEmbedder()
    text = "alpha beta gamma"
    store = InMemoryChunkStore()
    store.replace_document(
        "doc",
        tuple(
            Chunk(
                chunk_id=f"doc:1:{ordinal}",
                document_id="doc",
                version="1",
                title="Doc",
                text=text,
                ordinal=ordinal,
                owner_subject="alice",
                allowed_groups=frozenset(),
                embedding=embedder.embed(text),
            )
            for ordinal in range(2)
        ),
    )
    results = store.search(
        principal=Principal("alice", frozenset()),
        query="alpha",
        query_embedding=embedder.embed("alpha"),
        limit=20,
    )
    assert len(results) == 1
    assert results[0].rank == 1
