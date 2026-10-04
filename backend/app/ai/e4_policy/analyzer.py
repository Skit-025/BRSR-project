"""
E4 Engine: Policy-Gap Analyzer
Orchestrates checklist lookup, text verification, and completeness scoring.
"""
import uuid
from typing import List
from app.ai.schemas import E4PolicyCheckRequest, E4PolicyCheckResponse, PolicyCheckItem, PolicyCheckStatus
from app.ai.e4_policy.checklists import get_checklist
from app.ai.e4_policy.verify import verify_quote


class PolicyGapAnalyzer:
    """E4 Engine: Checks policy document against required BRSR disclosure items."""

    def analyze(self, req: E4PolicyCheckRequest, db_session=None) -> E4PolicyCheckResponse:
        run_id = str(uuid.uuid4())
        policy_text = req.text_content or ""
        requirements = get_checklist(req.policy_type)

        items: List[PolicyCheckItem] = []
        found_count = 0

        for element in requirements:
            found, quote = verify_quote(element, policy_text)
            if found:
                found_count += 1
                items.append(PolicyCheckItem(
                    element=element,
                    status=PolicyCheckStatus.PRESENT,
                    quote=quote,
                    page=None,
                    verified=True
                ))
            else:
                items.append(PolicyCheckItem(
                    element=element,
                    status=PolicyCheckStatus.ABSENT,
                    quote=None,
                    page=None,
                    verified=False
                ))

        completeness = round(found_count / len(requirements), 2) if requirements else 0.0

        return E4PolicyCheckResponse(
            run_id=run_id,
            policy_type=req.policy_type,
            items=items,
            completeness_score=completeness,
            is_fallback=False
        )


e4_engine = PolicyGapAnalyzer()
