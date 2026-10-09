"""
app/db/seed_demo_data.py
Populates authentic MEIL hierarchical demo data into PostgreSQL:
- Group: MEIL Group
- Subsidiary: MEIL Hydrocarbons & Energy Ltd, Olectra Greentech
- BU: Transportation BU, Refining & Petrochemicals BU
- Projects: Tunnel Project P7 (Zojila Tunnel), Highway Construction P-001
- Roles & Users: admin@meil.in, sub.manager@meil.in, bu.reviewer@meil.in, collector.tunnel@meil.in (all pw: Password123!)
- Period: March 2026 (FY2025-26-M03)
- Submissions & Data Points: Matching mockup (52,000 kWh electricity, 14.2 kL DG diesel, 31.8 kL mobile diesel, 8,420 kL water, 1.6 tonnes waste)
- Calculates consolidated values
"""
import uuid
from datetime import datetime, timezone
from app.db.session import SessionLocal, init_db
from app.modules.org.models import OrgNode, ReportingPeriod, NodeType
from app.modules.auth.models import User
from app.modules.auth.service import get_password_hash
from app.modules.metrics.models import Metric, MetricCategory, AggregationType
from app.modules.collection.models import Submission, DataPoint, SubmissionStatus
from app.modules.consolidation.service import run_consolidation_engine
from app.modules.evidence.models import EvidenceFile, EvidenceLink, ScanStatus

