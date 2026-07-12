from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NonEmpty = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ApiBaseModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ErrorDetail(ApiBaseModel):
    code: str = Field(description="エラーを機械的に識別するコードです。")
    message: str = Field(description="利用者向けのエラー説明です。")
    request_id: str = Field(description="処理を追跡するリクエストIDです。")


class ErrorOut(ApiBaseModel):
    error: ErrorDetail


PROTECTED_RESPONSES: dict[int | str, dict[str, object]] = {
    401: {"model": ErrorOut, "description": "認証情報がない、または形式が不正です。"},
    403: {"model": ErrorOut, "description": "操作または根拠への権限がありません。"},
    422: {"model": ErrorOut, "description": "入力がOpenAPI schemaに適合しません。"},
}
