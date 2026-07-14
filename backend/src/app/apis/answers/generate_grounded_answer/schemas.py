from typing import Literal

from pydantic import Field

from app.apis.base import ApiBaseModel, NonEmpty


class AnswerIn(ApiBaseModel):
    question: NonEmpty = Field(description="根拠に基づいて回答する質問です。")
    top_k: int = Field(default=5, ge=1, le=20, description="回答生成に渡す根拠候補上限です。")


class Citation(ApiBaseModel):
    document_id: str = Field(description="引用元文書IDです。")
    chunk_id: str = Field(description="引用元チャンクIDです。")
    title: str = Field(description="引用元文書名です。")
    source_text: str = Field(description="回答根拠として使用した本文です。")
    rank: int = Field(description="根拠検索順位です。")
    score: float = Field(description="根拠の融合scoreです。")


class AnswerOut(ApiBaseModel):
    status: Literal["answered", "insufficient_evidence"] = Field(description="回答可否です。")
    answer: str = Field(description="根拠限定回答または回答拒否理由です。")
    citations: list[Citation] = Field(description="回答に使用した認可済み根拠です。")
    request_id: str = Field(description="処理を追跡するリクエストIDです。")
