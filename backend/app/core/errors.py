"""
app/core/errors.py
Standardised HTTP exception classes and a global exception handler factory.
All API errors should raise one of these classes for consistent JSON shape.
"""
from typing import Any, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


# ── Standard JSON error shape ────────────────────────────────────
# { "error": "NOT_FOUND", "detail": "...", "field": null }

class AppError(Exception):
    """Base application error with HTTP status and structured detail."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code:  str = "INTERNAL_ERROR"

    def __init__(self, detail: str = "An unexpected error occurred.", field: Optional[str] = None):
        self.detail = detail
        self.field  = field
        super().__init__(detail)

    def to_dict(self) -> dict:
        return {"error": self.error_code, "detail": self.detail, "field": self.field}


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    error_code  = "NOT_FOUND"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    error_code  = "CONFLICT"


class ValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code  = "VALIDATION_ERROR"


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    error_code  = "FORBIDDEN"


class UnauthorisedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code  = "UNAUTHORISED"


class BadRequestError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code  = "BAD_REQUEST"


class PeriodLockedError(AppError):
    status_code = status.HTTP_423_LOCKED
    error_code  = "PERIOD_LOCKED"


class SodViolationError(AppError):
    status_code = status.HTTP_409_CONFLICT
    error_code  = "SOD_VIOLATION"


class IntegrityError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code  = "INTEGRITY_ERROR"


# ── Exception handlers for FastAPI app ───────────────────────────
def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first  = errors[0] if errors else {}
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error":  "VALIDATION_ERROR",
            "detail": first.get("msg", "Validation failed"),
            "field":  ".".join(str(x) for x in first.get("loc", [])) or None,
            "errors": errors,
        },
    )


def register_exception_handlers(app) -> None:
    """Call this in main.py to register all custom exception handlers."""
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
