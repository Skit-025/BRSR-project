"""
app/modules/validation/__init__.py
Validation engine, rule suites, and exception workflows.
"""
from app.modules.validation.models import ValidationResult, Severity
from app.modules.validation.engine import validate_submission
from app.modules.validation.router import router

__all__ = ["ValidationResult", "Severity", "validate_submission", "router"]
