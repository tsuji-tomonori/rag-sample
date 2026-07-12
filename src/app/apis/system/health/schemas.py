from typing import Literal

from pydantic import Field

from app.apis.base import ApiBaseModel


class HealthOut(ApiBaseModel):
    status: Literal["ok"] = Field(description="API processの死活状態です。")
