from app.apis.answers.generate_grounded_answer.contract import CONTRACT as ANSWER
from app.apis.documents.ingest_document.contract import CONTRACT as INGEST
from app.apis.retrieval.search_evidence.contract import CONTRACT as SEARCH
from app.apis.system.health.contract import CONTRACT as HEALTH

OPERATIONS = (HEALTH, INGEST, SEARCH, ANSWER)
MESSAGE_CATALOG = tuple(message for operation in OPERATIONS for message in operation.messages)
