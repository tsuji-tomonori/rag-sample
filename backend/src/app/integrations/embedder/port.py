from typing import Protocol


class EmbedderPort(Protocol):
    """検索・索引用embedding生成境界です。"""

    def embed(self, text: str) -> tuple[float, ...]: ...
