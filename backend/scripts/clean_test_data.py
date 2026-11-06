"""
backend/scripts/clean_test_data.py
Purges all test data generated during automated test runs (pytest / integration tests),
while strictly preserving:
- All system seed/mock data (seed admins, seed MEIL & Aarohan hierarchy, seed metrics, seed demo packs)
- Real user-created projects and disclosures
- Real registered users (admin@aarohan.in, Skit-025, adtshrm007, group.admin@aarohan.in, adityastar537@gmail.com, etc.)
- Real evidence files and uploads
"""
import sys
import os
import re

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod, MetricApplicability
from app.modules.auth.models import User, UserRoleAssignment, UserInvitation, UserCreationRequest, AdminAuditEntry
from app.modules.collection.models import Submission, DataPoint
from app.modules.validation.models import ValidationResult
from app.modules.validation.exceptions.models import ValidationException
from app.modules.workflow.models import Review
from app.modules.consolidation.models import ConsolidatedValue
from app.modules.evidence.models import EvidenceFile, EvidenceLink
from app.modules.reporting.models import Report
from app.modules.snapshots.models import ReportSnapshot
from app.modules.notifications.models import Notification
from app.modules.calc.models import CalculationLog
from app.modules.disclosures.models import CalculationJob

def run_cleanup(dry_run: bool = True):
    db = SessionLocal()
    try:
        print(f"=== Purging Test Data (dry_run={dry_run}) ===")

        # -------------------------------------------------------------
        # 1. IDENTIFY TEST REPORTING PERIODS
        # -------------------------------------------------------------
        # Preserved: FY2025-26-M03
        all_periods = db.query(ReportingPeriod).all()
        test_periods = [p for p in all_periods if p.code != "FY2025-26-M03"]
        test_period_ids = {str(p.id) for p in test_periods}
        print(f"Found {len(test_periods)} test reporting periods to remove (Preserving FY2025-26-M03).")

        # -------------------------------------------------------------
        # 2. IDENTIFY TEST USERS
        # -------------------------------------------------------------
        PRESERVED_EMAILS = {
            "skit-025",
            "adtshrm007",
            "admin@aarohan.in",
            "group.admin@aarohan.in",
            "sub.admin@aarohan.in",
            "bu.admin@aarohan.in",
            "project.user@aarohan.in",
            "adityastar537@gmail.com",
            "admin@meil.in",
            "sub.manager@meil.in",
            "bu.reviewer@meil.in",
            "collector.tunnel@meil.in",
        }

        all_users = db.query(User).all()
        test_users = []
        for u in all_users:
            email_lower = u.email.lower()
            if email_lower in PRESERVED_EMAILS:
                continue
            if (
                email_lower.endswith("@test.com")
                or re.match(r"^(maker|reviewer)\.[0-9a-f]+@meil\.in$", email_lower)
                or email_lower == "collector.site1@meil.in"
                or re.match(r"^(proj|grp|sub_a|bu_a1|sys)_[0-9a-f]+@test\.com$", email_lower)
            ):
                test_users.append(u)
            else:
                print(f"[PRESERVED USER] {u.email} ({u.full_name})")

        test_user_ids = {str(u.id) for u in test_users}
        print(f"Found {len(test_users)} test users to remove.")

        # -------------------------------------------------------------
        # 3. IDENTIFY TEST ORG NODES
        # -------------------------------------------------------------
        PRESERVED_NODE_CODES = {
            "MEIL-GROUP",
            "PRJ-HWY-001",
            "PRJ-ZOJILA-P7",
            "BU-TRANS",
            "MEGHA-ROAD-TRANS",
            "BU-TRANSPORTATION",
            "SUB-OLECTRA",
            "SUB-EVEY",
            "SUB-DRILLMEC",
            "SUB-MEGHA-GAS",
            "SUB-ICOMM",
            "SUB-SEPC",
            "SUB-MFGIL",
            "BU-HYDROCARBONS",
            "BU-IRRIGATION",
            "BU-POWER",
            "BU-MANUFACTURING",
            "BU-BUILDINGS",
            "BU-IBD",
            # User created real projects
            "PRJ-NH-18-HIGHWAY-C-9350",
            "PRJ-TEST-1",
            "PRJ-RAILWAY-TUNNEL--6713",
            "PRJ-BUIDING-A-TUNNE-0278",
            "PRJ-A-HIGHWAY-CONST-5174",
            "PRJ-CHARMINAR-TERMI-9324",
            "PRJ-RAILWAY-TUNNEL--6477",
            # Aarohan demo codes if present
            "AAROHAN-GROUP",
            "BU-WIND",
            "PRJ-KUTCH-WIND",
            "AAROHAN-INFRA",
            "BU-HIGHWAY",
            "PRJ-PURI-HWY",
            "PRJ-RAJ-SOLAR",
        }

        all_nodes = db.query(OrgNode).all()
        test_nodes = []
        for n in all_nodes:
            if n.code in PRESERVED_NODE_CODES:
                continue
            test_nodes.append(n)

        test_node_ids = {str(n.id) for n in test_nodes}
        print(f"Found {len(test_nodes)} test org nodes to remove.")

        # -------------------------------------------------------------
        # 4. IDENTIFY TEST SUBMISSIONS & DATA POINTS
        # -------------------------------------------------------------
        all_subs = db.query(Submission).all()
        test_subs = []
        for s in all_subs:
            if (
                str(s.period_id) in test_period_ids
                or str(s.entity_id) in test_node_ids
                or (s.maker_id and str(s.maker_id) in test_user_ids)
            ):
                test_subs.append(s)

        test_sub_ids = {str(s.id) for s in test_subs}
        print(f"Found {len(test_subs)} test submissions to remove.")

        # -------------------------------------------------------------
        # 5. IDENTIFY TEST CONSOLIDATED VALUES
        # -------------------------------------------------------------
        all_cvs = db.query(ConsolidatedValue).all()
        test_cvs = [
            cv for cv in all_cvs
            if str(cv.period_id) in test_period_ids or str(cv.entity_id) in test_node_ids
        ]
        test_cv_ids = {str(cv.id) for cv in test_cvs}
        print(f"Found {len(test_cvs)} test consolidated values to remove.")

        # -------------------------------------------------------------
        # 6. IDENTIFY TEST EVIDENCE FILES & LINKS
        # -------------------------------------------------------------
        PRESERVED_FILES = {
            "GRID-INVOICE-ODISHA-MAR2026.pdf",
            "DIESEL-LOGBOOK-IOCL-MAR2026.pdf",
            "WATER-EXTRACTION-CGWA-METER.pdf",
            "HAZARDOUS-WASTE-MANIFEST-SPCB.pdf",
            "images.jpg",
            "e7233e3ef37d71f22d783e20f8fd2661.jpg",
            "1.webp",
        }

        all_ev = db.query(EvidenceFile).all()
        test_ev = []
        for ev in all_ev:
            if ev.original_name in PRESERVED_FILES:
                continue
            if (
                ev.original_name.startswith("restoration_test")
                or ev.original_name.startswith("electricity_")
                or ev.original_name.startswith("eia_report")
                or ev.original_name.startswith("resume_john")
                or ev.original_name.startswith("ht_power_bill")
                or ev.original_name.startswith("bill.txt")
                or ev.original_name.startswith("diesel_logbook")
                or ev.original_name.startswith("invoice_electricity")
                or ev.original_name.startswith("energy_branch")
                or ev.original_name.startswith("waste_branch")
                or ev.storage_key.startswith("mock_storage_")
                or (ev.uploader_id and str(ev.uploader_id) in test_user_ids)
            ):
                test_ev.append(ev)

        test_ev_ids = {str(ev.id) for ev in test_ev}
        print(f"Found {len(test_ev)} test evidence files to remove.")

        # -------------------------------------------------------------
        # 7. IDENTIFY TEST REVIEWS
        # -------------------------------------------------------------
        test_reviews = db.query(Review).filter(
            (Review.submission_id.in_(list(test_sub_ids))) |
            (Review.reviewer_id.in_(list(test_user_ids))) |
            (Review.comment.ilike("%cross-verified with substation%")) |
            (Review.comment.ilike("%Substation serial number missing%"))
        ).all()
        test_review_ids = {str(r.id) for r in test_reviews}
        print(f"Found {len(test_reviews)} test reviews to remove.")

        # -------------------------------------------------------------
        # 8. IDENTIFY TEST REPORTS
        # -------------------------------------------------------------
        test_reports = db.query(Report).filter(
            (Report.period_id.in_(list(test_period_ids))) |
            (Report.entity_id.in_(list(test_node_ids)))
        ).all()
        test_report_ids = {str(r.id) for r in test_reports}
        print(f"Found {len(test_reports)} test reports to remove.")

        # -------------------------------------------------------------
        # 9. IDENTIFY TEST USER CREATION REQUESTS & INVITATIONS
        # -------------------------------------------------------------
        test_reqs = db.query(UserCreationRequest).filter(
            (UserCreationRequest.email.ilike("%@test.com")) |
            (UserCreationRequest.org_node_id.in_(list(test_node_ids)))
        ).all()
        test_req_ids = {str(r.id) for r in test_reqs}
        print(f"Found {len(test_reqs)} test user creation requests to remove.")

        test_invs = db.query(UserInvitation).filter(
            (UserInvitation.email.in_(["smtp_clean_test@example.com", "test_inv_456@example.com"])) |
            (UserInvitation.org_node_id.in_(list(test_node_ids)))
        ).all()
        test_inv_ids = {str(i.id) for i in test_invs}
        print(f"Found {len(test_invs)} test user invitations to remove.")

        # -------------------------------------------------------------
        # 10. IDENTIFY TEST NOTIFICATIONS
        # -------------------------------------------------------------
        test_notifs = db.query(Notification).filter(
            Notification.recipient_user_id.in_(list(test_user_ids))
        ).all()
        test_notif_ids = {str(n.id) for n in test_notifs}
        print(f"Found {len(test_notifs)} test notifications to remove.")

        if dry_run:
            print("\n[DRY RUN COMPLETE] Run with --execute to perform deletions.")
            return

        # -------------------------------------------------------------
        # LIVE EXECUTION IN DEPENDENCY ORDER
        # -------------------------------------------------------------
        print("\nExecuting purge operations...")

        # 1. Nullify self-referencing foreign keys on records to be deleted
        if test_user_ids:
            db.query(User).filter(User.id.in_(list(test_user_ids))).update(
                {User.org_node_id: None, User.created_by_id: None},
                synchronize_session=False
            )
        if test_node_ids:
            db.query(OrgNode).filter(OrgNode.id.in_(list(test_node_ids))).update(
                {OrgNode.parent_id: None},
                synchronize_session=False
            )
        db.flush()

        # 2. Evidence links & Evidence files
        if test_ev_ids:
            del_links = db.query(EvidenceLink).filter(EvidenceLink.evidence_id.in_(list(test_ev_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_links} evidence links.")
            
            # Remove physical files from storage if present
            storage_vaults = [
                os.path.join(backend_dir, "..", "storage", "evidence_vault"),
                os.path.join(backend_dir, "storage", "evidence_vault"),
            ]
            for ev in test_ev:
                base_fname = os.path.basename(ev.storage_key)
                for vault in storage_vaults:
                    fpath = os.path.join(vault, base_fname)
                    if os.path.exists(fpath):
                        try:
                            os.remove(fpath)
                        except Exception:
                            pass

            del_ev = db.query(EvidenceFile).filter(EvidenceFile.id.in_(list(test_ev_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_ev} evidence files.")

        # 3. Reviews
        if test_review_ids:
            del_rev = db.query(Review).filter(Review.id.in_(list(test_review_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_rev} reviews.")

        # 4. Validation results & exceptions
        if test_sub_ids:
            del_vr = db.query(ValidationResult).filter(ValidationResult.submission_id.in_(list(test_sub_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_vr} validation results.")
            del_ve = db.query(ValidationException).filter(ValidationException.submission_id.in_(list(test_sub_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_ve} validation exceptions.")

        # 5. Data Points
        if test_sub_ids:
            del_dp = db.query(DataPoint).filter(DataPoint.submission_id.in_(list(test_sub_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_dp} data points.")

        # 6. Submissions
        if test_sub_ids:
            del_sub = db.query(Submission).filter(Submission.id.in_(list(test_sub_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_sub} submissions.")

        # 7. Consolidated Values
        if test_cv_ids:
            del_cv = db.query(ConsolidatedValue).filter(ConsolidatedValue.id.in_(list(test_cv_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_cv} consolidated values.")

        # 8. Reports & Report Snapshots
        if test_report_ids:
            del_rep = db.query(Report).filter(Report.id.in_(list(test_report_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_rep} reports.")

        db.query(ReportSnapshot).filter(
            (ReportSnapshot.period_id.in_(list(test_period_ids))) |
            (ReportSnapshot.entity_id.in_(list(test_node_ids)))
        ).delete(synchronize_session=False)

        # 9. Calculation Jobs & Logs
        db.query(CalculationJob).filter(
            (CalculationJob.period_id.in_(list(test_period_ids))) |
            (CalculationJob.org_node_id.in_(list(test_node_ids))) |
            (CalculationJob.initiated_by_id.in_(list(test_user_ids)))
        ).delete(synchronize_session=False)

        db.query(CalculationLog).filter(
            (CalculationLog.period_id.in_(list(test_period_ids))) |
            (CalculationLog.org_node_id.in_(list(test_node_ids))) |
            (CalculationLog.executed_by.in_(list(test_user_ids)))
        ).delete(synchronize_session=False)

        # 10. User Creation Requests & Invitations
        if test_req_ids:
            del_req = db.query(UserCreationRequest).filter(UserCreationRequest.id.in_(list(test_req_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_req} user creation requests.")

        if test_inv_ids:
            del_inv = db.query(UserInvitation).filter(UserInvitation.id.in_(list(test_inv_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_inv} user invitations.")

        # 11. Notifications
        if test_notif_ids:
            del_not = db.query(Notification).filter(Notification.id.in_(list(test_notif_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_not} notifications.")

        # 12. User Role Assignments
        del_ura = db.query(UserRoleAssignment).filter(
            (UserRoleAssignment.user_id.in_(list(test_user_ids))) |
            (UserRoleAssignment.entity_id.in_(list(test_node_ids)))
        ).delete(synchronize_session=False)
        print(f"Deleted {del_ura} user role assignments.")

        # 13. Users
        if test_user_ids:
            del_u = db.query(User).filter(User.id.in_(list(test_user_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_u} test users.")

        # 14. Metric Applicability
        if test_node_ids or test_period_ids:
            del_ma = db.query(MetricApplicability).filter(
                (MetricApplicability.org_node_id.in_(list(test_node_ids))) |
                (MetricApplicability.period_id.in_(list(test_period_ids)))
            ).delete(synchronize_session=False)
            print(f"Deleted {del_ma} metric applicability entries.")

        # 15. Org Nodes
        if test_node_ids:
            del_nodes = db.query(OrgNode).filter(OrgNode.id.in_(list(test_node_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_nodes} test org nodes.")

        # 16. Reporting Periods
        if test_period_ids:
            del_per = db.query(ReportingPeriod).filter(ReportingPeriod.id.in_(list(test_period_ids))).delete(synchronize_session=False)
            print(f"Deleted {del_per} test reporting periods.")

        db.commit()
        print("\n[PURGE COMPLETE] All test data has been successfully removed!")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Transaction failed, rolled back: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    is_live = "--execute" in sys.argv
    run_cleanup(dry_run=not is_live)
