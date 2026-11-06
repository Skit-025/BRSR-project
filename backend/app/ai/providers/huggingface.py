"""
app/ai/providers/huggingface.py
Hugging Face Inference Providers — primary AI provider.

Uses the Hugging Face OpenAI-compatible router:

    POST https://router.huggingface.co/v1/chat/completions

The router automatically selects the fastest healthy inference provider
(Together, Groq, Cerebras, Fireworks, Novita, DeepInfra, ...) for a given
model, so a single HF token covers chat, vision-language and embeddings.

Resilience features (addresses the chronic HTTP 503 problem):
  * Multi-model fallback inside the HF provider itself.
  * Retry with exponential backoff (honours ``Retry-After``) on
    408 / 409 / 425 / 429 / 5xx responses — 503 here is usually a cold model
    or a busy upstream provider and is transient.
  * Fast abort on 401 so the gateway can move to the next provider instead of
    burning the request budget.
  * ``response_format`` downgrade: if a model rejects ``json_object`` we retry
    the same model without it before giving up.
"""
import base64
import json
import logging
import time
from typing import Any, Dict, Iterable, List, Optional

import httpx

from app.ai.providers.base import BaseAIProvider
from app.ai.providers.json_util import parse_json_robust
from app.config.settings import settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = {408, 409, 425, 429, 500, 502, 503, 504}
# 401 = bad token, 402 = no inference credits -> retrying models cannot help
AUTH_FAILURE_STATUS = {401, 402}
# 400/422 = payload unsupported by that model (e.g. response_format) -> retry downgraded
DOWNGRADE_STATUS = {400, 422}


class HFAuthError(RuntimeError):
    """Raised when the HF token is missing/invalid — no point trying more models."""


class HFRequestError(RuntimeError):
    """Raised when the HF router returns a non-retryable error for a model."""

    def __init__(self, status_code: int, message: str):
        super().__init__(f"HTTP {status_code}: {message}")
        self.status_code = status_code


def _auth_failure(status_code: int, detail: str) -> Optional[HFAuthError]:
    """Maps 401/402 to an HFAuthError so callers stop trying more models."""
    if status_code not in AUTH_FAILURE_STATUS:
        return None
    if status_code == 402:
        return HFAuthError(
            "Hugging Face account has no inference credits left (HTTP 402). "
            "Add credits / subscribe to PRO, or the gateway will use the next provider. "
            f"Details: {detail}"
        )
    return HFAuthError(f"Hugging Face rejected the token (HTTP {status_code}): {detail}")


