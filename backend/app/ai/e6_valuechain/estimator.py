"""
E6 Engine: Value-Chain Emissions Estimator
Estimates Scope 3 emissions from subcontractor activities using classified proxy factors.
"""
import uuid
from app.ai.schemas import E6ValueChainRequest, E6ValueChainResponse
from app.ai.e6_valuechain.classifier import classify_work_category


class ValueChainEstimator:
    """E6 Engine: Subcontractor Scope 3 proxy estimation."""

    def estimate(self, req: E6ValueChainRequest, db_session=None) -> E6ValueChainResponse:
        run_id = str(uuid.uuid4())

        matched = classify_work_category(req.work_category)
        factor = matched["factor"]
        factor_unit = matched["unit"]

        estimated_emissions = round(req.billed_quantity * factor, 4)

        return E6ValueChainResponse(
            run_id=run_id,
            work_category=req.work_category,
            proxy_factor=factor,
            proxy_factor_unit=factor_unit,
            estimated_emissions_tco2e=estimated_emissions,
            confidence=0.88,
            is_fallback=False
        )


e6_engine = ValueChainEstimator()
