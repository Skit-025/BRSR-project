"""
scripts/reset_odisha_demo.py
CLI utility to reset the Odisha Solar Park demo pack back to its SUBMITTED (or DRAFT) state,
clearing review audit logs and re-running boundary consolidation.
Enables judges and evaluators to repeat the live demo as many times as needed.
Usage:
    .venv\\Scripts\\python.exe scripts/reset_odisha_demo.py [--status SUBMITTED|DRAFT]
"""
import sys
import os
import argparse
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.collection.models import Submission, SubmissionStatus
from app.modules.workflow.models import Review
from app.modules.consolidation.service import run_consolidation_engine

def reset_demo(target_status: str = "SUBMITTED"):
    db = SessionLocal()
    try:
        # 1. Find Tunnel Project node & demo period
        proj = db.query(OrgNode).filter(OrgNode.code.in_(["PRJ-ZOJILA-P7", "PRJ-ODISHA-SOLAR"])).first()
        if not proj:
            print("[ERROR] PRJ-ZOJILA-P7 node not found.")
            return

        period = db.query(ReportingPeriod).filter(ReportingPeriod.code == "FY2025-26-M03").first()
        if not period:
            print("[ERROR] FY2025-26-M03 reporting period not found.")
            return

        group = db.query(OrgNode).filter(OrgNode.code.in_(["AAROHAN-GROUP", "MEIL-GROUP"])).first()

        # 2. Find submission
        sub = db.query(Submission).filter(
            Submission.entity_id == proj.id,
            Submission.period_id == period.id
        ).first()

        if not sub:
            print("[ERROR] Submission for PRJ-ZOJILA-P7 not found.")
            return

        # 3. Clean up any reviews
        deleted_reviews = db.query(Review).filter(Review.submission_id == sub.id).delete()
        print(f"[INFO] Cleared {deleted_reviews} review audit record(s).")

        # 4. Set submission status
        if target_status.upper() == "DRAFT":
            sub.status = SubmissionStatus.DRAFT.value
            sub.submitted_at = None
        else:
            sub.status = SubmissionStatus.SUBMITTED.value
            sub.submitted_at = datetime.now(timezone.utc)

        db.commit()
        print(f"[INFO] Reset submission {sub.id} status to '{sub.status}'.")

        # 5. Re-run boundary consolidation to restore state
        if group:
            print("[INFO] Re-running boundary consolidation for Aarohan Group...")
            run_consolidation_engine(db, str(period.id), root_node_id=str(group.id))
            print("[OK] Boundary consolidation updated.")

        print(f"[SUCCESS] Demo reset complete! Odisha Solar Park is now in '{sub.status}' state.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to reset demo: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Reset Odisha Solar demo submission state.")
    parser.add_argument("--status", choices=["SUBMITTED", "DRAFT"], default="SUBMITTED", help="Target status (default: SUBMITTED)")
    args = parser.parse_args()
    reset_demo(args.status)
