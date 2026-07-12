import uuid
from dataclasses import dataclass

from app.core.config import Settings
from app.integrations.answer_generator.port import AnswerGeneratorPort
from app.integrations.chunk_store.port import ChunkStorePort
from app.integrations.embedder.port import EmbedderPort


@dataclass(frozen=True, slots=True)
class RagResources:
    """Dependency injection用のprovider集合です。業務処理は保持しません。"""

    settings: Settings
    chunk_store: ChunkStorePort
    embedder: EmbedderPort
    answer_generator: AnswerGeneratorPort


RagRuntime = RagResources


def new_request_id() -> str:
    return str(uuid.uuid4())
