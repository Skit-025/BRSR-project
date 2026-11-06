"""
0008_eight_role_hierarchical_workflow.py

Revision: 0008
Revises: 0007
Create Date: 2026-11-07
Description:
    Migrates database to Eight-Role Hierarchical Governance System:
    Separates operational work performed by Supervisors from verification and approval
    performed by Admins across all 4 organizational tiers:
    1. project_supervisor (Operational) / project_admin (Verification)
    2. bu_supervisor (Operational) / bu_admin (Verification)
    3. subsidiary_supervisor (Operational) / subsidiary_admin (Verification)
    4. group_supervisor (Operational / Compilation) / group_admin (Verification / Final Lock)
    Plus platform administrator: system_admin.

    Seeds/ensures standard demo accounts for all supervisor and admin personas.
"""
from alembic import op
import sqlalchemy as sa
import uuid

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

DEFAULT_PASSWORD_HASH = "$argon2id$v=19$m=65536,t=3,p=4$814LwfhfixEiRGjtHaO01g$mT2Ogl34HvBF3RMehMH/4WdRZkoQDuhhHluv/DX+n54"

DEMO_ACCOUNTS = [
    {
        "email": "project.supervisor@aarohan.in",
        "full_name": "Ravi Kumar (Site Engineer - Project Supervisor)",
        "role": "project_supervisor",
        "org_node_id": "4cf5fec9-cbef-439b-a991-aefc391a56e8",
    },
    {
        "email": "project.admin@aarohan.in",
        "full_name": "Sunil Verma (Project Admin - Zojila Tunnel P7)",
        "role": "project_admin",
        "org_node_id": "4cf5fec9-cbef-439b-a991-aefc391a56e8",
    },
    {
        "email": "bu.supervisor@aarohan.in",
        "full_name": "Vikram Rao (Transportation BU Supervisor)",
        "role": "bu_supervisor",
        "org_node_id": "19ad9e6d-0a65-46b0-9fc2-84ed086a6de3",
    },
    {
        "email": "subsidiary.supervisor@aarohan.in",
        "full_name": "Pooja Hegde (Subsidiary ESG Supervisor)",
        "role": "subsidiary_supervisor",
        "org_node_id": "b5bf5b6a-0039-4a54-b74a-dd8dc5596250",
    },
    {
        "email": "group.supervisor@aarohan.in",
        "full_name": "Kavita Sen (Group ESG Supervisor)",
        "role": "group_supervisor",
        "org_node_id": "5f011418-17c5-4f9c-a037-e9c4272b4a1c",
    },
]

def upgrade() -> None:
    conn = op.get_bind()

    # 1. Update project.user@aarohan.in role to project_supervisor as Ravi is the operational site engineer
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'project_supervisor'
        WHERE email = 'project.user@aarohan.in';
    """))

    # 2. Insert or update standard demo supervisor and admin accounts
    for acc in DEMO_ACCOUNTS:
        existing = conn.execute(
            sa.text("SELECT id FROM users WHERE email = :email"),
            {"email": acc["email"]}
        ).fetchone()

        if existing:
            conn.execute(
                sa.text("""
                    UPDATE users
                    SET role = :role, full_name = :full_name, org_node_id = :org_node_id, is_active = true, is_deleted = false, updated_at = NOW()
                    WHERE email = :email
                """),
                {
                    "email": acc["email"],
                    "role": acc["role"],
                    "full_name": acc["full_name"],
                    "org_node_id": acc["org_node_id"],
                }
            )
        else:
            new_id = str(uuid.uuid4())
            conn.execute(
                sa.text("""
                    INSERT INTO users (id, email, hashed_password, full_name, role, org_node_id, is_active, must_change_password, mfa_enabled, is_deleted, created_at, updated_at)
                    VALUES (:id, :email, :password, :full_name, :role, :org_node_id, true, false, false, false, NOW(), NOW())
                """),
                {
                    "id": new_id,
                    "email": acc["email"],
                    "password": DEFAULT_PASSWORD_HASH,
                    "full_name": acc["full_name"],
                    "role": acc["role"],
                    "org_node_id": acc["org_node_id"],
                }
            )

def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'project_admin'
        WHERE email IN ('project.user@aarohan.in', 'project.supervisor@aarohan.in');
    """))
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'bu_admin'
        WHERE role = 'bu_supervisor';
    """))
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'subsidiary_admin'
        WHERE role = 'subsidiary_supervisor';
    """))
    conn.execute(sa.text("""
        UPDATE users
        SET role = 'group_admin'
        WHERE role = 'group_supervisor';
    """))