def _split_models(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [m.strip() for m in value.replace("\n", ",").split(",") if m.strip()]


PLACEHOLDER_MARKERS = ("put_your", "your_hugging", "your_hf", "replace_me", "changeme", "xxxx")


def _looks_like_placeholder(key: Optional[str]) -> bool:
    if not key:
        return True
    lowered = key.strip().lower()
    if not lowered or lowered.startswith("mock_"):
        return True
    return any(marker in lowered for marker in PLACEHOLDER_MARKERS)


def _extract_message_text(data: Dict[str, Any]) -> str:
    """Normalises message content across providers (string or content-part list)."""
    try:
        message = data["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Unexpected Hugging Face response shape: {str(data)[:300]}") from exc

    content = message.get("content")
    if isinstance(content, str) and content.strip():
        return content

    if isinstance(content, list):
        parts: List[str] = []
        for part in content:
            if isinstance(part, dict):
                text = part.get("text")
                if isinstance(text, str) and text.strip():
                    parts.append(text)
            elif isinstance(part, str) and part.strip():
                parts.append(part)
        if parts:
            return "\n".join(parts)

    # Some reasoning models expose text via reasoning_content only
    reasoning = message.get("reasoning_content")
    if isinstance(reasoning, str) and reasoning.strip():
        return reasoning

    raise ValueError(f"Hugging Face returned an empty message: {str(message)[:300]}")


class HuggingFaceProvider(BaseAIProvider):
    """Hugging Face Inference Providers implementation (text, vision, embeddings)."""

    DEFAULT_BASE_URL = "https://router.huggingface.co/v1"
    DEFAULT_INFERENCE_BASE_URL = "https://router.huggingface.co/hf-inference"

    def __init__(self, api_key: Optional[str] = None):
        # First real (non-placeholder) value wins; HF_TOKEN is accepted as an alias.
        candidates = [api_key, settings.HF_API_KEY, settings.HF_TOKEN]
        resolved = next((c.strip() for c in candidates if c and not _looks_like_placeholder(c)), "")
        if not resolved:
            resolved = next((c.strip() for c in candidates if c and c.strip()), "")
        self.api_key = resolved
        self.base_url = (settings.HF_ROUTER_BASE_URL or self.DEFAULT_BASE_URL).rstrip("/")
        self.last_model_used: Optional[str] = None
        self.last_error: Optional[str] = None

    # ------------------------------------------------------------------ utils
    def is_available(self) -> bool:
        if _looks_like_placeholder(self.api_key):
            return False
        return not self.api_key.strip().startswith("mock_")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _timeout(self) -> httpx.Timeout:
        read_timeout = float(getattr(settings, "HF_TIMEOUT_SECONDS", 120) or 120)
        return httpx.Timeout(read_timeout, connect=15.0, write=30.0, pool=15.0)

    def _decorate_model(self, model: str) -> str:
        """
        Optionally pins an inference provider, e.g. HF_PROVIDER=groq turns
        ``Qwen/Qwen2.5-7B-Instruct`` into ``Qwen/Qwen2.5-7B-Instruct:groq``.
        Leave HF_PROVIDER empty to let the router pick the fastest provider.
        """
        provider = (getattr(settings, "HF_PROVIDER", "") or "").strip()
        if not provider or ":" in model:
            return model
        return f"{model}:{provider}"

    def _text_models(self) -> List[str]:
        models = [settings.HF_MODEL_TEXT] + _split_models(settings.HF_MODEL_TEXT_FALLBACKS)
        models += [
            "Qwen/Qwen2.5-7B-Instruct",
            "meta-llama/Llama-3.1-8B-Instruct",
            "openai/gpt-oss-120b",
        ]
        return list(dict.fromkeys([m for m in models if m]))

    def _vision_models(self) -> List[str]:
        models = [settings.HF_MODEL_VISION] + _split_models(settings.HF_MODEL_VISION_FALLBACKS)
        models += [
            "Qwen/Qwen2.5-VL-7B-Instruct",
            "Qwen/Qwen2.5-VL-3B-Instruct",
            "Qwen/Qwen3-VL-8B-Instruct",
        ]
        return list(dict.fromkeys([m for m in models if m]))

    # ------------------------------------------------------------------- HTTP
    def _sleep_before_retry(self, attempt: int, retry_after: Optional[str]) -> None:
        delay = min(2 ** attempt, 8)
        if retry_after:
            try:
                delay = min(max(float(retry_after), 1.0), 20.0)
            except (TypeError, ValueError):
                pass
        logger.info(f"HuggingFace: retrying in {delay:.1f}s (attempt {attempt + 1}).")
        time.sleep(delay)

    def _post_chat(self, payload: Dict[str, Any], deadline: Optional[float] = None) -> Dict[str, Any]:
        """POSTs one chat-completion payload, retrying transient errors."""
        url = f"{self.base_url}/chat/completions"
        attempts = max(1, int(getattr(settings, "HF_MAX_RETRIES", 1) or 0) + 1)
        last_exc: Optional[Exception] = None

        for attempt in range(attempts):
            out_of_time = deadline is not None and time.time() >= deadline
            if attempt > 0 and out_of_time:
                break
            try:
                with httpx.Client(timeout=self._timeout(), follow_redirects=True) as client:
                    resp = client.post(url, headers=self._headers(), json=payload)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = exc
                if attempt < attempts - 1 and not out_of_time:
                    self._sleep_before_retry(attempt, None)
                    continue
                raise RuntimeError(f"Hugging Face network error: {exc}") from exc

            auth_error = _auth_failure(resp.status_code, resp.text[:300])
            if auth_error:
                raise auth_error

            if resp.status_code in RETRYABLE_STATUS and attempt < attempts - 1 and not out_of_time:
                logger.warning(
                    f"HuggingFace: model '{payload.get('model')}' returned "
                    f"HTTP {resp.status_code}; retrying."
                )
                self._sleep_before_retry(attempt, resp.headers.get("Retry-After"))
                continue

            if resp.status_code >= 400:
                raise HFRequestError(resp.status_code, resp.text[:300])

            try:
                return resp.json()
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Hugging Face returned non-JSON: {resp.text[:200]}") from exc

        raise RuntimeError(f"Hugging Face request failed after {attempts} attempts: {last_exc}")

    def _chat_completion(
        self,
        messages: List[Dict[str, Any]],
        models: Iterable[str],
        max_tokens: int,
        json_mode: bool = False,
    ) -> str:
        """Runs the model fallback chain and returns raw message text."""
        if not self.is_available():
            raise RuntimeError("Hugging Face API key is not configured (set HF_API_KEY in .env).")

        errors: List[str] = []
        total_budget = float(getattr(settings, "HF_TOTAL_TIMEOUT_SECONDS", 150) or 150)
        deadline = time.time() + total_budget

        for model in models:
            if time.time() >= deadline:
                errors.append("deadline reached before trying more models")
                break

            payload: Dict[str, Any] = {
                "model": self._decorate_model(model),
                "messages": messages,
                "temperature": float(getattr(settings, "HF_TEMPERATURE", 0.1) or 0.1),
                "max_tokens": max_tokens,
            }
            if json_mode:
                payload["response_format"] = {"type": "json_object"}

            try:
                data = self._post_chat(payload, deadline=deadline)
            except HFAuthError:
                # Token-level problem: abort immediately so the gateway can failover.
                raise
            except HFRequestError as exc:
                if json_mode and exc.status_code in DOWNGRADE_STATUS:
                    logger.info(
                        f"HuggingFace: model '{model}' rejected response_format "
                        f"({exc}); retrying without JSON mode."
                    )
                    payload.pop("response_format", None)
                    try:
                        data = self._post_chat(payload, deadline=deadline)
                    except HFAuthError:
                        raise
                    except Exception as retry_exc:
                        errors.append(f"{model}: {retry_exc}")
                        logger.warning(f"HuggingFace model '{model}' failed: {retry_exc}")
                        continue
                else:
                    errors.append(f"{model}: {exc}")
                    logger.warning(f"HuggingFace model '{model}' failed: {exc}")
                    continue
            except Exception as exc:
                errors.append(f"{model}: {exc}")
                logger.warning(f"HuggingFace model '{model}' failed: {exc}")
                continue

            text = _extract_message_text(data)
            self.last_model_used = model
            logger.info(f"HuggingFace: '{model}' succeeded ({len(text)} chars).")
            return text

        summary = "; ".join(errors[-4:]) or "no models configured"
        self.last_error = summary
        raise RuntimeError(f"All Hugging Face models failed. Last errors: {summary}")

    # -------------------------------------------------------------- interface
    def generate_json(
        self,
        prompt: str,
        schema_dict: Dict[str, Any],
        system_prompt: Optional[str] = None,
    ) -> Dict[str, Any]:
        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append(
            {
                "role": "user",
                "content": (
                    "Return ONE valid JSON object populated with actual values matching this schema:\n"
                    f"{json.dumps(schema_dict)}\n\n"
                    "Hard rules:\n"
                    "- Output valid JSON only, no markdown fences, no commentary.\n"
                    "- Never echo schema type names or arithmetic expressions.\n"
                    "- All numbers must be evaluated literal numbers (e.g. 1.64 not 0.082 * 20.0).\n"
                    "- Use null for unknown optional values instead of inventing data.\n\n"
                    f"Task:\n{prompt}"
                ),
            }
        )

        max_tokens = int(getattr(settings, "HF_MAX_TOKENS", 4096) or 4096)
        text = self._chat_completion(messages, self._text_models(), max_tokens=max_tokens, json_mode=True)
        return parse_json_robust(text)

    def generate_vision_json(
        self,
        prompt: str,
        image_bytes: bytes,
        mime_type: str,
        schema_dict: Dict[str, Any],
    ) -> Dict[str, Any]:
        if not image_bytes:
            raise RuntimeError("Hugging Face vision call received no image bytes.")

        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        data_uri = f"data:{mime_type or 'image/jpeg'};base64,{b64_image}"

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "You are an ESG document reader. Read the attached document image and "
                            "extract data matching this JSON schema:\n"
                            f"{json.dumps(schema_dict)}\n\n"
                            "Return ONE valid JSON object only — no markdown fences, no commentary.\n"
                            "Use null for values that are genuinely not present; never invent numbers.\n\n"
                            f"Task:\n{prompt}"
                        ),
                    },
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            }
        ]

        max_tokens = int(getattr(settings, "HF_MAX_TOKENS", 4096) or 4096)
        text = self._chat_completion(
            messages, self._vision_models(), max_tokens=max_tokens, json_mode=False
        )
        return parse_json_robust(text)

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        messages: List[Dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        max_tokens = int(getattr(settings, "HF_MAX_TOKENS", 4096) or 4096)
        return self._chat_completion(messages, self._text_models(), max_tokens=max_tokens, json_mode=False)

    # ------------------------------------------------------------- embeddings
    def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Returns a float embedding via the HF router.

        Tries the OpenAI-compatible ``/v1/embeddings`` route first, then the
        ``hf-inference`` feature-extraction pipeline route. Raises on failure so
        ``EmbeddingProvider`` can fall back.
        """
        if not self.is_available():
            raise RuntimeError("Hugging Face API key is not configured.")

        model_name = model or settings.HF_EMBEDDING_MODEL
        # 1) OpenAI-compatible embeddings endpoint
        try:
            with httpx.Client(timeout=self._timeout(), follow_redirects=True) as client:
                resp = client.post(
                    f"{self.base_url}/embeddings",
                    headers=self._headers(),
                    json={"model": model_name, "input": text},
                )
            auth_error = _auth_failure(resp.status_code, resp.text[:200])
            if auth_error:
                raise auth_error
            if resp.status_code < 400:
                data = resp.json()
                items = data.get("data") or []
                if items and isinstance(items[0], dict) and items[0].get("embedding"):
                    return [float(v) for v in items[0]["embedding"]]
        except HFAuthError:
            raise
        except Exception as exc:
            logger.debug(f"HuggingFace embeddings via /v1/embeddings failed: {exc}")

        # 2) Serverless feature-extraction pipeline route
        inference_base = (
            getattr(settings, "HF_INFERENCE_BASE_URL", None) or self.DEFAULT_INFERENCE_BASE_URL
        ).rstrip("/")
        with httpx.Client(timeout=self._timeout(), follow_redirects=True) as client:
            resp = client.post(
                f"{inference_base}/models/{model_name}/pipeline/feature-extraction",
                headers=self._headers(),
                json={"inputs": text, "options": {"wait_for_model": True}},
            )
            auth_error = _auth_failure(resp.status_code, resp.text[:200])
            if auth_error:
                raise auth_error
            resp.raise_for_status()
            data = resp.json()

        vector = data
        # Unwrap [[...]] or [{...}] shapes
        while isinstance(vector, list) and vector and isinstance(vector[0], (list, dict)):
            vector = vector[0]
        if isinstance(vector, dict):
            vector = vector.get("embedding") or vector.get("values") or []
        if not isinstance(vector, list) or not vector:
            raise RuntimeError(f"Unexpected Hugging Face embedding response: {str(data)[:200]}")
        return [float(v) for v in vector]


huggingface_provider = HuggingFaceProvider()
