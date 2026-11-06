# BRSR Portal — Backend

FastAPI service for the SEBI BRSR reporting portal (evidence extraction, anomaly
detection, RAG guidance, narrative drafting, explainability).

## Requirements

- **Python 3.12** (recommended — `numpy<2` in `requirements.txt` has no wheels for
  3.13/3.14, so `pip install` fails while compiling numpy)
- PostgreSQL 15+ with the `pgvector`, `ltree`, `uuid-ossp`, `pg_trgm` extensions
- Redis (job queue) and MinIO/S3 (evidence storage) for the full stack

## Install & run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then fill in the values below
uvicorn app.main:app --reload
```

Environment variables are read from `backend/.env`. When you start the app from
the repository root, `backend/.env` still takes priority over the root `.env`,
so **edit `backend/.env`**.

## AI provider cascade

All AI calls go through `app/ai/gateway.py`. The order is configurable:

```env
AI_PROVIDER=huggingface
AI_PROVIDER_FALLBACKS=openrouter,gemini
```

Default: **Hugging Face → OpenRouter → Gemini → deterministic mock**.

- **`app/ai/providers/huggingface.py`** — primary. Uses the OpenAI-compatible
  router (`https://router.huggingface.co/v1`), which fans out across Groq,
  Together, Cerebras, Fireworks, Novita, DeepInfra and others. Handles text,
  vision and embeddings; retries 429/5xx with backoff (honouring
  `Retry-After`), walks a model chain, and aborts instantly on 401/402.
- **`app/ai/providers/openrouter.py`** — first failover, budgeted models.
- **`app/ai/providers/gemini.py`** — second failover, with its own model chain so
  a retired/overloaded model name does not break the tier.
- **`app/ai/providers/mock.py`** — last resort, deterministic, never fails.

Circuit breaker: a provider that fails `AI_PROVIDER_FAILURE_THRESHOLD` times in a
row (default 2) is skipped for `AI_PROVIDER_COOLDOWN_SECONDS` (default 60). Auth
and credit failures (HTTP 401/402) get a 15-minute cooldown.

### Where to put the keys

| Variable | Where to get it |
| --- | --- |
| `HF_API_KEY` | <https://huggingface.co/settings/tokens> — fine-grained token with **"Make calls to Inference Providers"** |
| `OPENROUTER_API_KEY` | <https://openrouter.ai/keys> |
| `GEMINI_API_KEY` | <https://aistudio.google.com/apikey> |

Hugging Face Inference Providers is **not free**: a token with a zero balance
returns `HTTP 402` on every call. Add pre-paid credits or subscribe to PRO, or
leave the key out and the gateway will use OpenRouter instead.

### Default models

| Purpose | Hugging Face | OpenRouter |
| --- | --- | --- |
| Text / JSON | `openai/gpt-oss-120b` | `openai/gpt-oss-120b` |
| Vision | `Qwen/Qwen3-VL-30B-A3B-Instruct` | `google/gemma-3-12b-it` |
| Embeddings | `BAAI/bge-base-en-v1.5` | — (Gemini, then hash fallback) |

Each has its own fallback list in `.env` (`HF_MODEL_*_FALLBACKS`), plus hard-coded
secondary chains in the providers.

## Diagnostics

```bash
# Config + resolved cascade (works without a database)
python -m scripts.check_ai_providers

# Send one real text request through the cascade
python -m scripts.check_ai_providers --live

# Send a real vision request (image must be >= 64x64 px)
python -m scripts.check_ai_providers --vision path/to/bill.png
```

`GET /health` also reports the live cascade:

```json
{
  "ai_provider": "huggingface",
  "ai_provider_fallbacks": "openrouter,gemini",
  "ai_cascade": [
    {"provider": "huggingface", "configured": true, "cooldown_seconds_remaining": 0, "consecutive_failures": 0}
  ]
}
```

## Tests

```bash
pytest tests/ai/test_huggingface_provider.py -q   # offline, no DB needed
pytest -q                                        # full suite, needs PostgreSQL
```

`tests/ai/conftest.py` overrides the session-wide database bootstrap so the AI
unit tests run anywhere. The rest of the suite still provisions a real database.
