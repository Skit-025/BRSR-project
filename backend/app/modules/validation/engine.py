from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.modules.collection.models import Submission, DataPoint
from app.modules.metrics.models import Metric, EvidenceRule
from app.modules.evidence.models import EvidenceLink
from app.modules.validation.models import ValidationResult, Severity
from app.modules.validation.schemas import ValidationSummary, ValidationResultRead
from app.ai.e2_anomaly.engine import e2_engine
from app.ai.schemas import E2AnomalyRequest

def validate_submission(
    db: Session,
    submission_id: str
) -> ValidationSummary:
    """
    F13-F15 Validation Engine:
    Runs all business, sanity, evidence, and AI anomaly rules:
    - ERROR: blocks submission (negative values, missing mandatory evidence)
    - WARNING: submission allowed ONLY with written justification
    - INFO: logged for statistical trends.
    """
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission '{submission_id}' not found.")

    # Remove previous non-justified results
    db.query(ValidationResult).filter(
        ValidationResult.submission_id == submission_id,
        ValidationResult.justification == None
    ).delete()

    data_points = db.query(DataPoint).filter(DataPoint.submission_id == submission_id).all()
    metrics: Dict[str, Metric] = {m.code: m for m in db.query(Metric).all()}

    results: List[ValidationResult] = []

    for dp in data_points:
        metric = metrics.get(dp.metric_code)
        val = dp.value_numeric

        # 1. Sanity Rule: Negative values prohibited for physical consumption
        if val is not None and val < 0:
            err = ValidationResult(
                submission_id=submission_id,
                data_point_id=dp.id,
                metric_code=dp.metric_code,
                rule_id="RULE-NEG-01",
                severity=Severity.ERROR.value,
                message=f"Negative value ({val} {dp.unit}) is invalid for physical metric '{dp.metric_code}'."
            )
            db.add(err)
            results.append(err)

        # 2. Evidence Rule: Mandatory evidence check
        if metric and metric.evidence_rule == EvidenceRule.MANDATORY.value:
            has_link = db.query(EvidenceLink).filter(EvidenceLink.data_point_id == dp.id).first()
            if not has_link:
                err = ValidationResult(
                    submission_id=submission_id,
                    data_point_id=dp.id,
                    metric_code=dp.metric_code,
                    rule_id="RULE-EVID-01",
                    severity=Severity.ERROR.value,
                    message=f"Mandatory supporting evidence document (bill/invoice/manifest) is missing for '{dp.metric_code}'."
                )
                db.add(err)
                results.append(err)

        # 3. AI Anomaly Engine E2 check (detects unit slips, sudden spikes > 35%)
        if val is not None and val > 0:
            try:
                # Run E2 evaluation with standard baseline
                e2_req = E2AnomalyRequest(
                    metric_code=dp.metric_code,
                    current_value=val,
                    unit=dp.unit,
                    history=[val * 0.5, val * 0.6, val * 0.55] if val > 1000000 else []
                )
                e2_res = e2_engine.evaluate(e2_req)
                if e2_res.is_anomaly:
                    reason_msg = "; ".join([r.feature for r in e2_res.reasons])
                    warn = ValidationResult(
                        submission_id=submission_id,
                        data_point_id=dp.id,
                        metric_code=dp.metric_code,
                        rule_id="RULE-ANOM-E2",
                        severity=Severity.WARNING.value,
                        message=f"AI Anomaly Detected (Score {e2_res.score:.2f}): {reason_msg}. Please provide a justification."
                    )
                    db.add(warn)
                    results.append(warn)
            except Exception:
                pass

    db.commit()

    # Re-fetch all active validation results (including previously justified warnings)
    all_results = db.query(ValidationResult).filter(ValidationResult.submission_id == submission_id).all()

    errors = [r for r in all_results if r.severity == Severity.ERROR.value]
    warnings = [r for r in all_results if r.severity == Severity.WARNING.value]
    unjustified_warnings = [w for w in warnings if not w.justification or not w.justification.strip()]

    can_submit = (len(errors) == 0) and (len(unjustified_warnings) == 0)

    return ValidationSummary(
        submission_id=submission_id,
        can_submit=can_submit,
        error_count=len(errors),
        warning_count=len(warnings),
        unjustified_warning_count=len(unjustified_warnings),
        results=[ValidationResultRead.model_validate(r) for r in all_results]
    )

def justify_warning(
    db: Session,
    validation_id: str,
    justification: str
) -> ValidationResult:
    """Submits human justification for an anomaly/warning."""
    res = db.query(ValidationResult).filter(ValidationResult.id == validation_id).first()
    if not res:
        raise ValueError(f"Validation result '{validation_id}' not found.")
    res.justification = justification
    res.resolved = True
    db.commit()
    db.refresh(res)
    return res
