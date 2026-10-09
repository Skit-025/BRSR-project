"""
backend/scripts/seed/seed_aarohan_demo.py
Seeds the canonical Aarohan Infrastructure & Energy Group demo hierarchy and personas
matching the exact hackathon judge requirements:

Hierarchy:
Aarohan Infrastructure & Energy Group
├── Aarohan Renewable Energy Pvt. Ltd.
│   ├── Solar EPC & Operations
│   │   ├── 250 MW Odisha Solar Park
│   │   └── 50 MW Rajasthan Solar Expansion
│   └── Wind Energy Operations
│       └── Kutch Wind Farm
└── Aarohan Infrastructure Projects Pvt. Ltd.
    └── Highway Development
        └── Bhubaneswar–Puri Road Expansion

Personas:
- Group Admin: group.admin@aarohan.in / Password123!
- Subsidiary Admin: sub.admin@aarohan.in / Password123!
- BU Admin: bu.admin@aarohan.in / Password123!
- Project User: project.user@aarohan.in / Password123!
"""
import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
import uuid
import hashlib
from datetime import datetime, timezone, date
from app.db.session import SessionLocal, init_db
from app.modules.org.models import OrgNode, ReportingPeriod, NodeType
from app.modules.auth.models import User
from app.modules.auth.service import get_password_hash
from app.modules.metrics.models import Metric, MetricCategory, AggregationType
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.evidence.models import EvidenceFile, EvidenceLink, DocumentType, ScanStatus
from app.modules.consolidation.service import run_consolidation_engine

