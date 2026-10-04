"""
E2 Engine: Main Orchestrator
Runs all 4 anomaly layers sequentially and combines scores.
"""
import uuid
from app.ai.schemas import E2AnomalyRequest, E2AnomalyResponse
from app.ai.e2_anomaly.rules_layer import run_rules_layer
from app.ai.e2_anomaly.robust_stats import run_robust_stats_layer
from app.ai.e2_anomaly.peers import run_peer_layer
from app.ai.e2_anomaly.iforest import run_iforest_layer
from app.ai.e2_anomaly.combiner import combine_scores


class AnomalyEngine:
    """
    E2 Engine: 4-Layer Anomaly and Plausibility Engine
    as specified on Page 24 of the MEIL BRSR Build Guide.
    """

    def evaluate(self, req: E2AnomalyRequest, db_session=None) -> E2AnomalyResponse:
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

        return E2AnomalyResponse(
            run_id=run_id,
            is_anomaly=is_anomaly,
            score=composite_score,
            severity=severity,
            reasons=top_reasons,
            layer_scores={
                "L1_rules": round(l1_score, 3),
                "L2_robust_stats": round(l2_score, 3),
                "L3_peer_benchmark": round(l3_score, 3),
                "L4_isolation_forest": round(l4_score, 3),
            },
            is_fallback=False
        )


e2_engine = AnomalyEngine()