def seed_demo_data():
    init_db()
    db = SessionLocal()
    try:
        print("[INFO] Seeding authentic MEIL ESG Data...")

        # 1. Reporting Period: March 2026
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

        # 2. Hierarchy: Group -> Subsidiary -> BU -> Project
        # Group
        group = db.query(OrgNode).filter(OrgNode.type == "group").first()
        if not group:
            group = OrgNode(
                code="MEIL-GROUP",
                name="Megha Engineering & Infrastructures Ltd (MEIL)",
                type="group",
                path="MEIL",
                is_root=True,
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="corporate",
                location_state="Telangana",
                location_country="India",
                is_active=True
            )
            db.add(group)
            db.flush()
        print(f"[OK] Group: {group.name} [{group.code}]")

        # Subsidiary 1: MEIL Hydrocarbons
        sub1 = db.query(OrgNode).filter(OrgNode.code == "MEIL-HYDRO").first()
        if not sub1:
            sub1 = OrgNode(
                code="MEIL-HYDRO",
                name="MEIL Hydrocarbons & Energy Ltd",
                type="subsidiary",
                parent_id=group.id,
                path=f"{group.path}.HYDRO",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="hydrocarbon",
                location_state="Gujarat",
                location_country="India",
                is_active=True
            )
            db.add(sub1)
            db.flush()
        print(f"[OK] Subsidiary: {sub1.name}")

        # BU 1: Transportation BU
        bu1 = db.query(OrgNode).filter(OrgNode.code == "BU-TRANS").first()
        if not bu1:
            bu1 = OrgNode(
                code="BU-TRANS",
                name="Transportation & Tunneling Business Unit",
                type="business_unit",
                parent_id=sub1.id,
                path=f"{sub1.path}.TRANS",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="infrastructure",
                location_state="Jammu & Kashmir",
                location_country="India",
                is_active=True
            )
            db.add(bu1)
            db.flush()
        print(f"[OK] Business Unit: {bu1.name}")

        # Project 1: Tunnel Project P7 (Zojila Tunnel)
        proj1 = db.query(OrgNode).filter(OrgNode.code == "PRJ-ZOJILA-P7").first()
        if not proj1:
            proj1 = OrgNode(
                code="PRJ-ZOJILA-P7",
                name="Tunnel Project P7 (Zojila Tunnel)",
                type="project",
                parent_id=bu1.id,
                path=f"{bu1.path}.ZOJILA_P7",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="tunneling",
                project_description="Construction of 14.15 km bi-directional tunnel under Zojila pass including ventilation shafts, emergency egress, concrete lining and continuous electrical substation.",
                location_state="Ladakh",
                location_country="India",
                is_active=True
            )
            db.add(proj1)
            db.flush()
        print(f"[OK] Project: {proj1.name}")

        # Project 2: Highway Construction P-001
        proj2 = db.query(OrgNode).filter(OrgNode.code == "PRJ-HWY-001").first()
        if not proj2:
            proj2 = OrgNode(
                code="PRJ-HWY-001",
                name="Highway Construction P-001 (Odisha Expressway)",
                type="project",
                parent_id=bu1.id,
                path=f"{bu1.path}.HWY001",
                ownership_pct=100.0,
                control_type="operational_control",
                boundary=True,
                project_type="road_construction",
                project_description="50 km 4-lane highway construction including earthwork, concrete batching and bituminous paving.",
                location_state="Odisha",
                location_country="India",
                is_active=True
            )
            db.add(proj2)
            db.flush()
        print(f"[OK] Project: {proj2.name}")

        # 3. Users for all 4 roles
        demo_users = [
            ("group.admin@aarohan.in", "system_admin", "Aditya Sharma (Group ESG Director)", group.id),
            ("sub.admin@aarohan.in", "subsidiary_admin", "Meera Nair (Subsidiary ESG Manager)", sub1.id),
            ("bu.admin@aarohan.in", "checker", "Rajesh V. (Transportation BU Reviewer)", bu1.id),
            ("project.user@aarohan.in", "maker", "Ravi Kumar (Site Engineer P7)", proj1.id),
        ]
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
            print(f"[OK] User: {email} ({role})")

        # 4. Standard ESG Metrics
        std_metrics = [
            ("ENV-ENERGY-001", "Electricity Consumed (Grid Supply)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "kWh", AggregationType.SUM.value, "Grid electricity consumed across project operations"),
            ("ENV-ENERGY-002", "Diesel Consumed - DG Sets (Backup Generators)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "litres", AggregationType.SUM.value, "Captive stationary backup diesel generator run fuel"),
            ("ENV-ENERGY-003", "Diesel Consumed - Mobile Machinery & Fleet", MetricCategory.ENVIRONMENT.value, "Section C", 6, "litres", AggregationType.SUM.value, "Heavy excavation equipment and project transit fleet"),
            ("ENV-WATER-001", "Water Withdrawal (Ground / Borewell)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "kL", AggregationType.SUM.value, "Borewell and deep aquifer extraction at project site"),
            ("ENV-WASTE-001", "Hazardous Waste (Used Oil & Sludge)", MetricCategory.ENVIRONMENT.value, "Section C", 6, "tonnes", AggregationType.SUM.value, "Used lube oils and hazardous workshop sludge dispatched to SPCB vendor"),
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
        
        # Also seed the full 38-metric SEBI BRSR catalogue with Scope 1/2/3 granularity
        from app.modules.metrics.seed_data import seed_metrics
        seed_metrics(db)
        print("[OK] Full 38-Metric Granular SEBI BRSR Catalogue Seeded")


        # 5. Submission Pack for Tunnel Project P7 (Matching the user screenshot!)
        sub_p7 = db.query(Submission).filter(Submission.entity_id == proj1.id, Submission.period_id == period.id).first()
        if not sub_p7:
            sub_p7 = Submission(
                entity_id=proj1.id,
                period_id=period.id,
                status=SubmissionStatus.SUBMITTED.value,
                version=1,
                maker_id=db.query(User).filter(User.email == "project.user@aarohan.in").first().id,
                submitted_at=datetime.now(timezone.utc),
                notes="Zojila P7 March Pack. 4 of 8 metrics auto-reconciled with DISCOM utility bill TSS-04 and fuel register."
            )
            db.add(sub_p7)
            db.flush()

            # Data Points
            points = [
                ("ENV-ENERGY-001", 52000.0, "kWh", "ACTUAL"),
                ("ENV-ENERGY-002", 14200.0, "litres", "ACTUAL"), # 14.20 kL
                ("ENV-ENERGY-003", 31800.0, "litres", "ACTUAL"), # 31.80 kL
                ("ENV-WATER-001", 8420.0, "kL", "ACTUAL"),
                ("ENV-WASTE-001", 1.60, "tonnes", "ACTUAL"),
            ]
            for m_code, val, unit, status_val in points:
                dp = DataPoint(
                    submission_id=sub_p7.id,
                    metric_code=m_code,
                    value_numeric=val,
                    unit=unit,
                    status=status_val,
                    entry_method="automated_ocr"
                )
                db.add(dp)
            db.flush()
            print("[OK] Tunnel Project P7 Pack Seeded with Data Points")

        # 6. Submission Pack for BU Level (Business Travel & Conveyance)
        sub_bu = db.query(Submission).filter(Submission.entity_id == bu1.id, Submission.period_id == period.id).first()
        if not sub_bu:
            sub_bu = Submission(
                entity_id=bu1.id,
                period_id=period.id,
                status=SubmissionStatus.SUBMITTED.value,
                version=1,
                notes="Transportation BU Corporate Overhead Pack: Shared HQ electricity & executive project site inspections travel."
            )
            db.add(sub_bu)
            db.flush()
            bu_points = [
                ("ENV-ENERGY-001", 8500.0, "kWh", "ACTUAL"),   # BU shared power
                ("ENV-TRAV-001", 4800.0, "km", "ACTUAL"),       # Corporate conveyance
                ("ENV-TRAV-002", 12000.0, "passenger_km", "ACTUAL"), # Flight mileage
            ]
            for m_code, val, unit, status_val in bu_points:
                dp = DataPoint(
                    submission_id=sub_bu.id,
                    metric_code=m_code,
                    value_numeric=val,
                    unit=unit,
                    status=status_val,
                    entry_method="manual_form"
                )
                db.add(dp)
            db.flush()
            print("[OK] Transportation BU Level Scope 3 / Travel Pack Seeded")

        # 7. Run Hierarchical Boundary Consolidation
        db.commit()
        print("[INFO] Running Bottom-Up Boundary Consolidation (Project + BU -> Subsidiary -> Group)...")
        res = run_consolidation_engine(db, str(period.id))
        print(f"[SUCCESS] Consolidation complete! Rolled up records across {res.consolidated_nodes_count} nodes in the hierarchy.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
