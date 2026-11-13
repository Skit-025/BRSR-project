"""
E2 Engine: Main Orchestrator
Runs all 4 anomaly layers sequentially and combines scores.
"""
import uuid
import math
from statistics import median
from fastapi import HTTPException
from app.ai.schemas import E2AnomalyRequest, E2AnomalyResponse
from app.ai.e2_anomaly.rules_layer import run_rules_layer
from app.ai.e2_anomaly.robust_stats import run_robust_stats_layer
from app.ai.e2_anomaly.peers import run_peer_layer
from app.ai.e2_anomaly.iforest import run_iforest_layer
from app.ai.e2_anomaly.combiner import combine_scores


def _plain_language_interpretation(req, is_anomaly, severity, reasons):
    """Explain the detector result without treating a review flag as proof of error."""
    value = f"{req.current_value:,.2f}".rstrip("0").rstrip(".")
    unit = (req.unit or "units").strip()
    features = {reason.feature for reason in reasons}
    checks = []

    if "non_negative" in features:
        checks.append("The entered value is negative, which is not valid for this metric.")
    if "unit_slip_1000x" in features:
        checks.append("The value is far above its historical level, so a unit mismatch may have occurred.")
    if "robust_mad_zscore" in features:
        typical = median(req.history) if req.history else None
        baseline = f" (the historical middle value is {typical:,.2f} {unit})" if typical is not None else ""
        checks.append(f"The current reading, {value} {unit}, is unusually far from past readings{baseline}.")
    if "constant_history_deviation" in features:
        checks.append("Past readings were nearly unchanged, but the current reading is different; confirm the change.")
    if "yoy_change_35_pct" in features and req.history:
        previous = req.history[-1]
        if previous:
            pct = abs(req.current_value - previous) / abs(previous) * 100
            direction = "increased" if req.current_value > previous else "decreased"
            checks.append(f"It {direction} by {pct:.1f}% compared with the previous reading ({previous:,.2f} {unit}).")
    if "yoy_from_zero" in features:
        checks.append("The previous reading was zero and the current reading is not, so the change needs confirmation.")
    if "peer_iqr_outlier" in features:
        checks.append("The reading is outside the range seen in the supplied peer values.")
    if "zero_incidents_high_hours" in features:
        checks.append("No incidents were reported despite high hours worked; verify the safety records are complete.")
    if "isolation_forest" in features:
        checks.append("The reading has an uncommon pattern compared with the supplied history.")

    if not is_anomaly:
        if len(req.history or []) < 3 and len(req.peer_values or []) < 3:
            return ("No anomaly was flagged by the checks available. There are not enough historical or peer readings "
                    "for a strong comparison, so review the source evidence as usual.")
        return "No anomaly was flagged. The value did not cross the checks' review thresholds; continue normal evidence review."

    lead = "Invalid value" if "non_negative" in features else f"Potential anomaly flagged ({getattr(severity, 'value', severity) or 'review needed'})."
    explanation = " ".join(checks) if checks else "One or more data checks found an unusual pattern."
    return (f"{lead} {explanation} The score shows the strength of the detector signals; it is not the probability "
            f"that the figure is wrong. Check the unit, reporting period, "
            "and supporting bill or meter record before accepting it.")


class AnomalyEngine:
    """
    E2 Engine: 4-Layer Anomaly and Plausibility Engine
    as specified on Page 24 of the MEIL BRSR Build Guide.
    """

    def evaluate(self, req: E2AnomalyRequest, db_session=None) -> E2AnomalyResponse:
        numbers = [req.current_value, *(req.history or []), *(req.peer_values or [])]
        if any(not math.isfinite(float(value)) for value in numbers):
            raise HTTPException(status_code=422, detail="Anomaly inputs must contain finite numeric values.")
        if any(not math.isfinite(float(value)) for value in (req.extra_context or {}).values() if isinstance(value, (int, float))):
            raise HTTPException(status_code=422, detail="Anomaly context values must be finite.")
        run_id = str(uuid.uuid4())

        # Run each layer independently
        l1_score, l1_reasons = run_rules_layer(
            value=req.current_value,
            history=req.history,
            metric_code=req.metric_code,
            extra_context=req.extra_context or {}
        )
        l2_score, l2_reasons = run_robust_stats_layer(
            value=req.current_value,
            history=req.history
        )
        l3_score, l3_reasons = run_peer_layer(
            value=req.current_value,
            peer_values=req.peer_values
        )
        l4_score, l4_reasons = run_iforest_layer(
            value=req.current_value,
            history=req.history
        )

        all_reasons = l1_reasons + l2_reasons + l3_reasons + l4_reasons

        composite_score, is_anomaly, severity, top_reasons = combine_scores(
            l1_score, l2_score, l3_score, l4_score, all_reasons
        )
        interpretation = _plain_language_interpretation(req, is_anomaly, severity, top_reasons)

        return E2AnomalyResponse(
            run_id=run_id,
            is_anomaly=is_anomaly,
            score=composite_score,
            severity=severity,
            reasons=top_reasons,
            interpretation=interpretation,
            layer_scores={
                "L1_rules": round(l1_score, 3),
                "L2_robust_stats": round(l2_score, 3),
                "L3_peer_benchmark": round(l3_score, 3),
                "L4_isolation_forest": round(l4_score, 3),
            },
            is_fallback=len(req.history or []) < 3 or len(req.peer_values or []) < 3
        )


e2_engine = AnomalyEngine()
