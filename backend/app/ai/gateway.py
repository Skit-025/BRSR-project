import time
import uuid
import logging
from typing import Dict, Any, Type, Optional, TypeVar
from pydantic import BaseModel
from app.config.settings import settings
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.mock import MockFallbackProvider
from app.ai.models import AIRun
from app.ai.schemas import AIRunStatus
from app.ai.governance.pii_redaction import redact
from app.ai.governance.injection_guard import enforce

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class AIGateway:
    """
    Unified AI Gateway matching PDF Page 25 specifications:
    - AI proposes, human disposes
    - Structured Pydantic validation (rejects malformed outputs)
    - Cascade: Gemini -> OpenRouter -> Mock Fallback
    - Audit logging of every execution
    """

    def __init__(self):
        self.gemini_provider = GeminiProvider()
        self.openrouter_provider = OpenRouterProvider()
        self.mock_provider = MockFallbackProvider()

    def _call_provider_cascade(self, method_name: str, **kwargs) -> tuple[Dict[str, Any], str, bool]:
        """
        Executes cascade respecting settings.AI_PROVIDER:
        - If primary is openrouter: OpenRouter -> Gemini -> Mock Fallback
        - Otherwise: Gemini -> OpenRouter -> Mock Fallback
        """
        primary = getattr(settings, "AI_PROVIDER", "openrouter").lower()
        if primary == "openrouter":
            providers = [
                ("openrouter", self.openrouter_provider),
                ("gemini", self.gemini_provider),
            ]
        else:
            providers = [
                ("gemini", self.gemini_provider),
                ("openrouter", self.openrouter_provider),
            ]

        for prov_name, prov in providers:
            if prov.is_available():
                try:
                    method = getattr(prov, method_name)
                    result = method(**kwargs)
                    return result, prov_name, False
                except Exception as e:
                    logger.warning(f"AI Gateway: {prov_name} provider failed: {e}. Trying next provider in cascade.")

        # Step 3: Mock Fallback (Worst condition safety net)
        if settings.AI_AUTO_FALLBACK_ON_ERROR or settings.AI_FALLBACK_TO_MOCK:
            logger.info("AI Gateway: Activating deterministic Mock Fallback.")
            method = getattr(self.mock_provider, method_name)
            result = method(**kwargs)
            return result, "mock-fallback", True

        raise RuntimeError("All AI providers (Gemini, OpenRouter) failed and fallback is disabled.")

    def run_structured(
        self,
        engine: str,
        prompt: str,
        response_model: Type[T],
        system_prompt: Optional[str] = None,
        input_ref: Optional[str] = None,
        db_session = None
    ) -> T:
        start_time = time.time()

        # Governance: strip PII and neutralize injection attempts before API call
        prompt, _ = redact(prompt)
        prompt = enforce(prompt)

        provider_used = "unknown"
        is_fallback = False
        validated_output = None

        try:
            raw_output, provider_used, is_fallback = self._call_provider_cascade(
                "generate_json",
                prompt=prompt,
                schema_dict=response_model.model_json_schema(),
                system_prompt=system_prompt
            )
            validated_output = response_model.model_validate(raw_output)
        except Exception as cascade_err:
            if settings.AI_AUTO_FALLBACK_ON_ERROR or settings.AI_FALLBACK_TO_MOCK:
                logger.warning(f"AI Gateway: Structured run failed ({cascade_err}). Engaging MockFallback.")
                method = getattr(self.mock_provider, "generate_json")
                raw_output = method(prompt=prompt, schema_dict=response_model.model_json_schema(), system_prompt=system_prompt)
                provider_used = "mock-fallback"
                is_fallback = True
                try:
                    validated_output = response_model.model_validate(raw_output)
                except Exception:
                    validated_output = response_model.model_construct(**raw_output)
            else:
                raise

        if hasattr(validated_output, "is_fallback"):
            validated_output.is_fallback = is_fallback

        latency_ms = int((time.time() - start_time) * 1000)

        # Audit run logging
        if db_session:
            try:
                run_record = AIRun(
                    id=uuid.UUID(getattr(validated_output, "run_id", str(uuid.uuid4()))),
                    engine=engine,
                    model=provider_used,
                    prompt_version="v1.0",
                    input_ref=input_ref,
                    output=validated_output.model_dump(),
                    confidence=getattr(validated_output, "confidence", 1.0),
                    latency_ms=latency_ms,
                    status=AIRunStatus.PROPOSED.value
                )
                db_session.add(run_record)
                db_session.commit()
            except Exception as log_err:
                logger.error(f"Failed to write ai_runs audit entry: {log_err}")

        return validated_output

    def run_vision_structured(
        self,
        engine: str,
        prompt: str,
        image_bytes: bytes,
        mime_type: str,
        response_model: Type[T],
        input_ref: Optional[str] = None,
        db_session = None
    ) -> T:
        start_time = time.time()
        provider_used = "unknown"
        is_fallback = False
        validated_output = None

        try:
            raw_output, provider_used, is_fallback = self._call_provider_cascade(
                "generate_vision_json",
                prompt=prompt,
                image_bytes=image_bytes,
                mime_type=mime_type,
                schema_dict=response_model.model_json_schema()
            )
            validated_output = response_model.model_validate(raw_output)
        except Exception as cascade_err:
            if settings.AI_AUTO_FALLBACK_ON_ERROR or settings.AI_FALLBACK_TO_MOCK:
                logger.warning(f"AI Gateway: Vision run failed ({cascade_err}). Engaging MockFallback.")
                method = getattr(self.mock_provider, "generate_vision_json")
                raw_output = method(prompt=prompt, image_bytes=image_bytes, mime_type=mime_type, schema_dict=response_model.model_json_schema())
                provider_used = "mock-fallback"
                is_fallback = True
                try:
                    validated_output = response_model.model_validate(raw_output)
                except Exception:
                    validated_output = response_model.model_construct(**raw_output)
            else:
                raise

        if hasattr(validated_output, "is_fallback"):
            validated_output.is_fallback = is_fallback

        latency_ms = int((time.time() - start_time) * 1000)

        if db_session:
            try:
                run_record = AIRun(
                    id=uuid.UUID(getattr(validated_output, "run_id", str(uuid.uuid4()))),
                    engine=engine,
                    model=provider_used,
                    prompt_version="v1.0",
                    input_ref=input_ref,
                    output=validated_output.model_dump(),
                    confidence=getattr(validated_output, "confidence", 0.95),
                    latency_ms=latency_ms,
                    status=AIRunStatus.PROPOSED.value
                )
                db_session.add(run_record)
                db_session.commit()
            except Exception as log_err:
                logger.error(f"Failed to log vision ai_run: {log_err}")

        return validated_output

ai_gateway = AIGateway()
