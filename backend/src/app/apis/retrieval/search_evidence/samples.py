from app.apis.retrieval.search_evidence.schemas import SearchHit, SearchIn, SearchOut

SEARCH_REQUEST_SAMPLE = SearchIn(query="support hours", top_k=5)
SEARCH_RESPONSE_SAMPLE = SearchOut(
    hits=[
        SearchHit(
            document_id="support-policy",
            chunk_id="support-policy:1:0",
            title="Support Policy",
            text="Support hours are weekdays from 09:00 to 17:00.",
            rank=1,
            sparse_score=1.0,
            dense_score=0.82,
            fused_score=0.0328,
        )
    ],
    request_id="request-002",
)
