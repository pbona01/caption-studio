from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, *, code: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    content: dict[str, Any] = {
        "error": {"code": exc.code, "message": exc.message},
    }
    return JSONResponse(status_code=exc.status_code, content=content)

