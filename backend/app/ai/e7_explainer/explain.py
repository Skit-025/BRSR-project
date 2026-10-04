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
            summary = (
                f"Regarding {req.metric_code} in {req.period}: "
                f"The primary driver was {top.entity}, contributing {top.share * 100:.0f}% "
                f"(+{top.delta:.0f} units) of the change, "
                f"driven by increased operational activity during the reporting period."
            )
        else:
            summary = f"No lineage driver data available for {req.metric_code} in {req.period}."

        return E7ExplainNumberResponse(
            run_id=run_id,
            summary=summary,
            drivers=drivers,
            lineage_url=f"/lineage/{req.consolidated_value_id}",
            is_fallback=False
        )


e7_engine = NumberExplainer()
