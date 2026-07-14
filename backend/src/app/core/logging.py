import json
import logging
from collections.abc import Mapping

logger = logging.getLogger("rag.audit")


def audit(event: str, fields: Mapping[str, object]) -> None:
    """Emit a structured event without document or query content."""

    logger.info(json.dumps({"event": event, **fields}, ensure_ascii=True, sort_keys=True))
