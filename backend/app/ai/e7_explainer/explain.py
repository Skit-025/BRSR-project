"""
E7 Engine: Number Explainer
Explains consolidated totals using lineage driver trees — no text-to-SQL.
"""
import uuid
from app.ai.schemas import E7ExplainNumberRequest, E7ExplainNumberResponse
from app.ai.e7_explainer.drivers import extract_drivers


class NumberExplainer:
    """E7 Engine: Lineage-backed plain-language explainer."""

    def explain(self, req: E7ExplainNumberRequest, db_session=None) -> E7ExplainNumberResponse:
        run_id = str(uuid.uuid4())

        drivers = extract_drivers(req.lineage_data)

        # Build a natural language summary from top driver
        top = drivers[0] if drivers else None
        if top:
            direction = "increased" if top.delta > 0 else "decreased" if top.delta < 0 else "did not change"
            summary = (
                f"Regarding {req.metric_code} in {req.period}: "
                f"The largest listed driver was {top.entity}, accounting for "
                f"{top.share * 100:.1f}% of the absolute change ({top.delta:+g} units). "
                f"Its reported contribution {direction}; the supplied lineage does not establish a cause."
            )
        else:
            summary = f"No valid lineage driver data was supplied for {req.metric_code} in {req.period}; no attribution can be made."

        return E7ExplainNumberResponse(
            run_id=run_id,
            summary=summary,
            drivers=drivers,
            lineage_url=f"/lineage/{req.consolidated_value_id}",
            is_fallback=not bool(drivers)
        )


e7_engine = NumberExplainer()
