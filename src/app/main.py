from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import router
from app.core.config import get_settings
from app.schemas import ErrorDetail, ErrorOut
from app.services import new_request_id


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(title=settings.app_name, version="0.1.0")
    application.include_router(router)

    @application.get(
        "/health", tags=["system"], summary="死活状態を取得する", operation_id="health"
    )
    async def health() -> dict[str, str]:
        return {"status": "ok"}

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
