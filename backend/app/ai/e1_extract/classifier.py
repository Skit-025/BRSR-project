"""
E1 Engine: Document Classifier
Determines document type from file metadata and content signals.
"""
from typing import Optional

KNOWN_TYPES = {
    "electricity": "electricity_bill",
    "discom": "electricity_bill",
    "tsspdcl": "electricity_bill",
    "bescom": "electricity_bill",
    "power": "electricity_bill",
    "diesel": "fuel_receipt",
    "petrol": "fuel_receipt",
    "fuel": "fuel_receipt",
    "water": "water_manifest",
    "waste": "waste_manifest",
    "haz": "waste_manifest",
    "meter": "meter_log",
    "logbook": "meter_log",
}

def classify_document(file_path: Optional[str] = None, doc_type_hint: Optional[str] = None) -> str:
    """
    Classifies document type from hint or filename.
    Returns a standardized document type string.
    """
    if doc_type_hint:
        return doc_type_hint.strip().lower()
    if file_path:
        name = file_path.lower()
        for keyword, doc_type in KNOWN_TYPES.items():
            if keyword in name:
                return doc_type
    return "unknown_document"
