import time
import uuid
import logging
from typing import Dict, Any, Type, Optional, TypeVar
from pydantic import BaseModel
from app.config.settings import settings
from app.ai.providers.huggingface import HuggingFaceProvider, HFAuthError
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.mock import MockFallbackProvider
from app.ai.schemas import AIRunStatus
from app.ai.governance.pii_redaction import redact
from app.ai.governance.injection_guard import enforce

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Accepted spellings in AI_PROVIDER / AI_PROVIDER_FALLBACKS
PROVIDER_ALIASES = {
    "hf": "huggingface",
    "hugging-face": "huggingface",
    "huggingface": "huggingface",
    "google": "gemini",
    "open-router": "openrouter",
}


class AIGateway:
    """
    Unified AI Gateway matching PDF Page 25 specifications:
    - AI proposes, human disposes
    - Structured Pydantic validation (rejects malformed outputs)
    - Cascade: AI_PROVIDER then AI_PROVIDER_FALLBACKS (default: huggingface ->
      openrouter -> gemini), with a deterministic Mock fallback as last resort
    - Audit logging of every execution
    """

    def __init__(self):
        self.huggingface_provider = HuggingFaceProvider()
        self.gemini_provider = GeminiProvider()
        self.openrouter_provider = OpenRouterProvider()
        self.mock_provider = MockFallbackProvider()

        self._providers = {
            "huggingface": self.huggingface_provider,
            "gemini": self.gemini_provider,
            "openrouter": self.openrouter_provider,
            "mock": self.mock_provider,
        }
        # Lightweight circuit breaker: skip a provider that just failed repeatedly
        self._failures: Dict[str, int] = {}
        self._cooldown_until: Dict[str, float] = {}

    def _resolve_order(self) -> list:
        """Builds the provider order from AI_PROVIDER + AI_PROVIDER_FALLBACKS."""
        raw = f"{getattr(settings, 'AI_PROVIDER', 'huggingface')},{getattr(settings, 'AI_PROVIDER_FALLBACKS', '')}"
        names = []
        for token in raw.split(","):
            name = PROVIDER_ALIASES.get(token.strip().lower(), token.strip().lower())
            if name:
                names.append(name)

        names = list(dict.fromkeys(names))
        known = [n for n in names if n in self._providers]
        if not known:
            # Nothing valid configured -> safe default cascade
            known = ["huggingface", "gemini", "openrouter"]

        # Mock is always the last-resort safety net handled by the caller
        return [(n, self._providers[n]) for n in known if n != "mock"]

    def get_cascade_status(self) -> list:
        """Introspection for /health and diagnostics."""
        now = time.time()
        status = []
        for name, prov in self._resolve_order():
            status.append(
                {
                    "provider": name,
                    "configured": prov.is_available(),
                    "cooldown_seconds_remaining": max(0, int(self._cooldown_until.get(name, 0) - now)),
                    "consecutive_failures": self._failures.get(name, 0),
                }
            )
        return status

    def _mark_failure(self, name: str, exc: Exception) -> None:
        self._failures[name] = self._failures.get(name, 0) + 1
        threshold = max(1, int(getattr(settings, "AI_PROVIDER_FAILURE_THRESHOLD", 2) or 1))
        if self._failures[name] >= threshold:
            cooldown = int(getattr(settings, "AI_PROVIDER_COOLDOWN_SECONDS", 60) or 0)
            if isinstance(exc, HFAuthError):
                # Bad token / exhausted credits won't fix itself in 60 seconds
                cooldown = max(cooldown, 900)
            if cooldown > 0:
                self._cooldown_until[name] = time.time() + cooldown
                logger.warning(
                    f"AI Gateway: {name} disabled for {cooldown}s after "
                    f"{self._failures[name]} consecutive failures ({exc})."
                )

    def _mark_success(self, name: str) -> None:
        self._failures.pop(name, None)
        self._cooldown_until.pop(name, None)

    def _call_provider_cascade(self, method_name: str, **kwargs) -> tuple[Dict[str, Any], str, bool]:
        """
        Executes the cascade in configured order (default: Hugging Face -> Gemini
        -> OpenRouter -> deterministic Mock Fallback).

        Providers in cooldown are skipped while at least one healthy provider
        remains, which prevents burning a request on a provider that is down.
        """
        candidates = [(name, prov) for name, prov in self._resolve_order() if prov.is_available()]
        now = time.time()
        ready = [(n, p) for n, p in candidates if self._cooldown_until.get(n, 0) <= now]
        if not ready:
            # Every provider is cooling down (or none is configured): try them all anyway.
            ready = candidates

        if not ready:
            logger.warning(
                "AI Gateway: no live provider is configured (check HF_API_KEY / GEMINI_API_KEY / "
                "OPENROUTER_API_KEY in .env)."
            )

        for prov_name, prov in ready:
            try:
                method = getattr(prov, method_name)
                result = method(**kwargs)
                self._mark_success(prov_name)
                model_used = getattr(prov, "last_model_used", None)
                label = f"{prov_name}:{model_used}" if model_used else prov_name
                label = label[:100]  # ai_runs.model is String(100)
                logger.info(f"AI Gateway: {label} succeeded for {method_name}.")
                return result, label, False
            except Exception as e:
                self._mark_failure(prov_name, e)
                logger.warning(
                    f"AI Gateway: {prov_name} provider failed: {e}. Trying next provider in cascade."
                )

        # Step 3: Mock Fallback (Worst condition safety net)
        if settings.AI_AUTO_FALLBACK_ON_ERROR or settings.AI_FALLBACK_TO_MOCK:
            logger.info("AI Gateway: Activating deterministic Mock Fallback.")
            method = getattr(self.mock_provider, method_name)
            result = method(**kwargs)
            return result, "mock-fallback", True

        attempted = ", ".join(n for n, _ in ready) or "none configured"
        raise RuntimeError(f"All AI providers failed (attempted: {attempted}) and fallback is disabled.")

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
                run_id_val = getattr(validated_output, "run_id", None)
                try:
                    record_id = uuid.UUID(str(run_id_val)) if run_id_val else uuid.uuid4()
                except Exception:
                    record_id = uuid.uuid4()
                # Imported lazily: importing app.ai.models pulls in app.db and a
                # live PostgreSQL connection, which AI-provider diagnostics do not need.
                from app.ai.models import AIRun

                run_record = AIRun(
                    id=record_id,
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
                run_id_val = getattr(validated_output, "run_id", None)
                try:
                    record_id = uuid.UUID(str(run_id_val)) if run_id_val else uuid.uuid4()
                except Exception:
                    record_id = uuid.uuid4()
                # Imported lazily: importing app.ai.models pulls in app.db and a
                # live PostgreSQL connection, which AI-provider diagnostics do not need.
                from app.ai.models import AIRun

                run_record = AIRun(
                    id=record_id,
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
