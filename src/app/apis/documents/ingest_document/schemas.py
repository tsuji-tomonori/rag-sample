from pydantic import Field, model_validator

from app.apis.base import ApiBaseModel, NonEmpty


class DocumentIn(ApiBaseModel):
    document_id: NonEmpty = Field(description="文書を一意に識別するIDです。")
    version: NonEmpty = Field(description="文書の版です。")
    title: NonEmpty = Field(description="検索結果と引用に表示する文書名です。")
    text: NonEmpty = Field(description="正規化・チャンク化する文書本文です。")
    owner_subject: NonEmpty = Field(description="文書所有者の認証主体IDです。")
    allowed_groups: list[NonEmpty] = Field(
        default_factory=list,
        max_length=100,
        description="文書を検索できるCognito group一覧です。",
    )

    @model_validator(mode="after")
    def require_acl(self) -> "DocumentIn":
        if not self.owner_subject and not self.allowed_groups:
            raise ValueError("an owner or allowed group is required")
        return self


class IngestOut(ApiBaseModel):
    document_id: str = Field(description="取り込んだ文書IDです。")
    version: str = Field(description="取り込んだ文書の版です。")
    chunk_count: int = Field(description="生成して索引化したチャンク数です。")
    request_id: str = Field(description="処理を追跡するリクエストIDです。")
