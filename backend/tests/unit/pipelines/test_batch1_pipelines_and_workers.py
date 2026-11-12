"""
Regression tests for Phase 2 — Batch 1 (P0):
Closing pipelines, reporting pipelines, and Celery worker schema alignment.
All DB tests execute inside a rolled-back outer transaction savepoint so live
PostgreSQL data and append-only audit_events remain untouched.
"""
from __future__ import annotations

import importlib
import importlib.util
import json
import sys
import types
import uuid
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.ai.schemas import E1ExtractResponse, ExtractedField
from app.db.session import engine
from app.modules.audit.models import AuditLog
from app.modules.audit.schemas import AuditLogCreate
from app.modules.audit.service import AuditService
from app.modules.collection.models import DataPoint, Submission, SubmissionStatus, ValueStatus
from app.modules.consolidation.schemas import ConsolidationRunResponse
from app.modules.evidence.models import EvidenceFile, ScanStatus
from app.modules.metrics.models import Metric
from app.modules.org.models import OrgNode, PeriodStatus, PeriodType, ReportingPeriod
from app.modules.snapshots.models import ReportSnapshot
from app.modules.validation.exceptions.models import ExceptionStatus, ValidationException
from app.pipelines.closing.pipeline import ClosingContext, run_closing_pipeline
from app.pipelines.closing.steps.lock_period import lock_period
from app.pipelines.closing.steps.seal_snapshot import (
    _get_payload_digest,
    _get_previous_snapshot_hash,
    seal_snapshot,
)
from app.pipelines.closing.steps.verify_chain_complete import verify_chain_complete
from app.pipelines.reporting.pipeline import ReportingContext, run_reporting_pipeline
from app.pipelines.reporting.steps.assemble_audit_pack import (
    _load_audit_events,
    _load_validation_exceptions,
    assemble_audit_pack,
)
from app.pipelines.reporting.steps.load_snapshot import load_snapshot


@pytest.fixture
def worker_modules():
    """
    Import app.workers.tasks_ai and app.workers.tasks_pipelines cleanly even
    when optional `celery` package is absent from the local Python environment.
    """
    if importlib.util.find_spec("celery") is not None:
        from app.workers import tasks_ai, tasks_pipelines
        yield tasks_ai, tasks_pipelines
        return

    class _BoundTaskWrapper:
        def __init__(self, fn, bind: bool):
            self._fn = fn
            self._bind = bind
            self.delay = MagicMock()

        def retry(self, exc=None, **kwargs):
            return exc if exc is not None else RuntimeError("celery retry requested")

        def run(self, *args, **kwargs):
            if self._bind:
                return self._fn(self, *args, **kwargs)
            return self._fn(*args, **kwargs)

        def __call__(self, *args, **kwargs):
            return self.run(*args, **kwargs)

    class _FakeCelery:
        def __init__(self, *args, **kwargs):
            pass

        def config_from_object(self, *args, **kwargs):
            pass

        def autodiscover_tasks(self, *args, **kwargs):
            pass

        def task(self, *args, bind: bool = False, **kwargs):
            def decorator(fn):
                return _BoundTaskWrapper(fn, bind=bind)
            return decorator

    fake_celery = types.ModuleType("celery")
    fake_celery.Celery = _FakeCelery

    saved_worker_mods = {
        k: sys.modules.pop(k)
        for k in list(sys.modules.keys())
        if k == "app.workers" or k.startswith("app.workers.")
    }
    try:
        with patch.dict(sys.modules, {"celery": fake_celery}):
            tasks_ai = importlib.import_module("app.workers.tasks_ai")
            tasks_pipelines = importlib.import_module("app.workers.tasks_pipelines")
            yield tasks_ai, tasks_pipelines
    finally:
        for k in list(sys.modules.keys()):
            if k == "app.workers" or k.startswith("app.workers."):
                sys.modules.pop(k, None)
        sys.modules.update(saved_worker_mods)


