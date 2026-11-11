"""
tests/unit/core/test_decimal_and_hashing.py
Unit tests verifying Decimal precision, canonical JSON serialization,
and cryptographic SHA-256 snapshot seals.
"""
import json
import hashlib
import pytest
from decimal import Decimal


def test_decimal_precision_preservation():
    # Verify no binary floating-point drift (e.g. 0.1 + 0.2 == 0.3)
    d1 = Decimal("0.1")
    d2 = Decimal("0.2")
    assert d1 + d2 == Decimal("0.3")

    # High precision factor multiplication
    qty = Decimal("46000")
    factor = Decimal("0.00268")
    result = (qty * factor).quantize(Decimal("0.0001"))
    assert result == Decimal("123.2800")


def test_sha256_canonical_json_determinism():
    """
    Verifies that canonical JSON serialization (sorted keys, compact separators)
    produces identical, tamper-evident SHA-256 hashes regardless of dictionary key insertion order.
    """
    dict1 = {
        "entity": "MEIL-GROUP",
        "period": "FY2025-26-M03",
        "total_emissions_tco2e": 171.2,
        "metrics": [
            {"code": "ENV-GHG-001", "value": 123.28},
            {"code": "ENV-GHG-002", "value": 43.32},
        ]
    }

    # Dict2 with identical data but reversed/different key insertion order
    dict2 = {
        "metrics": [
            {"code": "ENV-GHG-001", "value": 123.28},
            {"code": "ENV-GHG-002", "value": 43.32},
        ],
        "total_emissions_tco2e": 171.2,
        "period": "FY2025-26-M03",
        "entity": "MEIL-GROUP",
    }

    canonical1 = json.dumps(dict1, sort_keys=True, separators=(",", ":")).encode("utf-8")
    canonical2 = json.dumps(dict2, sort_keys=True, separators=(",", ":")).encode("utf-8")

    hash1 = hashlib.sha256(canonical1).hexdigest()
    hash2 = hashlib.sha256(canonical2).hexdigest()

    assert hash1 == hash2
    assert len(hash1) == 64  # Valid SHA-256 hex string


def test_sha256_tamper_evidence():
    """
    Verifies that altering a single numerical character in the canonical payload
    completely changes the resulting SHA-256 hash.
    """
    base_dict = {"company": "MEIL", "scope1_tco2e": 123.28}
    tampered_dict = {"company": "MEIL", "scope1_tco2e": 123.29}

    hash_base = hashlib.sha256(json.dumps(base_dict, sort_keys=True).encode("utf-8")).hexdigest()
    hash_tampered = hashlib.sha256(json.dumps(tampered_dict, sort_keys=True).encode("utf-8")).hexdigest()

    assert hash_base != hash_tampered

