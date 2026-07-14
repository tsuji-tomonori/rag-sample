"""Compatibility aliases for integration-local ports."""

from app.integrations.answer_generator.port import AnswerGeneratorPort
from app.integrations.chunk_store.port import ChunkStorePort
from app.integrations.embedder.port import EmbedderPort

AnswerGenerator = AnswerGeneratorPort
ChunkStore = ChunkStorePort
Embedder = EmbedderPort

__all__ = ("AnswerGenerator", "ChunkStore", "Embedder")
