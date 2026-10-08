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
                f"Provide a comprehensive, highly descriptive explanation to address the user's question.\n"
                f"Requirements:\n"
                f"- Give a thorough, descriptive answer structured with clear bullet points.\n"
                f"- Explain the regulatory intent and reporting boundary.\n"
                f"- Detail the applicable measurement units, calculation formulas, and recommended documentary evidence.\n"
                f"- Firmly ground your explanation in the statutory guidance text provided."
            )
            system_prompt = (
                "You are an official SEBI BRSR compliance assistant. "
                "Provide detailed, descriptive answers structured in clear bullet points based on statutory guidance."
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
                return res

            except Exception as e:
                logger.warning(f"E3 grounded LLM call failed ({e}); building structured fallback from chunk.")
                bullet_answer = (
                    f"### Statutory Guidance: {chunk.get('section')}\n\n"
                    f"• **Regulatory Standard**: {chunk.get('section')} ({chunk.get('version', 'BRSR-2023')})\n"
                    f"• **Statutory Requirement**: {chunk.get('guidance')}\n"
                    f"• **Reporting Boundary**: Disclose data for the entire reporting entity including participating operational facilities.\n"
                    f"• **Audit Trail**: Maintain primary source documents (invoices, meter logs, weighbridge slips, test certificates) substantiating all reported values.\n"
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
                f"Draw upon your comprehensive expert knowledge of the SEBI BRSR (Business Responsibility and Sustainability Reporting) "
                f"framework (Regulation 34(2)(f) of SEBI LODR), BRSR Core, GRI Standards, and GHG Protocol to provide an in-depth, descriptive answer.\n\n"
                f"Formatting Requirements:\n"
                f"- Always provide a descriptive, thorough answer.\n"
                f"- Structure your answer into clear, organized sections using descriptive bullet points:\n"
                f"  • Executive Overview & Regulatory Purpose\n"
                f"  • Core Requirements, Boundary Rules & Definitions\n"
                f"  • Practical Steps & Calculation / Measurement Rules\n"
                f"  • Audit Verification & Documentary Evidence Requirements\n"
                f"- At the end of your answer, include the caution notice verbatim:\n"
                f"  '> ⚠️ **Caution**: This guidance is generated using general AI regulatory knowledge (no direct statutory chunk was matched in the local knowledge base). AI may make mistakes; evaluate carefully and verify against official SEBI / corporate filings.'"
            )
            system_prompt = (
                "You are an authoritative ESG and SEBI BRSR compliance advisor. "
                "Always provide comprehensive, descriptive answers structured with bullet points. "
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

                # Ensure the caution notice is present in the final answer
                if "ai may make mistakes" not in res.answer.lower():
                    res.answer = res.answer.rstrip() + CAUTION_NOTICE

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
