"""
tests/ai/test_huggingface_provider.py
Offline tests for the Hugging Face provider and the gateway cascade.
No network calls: HTTP and provider calls are monkeypatched.

No database is required either — tests/ai/conftest.py overrides the
session-wide DB bootstrap, so this runs anywhere:

    python -m pytest tests/ai/test_huggingface_provider.py -q
"""
import copy
import json

import pytest

from app.ai.providers import huggingface as hf
from app.ai.gateway import AIGateway


class FakeResponse:
    def __init__(self, status_code, payload=None, text=None, headers=None):
        self.status_code = status_code
        self._payload = payload or {}
        self.text = text if text is not None else json.dumps(self._payload)
        self.headers = headers or {}

    def json(self):
        return self._payload


class FakeClient:
    """Mimics httpx.Client for a scripted sequence of responses."""

    def __init__(self, script):
        self._script = script
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False

    def post(self, url, headers=None, json=None):
        # Copy the payload: the provider mutates it (e.g. dropping response_format)
        # between attempts, and the assertions need the payload as it was sent.
        self.calls.append({"url": url, "headers": headers, "json": copy.deepcopy(json)})
        return self._script.pop(0)


def _chat_ok(content: str):
    return FakeResponse(200, {"choices": [{"message": {"content": content}}]})


@pytest.fixture
def provider(monkeypatch):
    monkeypatch.setattr(hf.settings, "HF_MODEL_TEXT", "test/text-model")
    monkeypatch.setattr(hf.settings, "HF_MODEL_TEXT_FALLBACKS", "test/fallback-model")
    monkeypatch.setattr(hf.settings, "HF_MODEL_VISION", "test/vision-model")
    monkeypatch.setattr(hf.settings, "HF_MODEL_VISION_FALLBACKS", "")
    monkeypatch.setattr(hf.settings, "HF_PROVIDER", "")
    monkeypatch.setattr(hf.settings, "HF_MAX_RETRIES", 1)
    monkeypatch.setattr(hf.settings, "HF_TOTAL_TIMEOUT_SECONDS", 60)
    return hf.HuggingFaceProvider(api_key="hf_test_token")


def test_placeholder_key_is_not_configured(monkeypatch):
    monkeypatch.setattr(hf.settings, "HF_API_KEY", "hf_PUT_YOUR_TOKEN_HERE")
    monkeypatch.setattr(hf.settings, "HF_TOKEN", None)
    assert hf.HuggingFaceProvider().is_available() is False


def test_json_generation_parses_fenced_json(provider, monkeypatch):
    monkeypatch.setattr(
        provider,
        "_post_chat",
        lambda payload, deadline=None: {
            "choices": [{"message": {"content": '```json\n{"status": "ok"}\n```'}}]
        },
    )

    result = provider.generate_json("ping", {"type": "object"})

    assert result == {"status": "ok"}
    assert provider.last_model_used == "test/text-model"


def test_retries_on_503_and_honours_retry_after(provider, monkeypatch):
    script = [
        FakeResponse(503, text="model loading", headers={"Retry-After": "1"}),
        _chat_ok('{"ok": true}'),
    ]
    clients = []

    def client_factory(*args, **kwargs):
        client = FakeClient(script)
        clients.append(client)
        return client

    sleeps = []
    monkeypatch.setattr(hf.httpx, "Client", client_factory)
    monkeypatch.setattr(hf.time, "sleep", sleeps.append)

    assert provider.generate_json("ping", {"type": "object"}) == {"ok": True}
    assert sum(len(c.calls) for c in clients) == 2
    assert sleeps == [1.0]


def test_downgrades_response_format_when_rejected(provider, monkeypatch):
    script = [
        FakeResponse(400, text="response_format unsupported"),
        _chat_ok('{"ok": true}'),
    ]
    clients = []

    def client_factory(*args, **kwargs):
        client = FakeClient(script)
        clients.append(client)
        return client

    monkeypatch.setattr(hf.httpx, "Client", client_factory)

    assert provider.generate_json("ping", {"type": "object"}) == {"ok": True}
    assert "response_format" in clients[0].calls[0]["json"]
    assert "response_format" not in clients[1].calls[0]["json"]


def test_falls_back_to_next_model(provider, monkeypatch):
    seen = []

    def fake_post(payload, deadline=None):
        seen.append(payload["model"])
        if len(seen) == 1:
            raise hf.HFRequestError(500, "upstream failure")
        return {"choices": [{"message": {"content": '{"ok": true}'}}]}

    monkeypatch.setattr(provider, "_post_chat", fake_post)

    assert provider.generate_json("ping", {"type": "object"}) == {"ok": True}
    assert seen == ["test/text-model", "test/fallback-model"]


def test_auth_error_aborts_immediately(provider, monkeypatch):
    calls = []

    def fake_post(payload, deadline=None):
        calls.append(payload["model"])
        raise hf.HFAuthError("401 invalid token")

    monkeypatch.setattr(provider, "_post_chat", fake_post)

    with pytest.raises(hf.HFAuthError):
        provider.generate_json("ping", {"type": "object"})
    assert calls == ["test/text-model"]


def test_vision_payload_uses_data_uri(provider, monkeypatch):
    captured = {}

    def fake_post(payload, deadline=None):
        captured.update(payload)
        return {"choices": [{"message": {"content": '{"value": 12.5}'}}]}

    monkeypatch.setattr(provider, "_post_chat", fake_post)

    result = provider.generate_vision_json("read", b"\x89PNG", "image/png", {"type": "object"})

    assert result == {"value": 12.5}
    parts = captured["messages"][0]["content"]
    assert parts[1]["image_url"]["url"].startswith("data:image/png;base64,")


class _FakeProvider:
    def __init__(self, fail=False, available=True):
        self.fail = fail
        self.available = available
        self.calls = 0
        self.last_model_used = "fake-model"

    def is_available(self):
        return self.available

    def generate_json(self, **kwargs):
        self.calls += 1
        if self.fail:
            raise RuntimeError("503 Service Unavailable")
        return {"ok": True}


def test_gateway_uses_huggingface_first_then_falls_back(monkeypatch):
    gateway = AIGateway()
    hf_provider = _FakeProvider(fail=True)
    gemini = _FakeProvider()
    openrouter = _FakeProvider()
    gateway._providers.update(
        {"huggingface": hf_provider, "gemini": gemini, "openrouter": openrouter}
    )

    raw, used, is_mock = gateway._call_provider_cascade(
        "generate_json", prompt="ping", schema_dict={}
    )

    assert not is_mock
    assert used.startswith("openrouter")  # default cascade: huggingface -> openrouter -> gemini
    assert hf_provider.calls == 1


def test_gateway_skips_provider_in_cooldown(monkeypatch):
    gateway = AIGateway()
    hf_provider = _FakeProvider(fail=True)
    gemini = _FakeProvider()
    gateway._providers.update({"huggingface": hf_provider, "gemini": gemini, "openrouter": _FakeProvider()})
    monkeypatch.setattr(gateway, "_resolve_order", lambda: [
        ("huggingface", hf_provider),
        ("gemini", gemini),
    ])
    monkeypatch.setattr(gateway, "_cooldown_until", {"huggingface": 10**12})

    _, used, _ = gateway._call_provider_cascade("generate_json", prompt="ping", schema_dict={})

    assert used.startswith("gemini")
    assert hf_provider.calls == 0
