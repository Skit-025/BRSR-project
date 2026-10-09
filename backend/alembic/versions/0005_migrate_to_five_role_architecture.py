"""
0005_migrate_to_five_role_architecture.py

Revision: 0005
Description:
    Migrates database records to the Final Five-Role Architecture:
    1. system_admin
    2. group_admin
    3. subsidiary_admin
    4. bu_admin
    5. project_admin

    Consolidates obsolete roles:
    - maker, checker, project_data_entry_user -> project_admin
    - bu_reviewer, bu_esg_manager -> bu_admin
    - subsidiary_esg_manager -> subsidiary_admin
    - group_esg_manager, esg_manager -> group_admin
    - super_admin -> system_admin
    - auditor, read_only_viewer, viewer -> deactivated, role set to project_admin

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Update users table roles
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'system_admin'
        WHERE role = 'super_admin';
    """))

    conn.execute(sa.text("""
        UPDATE users
        SET role = 'group_admin'
        WHERE role IN ('group_esg_manager', 'esg_manager');
    """))

    conn.execute(sa.text("""
        UPDATE users
        SET role = 'subsidiary_admin'
        WHERE role = 'subsidiary_esg_manager';
    """))

    conn.execute(sa.text("""
        UPDATE users
        SET role = 'bu_admin'
        WHERE role IN ('bu_reviewer', 'bu_esg_manager');
    """))

    conn.execute(sa.text("""
        UPDATE users
        SET role = 'project_admin'
        WHERE role IN ('maker', 'project_data_entry_user', 'checker', 'site_collector');
    """))

    conn.execute(sa.text("""
        UPDATE users
        SET role = 'project_admin', is_active = false
        WHERE role IN ('auditor', 'read_only_viewer', 'viewer');
    """))

    # 2. Update user_role_assignments table if it exists
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "user_role_assignments" in tables:
        conn.execute(sa.text("""
            UPDATE user_role_assignments SET role = 'system_admin' WHERE role = 'super_admin';
            UPDATE user_role_assignments SET role = 'group_admin' WHERE role IN ('group_esg_manager', 'esg_manager');
            UPDATE user_role_assignments SET role = 'subsidiary_admin' WHERE role = 'subsidiary_esg_manager';
            UPDATE user_role_assignments SET role = 'bu_admin' WHERE role IN ('bu_reviewer', 'bu_esg_manager');
            UPDATE user_role_assignments SET role = 'project_admin' WHERE role IN ('maker', 'project_data_entry_user', 'checker');
            UPDATE user_role_assignments SET role = 'project_admin', is_active = false WHERE role IN ('auditor', 'read_only_viewer', 'viewer');
        """))

    # 3. Update user_invitations table if it exists
    if "user_invitations" in tables:
        conn.execute(sa.text("""
            UPDATE user_invitations SET role = 'system_admin' WHERE role = 'super_admin';
            UPDATE user_invitations SET role = 'group_admin' WHERE role IN ('group_esg_manager', 'esg_manager');
            UPDATE user_invitations SET role = 'subsidiary_admin' WHERE role = 'subsidiary_esg_manager';
            UPDATE user_invitations SET role = 'bu_admin' WHERE role IN ('bu_reviewer', 'bu_esg_manager');
            UPDATE user_invitations SET role = 'project_admin' WHERE role IN ('maker', 'project_data_entry_user', 'checker', 'auditor', 'read_only_viewer', 'viewer');
        """))

    # 4. Update user_creation_requests table if it exists
    if "user_creation_requests" in tables:
        conn.execute(sa.text("""
            UPDATE user_creation_requests SET requested_role = 'system_admin' WHERE requested_role = 'super_admin';
            UPDATE user_creation_requests SET requested_role = 'group_admin' WHERE requested_role IN ('group_esg_manager', 'esg_manager');
            UPDATE user_creation_requests SET requested_role = 'subsidiary_admin' WHERE requested_role = 'subsidiary_esg_manager';
            UPDATE user_creation_requests SET requested_role = 'bu_admin' WHERE requested_role IN ('bu_reviewer', 'bu_esg_manager');
            UPDATE user_creation_requests SET requested_role = 'project_admin' WHERE requested_role IN ('maker', 'project_data_entry_user', 'checker', 'auditor', 'read_only_viewer', 'viewer');
        """))

    # 5. Update metrics owner_role if it exists
    if "metrics" in tables:
        conn.execute(sa.text("""
            UPDATE metrics SET owner_role = 'project_admin' WHERE owner_role IN ('site_collector', 'maker', 'checker');
            UPDATE metrics SET owner_role = 'bu_admin' WHERE owner_role IN ('bu_reviewer', 'bu_esg_manager');
            UPDATE metrics SET owner_role = 'subsidiary_admin' WHERE owner_role = 'subsidiary_esg_manager';
            UPDATE metrics SET owner_role = 'group_admin' WHERE owner_role IN ('group_esg_manager', 'esg_manager');
        """))

    # 6. Update evidence_files attached_by_role if it exists
    if "evidence_files" in tables:
        conn.execute(sa.text("""
            UPDATE evidence_files SET attached_by_role = 'project_admin' WHERE attached_by_role IN ('maker', 'project_data_entry_user', 'site_collector', 'checker');
            UPDATE evidence_files SET attached_by_role = 'bu_admin' WHERE attached_by_role IN ('bu_reviewer', 'bu_esg_manager');
            UPDATE evidence_files SET attached_by_role = 'subsidiary_admin' WHERE attached_by_role = 'subsidiary_esg_manager';
            UPDATE evidence_files SET attached_by_role = 'group_admin' WHERE attached_by_role IN ('group_esg_manager', 'esg_manager');
        """))

    # 7. Cleanup legacy "__" sentinel values — project_id and esg_indicator should be NULL, not "__"
    if "evidence_files" in tables:
        conn.execute(sa.text("""
            UPDATE evidence_files SET project_id = NULL WHERE project_id = '__';
            UPDATE evidence_files SET esg_indicator = NULL WHERE esg_indicator = '__';
        """))


def downgrade() -> None:
    pass
