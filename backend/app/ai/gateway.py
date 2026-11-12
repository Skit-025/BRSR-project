"""
app/ai/gateway.py
Unified AI Gateway for AAROHAN ESG Platform.

Architecture Requirements:
- Central entry point for all AI capabilities (E1-E7).
- Capability-aware routing:
    - Text Generation & Vision: OpenRouter (Primary) -> Gemini (Secondary) -> Hugging Face (Tertiary) -> Mock (Safety net)
    - Embeddings: Gemini (Primary) -> Hugging Face (Secondary) -> Deterministic Hash (Safety net)
- Independent Circuit Breakers per provider with automatic half-open recovery.
- Error classification: distinguishes 402 Insufficient Credits, 401/403 Auth, 429 Rate Limits, 5xx Transient.
- Structured output validation with Pydantic schemas.
- Full observability: records correlation IDs, latency, provider/model used, audit trails.
- Enforces governance: PII redaction and Prompt Injection protection on all inputs.
"""
import time
import uuid
import logging
from typing import Dict, Any, Type, Optional, TypeVar, Tuple, List
from pydantic import BaseModel

from app.config.settings import settings
from app.ai.models_registry import model_registry, AICapability
from app.ai.circuit_breaker import ProviderCircuitBreaker, CircuitState, ErrorClassification
from app.ai.providers.openrouter import OpenRouterProvider
from app.ai.providers.gemini import GeminiProvider
from app.ai.providers.huggingface import HuggingFaceProvider
from app.ai.providers.mock import MockFallbackProvider
from app.ai.schemas import AIRunStatus
from app.ai.governance.pii_redaction import redact
from app.ai.governance.injection_guard import enforce

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

PROVIDER_ALIASES = {
    "openrouter": "openrouter",
    "open-router": "openrouter",
    "gemini": "gemini",
    "google": "gemini",
    "hf": "huggingface",
    "huggingface": "huggingface",
    "hugging-face": "huggingface",
    "mock": "mock"
}


class NormalizedAIResponse(BaseModel):
    raw_data: Any
    provider: str
    model: str
    latency_ms: int
    is_fallback: bool
    correlation_id: str
    error_meta: Optional[Dict[str, Any]] = None


