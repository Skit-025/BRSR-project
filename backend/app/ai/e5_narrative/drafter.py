"""Deterministic E5 draft composed only from supplied facts and approved values."""
import uuid
from app.ai.schemas import E5NarrativeRequest, E5NarrativeResponse
from app.ai.e5_narrative.number_lock import check_number_lock

class NarrativeCopilot:
    def draft(self, req: E5NarrativeRequest, db_session=None) -> E5NarrativeResponse:
        facts = [str(item).strip() for item in req.bullets if str(item).strip()]
        if req.approved_kpis:
            facts.extend(f"{key}: {value}" for key, value in req.approved_kpis.items())
        draft = f"Reporting period: {req.period}. Section: {req.section}.\n"
        draft += "\n".join(f"- {fact}" for fact in facts) if facts else "- No source narrative or approved KPI values were provided; add verified information to draft this disclosure."
        found, unapproved, passed = check_number_lock(draft, req.approved_kpis)
        return E5NarrativeResponse(run_id=str(uuid.uuid4()), draft=draft, numbers_found=found,
            numbers_unapproved=unapproved, number_lock_passed=passed, is_fallback=True)

e5_engine = NarrativeCopilot()
