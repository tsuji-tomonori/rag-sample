from typing import Annotated, Literal

from pydantic import BaseModel, Field, StringConstraints, model_validator

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class DocumentIn(BaseModel):
    document_id: NonEmpty
    version: NonEmpty
    title: NonEmpty
    text: NonEmpty
    owner_subject: NonEmpty
    allowed_groups: list[NonEmpty] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def require_acl(self) -> "DocumentIn":
        if not self.owner_subject and not self.allowed_groups:
            raise ValueError("an owner or allowed group is required")
        return self


class IngestOut(BaseModel):
    document_id: str
    version: str
    chunk_count: int
    request_id: str


class SearchIn(BaseModel):
    query: NonEmpty
    top_k: int = Field(default=5, ge=1, le=20)


class SearchHit(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    text: str
    rank: int
    sparse_score: float
    dense_score: float
    fused_score: float


class SearchOut(BaseModel):
    hits: list[SearchHit]
    request_id: str


class AnswerIn(BaseModel):
    question: NonEmpty
    top_k: int = Field(default=5, ge=1, le=20)


class Citation(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    source_text: str
    rank: int
    score: float


class AnswerOut(BaseModel):
    status: Literal["answered", "insufficient_evidence"]
    answer: str
    citations: list[Citation]
    request_id: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str


class ErrorOut(BaseModel):
    error: ErrorDetail
