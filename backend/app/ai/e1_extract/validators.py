"""
E1 Engine: Field Validators
Validates extracted field values against BRSR unit boundaries and data rules.
"""
from typing import List
from app.ai.schemas import ExtractedField

# Plausibility bounds per metric code
METRIC_BOUNDS = {
    "ENV-ENERGY-001": {"min": 0.0, "max": 100_000_000.0, "unit": "kWh"},  # Electricity kWh
    "ENV-ENERGY-002": {"min": 0.0, "max": 10_000_000.0,  "unit": "kL"},   # Fuel kL
    "ENV-WATER-001":  {"min": 0.0, "max": 50_000_000.0,  "unit": "kL"},   # Water kL
    "ENV-WASTE-001":  {"min": 0.0, "max": 10_000_000.0,  "unit": "tonnes"},# Waste tonnes
}

def validate_fields(fields: List[ExtractedField]) -> List[ExtractedField]:
    """
    Checks each extracted field against plausibility bounds.
    Lowers confidence score if the value is outside expected limits.
    """
    validated = []
    for field in fields:
        bounds = METRIC_BOUNDS.get(field.metric)
        if bounds:
            if field.value < bounds["min"] or field.value > bounds["max"]:
                # Suspicious - lower confidence
                field.confidence = max(0.0, field.confidence - 0.30)
                if not field.metadata:
                    field.metadata = {}
                field.metadata["validation_warning"] = (
                    f"Value {field.value} is outside plausible range "
                    f"[{bounds['min']}, {bounds['max']}] for {field.metric}"
                )
        validated.append(field)
    return validated
