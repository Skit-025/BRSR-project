"""
app/modules/workflow/notifications.py
Transactional In-App Notification Dispatcher for the Eight-Role Hierarchical Workflow.
Covers all 12 events specified in Stage 1 through Stage 8:
- Project submission → Project Admin
- Project approval → BU Supervisor
- Project rejection → Project Supervisor
- BU submission → BU Admin
- BU approval → Subsidiary Supervisor
- BU rejection → BU Supervisor
- Subsidiary submission → Subsidiary Admin
- Subsidiary approval → Group Supervisor
- Subsidiary rejection → Subsidiary Supervisor
- Group BRSR submission → Group Admin
- Group approval → Group Supervisor & Admins
- Group rejection → Group Supervisor
"""
import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.auth.models import User
from app.modules.org.models import OrgNode, ReportingPeriod
from app.modules.collection.models import Submission
from app.modules.notifications.service import NotificationService
from app.security.rbac import Role

logger = logging.getLogger(__name__)


def find_users_for_scope_and_role(
    db: Session,
    target_role: str,
    org_node_id: Optional[str] = None
) -> List[User]:
    """
    Finds active users matching target_role scoped to org_node_id (or descendants / platform wide).
    Supports concurrent ESG Manager / Supervisor designation aliases.
    Fallback to system_admin if no specific user is assigned to avoid dropped alerts.
    """
    role_family = [target_role]
    if target_role in ("group_esg_manager", "group_supervisor"):
        role_family = ["group_esg_manager", "group_supervisor"]
    elif target_role in ("subsidiary_esg_manager", "subsidiary_supervisor"):
        role_family = ["subsidiary_esg_manager", "subsidiary_supervisor"]
    elif target_role in ("bu_esg_manager", "bu_supervisor"):
        role_family = ["bu_esg_manager", "bu_supervisor"]

    query = db.query(User).filter(
        User.role.in_(role_family),
        User.is_active == True,
        User.is_deleted == False
    )
    if org_node_id:
        from app.security.scope import get_user_assigned_project_ids
        from app.modules.auth.service import is_node_descendant
        candidates = query.all()
        matched = []
        for u in candidates:
            if not u.org_node_id:
                matched.append(u)
            elif str(u.org_node_id) == str(org_node_id):
                matched.append(u)
            elif is_node_descendant(db, str(u.org_node_id), str(org_node_id)) or is_node_descendant(db, str(org_node_id), str(u.org_node_id)):
                matched.append(u)
        if matched:
            return matched

    # Fallback to any user with that role
    all_role_users = query.all()
    if all_role_users:
        return all_role_users

    # Secondary fallback to system admin so notifications are never lost
    sys_admins = db.query(User).filter(
        User.role == Role.SYSTEM_ADMIN.value,
        User.is_active == True,
        User.is_deleted == False
    ).all()
    return sys_admins


