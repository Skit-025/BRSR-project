import json
import uuid
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import text

from app.db.session import SessionLocal, init_db
from app.config.settings import settings
from app.workers.tasks_ai import (
    extract_document,
    detect_anomalies,
    analyze_policy_gaps,
    generate_narrative,
)
from app.ai.models import AIRun


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_extract_document_contract_v1_and_v2():
    db = SessionLocal()
    ev_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO evidence_files (id, storage_key, original_name, mime_type, size_bytes, sha256)
            VALUES (:id, :sk, 'sample_bill.pdf', 'application/pdf', 1024, 'abc123sha')
        """),
        {"id": ev_id, "sk": f"files/{ev_id}/sample_bill.pdf"}
    )
    db.commit()
    db.close()

    # 1. Test V1 Contract (AI_ENGINES_V2 = False)
    with patch("app.config.settings.settings.AI_ENGINES_V2", False):
        with patch("app.workers.tasks_ai._call_ai") as mock_call:
            mock_call.return_value = json.dumps([{"metric_name": "Electricity", "value": 52000, "unit": "kWh"}])
            res_v1 = extract_document.apply(
                args=(ev_id, "http://example.com/bill.pdf", "ent_1", "per_1")
            ).result
            assert res_v1["evidence_id"] == ev_id
            assert res_v1["status"] == "extracted"
            assert "raw" in res_v1

    # 2. Test V2 Contract (AI_ENGINES_V2 = True)
    with patch("app.config.settings.settings.AI_ENGINES_V2", True):
        with patch("app.workers.tasks_ai_adapters.run_extraction_pipeline") as mock_v2:
            mock_res = MagicMock()
            mock_res.is_relevant = True
            mock_res.fields = []
            mock_res.bill_details = None
            mock_res.model_dump.return_value = {"fields": []}
            mock_v2.return_value = mock_res

            res_v2 = extract_document.apply(
                args=(ev_id, "http://example.com/bill.pdf", "ent_1", "per_1")
            ).result
            assert res_v2["evidence_id"] == ev_id
            assert res_v2["status"] == "extracted"
            assert "raw" in res_v2


def test_detect_anomalies_contract_v1_and_v2():
    db = SessionLocal()
    # Check if period exists or mock period
    p_id = str(uuid.uuid4())
    e_id = str(uuid.uuid4())
    db.close()

    # 1. Test V1 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", False):
        with patch("app.workers.tasks_ai._call_ai") as mock_call:
            mock_call.return_value = json.dumps([])
            res_v1 = detect_anomalies.apply(args=(p_id, e_id)).result
            assert res_v1["period_id"] == p_id
            assert res_v1["entity_id"] == e_id
            assert "metrics_checked" in res_v1
            assert "anomaly_report" in res_v1
            assert res_v1["status"] == "completed"

    # 2. Test V2 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", True):
        res_v2 = detect_anomalies.apply(args=(p_id, e_id)).result
        assert res_v2["period_id"] == p_id
        assert res_v2["entity_id"] == e_id
        assert "metrics_checked" in res_v2
        assert "anomaly_report" in res_v2
        assert res_v2["status"] == "completed"


def test_analyze_policy_gaps_contract_v1_and_v2():
    p_id = str(uuid.uuid4())
    e_id = str(uuid.uuid4())

    # 1. Test V1 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", False):
        with patch("app.workers.tasks_ai._call_ai") as mock_call:
            mock_call.return_value = json.dumps([])
            res_v1 = analyze_policy_gaps.apply(args=(p_id, e_id)).result
            assert res_v1["period_id"] == p_id
            assert res_v1["entity_id"] == e_id
            assert "missing_mandatory_count" in res_v1
            assert "gap_analysis" in res_v1
            assert res_v1["status"] == "completed"

    # 2. Test V2 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", True):
        res_v2 = analyze_policy_gaps.apply(args=(p_id, e_id)).result
        assert res_v2["period_id"] == p_id
        assert res_v2["entity_id"] == e_id
        assert "missing_mandatory_count" in res_v2
        assert "gap_analysis" in res_v2
        assert res_v2["status"] == "completed"


def test_generate_narrative_contract_v1_and_v2():
    p_id = str(uuid.uuid4())
    root_id = str(uuid.uuid4())

    # 1. Test V1 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", False):
        with patch("app.workers.tasks_ai._call_ai") as mock_call:
            mock_call.return_value = "Drafted ESG narrative text."
            res_v1 = generate_narrative.apply(args=(p_id, root_id, "general", "professional")).result
            assert res_v1["period_id"] == p_id
            assert res_v1["entity_id"] == root_id
            assert res_v1["section"] == "general"
            assert "narrative" in res_v1
            assert res_v1["status"] == "generated"

    # 2. Test V2 Contract
    with patch("app.config.settings.settings.AI_ENGINES_V2", True):
        with patch("app.workers.tasks_ai_adapters.e5_engine.draft") as mock_draft:
            mock_res = MagicMock()
            mock_res.draft = "Drafted ESG narrative text with approved numbers."
            mock_res.number_lock_passed = True
            mock_res.model_dump.return_value = {"draft": mock_res.draft}
            mock_draft.return_value = mock_res

            res_v2 = generate_narrative.apply(args=(p_id, root_id, "general", "professional")).result
            assert res_v2["period_id"] == p_id
            assert res_v2["entity_id"] == root_id
            assert res_v2["section"] == "general"
            assert res_v2["narrative"] == mock_res.draft
            assert res_v2["status"] == "generated"
