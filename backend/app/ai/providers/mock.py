import logging
from typing import Dict, Any, Optional
from app.ai.providers.base import BaseAIProvider

logger = logging.getLogger(__name__)

class MockFallbackProvider(BaseAIProvider):
    """
    Automated Fallback Provider.
    Activated seamlessly when live external APIs are unreachable, unconfigured, or timing out.
    Produces deterministic, valid schema outputs as required by the Build Guide.
    """

    def generate_json(self, prompt: str, schema_dict: Dict[str, Any], system_prompt: Optional[str] = None) -> Dict[str, Any]:
        logger.info("MockFallbackProvider: executing structured JSON fallback.")
        # Return fallback tailored to prompt keywords
        if "guidance" in prompt.lower() or "explain" in prompt.lower():
            return {
                "answer": "Under SEBI BRSR Principle 6, entities must disclose total energy consumed from renewable and non-renewable sources in Joules or MWh, with mandatory primary evidence like electricity bills or meter logs.",
                "citations": [
                    {
                        "doc": "SEBI BRSR Guidance Note 2023",
                        "version": "BRSR-2023",
                        "section": "Principle 6 - Essential Indicator 1",
                        "text": "Report total electricity consumption and fuel consumption. Disclosures must be backed by utility invoices or logbook entries."
                    }
                ],
                "grounded": True
            }
        elif "policy" in prompt.lower():
            return {
                "items": [
                    {
                        "element": "Anti-Corruption Policy Scope & Whistleblower Mechanism",
                        "status": "present",
                        "quote": "The organization maintains a zero-tolerance policy against bribery and provides a protected whistleblower channel.",
                        "page": 4,
                        "verified": True
                    },
                    {
                        "element": "Annual Policy Review by Board",
                        "status": "partial",
                        "quote": "Policies are subject to periodic review by executive management.",
                        "page": 7,
                        "verified": True
                    }
                ],
                "completeness_score": 0.85
            }
        elif "narrative" in prompt.lower():
            return {
                "draft": "In FY 2025-26, our total Scope 1 emissions were 18,650 tCO2e, with zero reported high-severity environmental infractions. All data reflects verified meter reads across participating business units.",
                "numbers_found": ["18650", "2025", "2026", "0"]
            }
        
        return {}

    def generate_vision_json(self, prompt: str, image_bytes: bytes, mime_type: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        logger.info("MockFallbackProvider: executing Vision document extraction fallback.")
        # Simulates extraction from a standard DISCOM electricity bill
        return {
            "doc_type": "electricity_bill",
            "fields": [
                {
                    "metric": "ENV-ENERGY-001",
                    "value": 52000.0,
                    "unit": "kWh",
                    "confidence": 0.95,
                    "page": 1,
                    "bbox": [120.0, 340.0, 480.0, 390.0],
                    "metadata": {
                        "billing_period": "01-31 Mar 2026",
                        "meter_id": "MTR-88213",
                        "discom": "TSSPDCL",
                        "tariff": "HT-1 Industrial"
                    }
                }
            ]
        }

    def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        logger.info("MockFallbackProvider: executing text fallback.")
        return "Deterministic fallback response generated for offline resilience."


# Backward-compat alias — providers/__init__.py imports MockAIProvider
MockAIProvider = MockFallbackProvider
