from pydantic import Field

from app.apis.base import ApiBaseModel, NonEmpty


class SearchIn(ApiBaseModel):
    query: NonEmpty = Field(description="根拠候補を検索する質問または検索語です。")
    top_k: int = Field(default=5, ge=1, le=20, description="返却する根拠候補の上限です。")


class SearchHit(ApiBaseModel):
    document_id: str = Field(description="根拠を含む文書IDです。")
    chunk_id: str = Field(description="根拠チャンクIDです。")
    title: str = Field(description="根拠文書のタイトルです。")
    text: str = Field(description="認可済み根拠本文です。")
    rank: int = Field(description="融合後の順位です。")
    sparse_score: float = Field(description="疎検索の診断scoreです。")
    dense_score: float = Field(description="密検索の診断scoreです。")
    fused_score: float = Field(description="Reciprocal Rank Fusion scoreです。")


class SearchOut(ApiBaseModel):
    hits: list[SearchHit] = Field(description="ACL検証済みの根拠候補です。")
    request_id: str = Field(description="処理を追跡するリクエストIDです。")
