"""Quick test to hit the DELETE evidence endpoint and capture the actual error."""
import requests
import json

BASE = "http://localhost:8000/api/v1"

# First, login to get a token
try:
    # Try to get a health check first
    r = requests.get("http://localhost:8000/health", timeout=5)
    print("Health:", r.status_code, r.text[:200])
except Exception as e:
    print("Health check failed:", e)

# Test OPTIONS preflight for DELETE
try:
    r = requests.options(
        f"{BASE}/evidence/test-uuid",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "DELETE",
            "Access-Control-Request-Headers": "Content-Type,Authorization",
        },
        timeout=5
    )
    print(f"\nOPTIONS preflight: {r.status_code}")
    print("CORS headers:")
    for k, v in r.headers.items():
        if "access-control" in k.lower() or "origin" in k.lower():
            print(f"  {k}: {v}")
except Exception as e:
    print(f"OPTIONS failed: {e}")

# Try the actual DELETE without auth to see if we get 401 (expected) vs 500
try:
    r = requests.delete(
        f"{BASE}/evidence/test-uuid",
        json={"password": "test", "reason": "testing"},
        headers={
            "Content-Type": "application/json",
            "Origin": "http://localhost:5173",
        },
        timeout=5
    )
    print(f"\nDELETE (no auth): {r.status_code}")
    print("Response:", r.text[:500])
    print("CORS headers:")
    for k, v in r.headers.items():
        if "access-control" in k.lower() or "origin" in k.lower():
            print(f"  {k}: {v}")
except Exception as e:
    print(f"DELETE failed: {e}")
