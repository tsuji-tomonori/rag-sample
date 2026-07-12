from typing import Protocol

from app.domain import RankedChunk


class AnswerGeneratorPort(Protocol):
    """認可済み根拠に限定した回答生成境界です。"""

    def generate(self, question: str, evidence: tuple[RankedChunk, ...]) -> str: ...
