"""
backend/scripts/check_ai_providers.py
Quick diagnostic for the AI provider cascade.

Usage (from the backend directory, with the venv activated):

    python -m scripts.check_ai_providers
    python -m scripts.check_ai_providers --vision path/to/bill.jpg

It prints which provider keys are configured, the resolved cascade order, and
optionally sends a tiny real request through the gateway.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config.settings import settings  # noqa: E402
from app.ai.gateway import ai_gateway  # noqa: E402


def _mask(key):
    if not key:
        return "NOT SET"
    key = key.strip()
    if len(key) <= 10:
        return key[:4] + "..."
    return f"{key[:6]}...{key[-4:]}"


def main():
    parser = argparse.ArgumentParser(description="Check AI provider configuration.")
    parser.add_argument("--live", action="store_true", help="Send a real text request through the cascade.")
    parser.add_argument("--vision", metavar="IMAGE_PATH", help="Send a real vision request with this image.")
    parser.add_argument("--text", metavar="PROMPT", help="Custom prompt for the live text request.")
    args = parser.parse_args()

    print("=== AI provider configuration ===")
    print(f"AI_PROVIDER            : {settings.AI_PROVIDER}")
    print(f"AI_PROVIDER_FALLBACKS  : {settings.AI_PROVIDER_FALLBACKS}")
    print(f"HF_API_KEY             : {_mask(settings.HF_API_KEY)}")
    print(f"HF_TOKEN               : {_mask(settings.HF_TOKEN)}")
    print(f"HF_MODEL_TEXT          : {settings.HF_MODEL_TEXT}")
    print(f"HF_MODEL_VISION        : {settings.HF_MODEL_VISION}")
    print(f"HF_ROUTER_BASE_URL     : {settings.HF_ROUTER_BASE_URL}")
    print(f"GEMINI_API_KEY         : {_mask(settings.GEMINI_API_KEY)}")
    print(f"OPENROUTER_API_KEY     : {_mask(settings.OPENROUTER_API_KEY)}")

    print("\n=== Resolved cascade ===")
    for entry in ai_gateway.get_cascade_status():
        state = "ready" if entry["configured"] else "not configured"
        if entry["cooldown_seconds_remaining"]:
            state = f"cooldown {entry['cooldown_seconds_remaining']}s"
        print(f"  {entry['provider']:<12} {state}")
    print("  mock-fallback last resort")

    if args.live or args.vision:
        print("\n=== Live request ===")
        try:
            if args.vision:
                with open(args.vision, "rb") as fh:
                    image_bytes = fh.read()
                ext = os.path.splitext(args.vision)[1].lower()
                mime_type = {
                    ".png": "image/png",
                    ".webp": "image/webp",
                    ".gif": "image/gif",
                    ".tif": "image/tiff",
                    ".tiff": "image/tiff",
                }.get(ext, "image/jpeg")
                raw, provider, is_mock = ai_gateway._call_provider_cascade(
                    "generate_vision_json",
                    prompt="Describe this document in one short sentence as JSON.",
                    image_bytes=image_bytes,
                    mime_type=mime_type,
                    schema_dict={"type": "object", "properties": {"description": {"type": "string"}}},
                )
            else:
                raw, provider, is_mock = ai_gateway._call_provider_cascade(
                    "generate_json",
                    prompt=args.text
                    or "Reply with the health of the reporting portal and a confidence score.",
                    schema_dict={
                        "type": "object",
                        "properties": {
                            "status": {"type": "string"},
                            "confidence": {"type": "number"},
                        },
                        "required": ["status", "confidence"],
                    },
                )
            print(f"Provider used : {provider}")
            print(f"Mock fallback : {is_mock}")
            print(f"Response      : {json.dumps(raw, indent=2)[:800]}")
        except Exception as exc:
            print(f"FAILED: {exc}")
            return 1

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
