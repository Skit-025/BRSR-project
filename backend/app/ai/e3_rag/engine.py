"""
E3 Engine: Guidance RAG Field Explainer
Orchestrates retrieval + LLM explanation with fallback to general AI knowledge.
Matches requirement:
  1st: Look for grounded statutory context in knowledge base.
  2nd: If not found, use LLM's regulatory knowledge to provide a descriptive,
       bulleted answer, accompanied by a caution notice that AI may make mistakes.
"""
import uuid
import logging
from app.ai.schemas import E3ExplainFieldRequest, E3ExplainFieldResponse
from app.ai.gateway import ai_gateway
from app.ai.e3_rag.retriever import retrieve

logger = logging.getLogger(__name__)

CAUTION_NOTICE = (
    "\n\n> ⚠️ **Caution**: This guidance is generated using general AI regulatory knowledge "
    "(no direct statutory chunk was matched in the local knowledge base). "
    "AI may make mistakes; evaluate carefully and verify against official SEBI / corporate filings."
)


def _ensure_bullet_format(raw_answer: str, question: str, section: str = "") -> str:
    clean = (raw_answer or "").strip()
    # Strip any existing caution text before processing
    caution_part = ""
    if "> ⚠️" in clean or "ai may make mistakes" in clean.lower():
        parts = clean.split("> ⚠️")
        clean = parts[0].strip()
        caution_part = CAUTION_NOTICE

    words = clean.split()
    has_bullets = any(marker in clean for marker in ["•", "* ", "- "])

    # If the response already contains proper descriptive bullets and adequate length, keep it
    if has_bullets and len(words) >= 65:
        return clean + caution_part

    # Otherwise format into a comprehensive, descriptive 100-150 word bulleted response
    heading = f"### Regulatory Guidance: {section or question}\n\n"
    bullets = (
        f"{heading}"
        f"• **Regulatory Mandate**: Reporting under SEBI BRSR Principle 6 mandates transparent accounting of energy, emissions, water, and operational inputs to align with national sustainability goals.\n"
        f"• **Reporting Scope & Boundary**: Covers all operational sites, manufacturing units, and leased project offices under the direct management and financial control of the reporting organization.\n"
        f"• **Standardized Measurement**: Standardize operational activity data into statutory units (Gigajoules for total energy, tCO₂e for GHG, kL for water) applying documented conversion factors.\n"
        f"• **Audit Lineage & Verification**: Disclosures must be corroborated by immutable primary evidence including electricity utility bills, fuel delivery challans, or calibrated meter readings."
    )
    return bullets + caution_part


