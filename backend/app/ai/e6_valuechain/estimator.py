"""
E6 Engine: Value-Chain Emissions Estimator
==========================================
Two-layer architecture:

  Layer 1 — Deterministic formula:
    classified proxy factor × billed quantity → baseline tCO₂e estimate.
    Fast, auditable, always runs.

  Layer 2 — LLM validation & enrichment (OpenRouter / Gemini):
    Sends the formula result + full context to the LLM.
    LLM may:
      • Confirm the estimate with reasoning
      • Adjust it if the factor seems wrong for the specific description
      • Flag better method (spend-based vs activity-based)
      • Cite the BRSR / GHG Protocol section
      • Identify data gaps that could improve accuracy
    Falls back gracefully if LLM is unavailable.
"""
import uuid
import json
import logging
from typing import Optional

from app.ai.schemas import E6ValueChainRequest, E6ValueChainResponse
from app.ai.e6_valuechain.classifier import classify_work_category, PROXY_FACTORS

logger = logging.getLogger(__name__)

# ── Expanded proxy factor catalogue (for LLM context only) ────────────────────
FULL_FACTOR_CATALOGUE = {
    "civil_works":           {"factor": 0.0150, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "electrical_works":      {"factor": 0.0130, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "solar_epc":             {"factor": 0.0080, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "wind_turbine":          {"factor": 0.0090, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "hvac_mep":              {"factor": 0.0120, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "it_services":           {"factor": 0.0060, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "logistics_transport":   {"factor": 0.0160, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "catering_facility":     {"factor": 0.0110, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "waste_management":      {"factor": 0.0070, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "security_services":     {"factor": 0.0040, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "professional_services": {"factor": 0.0050, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "equipment_supply":      {"factor": 0.0200, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "raw_material_supply":   {"factor": 0.0250, "unit": "tCO₂e/INR Lakh",       "method": "spend-based"},
    "earthmoving":           {"factor": 0.0820, "unit": "tCO₂e/machine-hr",     "method": "activity-based"},
    "diesel_hauling":        {"factor": 2.6800, "unit": "tCO₂e/kL diesel",      "method": "activity-based"},
    "concrete":              {"factor": 0.0001, "unit": "tCO₂e/kg cement",      "method": "activity-based"},
    "steel":                 {"factor": 0.0019, "unit": "tCO₂e/kg steel",       "method": "activity-based"},
}

LLM_SYSTEM_PROMPT = """You are a senior GHG accounting specialist with expertise in SEBI BRSR Core, 
the GHG Protocol Corporate Value Chain (Scope 3) Standard, and IPCC emission factors for Indian 
infrastructure projects. Your role is to VALIDATE a formula-based Scope 3 emission estimate and 
provide enriched guidance for BRSR disclosure.

Rules:
1. Review the proxy factor used — is it appropriate for the specific work description?
2. If you have a more accurate factor from GHG Protocol or India GHG Program, provide it.
3. Suggest the appropriate method: spend-based (if only cost data available) or activity-based (if physical quantities known).
4. Cite the relevant BRSR/GHG Protocol section.
5. Return ONLY valid JSON — no markdown, no commentary outside JSON."""


def _call_llm_validation(
    work_category: str,
    billed_quantity: float,
    billed_unit: str,
    formula_factor: float,
    formula_factor_unit: str,
    formula_estimate: float,
    matched_category: str,
) -> Optional[dict]:
    """
    Calls the LLM to validate and enrich the formula estimate.
    Returns a dict with validation fields, or None if LLM unavailable.
    """
    providers_to_try = []
    try:
        from app.ai.providers.openrouter import OpenRouterProvider
        orp = OpenRouterProvider()
        if orp.is_available():
            providers_to_try.append(("openrouter", orp))
    except Exception:
        pass

    try:
        from app.ai.providers.gemini import GeminiProvider
        gp = GeminiProvider()
        if gp.is_available():
            providers_to_try.append(("gemini", gp))
    except Exception:
        pass

    if not providers_to_try:
        logger.info("E6 LLM validation skipped — no AI provider available")
        return None

    catalogue_summary = json.dumps(FULL_FACTOR_CATALOGUE, indent=2)

    prompt = f"""
SCOPE 3 EMISSION ESTIMATE VALIDATION REQUEST

Work Category Described: "{work_category}"
Billed Quantity: {billed_quantity} {billed_unit}
Formula Used: {formula_factor} {formula_factor_unit} (matched category: {matched_category})
Formula Result: {formula_estimate:.4f} tCO₂e

Available Proxy Factor Catalogue (India GHG Program / SEBI BRSR):
{catalogue_summary}

TASK:
1. Assess if the matched category "{matched_category}" is correct for the described work.
2. Suggest a better category + factor if available in the catalogue or from GHG Protocol.
3. Calculate adjusted_tco2e using the better factor if applicable (else confirm formula value).
4. Identify up to 3 data gaps that would enable a more accurate estimate.

Return this exact JSON schema (no other text):
{{
  "validated": true,
  "formula_is_appropriate": true or false,
  "adjusted_tco2e": <number or null — provide number only if you have a better factor>,
  "adjusted_factor": <number or null>,
  "adjusted_factor_unit": "<string or null>",
  "suggested_method": "<spend-based | activity-based | hybrid>",
  "confidence_note": "<1-2 sentence assessment of reliability of this estimate>",
  "reasoning": "<3-5 sentence explanation: why this factor, what assumptions, what standards apply>",
  "brsr_reference": "<BRSR / GHG Protocol section that mandates this Scope 3 category>",
  "data_gaps": ["<gap 1>", "<gap 2>", "<gap 3>"]
}}"""

    schema = {
        "validated": "boolean",
        "formula_is_appropriate": "boolean",
        "adjusted_tco2e": "number|null",
        "adjusted_factor": "number|null",
        "adjusted_factor_unit": "string|null",
        "suggested_method": "string",
        "confidence_note": "string",
        "reasoning": "string",
        "brsr_reference": "string",
        "data_gaps": ["string"]
    }

    last_err = None
    for pname, prov in providers_to_try:
        try:
            result = prov.generate_json(prompt, schema, system_prompt=LLM_SYSTEM_PROMPT)
            logger.info(f"E6 LLM validation succeeded via {pname}: formula_appropriate={result.get('formula_is_appropriate')}, adjusted={result.get('adjusted_tco2e')}")
            return result
        except Exception as e:
            logger.warning(f"E6 LLM validation failed with {pname}: {e}. Trying fallback...")
            last_err = e

    logger.warning(f"E6 LLM validation failed across all providers: {last_err}")
    return None


class ValueChainEstimator:
    """E6 Engine: Two-layer Scope 3 Estimator — formula + LLM validation."""

    def estimate(self, req: E6ValueChainRequest, db_session=None) -> E6ValueChainResponse:
        run_id = str(uuid.uuid4())

        # ── Layer 1: Deterministic formula ────────────────────────────────────
        matched = classify_work_category(req.work_category)
        factor = matched["factor"]
        factor_unit = matched["unit"]
        matched_category = matched.get("category", "civil_works")

        formula_estimate = round(req.billed_quantity * factor, 4)

        # ── Layer 2: LLM validation & enrichment ──────────────────────────────
        llm_result = _call_llm_validation(
            work_category=req.work_category,
            billed_quantity=req.billed_quantity,
            billed_unit=req.billed_unit,
            formula_factor=factor,
            formula_factor_unit=factor_unit,
            formula_estimate=formula_estimate,
            matched_category=matched_category,
        )

        # ── Assemble response ─────────────────────────────────────────────────
        llm_validated = llm_result is not None and bool(llm_result.get("validated"))
        llm_adjusted = llm_result.get("adjusted_tco2e") if llm_result else None
        if llm_adjusted is not None:
            try:
                llm_adjusted = round(float(llm_adjusted), 4)
            except (TypeError, ValueError):
                llm_adjusted = None

        # Confidence: LLM-informed if available, else conservative formula-only value
        if llm_validated:
            formula_ok = llm_result.get("formula_is_appropriate", True)
            # Lower confidence if LLM found a better factor
            confidence = 0.88 if formula_ok else 0.72
        else:
            confidence = 0.75  # Lower when no LLM validation

        return E6ValueChainResponse(
            run_id=run_id,
            work_category=req.work_category,
            proxy_factor=factor,
            proxy_factor_unit=factor_unit,
            estimated_emissions_tco2e=formula_estimate,
            confidence=confidence,
            is_fallback=False,
            # LLM layer
            llm_validated=llm_validated,
            llm_adjusted_tco2e=llm_adjusted,
            llm_reasoning=llm_result.get("reasoning") if llm_result else None,
            llm_confidence_note=llm_result.get("confidence_note") if llm_result else None,
            llm_suggested_method=llm_result.get("suggested_method") if llm_result else None,
            llm_brsr_reference=llm_result.get("brsr_reference") if llm_result else None,
            llm_data_gaps=llm_result.get("data_gaps") if llm_result else None,
        )


e6_engine = ValueChainEstimator()