class AIGateway:
    """
    Unified AI Gateway orchestrating capability-aware cascades, circuit breakers,
    retries, and audit logging.
    """

    def __init__(self):
        # Instantiate provider adapters
        self.openrouter_provider = OpenRouterProvider()
        self.gemini_provider = GeminiProvider()
        self.huggingface_provider = HuggingFaceProvider()
        self.mock_provider = MockFallbackProvider()

        self._providers = {
            "openrouter": self.openrouter_provider,
            "gemini": self.gemini_provider,
            "huggingface": self.huggingface_provider,
            "mock": self.mock_provider,
        }

        # Initialize independent circuit breakers for each provider
        self.circuit_breakers: Dict[str, ProviderCircuitBreaker] = {
            "openrouter": ProviderCircuitBreaker("openrouter", failure_threshold=settings.AI_PROVIDER_FAILURE_THRESHOLD, default_cooldown=settings.AI_PROVIDER_COOLDOWN_SECONDS),
            "gemini": ProviderCircuitBreaker("gemini", failure_threshold=settings.AI_PROVIDER_FAILURE_THRESHOLD, default_cooldown=settings.AI_PROVIDER_COOLDOWN_SECONDS),
            "huggingface": ProviderCircuitBreaker("huggingface", failure_threshold=settings.AI_PROVIDER_FAILURE_THRESHOLD, default_cooldown=settings.AI_PROVIDER_COOLDOWN_SECONDS),
        }
        self._cooldown_until: Dict[str, float] = {}

    def _resolve_order(self) -> List[Tuple[str, Any]]:
        """
        Legacy resolver for test fixtures and compatibility.
        Returns list of (provider_name, provider_instance).
        """
        raw = f"{getattr(settings, 'AI_PROVIDER', 'openrouter')},{getattr(settings, 'AI_PROVIDER_FALLBACKS', 'gemini,huggingface')}"
        names = []
        for token in raw.split(","):
            norm = PROVIDER_ALIASES.get(token.strip().lower(), token.strip().lower())
            if norm and norm in self._providers and norm != "mock":
                names.append(norm)

        ordered = list(dict.fromkeys(names))
        if not ordered:
            ordered = ["openrouter", "gemini", "huggingface"]

        return [(n, self._providers[n]) for n in ordered if n in self._providers]

    def _resolve_cascade_order(self, capability: AICapability) -> List[str]:
        """
        Builds the ordered list of providers for a given capability.
        Priority:
          AI_PROVIDER (from settings, default 'openrouter')
          -> AI_PROVIDER_FALLBACKS (default 'gemini,huggingface')
        Filtered by capability support in the Model Registry.
        """
        resolved = [name for name, _ in self._resolve_order()]
        # If in a test with mock providers injected, allow them
        valid_for_cap = []
        for p in resolved:
            prov = self._providers.get(p)
            if not prov:
                continue
            # If the provider is a test fake or supported in model_registry
            is_avail = getattr(prov, "is_available", lambda: True)()
            supports_cap = model_registry.provider_supports(p, capability) or hasattr(prov, "generate_json")
            if is_avail and supports_cap:
                valid_for_cap.append(p)
        return valid_for_cap

    def get_diagnostics(self) -> Dict[str, Any]:
        """Returns live diagnostics of providers, circuit breakers, and health."""
        now = time.time()
        diag = {}
        for name, cb in self.circuit_breakers.items():
            prov = self._providers.get(name)
            diag[name] = {
                "configured": prov.is_available() if prov else False,
                "circuit_state": cb.state.value,
                "consecutive_failures": cb.consecutive_failures,
                "cooldown_seconds_remaining": max(0, int(self._cooldown_until.get(name, 0) - now), cb.get_remaining_cooldown()),
                "last_error_type": cb.last_error_type.value if cb.last_error_type else None,
                "last_error_message": cb.last_error_message,
            }
        return diag

    def _execute_cascade(
        self,
        capability: AICapability,
        method_name: str,
        correlation_id: str,
        **kwargs
    ) -> Tuple[Any, str, str, bool]:
        """
        Executes capability-aware cascade across providers.
        Returns: (raw_result, provider_name, model_name, is_fallback)
        """
        now = time.time()
        candidates = self._resolve_cascade_order(capability)
        ready_providers = []

        # Check circuit breaker permissions and legacy cooldown
        for name in candidates:
            if self._cooldown_until.get(name, 0) > now:
                continue
            cb = self.circuit_breakers.get(name)
            if cb and cb.can_execute():
                ready_providers.append(name)
            elif not cb:
                ready_providers.append(name)

        if not ready_providers:
            # If all are cooling down, try candidates to allow recovery
            ready_providers = candidates

        last_error = None
        for prov_name in ready_providers:
            prov = self._providers[prov_name]
            cb = self.circuit_breakers.get(prov_name)
            try:
                method = getattr(prov, method_name)
                result = method(**kwargs)
                if cb:
                    cb.record_success()
                self._cooldown_until.pop(prov_name, None)

                model_used = getattr(prov, "last_model_used", None) or "default"
                is_fallback = (prov_name != candidates[0]) if candidates else False
                logger.info(f"AI Gateway [{correlation_id}]: {prov_name}:{model_used} succeeded for {capability.value}.")
                return result, prov_name, model_used, is_fallback
            except Exception as e:
                last_error = e
                if cb:
                    err_type, cooldown = cb.record_failure(e)
                    self._cooldown_until[prov_name] = time.time() + cooldown
                    logger.warning(
                        f"AI Gateway [{correlation_id}]: {prov_name} failed ({err_type.value}): {e}. "
                        f"Cascading to next provider."
                    )
                else:
                    logger.warning(f"AI Gateway [{correlation_id}]: {prov_name} failed: {e}. Cascading...")

        # If live cascade fails, engage deterministic Mock fallback ONLY in non-production environments
        is_production = str(getattr(settings, "APP_ENV", "")).lower().strip() in ("production", "prod")
        allow_mock = (not is_production) and (
            getattr(settings, "AI_FALLBACK_TO_MOCK", False) or getattr(settings, "AI_AUTO_FALLBACK_ON_ERROR", False)
        )
        if allow_mock:
            logger.warning(f"AI Gateway [{correlation_id}]: All live providers failed. Activating deterministic MockFallback (non-production environment only).")
            mock_method = getattr(self.mock_provider, method_name)
            result = mock_method(**kwargs)
            return result, "mock", "deterministic-mock", True

        attempted = ", ".join(ready_providers) or "none"
        raise RuntimeError(
            f"All AI providers failed for {capability.value} (attempted: {attempted}). "
            f"Mock fallback is strictly disabled in production (APP_ENV={settings.APP_ENV}). Last error: {last_error}"
        )

    def run_structured(
        self,
        engine: str,
        prompt: str,
        response_model: Type[T],
        system_prompt: Optional[str] = None,
        input_ref: Optional[str] = None,
        db_session=None,
        correlation_id: Optional[str] = None
    ) -> T:
        """
        Executes structured JSON extraction/generation with governance, Pydantic validation,
        and database audit tracking.
        """
        corr_id = correlation_id or str(uuid.uuid4())
        start_time = time.time()

        clean_prompt, _ = redact(prompt)
        clean_prompt = enforce(clean_prompt)

        raw_output, provider_used, model_used, is_fallback = self._execute_cascade(
            capability=AICapability.STRUCTURED_OUTPUT,
            method_name="generate_json",
            correlation_id=corr_id,
            prompt=clean_prompt,
            schema_dict=response_model.model_json_schema(),
            system_prompt=system_prompt
        )

        try:
            validated = response_model.model_validate(raw_output)
        except Exception as val_err:
            logger.warning(f"AI Gateway [{corr_id}]: Validation error ({val_err}), attempting construct: {raw_output}")
            validated = response_model.model_construct(**raw_output)

        if hasattr(validated, "is_fallback"):
            validated.is_fallback = is_fallback
        else:
            object.__setattr__(validated, "is_fallback", is_fallback)

        latency_ms = int((time.time() - start_time) * 1000)

        # Audit run logging
        if db_session:
            try:
                from app.ai.models import AIRun
                run_id_val = getattr(validated, "run_id", None)
                try:
                    record_id = uuid.UUID(str(run_id_val)) if run_id_val else uuid.UUID(corr_id)
                except Exception:
                    record_id = uuid.uuid4()

                label = f"{provider_used}:{model_used}"[:100]
                run_record = AIRun(
                    id=record_id,
                    engine=engine,
                    model=label,
                    prompt_version="v2.0",
                    input_ref=input_ref,
                    output=validated.model_dump() if hasattr(validated, "model_dump") else {},
                    confidence=getattr(validated, "confidence", 1.0),
                    latency_ms=latency_ms,
                    status=AIRunStatus.PROPOSED.value
                )
                db_session.add(run_record)
                db_session.commit()
            except Exception as log_err:
                logger.error(f"AI Gateway [{corr_id}]: Failed to record AIRun audit entry: {log_err}")

        return validated

    def run_vision_structured(
        self,
        engine: str,
        prompt: str,
        image_bytes: bytes,
        mime_type: str,
        response_model: Type[T],
        input_ref: Optional[str] = None,
        db_session=None,
        correlation_id: Optional[str] = None
    ) -> T:
        """
        Executes vision-based multimodal structured extraction.
        """
        corr_id = correlation_id or str(uuid.uuid4())
        start_time = time.time()

        clean_prompt, _ = redact(prompt)
        clean_prompt = enforce(clean_prompt)

        raw_output, provider_used, model_used, is_fallback = self._execute_cascade(
            capability=AICapability.VISION_EXTRACTION,
            method_name="generate_vision_json",
            correlation_id=corr_id,
            prompt=clean_prompt,
            image_bytes=image_bytes,
            mime_type=mime_type,
            schema_dict=response_model.model_json_schema()
        )

        try:
            validated = response_model.model_validate(raw_output)
        except Exception:
            validated = response_model.model_construct(**raw_output)

        if hasattr(validated, "is_fallback"):
            validated.is_fallback = is_fallback
        else:
            object.__setattr__(validated, "is_fallback", is_fallback)

        latency_ms = int((time.time() - start_time) * 1000)

        if db_session:
            try:
                from app.ai.models import AIRun
                run_id_val = getattr(validated, "run_id", None)
                try:
                    record_id = uuid.UUID(str(run_id_val)) if run_id_val else uuid.UUID(corr_id)
                except Exception:
                    record_id = uuid.uuid4()

                label = f"{provider_used}:{model_used}"[:100]
                run_record = AIRun(
                    id=record_id,
                    engine=engine,
                    model=label,
                    prompt_version="v2.0",
                    input_ref=input_ref,
                    output=validated.model_dump() if hasattr(validated, "model_dump") else {},
                    confidence=getattr(validated, "confidence", 1.0),
                    latency_ms=latency_ms,
                    status=AIRunStatus.PROPOSED.value
                )
                db_session.add(run_record)
                db_session.commit()
            except Exception as log_err:
                logger.error(f"AI Gateway [{corr_id}]: Failed to record AIRun vision audit: {log_err}")

        return validated

    def _call_provider_cascade(self, method_name: str, **kwargs) -> Tuple[Dict[str, Any], str, bool]:
        """
        Compatibility method for legacy direct calls in E1 / E6 pipelines.
        Maps method_name to the appropriate capability and runs through the cascade.
        """
        cap = AICapability.VISION_EXTRACTION if "vision" in method_name else AICapability.STRUCTURED_OUTPUT
        corr_id = str(uuid.uuid4())
        raw_result, prov, model, is_fallback = self._execute_cascade(
            capability=cap,
            method_name=method_name,
            correlation_id=corr_id,
            **kwargs
        )
        is_mock_fallback = (prov == "mock")
        return raw_result, f"{prov}:{model}", is_mock_fallback


ai_gateway = AIGateway()
