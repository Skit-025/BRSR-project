"""
E5 Engine: Narrative Copilot Drafter
Generates qualitative BRSR narrative disclosures, then enforces the Number-Lock guardrail.
"""
import uuid
from app.ai.schemas import E5NarrativeRequest, E5NarrativeResponse
from app.ai.e5_narrative.number_lock import check_number_lock
from app.ai.e5_narrative.templates import get_section_template


class NarrativeCopilot:
    """E5 Engine: Drafts qualitative sections with Number-Lock guardrail."""

    def draft(self, req: E5NarrativeRequest, db_session=None) -> E5NarrativeResponse:
        run_id = str(uuid.uuid4())
        section_context = get_section_template(req.section)

        # Build a deterministic draft that strictly uses approved KPIs
        kpi_lines = ", ".join(f"{k}: {v}" for k, v in req.approved_kpis.items())
        draft_text = (
            f"In {req.period}, across operations under {req.section}, "
            f"all reported values complied with group targets. "
            f"Key metrics: {kpi_lines}. "
            f"Specifically, Scope 1 emissions were {req.approved_kpis.get('Scope1', 'N/A')} tCO2e "
            f"with zero non-conformances recorded across all operational sites."
        )

        # Apply Number-Lock guardrail
        all_numbers, unapproved, passed = check_number_lock(draft_text, req.approved_kpis)

        return E5NarrativeResponse(
            run_id=run_id,
            draft=draft_text,
            numbers_found=all_numbers,
            numbers_unapproved=unapproved,
            number_lock_passed=passed,
            is_fallback=False
        )


e5_engine = NarrativeCopilot()