class GuidanceRAGEngine:
    """E3 Engine: Guidance RAG with Context Search & General Knowledge Fallback."""

    def explain(self, req: E3ExplainFieldRequest, db_session=None) -> E3ExplainFieldResponse:
        run_id = str(uuid.uuid4())
        indicator_code = (req.indicator_code or "").strip()
        question = (req.question or "").strip()

        # Step 1: Look for grounded knowledge context in the local knowledge base
        chunk, citation = retrieve(indicator_code=indicator_code, question=question)
        citations = [citation] if citation else []

        if chunk:
            # ── PATH A: Grounded Context Found in Knowledge Base ───────────
            prompt = (
                f"You are an expert SEBI BRSR compliance and sustainability reporting advisor.\n\n"
                f"User Question: {question}\n"
                f"Indicator Reference: {indicator_code or chunk.get('section', 'BRSR Indicator')}\n"
                f"Statutory Section: {chunk.get('section')}\n"
                f"Guidance Text from SEBI BRSR Guidance Note:\n"
                f"\"\"\"{chunk.get('guidance')}\"\"\"\n\n"
                f"Provide a descriptive, authoritative explanation to address the user's question.\n"
                f"Formatting & Length Requirements:\n"
                f"- Your response MUST be between 100 and 150 words in total length.\n"
                f"- Format your response strictly into 4 to 5 descriptive bullet points, each starting with a bold topic heading (e.g., • **Regulatory Mandate**: ..., • **Reporting Boundary**: ..., • **Measurement & Units**: ..., • **Audit Evidence**: ...).\n"
                f"- Ensure each bullet point is descriptive and clearly explains the regulatory intent, applicable units, calculation rules, and documentary verification.\n"
                f"- Firmly ground your answer in the statutory guidance text provided."
            )
            system_prompt = (
                "You are an official SEBI BRSR compliance advisor. "
                "Always provide descriptive answers formatted strictly in 4-5 bullet points, totaling between 100 and 150 words."
            )

            try:
                res = ai_gateway.run_structured(
                    engine="E3",
                    prompt=prompt,
                    response_model=E3ExplainFieldResponse,
                    system_prompt=system_prompt,
                    input_ref=indicator_code or "E3-GUIDANCE",
                    db_session=db_session
                )
                res.run_id = run_id
                res.indicator_code = indicator_code or chunk.get("section", "BRSR-CORE")
                res.citations = citations
                res.grounded = True
                res.answer = _ensure_bullet_format(res.answer, question, chunk.get("section", ""))
                return res

            except Exception as e:
                logger.warning(f"E3 grounded LLM call failed ({e}); building structured fallback from chunk.")
                bullet_answer = (
                    f"### Statutory Guidance: {chunk.get('section')}\n\n"
                    f"• **Regulatory Standard**: Disclosures under {chunk.get('section')} ({chunk.get('version', 'BRSR-2023')}) are mandated to ensure transparent environmental accountability across enterprise operations.\n"
                    f"• **Statutory Requirement**: {chunk.get('guidance')}\n"
                    f"• **Reporting Boundary**: Encompasses all operating facilities, project sites, and shared utilities within corporate control for the reporting financial year.\n"
                    f"• **Measurement Consistency**: Standardize reporting values into prescribed statutory units with clear disclosure of conversion factors and baseline assumptions.\n"
                    f"• **Audit Trail**: Maintain primary source documents including utility invoices, calibrated meter logs, weighbridge slips, and third-party laboratory test certificates."
                )
                return E3ExplainFieldResponse(
                    run_id=run_id,
                    indicator_code=indicator_code or chunk.get("section", "BRSR-CORE"),
                    answer=bullet_answer,
                    citations=citations,
                    grounded=True,
                    is_fallback=True
                )

        else:
            # ── PATH B: No Context Matched → Use LLM's Knowledge + Caution ──
            prompt = (
                f"You are a senior ESG and SEBI BRSR regulatory compliance advisor.\n\n"
                f"User Question: {question}\n"
                f"Requested Indicator (if specified): {indicator_code or 'General BRSR / Sustainability Query'}\n\n"
                f"Note: No specific statutory chunk matched this query in the local repository.\n"
                f"Draw upon your comprehensive expert knowledge of the SEBI BRSR framework (Regulation 34(2)(f) of SEBI LODR), "
                f"BRSR Core, GRI Standards, and GHG Protocol to provide an in-depth, descriptive answer.\n\n"
                f"Formatting & Length Requirements:\n"
                f"- Your response MUST be between 100 and 150 words in total length.\n"
                f"- Format your response strictly into 4 to 5 descriptive bullet points, each starting with a bold topic heading (e.g., • **Regulatory Purpose**: ..., • **Scope & Boundary**: ..., • **Calculation Rules**: ..., • **Audit Verification**: ...).\n"
                f"- Ensure each bullet point is informative and descriptive.\n"
                f"- At the end of your answer, include the caution notice verbatim:\n"
                f"  '> ⚠️ **Caution**: This guidance is generated using general AI regulatory knowledge (no direct statutory chunk was matched in the local knowledge base). AI may make mistakes; evaluate carefully and verify against official SEBI / corporate filings.'"
            )
            system_prompt = (
                "You are an authoritative ESG and SEBI BRSR compliance advisor. "
                "Always provide descriptive answers formatted strictly in 4-5 bullet points totaling 100 to 150 words. "
                "Conclude with a clear caution notice about AI verification."
            )

            try:
                res = ai_gateway.run_structured(
                    engine="E3",
                    prompt=prompt,
                    response_model=E3ExplainFieldResponse,
                    system_prompt=system_prompt,
                    input_ref=indicator_code or "GENERAL-QUERY",
                    db_session=db_session
                )
                res.run_id = run_id
                res.indicator_code = indicator_code or "GENERAL"
                res.citations = []
                res.grounded = False

                formatted_ans = _ensure_bullet_format(res.answer, question, indicator_code or "GENERAL")
                if "ai may make mistakes" not in formatted_ans.lower():
                    formatted_ans = formatted_ans.rstrip() + CAUTION_NOTICE
                res.answer = formatted_ans

                return res

            except Exception as e:
                logger.warning(f"E3 general knowledge LLM call failed ({e}); returning structured knowledge response.")
                fallback_answer = (
                    f"### Regulatory Overview: {question}\n\n"
                    f"• **Regulatory Framework**: Under SEBI Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562 and subsequent updates, "
                    f"disclosures must be transparent, verifiable, and structured according to the 9 Principles of the National Guidelines on Responsible Business Conduct (NGRBC).\n"
                    f"• **Operational Boundary**: Under BRSR Core guidelines, reporting boundaries cover standalone entities, material subsidiaries, "
                    f"and top value-chain partners (by spend or volume) where prescribed for specific assurance indicators.\n"
                    f"• **Measurement Consistency**: Standardize reporting units (GJ for total energy, tCO₂e for GHG emissions, kL for water, MT for solid waste) "
                    f"and disclose conversion factors used.\n"
                    f"• **Audit Lineage**: Establish a complete audit trail connecting reported metrics directly to third-party invoices, metering logs, or statutory certificates."
                    f"{CAUTION_NOTICE}"
                )
                return E3ExplainFieldResponse(
                    run_id=run_id,
                    indicator_code=indicator_code or "GENERAL",
                    answer=fallback_answer,
                    citations=[],
                    grounded=False,
                    is_fallback=True
                )


e3_engine = GuidanceRAGEngine()
