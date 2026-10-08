import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, MetricApplicability
from app.modules.audit.models import AuditLog
from app.security.jwt import create_access_token

client = TestClient(app)

def test_applicability_override_rbac_and_audit():
    suffix = uuid.uuid4().hex[:6].upper()

    with SessionLocal() as db:
        node = OrgNode(
            code=f"NODE-OVR-{suffix}",
            name=f"Override Test Entity {suffix}",
            type="project",
            path=f"GRP.NODE-OVR-{suffix}",
            boundary=True,
            ownership_pct=100.0,
            control_type="operational_control",
        )
        db.add(node)
        db.commit()
        db.refresh(node)
        node_id = str(node.id)

    # 1. Create tokens for MAKER (maker role) and ADMIN (system_admin role)
    maker_token = create_access_token(subject=f"maker-user-{suffix}", role="maker", org_node_id=node_id)
    admin_token = create_access_token(subject=f"admin-user-{suffix}", role="system_admin", org_node_id=node_id)

    maker_headers = {"Authorization": f"Bearer {maker_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. MAKER attempt: must get 403 Forbidden
    payload = {
        "metric_code": "ENV-GHG-001",
        "is_applicable": False,
        "reason": "Facility does not emit Scope 1 emissions from flaring.",
        "approved_by": "Test Approver"
    }
    maker_res = client.post(f"/api/v1/org/applicability/{node_id}/override", json=payload, headers=maker_headers)
    assert maker_res.status_code == 403, f"Expected 403 for MAKER, got {maker_res.status_code}: {maker_res.text}"
    assert "MAKER role forbidden" in maker_res.json()["detail"]

    # 3. Mandatory Reason Validation: Admin sends empty reason -> must get 400 Bad Request
    invalid_payload = {
        "metric_code": "ENV-GHG-001",
        "is_applicable": False,
        "reason": "   ",
        "approved_by": "Test Approver"
    }
    bad_req_res = client.post(f"/api/v1/org/applicability/{node_id}/override", json=invalid_payload, headers=admin_headers)
    assert bad_req_res.status_code == 400
    assert "mandatory justification reason" in bad_req_res.json()["detail"].lower()

    # 4. Admin attempt with valid reason -> must succeed (200 OK)
    admin_res = client.post(f"/api/v1/org/applicability/{node_id}/override", json=payload, headers=admin_headers)
    assert admin_res.status_code == 200, f"Expected 200 for Admin, got {admin_res.status_code}: {admin_res.text}"
    body = admin_res.json()
    assert body["is_applicable"] is False
    assert body["is_exception"] is True
    assert body["exception_reason"] == payload["reason"]

    # 5. Verify cryptographic audit log entry was recorded
    with SessionLocal() as db:
        audit_entry = db.query(AuditLog).filter(
            AuditLog.action == "APPLICABILITY_OVERRIDE",
            AuditLog.target_id == body["id"]
        ).first()
        assert audit_entry is not None, "AuditLog entry was not generated for applicability override"
        assert audit_entry.actor_id == f"admin-user-{suffix}"
        assert audit_entry.changes["metric_code"] == "ENV-GHG-001"
        assert audit_entry.changes["is_applicable"] is False