def dispatch_workflow_notification(
    db: Session,
    event: str,
    submission: Submission,
    comment: Optional[str] = None,
    actor_id: Optional[str] = None
) -> None:
    """
    Dispatches real, persistent in-app notifications on workflow state transitions.
    """
    notif_svc = NotificationService(db)

    entity = db.query(OrgNode).filter(OrgNode.id == submission.entity_id).first()
    period = db.query(ReportingPeriod).filter(ReportingPeriod.id == submission.period_id).first()
    entity_name = entity.name if entity else "Unknown Entity"
    period_code = period.code if period else "Unknown Period"
    parent_id = entity.parent_id if entity else None

    # Resolve grandparent for higher tier supervisors
    grandparent_id = None
    if parent_id:
        parent_node = db.query(OrgNode).filter(OrgNode.id == parent_id).first()
        if parent_node:
            grandparent_id = parent_node.parent_id

    # 1. Project Submission → Project Admin
    if event == "PROJECT_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.PROJECT_ADMIN.value, submission.entity_id)
        title = f"New Project Submission: {entity_name}"
        msg = f"Project Supervisor submitted data for {entity_name} ({period_code}). Pending Project Admin verification."
        link = "/workflow"
        for r in recipients:
            notif_svc.notify_user(r.id, title, msg, link)

    # 2. Project approval routes the pack to the BU ESG Manager.
    elif event == "PROJECT_APPROVED":
        recipients = find_users_for_scope_and_role(db, Role.BU_ESG_MANAGER.value, parent_id)
        title = f"Project Approved: {entity_name} ✓"
        msg = f"Project Admin approved {entity_name} ({period_code}). Data is now eligible for BU consolidation."
        link = "/disclosure/bu"
        for r in recipients:
            notif_svc.notify_user(r.id, title, msg, link)
        # Also notify the maker
        if submission.maker_id:
            notif_svc.notify_user(
                submission.maker_id,
                f"Your Submission for {entity_name} was Approved ✓",
                f"Project Admin approved your submission for {period_code}.",
                "/collection"
            )

    elif event == "BU_PROJECT_ACCEPTED":
        recipients = find_users_for_scope_and_role(db, Role.PROJECT_ADMIN.value, submission.entity_id)
        for r in recipients:
            notif_svc.notify_user(r.id, f"Project Report Accepted by BU: {entity_name}", f"The BU ESG Manager accepted the Project Report for {entity_name} ({period_code}).", "/workflow")

    elif event == "BU_PROJECT_REJECTED":
        recipients = find_users_for_scope_and_role(db, Role.PROJECT_ADMIN.value, submission.entity_id)
        reason = f" Reason: {comment}" if comment else ""
        for r in recipients:
            notif_svc.notify_user(r.id, f"Project Report Returned by BU: {entity_name}", f"The BU ESG Manager returned the Project Report for {entity_name} ({period_code}).{reason}", "/workflow")

    # 3. Project Rejection → Project Supervisor
    elif event == "PROJECT_REJECTED":
        if submission.maker_id:
            reason = f" Reason: {comment}" if comment else ""
            notif_svc.notify_user(
                submission.maker_id,
                f"Submission Returned: {entity_name} ↩",
                f"Project Admin returned your submission for {entity_name} ({period_code}).{reason} Please correct and resubmit.",
                "/collection"
            )

    # 4. BU Submission → BU Admin
    elif event == "BU_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.BU_ADMIN.value, submission.entity_id)
        title = f"BU Report Submitted: {entity_name}"
        msg = f"BU ESG Manager submitted BU-level report for {entity_name} ({period_code}). Awaiting BU Admin review."
        link = "/workflow"
        for r in recipients:
            notif_svc.notify_user(r.id, title, msg, link)

    elif event == "BU_FINAL_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.SUBSIDIARY_ESG_MANAGER.value, parent_id)
        for r in recipients:
            notif_svc.notify_user(r.id, f"Final BU Report Submitted: {entity_name}", f"BU Admin submitted the accepted and completed BU Report for {entity_name} ({period_code}). Review the Project source reports and BU calculations.", "/workflow")

    # 5. BU Approval → Subsidiary ESG Manager (and maker)
    elif event == "BU_APPROVED":
        if submission.maker_id:
            notif_svc.notify_user(
                submission.maker_id,
                f"BU Report Approved: {entity_name} ✓",
                f"BU Admin approved the BU report for {period_code}.",
                "/disclosure/bu"
            )

    # 6. BU Rejection → BU ESG Manager
    elif event == "BU_REJECTED":
        if submission.maker_id:
            reason = f" Reason: {comment}" if comment else ""
            notif_svc.notify_user(
                submission.maker_id,
                f"BU Report Returned: {entity_name} ↩",
                f"BU Admin returned the BU report for {entity_name} ({period_code}).{reason} Please revise and resubmit.",
                "/disclosure/bu"
            )

    elif event == "SUBSIDIARY_BU_ACCEPTED":
        recipients = find_users_for_scope_and_role(db, Role.BU_ADMIN.value, submission.entity_id)
        for r in recipients:
            notif_svc.notify_user(r.id, f"BU Report Accepted by Subsidiary: {entity_name}", f"The Subsidiary ESG Manager accepted the BU Report for {entity_name} ({period_code}).", "/workflow")

    elif event == "SUBSIDIARY_BU_REJECTED":
        recipients = find_users_for_scope_and_role(db, Role.BU_ADMIN.value, submission.entity_id)
        reason = f" Reason: {comment}" if comment else ""
        for r in recipients:
            notif_svc.notify_user(r.id, f"BU Report Returned by Subsidiary: {entity_name}", f"The Subsidiary ESG Manager returned the BU Report for {entity_name} ({period_code}).{reason}", "/workflow")

    # 7. Subsidiary Submission → Subsidiary Admin
    elif event == "SUBSIDIARY_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.SUBSIDIARY_ADMIN.value, submission.entity_id)
        title = f"Subsidiary Report Submitted: {entity_name}"
        msg = f"Subsidiary ESG Manager submitted subsidiary disclosures for {entity_name} ({period_code}). Pending Subsidiary Admin verification."
        link = "/workflow"
        for r in recipients:
            notif_svc.notify_user(r.id, title, msg, link)

    elif event == "SUBSIDIARY_FINAL_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.GROUP_SUPERVISOR.value, parent_id)
        for r in recipients:
            notif_svc.notify_user(r.id, f"Final Subsidiary Report Submitted: {entity_name}", f"Subsidiary Admin submitted the accepted and completed Subsidiary Report for {entity_name} ({period_code}). Review accepted BU reports and lineage.", "/workflow")

    # 8. Subsidiary Admin acceptance routes the pack to the Group Supervisor.
    elif event == "SUBSIDIARY_APPROVED":
        if submission.maker_id:
            notif_svc.notify_user(
                submission.maker_id,
                f"Subsidiary Report Approved: {entity_name} ✓",
                f"Subsidiary Admin approved your report for {period_code}.",
                "/disclosure/subsidiary"
            )

    elif event == "GROUP_SUBSIDIARY_ACCEPTED":
        recipients = find_users_for_scope_and_role(db, Role.SUBSIDIARY_ADMIN.value, submission.entity_id)
        for r in recipients:
            notif_svc.notify_user(r.id, f"Subsidiary Report Accepted by Group: {entity_name}", f"The Group Supervisor accepted the Subsidiary Report for {entity_name} ({period_code}).", "/workflow")

    elif event == "GROUP_SUBSIDIARY_REJECTED":
        recipients = find_users_for_scope_and_role(db, Role.SUBSIDIARY_ADMIN.value, submission.entity_id)
        reason = f" Reason: {comment}" if comment else ""
        for r in recipients:
            notif_svc.notify_user(r.id, f"Subsidiary Report Returned by Group: {entity_name}", f"The Group Supervisor returned the Subsidiary Report for {entity_name} ({period_code}).{reason}", "/workflow")

    # 9. Subsidiary Rejection → Subsidiary ESG Manager
    elif event == "SUBSIDIARY_REJECTED":
        if submission.maker_id:
            reason = f" Reason: {comment}" if comment else ""
            notif_svc.notify_user(
                submission.maker_id,
                f"Subsidiary Report Returned: {entity_name} ↩",
                f"Subsidiary Admin returned the report for {entity_name} ({period_code}).{reason} Please revise.",
                "/disclosure/subsidiary"
            )

    # 10. Group Submission → Group Admin
    elif event == "GROUP_SUBMITTED":
        recipients = find_users_for_scope_and_role(db, Role.GROUP_ADMIN.value, submission.entity_id)
        title = f"Final Group BRSR Report Submitted"
        msg = f"Group ESG Manager compiled and submitted the Group BRSR report ({period_code}). Pending Group Admin approval."
        link = "/reporting"
        for r in recipients:
            notif_svc.notify_user(r.id, title, msg, link)

    # 11. Group Approval → Group ESG Manager & Admins
    elif event == "GROUP_APPROVED":
        recipients = find_users_for_scope_and_role(db, Role.GROUP_ESG_MANAGER.value, submission.entity_id)
        admin_recipients = find_users_for_scope_and_role(db, Role.GROUP_ADMIN.value, submission.entity_id)
        all_to_notify = {u.id: u for u in (recipients + admin_recipients)}.values()
        title = f"Final BRSR Report Officially Approved 🏆"
        msg = f"Group Admin approved the final SEBI BRSR Core report ({period_code}). Report is locked and sealed with SHA-256."
        link = "/reporting"
        for r in all_to_notify:
            notif_svc.notify_user(r.id, title, msg, link)

    # 12. Group Rejection → Group ESG Manager
    elif event == "GROUP_REJECTED":
        if submission.maker_id:
            reason = f" Reason: {comment}" if comment else ""
            notif_svc.notify_user(
                submission.maker_id,
                f"Final BRSR Report Returned ↩",
                f"Group Admin returned the compiled BRSR report ({period_code}).{reason} Please correct and resubmit.",
                "/reporting"
            )

