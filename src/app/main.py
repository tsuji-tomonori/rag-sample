from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.apis.answers.generate_grounded_answer.router import router as answer_router
from app.apis.base import ErrorDetail, ErrorOut
from app.apis.documents.ingest_document.router import router as ingest_router
from app.apis.retrieval.search_evidence.router import router as search_router
from app.apis.system.health.router import router as health_router
from app.core.config import get_settings
from app.integrations.rag_runtime import new_request_id


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.include_router(health_router)
    application.include_router(ingest_router)
    application.include_router(search_router)
    application.include_router(answer_router)

    @application.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        request_id = new_request_id()
        body = ErrorOut(
            error=ErrorDetail(
                code="validation_error", message=str(exc.errors()[0]["msg"]), request_id=request_id
            )
        )
        return JSONResponse(status_code=422, content=body.model_dump())

    @application.exception_handler(HTTPException)
    async def http_error(_request: Request, exc: HTTPException) -> JSONResponse:
        request_id = new_request_id()
        code = "authentication_required" if exc.status_code == 401 else "http_error"
        body = ErrorOut(
            error=ErrorDetail(code=code, message=str(exc.detail), request_id=request_id)
        )
        return JSONResponse(status_code=exc.status_code, content=body.model_dump())

    @application.exception_handler(ValueError)
    async def value_error(_request: Request, exc: ValueError) -> JSONResponse:
        request_id = new_request_id()
        body = ErrorOut(
            error=ErrorDetail(code="invalid_operation", message=str(exc), request_id=request_id)
        )
        return JSONResponse(status_code=400, content=body.model_dump())

    @application.exception_handler(PermissionError)
    async def permission_error(_request: Request, exc: PermissionError) -> JSONResponse:
        request_id = new_request_id()
        body = ErrorOut(
            error=ErrorDetail(code="access_denied", message=str(exc), request_id=request_id)
        )
        return JSONResponse(status_code=403, content=body.model_dump())

    return application


app = create_app()