@pytest.fixture
def isolated_db():
    """
    Provide a PostgreSQL Session bound to an outer transaction that always rolls
    back at teardown, isolating even code paths that call db.commit() or insert
    into append-only audit_events.
    """
    conn = engine.connect()
    outer_tx = conn.begin()
    session = Session(bind=conn, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        outer_tx.rollback()
        conn.close()


def _seed_org_period_submission(db: Session, suffix: str):
    root = OrgNode(
        id=str(uuid.uuid4()),
        code=f"GRP-{suffix}",
        name=f"Batch1 Group {suffix}",
        type="group",
        path=f"BATCH1_{suffix}",
        is_root=True,
        ownership_pct=100.0,
        boundary=True,
        location_country="India",
    )
    site = OrgNode(
        id=str(uuid.uuid4()),
        code=f"SITE-{suffix}",
        name=f"Batch1 Site {suffix}",
        type="project",
        parent_id=root.id,
        path=f"BATCH1_{suffix}.SITE_{suffix}",
        is_root=False,
        ownership_pct=100.0,
        boundary=True,
        location_country="India",
    )
    period = ReportingPeriod(
        id=str(uuid.uuid4()),
        code=f"FY2025-26-B1-{suffix}",
        financial_year="2025-2026",
        period_type=PeriodType.MONTH.value,
        month=5,
        quarter=1,
        start_date=date(2025, 5, 1),
        end_date=date(2025, 5, 31),
        status=PeriodStatus.OPEN.value,
    )
    db.add_all([root, site, period])
    db.flush()

    metric = db.query(Metric).filter(Metric.code == "ENV-ENERGY-001", Metric.is_deleted == False).first()
    if not metric:
        metric = Metric(
            code="ENV-ENERGY-001",
            name="Total Electricity Consumption",
            definition="Grid electricity consumed",
            category="environment",
            section="Section C",
            principle=6,
            indicator_type="essential",
            brsr_core=True,
            core_attribute="Energy Footprint",
            data_type="numeric",
            base_unit="MWh",
            allowed_units=["kWh", "MWh", "GJ"],
        )
        db.add(metric)
        db.flush()

    sub = Submission(
        id=str(uuid.uuid4()),
        entity_id=site.id,
        period_id=period.id,
        status=SubmissionStatus.PROJECT_APPROVED.value,
    )
    db.add(sub)
    db.flush()

    dp = DataPoint(
        id=str(uuid.uuid4()),
        submission_id=sub.id,
        metric_code="ENV-ENERGY-001",
        value_numeric=120.0,
        normalized_value=120.0,
        unit="MWh",
        status=ValueStatus.ACTUAL.value,
    )
    db.add(dp)
    db.commit()
    return root, site, period, sub, dp


# ----------------------------------------------------------------------
# 1. verify_chain_complete.py
# ----------------------------------------------------------------------

def test_verify_chain_complete_valid_and_broken_and_db_error(isolated_db: Session):
    suffix = uuid.uuid4().hex[:6].upper()
    actor = str(uuid.uuid4())

    AuditService(isolated_db).log_event(
        AuditLogCreate(
            action="BATCH1_TEST",
            actor_id=actor,
            target_type="ORG_NODE",
            target_id=suffix,
        )
    )

    ctx_ok = ClosingContext(period_id=str(uuid.uuid4()), root_entity_id=str(uuid.uuid4()), closed_by=actor)
    verify_chain_complete(ctx_ok, isolated_db)
    assert ctx_ok.chain_verified is True
    assert ctx_ok.chain_gaps == []

    # Inject an orphan prev_hash row into audit_events
    broken_id = str(uuid.uuid4())
    broken_row = AuditLog(
        id=broken_id,
        sequence_number=999_999_001,
        action="TAMPER_SIMULATION",
        actor_id=actor,
        target_type="ORG_NODE",
        target_id=suffix,
        prev_hash="f" * 64,
        record_hash="a" * 64,
    )
    isolated_db.add(broken_row)
    isolated_db.commit()

    ctx_bad = ClosingContext(period_id=str(uuid.uuid4()), root_entity_id=str(uuid.uuid4()), closed_by=actor)
    verify_chain_complete(ctx_bad, isolated_db)
    assert ctx_bad.chain_verified is False
    assert broken_id in ctx_bad.chain_gaps
    assert ctx_bad.warnings

    # DB error must propagate rather than setting chain_verified = True
    failing_db = MagicMock()
    failing_db.execute.side_effect = SQLAlchemyError("simulated DB failure")
    ctx_err = ClosingContext(period_id=str(uuid.uuid4()), root_entity_id=str(uuid.uuid4()))
    with pytest.raises(SQLAlchemyError):
        verify_chain_complete(ctx_err, failing_db)
    assert ctx_err.chain_verified is False


# ----------------------------------------------------------------------
# 2. lock_period.py
# ----------------------------------------------------------------------

def test_lock_period_success_idempotent_and_missing(isolated_db: Session):
    suffix = uuid.uuid4().hex[:6].upper()
    root, _site, period, _sub, _dp = _seed_org_period_submission(isolated_db, suffix)

    ctx = ClosingContext(period_id=period.id, root_entity_id=root.id, closed_by="group-admin-1")
    lock_period(ctx, isolated_db)
    assert ctx.period_locked is True

    isolated_db.expire_all()
    refreshed = isolated_db.query(ReportingPeriod).filter(ReportingPeriod.id == period.id).first()
    assert refreshed.status == PeriodStatus.LOCKED.value

    audit_row = (
        isolated_db.query(AuditLog)
        .filter(AuditLog.action == "LOCK_PERIOD", AuditLog.target_id == period.id)
        .first()
    )
    assert audit_row is not None
    assert audit_row.actor_id == "group-admin-1"

    # Locking again should warn cleanly and keep period_locked = True
    ctx2 = ClosingContext(period_id=period.id, root_entity_id=root.id, closed_by="group-admin-1")
    lock_period(ctx2, isolated_db)
    assert ctx2.period_locked is True
    assert any("already LOCKED" in w for w in ctx2.warnings)

    # Non-existent period must raise rather than succeeding silently
    ctx_missing = ClosingContext(period_id=str(uuid.uuid4()), root_entity_id=root.id, closed_by="group-admin-1")
    with pytest.raises(ValueError, match="not found"):
        lock_period(ctx_missing, isolated_db)
    assert ctx_missing.period_locked is False


# ----------------------------------------------------------------------
# 3. seal_snapshot.py, load_snapshot.py, assemble_audit_pack.py
# ----------------------------------------------------------------------

def test_closing_and_reporting_pipelines_end_to_end(isolated_db: Session):
    suffix = uuid.uuid4().hex[:6].upper()
    root, site, period, sub, _dp = _seed_org_period_submission(isolated_db, suffix)

    # Add an open ValidationException + submission AuditLog to exercise assemble_audit_pack
    ve = ValidationException(
        id=str(uuid.uuid4()),
        submission_id=sub.id,
        metric_code="ENV-ENERGY-001",
        rule_id="VR-TEST-01",
        severity="warning",
        description="Test exception for Batch 1 audit pack",
        status=ExceptionStatus.OPEN.value,
    )
    isolated_db.add(ve)
    isolated_db.commit()

    AuditService(isolated_db).log_event(
        AuditLogCreate(
            action="SUBMIT_PACK",
            actor_id="maker-1",
            target_type="SUBMISSION",
            target_id=sub.id,
            details={"period_id": period.id, "entity_id": site.id},
        )
    )

    # Run closing pipeline
    close_res = run_closing_pipeline(
        db=isolated_db,
        period_id=period.id,
        root_entity_id=root.id,
        closed_by="group-admin-1",
    )
    assert close_res["status"] == "CLOSED", close_res
    assert close_res["chain_verified"] is True
    assert close_res["period_locked"] is True
    assert close_res["snapshot_id"] is not None
    assert len(close_res["snapshot_hash"]) == 64

    snap1 = isolated_db.query(ReportSnapshot).filter(ReportSnapshot.id == close_res["snapshot_id"]).first()
    assert snap1 is not None
    assert snap1.is_sealed is True
    assert snap1.version == 1

    # Re-seal creates chained version 2 linking prev_hash -> snap1.sha256_hash
    ctx_rechain = ClosingContext(period_id=period.id, root_entity_id=root.id, closed_by="group-admin-1")
    seal_snapshot(ctx_rechain, isolated_db)
    snap2 = isolated_db.query(ReportSnapshot).filter(ReportSnapshot.id == ctx_rechain.snapshot_id).first()
    assert snap2 is not None
    assert snap2.version == 2
    assert snap2.metadata_json["prev_hash"] == snap1.sha256_hash

    # Run reporting pipeline against sealed snapshot & live approved data_points
    report_res = run_reporting_pipeline(
        db=isolated_db,
        period_id=period.id,
        root_entity_id=root.id,
        requested_by="group-admin-1",
        output_formats=["json", "csv", "html"],
    )
    assert report_res["status"] == "COMPLETED", report_res
    assert report_res["snapshot"]["id"] == snap2.id
    assert report_res["snapshot"]["hash"] == snap2.sha256_hash
    assert report_res["snapshot"]["prev_hash"] == snap1.sha256_hash
    assert report_res["total_disclosures"] >= 1
    assert "ENV-ENERGY-001" in report_res["rendered_outputs"]["json"]

    # Audit pack contents check
    rpt_ctx = ReportingContext(period_id=period.id, root_entity_id=root.id, requested_by="group-admin-1")
    load_snapshot(rpt_ctx, isolated_db)
    assemble_audit_pack(rpt_ctx, isolated_db)
    assert rpt_ctx.audit_pack["audit_events_count"] >= 3
    assert any(ex["rule_id"] == "VR-TEST-01" for ex in rpt_ctx.audit_pack["validation_exceptions"])


def test_snapshot_and_audit_pack_propagate_db_errors():
    failing_db = MagicMock()
    failing_db.execute.side_effect = SQLAlchemyError("DB connection dropped")

    with pytest.raises(SQLAlchemyError):
        _get_payload_digest(failing_db, str(uuid.uuid4()), str(uuid.uuid4()))

    with pytest.raises(SQLAlchemyError):
        _get_previous_snapshot_hash(failing_db, str(uuid.uuid4()), str(uuid.uuid4()))

    with pytest.raises(SQLAlchemyError):
        _load_audit_events(failing_db, str(uuid.uuid4()), str(uuid.uuid4()))

    with pytest.raises(SQLAlchemyError):
        _load_validation_exceptions(failing_db, str(uuid.uuid4()), str(uuid.uuid4()))


# ----------------------------------------------------------------------
# 4. tasks_pipelines.py
# ----------------------------------------------------------------------

def test_tasks_pipelines_run_aggregation_no_timestamp_error(isolated_db: Session, worker_modules):
    _tasks_ai, tasks_pipelines = worker_modules
    mock_res = ConsolidationRunResponse(
        period_id="p-1",
        consolidated_nodes_count=3,
        consolidated_metrics_count=12,
        message="ok",
    )
    with patch.object(tasks_pipelines, "_get_db", return_value=isolated_db), \
         patch.object(isolated_db, "close", lambda: None), \
         patch("app.modules.consolidation.service.run_consolidation_engine", return_value=mock_res):
        res = tasks_pipelines.run_aggregation.run("p-1", "root-1")
        assert res["status"] == "COMPLETED"
        assert res["entities_processed"] == 3
        assert res["metrics_processed"] == 12
        assert res["message"] == "ok"
        assert isinstance(res["timestamp"], str) and len(res["timestamp"]) > 10


def test_tasks_pipelines_trigger_ignores_deleted_rows(isolated_db: Session, worker_modules):
    _tasks_ai, tasks_pipelines = worker_modules
    suffix = uuid.uuid4().hex[:6].upper()
    root, _site, period, _sub, _dp = _seed_org_period_submission(isolated_db, suffix)
    period.is_deleted = True
    isolated_db.commit()

    with patch.object(tasks_pipelines, "_get_db", return_value=isolated_db), \
         patch.object(isolated_db, "close", lambda: None), \
         patch.object(tasks_pipelines.run_incremental_aggregation, "delay") as mock_delay:
        res = tasks_pipelines.trigger_incremental_aggregation_all.run()
        dispatched_pairs = {(t["period_id"], t["root_entity_id"]) for t in res["tasks"]}
        assert (period.id, root.id) not in dispatched_pairs
        assert mock_delay.called or res["dispatched"] >= 0


# ----------------------------------------------------------------------
# 5. tasks_ai.py
# ----------------------------------------------------------------------

def test_tasks_ai_extract_document_persists_ai_run_and_validates_missing(isolated_db: Session, worker_modules):
    tasks_ai, _tasks_pipelines = worker_modules
    ev = EvidenceFile(
        id=str(uuid.uuid4()),
        storage_key="evidence/test_bill.pdf",
        original_name="test_bill.pdf",
        mime_type="application/pdf",
        size_bytes=128,
        sha256="b" * 64,
        scan_status=ScanStatus.CLEAN.value,
        doc_type="ELECTRICITY_BILL",
    )
    isolated_db.add(ev)
    isolated_db.commit()

    fake_run_id = str(uuid.uuid4())
    fake_extract = E1ExtractResponse(
        run_id=fake_run_id,
        doc_type="electricity_bill",
        fields=[
            ExtractedField(
                metric="ENV-ENERGY-001",
                value=110.0,
                unit="kWh",
                confidence=0.95,
                page=1,
            )
        ],
        is_relevant=True,
    )

    with patch.object(tasks_ai, "_get_db", return_value=isolated_db), \
         patch.object(isolated_db, "close", lambda: None), \
         patch("app.modules.evidence.storage.storage_service.get_file_bytes", return_value=b"%PDF-1.4 fake"), \
         patch("app.ai.e1_extract.extractor.e1_engine.extract_from_file", return_value=fake_extract):
        res = tasks_ai.extract_document.run(ev.id, "evidence/test_bill.pdf", "ent-1", "per-1")
        assert res["status"] == "extracted"
        assert res["run_id"] == fake_run_id
        assert res["fields_count"] == 1

    from app.ai.models import AIRun
    persisted = isolated_db.query(AIRun).filter(AIRun.id == fake_run_id).first()
    assert persisted is not None
    assert persisted.engine == "E1"
    assert persisted.input_ref == ev.id

    # Missing EvidenceFile should invoke Celery retry / raise instead of silently passing
    with patch.object(tasks_ai, "_get_db", return_value=isolated_db), \
         patch.object(isolated_db, "close", lambda: None), \
         patch.object(tasks_ai.extract_document, "retry", side_effect=RuntimeError("retry-triggered")):
        with pytest.raises(RuntimeError, match="retry-triggered"):
            tasks_ai.extract_document.run(str(uuid.uuid4()), "missing", "ent-1", "per-1")


def test_tasks_ai_anomaly_narrative_and_policy_gaps(isolated_db: Session, worker_modules):
    tasks_ai, _tasks_pipelines = worker_modules
    suffix = uuid.uuid4().hex[:6].upper()
    root, site, period, _sub, _dp = _seed_org_period_submission(isolated_db, suffix)

    anomaly_out = tasks_ai._WorkerAnomalyReport(
        anomalies=[
            tasks_ai._WorkerAnomalyItem(
                metric_code="ENV-ENERGY-001",
                anomaly_type="spike",
                severity="warning",
                explanation="Elevated consumption vs baseline",
            )
        ]
    )
    narrative_out = tasks_ai._WorkerNarrativeOutput(draft="Verified BRSR section narrative.")
    gap_out = tasks_ai._WorkerPolicyGapReport(
        gaps=[
            tasks_ai._WorkerPolicyGapItem(
                code="ENV-WATER-001",
                risk_level="High",
                action="Submit water withdrawal data",
                regulatory_reference="SEBI BRSR P6",
            )
        ]
    )

    def fake_run_structured(engine: str, **kwargs):
        if engine == "E2":
            return anomaly_out
        if engine == "E5":
            return narrative_out
        return gap_out

    with patch.object(tasks_ai, "_get_db", return_value=isolated_db), \
         patch.object(isolated_db, "close", lambda: None), \
         patch("app.ai.gateway.ai_gateway.run_structured", side_effect=fake_run_structured):
        res_e2 = tasks_ai.detect_anomalies.run(period.id, site.id)
        assert res_e2["status"] == "completed"
        assert res_e2["metrics_checked"] >= 1
        assert "ENV-ENERGY-001" in res_e2["anomaly_report"]

        res_e5 = tasks_ai.generate_narrative.run(period.id, root.id, section="environment")
        assert res_e5["status"] == "generated"
        assert res_e5["narrative"] == "Verified BRSR section narrative."

        res_e4 = tasks_ai.analyze_policy_gaps.run(period.id, site.id)
        assert res_e4["status"] == "completed"
        assert res_e4["missing_mandatory_count"] >= 0
        assert json.loads(res_e4["gap_analysis"])[0]["code"] == "ENV-WATER-001"