def seed_aarohan_demo():
    init_db()
    db = SessionLocal()
    try:
        print("[INFO] Seeding Aarohan Infrastructure & Energy Group demo dataset...")

        # 1. Reporting Period: March 2026 (FY 2025-26)
        period = db.query(ReportingPeriod).filter(ReportingPeriod.code == "FY2025-26-M03").first()
        if not period:
            period = ReportingPeriod(
                code="FY2025-26-M03",
                financial_year="2025-2026",
                period_type="month",
                month=3,
                start_date=datetime(2026, 3, 1),
                end_date=datetime(2026, 3, 31),
                status="OPEN"
            )
            db.add(period)
            db.flush()
        print(f"[OK] Period: {period.code}")

        # 2. Hierarchy Setup
        # Root Group
        group = db.query(OrgNode).filter(OrgNode.code == "AAROHAN-GROUP").first()
        if not group:
            group = OrgNode(
                code="AAROHAN-GROUP",
                name="Aarohan Infrastructure & Energy Group",
                type="group",
                path="AAROHAN",
                is_root=True,
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="corporate",
                location_state="Delhi",
                location_country="India",
                is_active=True
            )
            db.add(group)
            db.flush()
        print(f"[OK] Group: {group.name} [{group.code}]")

        # Subsidiary 1: Aarohan Renewable Energy Pvt. Ltd.
        sub1 = db.query(OrgNode).filter(OrgNode.code == "AAROHAN-RENEW").first()
        if not sub1:
            sub1 = OrgNode(
                code="AAROHAN-RENEW",
                name="Aarohan Renewable Energy Pvt. Ltd.",
                type="subsidiary",
                parent_id=group.id,
                path=f"{group.path}.RENEW",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="renewable_energy",
                location_state="Gujarat",
                location_country="India",
                is_active=True
            )
            db.add(sub1)
            db.flush()
        print(f"[OK] Subsidiary 1: {sub1.name}")

        # BU 1: Solar EPC & Operations
        bu1 = db.query(OrgNode).filter(OrgNode.code == "BU-SOLAR").first()
        if not bu1:
            bu1 = OrgNode(
                code="BU-SOLAR",
                name="Solar EPC & Operations",
                type="business_unit",
                parent_id=sub1.id,
                path=f"{sub1.path}.SOLAR",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="solar_power",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(bu1)
            db.flush()
        print(f"[OK] BU 1: {bu1.name}")

        # Project 1: 250 MW Odisha Solar Park (Hero experience)
        proj1 = db.query(OrgNode).filter(OrgNode.code == "PRJ-ODISHA-SOLAR").first()
        if not proj1:
            proj1 = OrgNode(
                code="PRJ-ODISHA-SOLAR",
                name="250 MW Odisha Solar Park",
                type="project",
                parent_id=bu1.id,
                path=f"{bu1.path}.ODISHA250",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="solar_generation",
                project_description="250 MW utility-scale solar photovoltaic power plant with single-axis tracking systems, central inverters, and high-efficiency bifacial modules supplying clean power to the state grid.",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(proj1)
            db.flush()
        print(f"[OK] Project 1: {proj1.name}")

        # Project 2: 50 MW Rajasthan Solar Expansion
        proj2 = db.query(OrgNode).filter(OrgNode.code == "PRJ-RAJ-SOLAR").first()
        if not proj2:
            proj2 = OrgNode(
                code="PRJ-RAJ-SOLAR",
                name="50 MW Rajasthan Solar Expansion",
                type="project",
                parent_id=bu1.id,
                path=f"{bu1.path}.RAJ50",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="solar_generation",
                project_description="50 MW ground mounted solar farm expansion with advanced bifacial monocrystalline arrays in Bhadla solar zone.",
                location_state="Rajasthan",
                location_country="India",
                is_active=True
            )
            db.add(proj2)
            db.flush()
        print(f"[OK] Project 2: {proj2.name}")

        # BU 2: Wind Energy Operations
        bu2 = db.query(OrgNode).filter(OrgNode.code == "BU-WIND").first()
        if not bu2:
            bu2 = OrgNode(
                code="BU-WIND",
                name="Wind Energy Operations",
                type="business_unit",
                parent_id=sub1.id,
                path=f"{sub1.path}.WIND",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="wind_power",
                location_state="Gujarat",
                location_country="India",
                is_active=True
            )
            db.add(bu2)
            db.flush()
        print(f"[OK] BU 2: {bu2.name}")

        # Project 3: Kutch Wind Farm
        proj3 = db.query(OrgNode).filter(OrgNode.code == "PRJ-KUTCH-WIND").first()
        if not proj3:
            proj3 = OrgNode(
                code="PRJ-KUTCH-WIND",
                name="Kutch Wind Farm",
                type="project",
                parent_id=bu2.id,
                path=f"{bu2.path}.KUTCH",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="wind_generation",
                project_description="100 MW onshore wind turbine farm located along the high-wind corridor of Kutch coastal plain, deploying 2.7 MW class turbines.",
                location_state="Gujarat",
                location_country="India",
                is_active=True
            )
            db.add(proj3)
            db.flush()
        print(f"[OK] Project 3: {proj3.name}")

        # Subsidiary 2: Aarohan Infrastructure Projects Pvt. Ltd.
        sub2 = db.query(OrgNode).filter(OrgNode.code == "AAROHAN-INFRA").first()
        if not sub2:
            sub2 = OrgNode(
                code="AAROHAN-INFRA",
                name="Aarohan Infrastructure Projects Pvt. Ltd.",
                type="subsidiary",
                parent_id=group.id,
                path=f"{group.path}.INFRA",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="civil_infrastructure",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(sub2)
            db.flush()
        print(f"[OK] Subsidiary 2: {sub2.name}")

        # BU 3: Highway Development
        bu3 = db.query(OrgNode).filter(OrgNode.code == "BU-HIGHWAY").first()
        if not bu3:
            bu3 = OrgNode(
                code="BU-HIGHWAY",
                name="Highway Development",
                type="business_unit",
                parent_id=sub2.id,
                path=f"{sub2.path}.HWY",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="highways",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(bu3)
            db.flush()
        print(f"[OK] BU 3: {bu3.name}")

        # Project 4: Bhubaneswar–Puri Road Expansion
        proj4 = db.query(OrgNode).filter(OrgNode.code == "PRJ-PURI-HWY").first()
        if not proj4:
            proj4 = OrgNode(
                code="PRJ-PURI-HWY",
                name="Bhubaneswar–Puri Road Expansion",
                type="project",
                parent_id=bu3.id,
                path=f"{bu3.path}.PURI",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="highway_expansion",
                project_description="60 km 6-lane Greenfield expressway and grade separation corridor connecting state capital Bhubaneswar to coastal pilgrimage center Puri.",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(proj4)
            db.flush()
        print(f"[OK] Project 4: {proj4.name}")

        # 3. Create the 5 Demo Personas (Five-Role Architecture)
        demo_users = [
            ("admin@aarohan.in", "system_admin", "Dr. Deepa Nair (Platform System Admin)", None),
            ("group.admin@aarohan.in", "group_admin", "Aditya Sharma (Group ESG Director)", group.id),
            ("sub.admin@aarohan.in", "subsidiary_admin", "Meera Nair (Subsidiary ESG Admin)", sub1.id),
            ("bu.admin@aarohan.in", "bu_admin", "Rajesh V. (Solar EPC BU Admin)", bu1.id),
            ("project.user@aarohan.in", "project_admin", "Ravi Kumar (Site Engineer - Odisha Solar)", proj1.id),
        ]
        user_records = {}
        for email, role, full_name, node_id in demo_users:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    hashed_password=get_password_hash("Password123!"),
                    full_name=full_name,
                    role=role,
                    org_node_id=node_id,
                    is_active=True
                )
                db.add(u)
                db.flush()
            else:
                # Update role and node if needed
                u.role = role
                u.org_node_id = node_id
                u.full_name = full_name
                u.is_active = True
                db.flush()

            # Ensure role assignment
            assignment = db.query(UserRoleAssignment).filter(
                UserRoleAssignment.user_id == u.id,
                UserRoleAssignment.is_active == True
            ).first()
            if not assignment:
                assignment = UserRoleAssignment(
                    user_id=u.id,
                    role=role,
                    entity_id=node_id,
                    assigned_by_id=u.id,
                    is_active=True
                )
                db.add(assignment)
                db.flush()
            else:
                assignment.role = role
                assignment.entity_id = node_id
                db.flush()

            user_records[email] = u
            print(f"[OK] Persona: {email} -> {role} ({full_name})")

        # 4. Standard Metrics Ensure
        std_metrics = [
            ("ENV-ENERGY-001", "Electricity Consumed (Grid Supply)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "kWh", AggregationType.SUM.value, "Grid electricity consumed across project operations"),
            ("ENV-ENERGY-002", "Diesel Consumed - DG Sets (Backup Generators)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "litres", AggregationType.SUM.value, "Captive stationary backup diesel generator fuel for testing and emergency backup"),
            ("ENV-ENERGY-003", "Diesel Consumed - Mobile Machinery & Fleet", MetricCategory.ENVIRONMENT.value, "Section C", 6, "litres", AggregationType.SUM.value, "Heavy excavation equipment and project maintenance transit fleet"),
            ("ENV-WATER-001", "Water Withdrawal (Ground / Borewell)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "kL", AggregationType.SUM.value, "Water extracted for automated robotic module cleaning and civil maintenance"),
            ("ENV-WASTE-001", "Hazardous Waste (Used Oil & Sludge)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "tonnes", AggregationType.SUM.value, "Used inverter transformer oils and workshop sludge dispatched to authorised SPCB re-refiners"),
            ("ENV-TRAV-001", "Business Travel & Local Conveyance", MetricCategory.ENVIRONMENT.value, "Section C", 6, "km", AggregationType.SUM.value, "Corporate business travel mileage across vehicles"),
            ("ENV-TRAV-002", "Air Travel Commercial Passenger-km", MetricCategory.ENVIRONMENT.value, "Section C", 6, "passenger_km", AggregationType.SUM.value, "Commercial airline domestic passenger travel"),
        ]
        for code, name, cat, sec, prin, unit, agg, defn in std_metrics:
            m = db.query(Metric).filter(Metric.code == code).first()
            if not m:
                m = Metric(
                    code=code,
                    name=name,
                    definition=defn,
                    category=cat,
                    section=sec,
                    principle=prin,
                    base_unit=unit,
                    allowed_units=[unit],
                    aggregation_type=agg,
                    is_deleted=False
                )
                db.add(m)
                db.flush()

        from app.modules.metrics.seed_data import seed_metrics
        seed_metrics(db)

        # 5. Evidence Files for Project 1 (Hero Experience)
        mock_evidence_specs = [
            ("GRID-INVOICE-ODISHA-MAR2026.pdf", "application/pdf", 245100, DocumentType.ELECTRICITY_BILL.value, "TSSPDCL Grid Energy Statement Inv #OD-2026-0391"),
            ("DIESEL-LOGBOOK-IOCL-MAR2026.pdf", "application/pdf", 182300, DocumentType.FUEL_BILL.value, "IOCL Bulk High-Speed Diesel Delivery Challan #7721-A"),
            ("WATER-EXTRACTION-CGWA-METER.pdf", "application/pdf", 112400, DocumentType.METER_READING.value, "Automated Borewell Telemetry Log CGWA-NOC-2025/OD"),
            ("HAZARDOUS-WASTE-MANIFEST-SPCB.pdf", "application/pdf", 98200, DocumentType.OTHER.value, "SPCB Form 10 Hazardous Waste Consignment Manifest"),
        ]
        evidence_objects = {}
        for fname, mime, sz, doc_t, note in mock_evidence_specs:
            ef = db.query(EvidenceFile).filter(EvidenceFile.original_name == fname).first()
            if not ef:
                sha = hashlib.sha256(fname.encode("utf-8")).hexdigest()
                ef = EvidenceFile(
                    storage_key=f"evidence/odisha-solar/{fname}",
                    original_name=fname,
                    mime_type=mime,
                    size_bytes=sz,
                    sha256=sha,
                    uploader_id=user_records["project.user@aarohan.in"].id,
                    uploaded_at=datetime.now(timezone.utc),
                    doc_type=doc_t,
                    doc_date=date(2026, 3, 20),
                    scan_status=ScanStatus.CLEAN.value,
                    version=1
                )
                db.add(ef)
                db.flush()
            evidence_objects[fname] = ef
        print(f"[OK] Seeded {len(evidence_objects)} Evidence vouchers for Hero Project.")

        # 6. Submission Pack for Project 1 (250 MW Odisha Solar Park)
        sub_proj1 = db.query(Submission).filter(
            Submission.entity_id == proj1.id,
            Submission.period_id == period.id
        ).first()

        if not sub_proj1:
            sub_proj1 = Submission(
                entity_id=proj1.id,
                period_id=period.id,
                status=SubmissionStatus.SUBMITTED.value,
                version=1,
                maker_id=user_records["project.user@aarohan.in"].id,
                submitted_at=datetime.now(timezone.utc),
                notes="Odisha Solar Park March 2026 pack. 5 ESG parameters substantiated with DISCOM utility bill, IOCL fuel challans, and CGWA water logs."
            )
            db.add(sub_proj1)
            db.flush()

            data_points_proj1 = [
                ("ENV-ENERGY-001", 64500.0, "kWh", "GRID-INVOICE-ODISHA-MAR2026.pdf"),
                ("ENV-ENERGY-002", 12450.0, "litres", "DIESEL-LOGBOOK-IOCL-MAR2026.pdf"),
                ("ENV-ENERGY-003", 28300.0, "litres", "DIESEL-LOGBOOK-IOCL-MAR2026.pdf"),
                ("ENV-WATER-001", 9150.0, "kL", "WATER-EXTRACTION-CGWA-METER.pdf"),
                ("ENV-WASTE-001", 1.85, "tonnes", "HAZARDOUS-WASTE-MANIFEST-SPCB.pdf"),
            ]
            for m_code, val, unit, ev_name in data_points_proj1:
                dp = DataPoint(
                    submission_id=sub_proj1.id,
                    metric_code=m_code,
                    value_numeric=val,
                    unit=unit,
                    status="ACTUAL",
                    entry_method="manual_form"
                )
                db.add(dp)
                db.flush()
                # Link to evidence
                if ev_name in evidence_objects:
                    el = EvidenceLink(
                        evidence_id=evidence_objects[ev_name].id,
                        data_point_id=dp.id,
                        notes=f"Substantiating voucher for {m_code}"
                    )
                    db.add(el)
            db.flush()
            print("[OK] Project 1 (250 MW Odisha Solar) Data Pack & Evidence Links Seeded.")

        # 7. Seed Submissions for Project 2 (Rajasthan Solar), BU Wind, and Highway
        # Project 2 (Rajasthan Solar)
        sub_proj2 = db.query(Submission).filter(Submission.entity_id == proj2.id, Submission.period_id == period.id).first()
        if not sub_proj2:
            sub_proj2 = Submission(
                entity_id=proj2.id,
                period_id=period.id,
                status=SubmissionStatus.BU_APPROVED.value,
                version=1,
                notes="Rajasthan Solar Expansion March pack - verified by BU Lead."
            )
            db.add(sub_proj2)
            db.flush()
            pts2 = [
                ("ENV-ENERGY-001", 24000.0, "kWh"),
                ("ENV-ENERGY-002", 5200.0, "litres"),
                ("ENV-WATER-001", 3800.0, "kL"),
            ]
            for m_code, val, unit in pts2:
                dp = DataPoint(submission_id=sub_proj2.id, metric_code=m_code, value_numeric=val, unit=unit, status="ACTUAL")
                db.add(dp)
            db.flush()

        # Project 3 (Kutch Wind)
        sub_proj3 = db.query(Submission).filter(Submission.entity_id == proj3.id, Submission.period_id == period.id).first()
        if not sub_proj3:
            sub_proj3 = Submission(
                entity_id=proj3.id,
                period_id=period.id,
                status=SubmissionStatus.BU_APPROVED.value,
                version=1,
                notes="Kutch Wind Farm generation operational log pack."
            )
            db.add(sub_proj3)
            db.flush()
            pts3 = [
                ("ENV-ENERGY-001", 18500.0, "kWh"),
                ("ENV-ENERGY-002", 3400.0, "litres"),
                ("ENV-WATER-001", 1200.0, "kL"),
            ]
            for m_code, val, unit in pts3:
                dp = DataPoint(submission_id=sub_proj3.id, metric_code=m_code, value_numeric=val, unit=unit, status="ACTUAL")
                db.add(dp)
            db.flush()

        # Project 4 (Bhubaneswar-Puri Highway)
        sub_proj4 = db.query(Submission).filter(Submission.entity_id == proj4.id, Submission.period_id == period.id).first()
        if not sub_proj4:
            sub_proj4 = Submission(
                entity_id=proj4.id,
                period_id=period.id,
                status=SubmissionStatus.BU_APPROVED.value,
                version=1,
                notes="Highway Development Bituminous Batching & Earthwork fuel log."
            )
            db.add(sub_proj4)
            db.flush()
            pts4 = [
                ("ENV-ENERGY-001", 32000.0, "kWh"),
                ("ENV-ENERGY-002", 21500.0, "litres"),
                ("ENV-ENERGY-003", 44200.0, "litres"),
                ("ENV-WATER-001", 14500.0, "kL"),
                ("ENV-WASTE-001", 3.20, "tonnes"),
            ]
            for m_code, val, unit in pts4:
                dp = DataPoint(submission_id=sub_proj4.id, metric_code=m_code, value_numeric=val, unit=unit, status="ACTUAL")
                db.add(dp)
            db.flush()

        db.commit()

        # 8. Run Bottom-Up Boundary Consolidation across Aarohan Group
        print("[INFO] Running Bottom-Up Boundary Consolidation for Aarohan Group...")
        res = run_consolidation_engine(db, str(period.id), root_node_id=str(group.id))
        print(f"[SUCCESS] Aarohan Consolidation complete! Rolled up records across {res.consolidated_nodes_count} hierarchy nodes.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during Aarohan demo seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_aarohan_demo()
