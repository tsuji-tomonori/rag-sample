from app.apis.documents.ingest_document.schemas import DocumentIn, IngestOut

INGEST_REQUEST_SAMPLE = DocumentIn(
    document_id="support-policy",
    version="1",
    title="Support Policy",
    text="Support hours are weekdays from 09:00 to 17:00.",
    owner_subject="alice",
    allowed_groups=["support"],
)
INGEST_RESPONSE_SAMPLE = IngestOut(
    document_id="support-policy", version="1", chunk_count=1, request_id="request-001"
)
