"""
app/db/seed_admins.py
Seeds the 2 primary System Administrator accounts required for MEIL BRSR Portal.
- Skit-025 / Skit@2409006
- adtshrm007 / adtshrm@2409007
"""
import logging
from app.db.session import SessionLocal
from app.modules.auth.models import User, UserRole, UserRoleAssignment
from app.modules.auth.service import get_password_hash

logger = logging.getLogger(__name__)

INITIAL_ADMINS = [
    {
        "username": "Skit-025",
        "full_name": "System Administrator (Skit-025)",
        "password": "Skit@2409006",
        "role": UserRole.SYSTEM_ADMIN.value,
    },
    {
        "username": "adtshrm007",
        "full_name": "System Administrator (adtshrm007)",
        "password": "adtshrm@2409007",
        "role": UserRole.SYSTEM_ADMIN.value,
    }
]

def seed_system_admins():
    """Ensure the 2 system admin accounts exist and have current credentials."""
    db = SessionLocal()
    try:
        for admin_data in INITIAL_ADMINS:
            username = admin_data["username"]
            user = db.query(User).filter(
                (User.email == username) | (User.email.ilike(username))
            ).first()

            hashed_pwd = get_password_hash(admin_data["password"])

            if not user:
                logger.info(f"Seeding System Admin: {username}")
                user = User(
                    email=username,
                    hashed_password=hashed_pwd,
                    full_name=admin_data["full_name"],
                    role=admin_data["role"],
                    org_node_id=None,
                    is_active=True,
                    must_change_password=False,
                )
                db.add(user)
                db.flush()

                assignment = UserRoleAssignment(
                    user_id=user.id,
                    role=admin_data["role"],
                    entity_id=None,
                    assigned_by_id=user.id,
                    is_active=True,
                )
                db.add(assignment)
                db.commit()
                logger.info(f"Successfully seeded System Admin: {username}")
            else:
                # Update password and ensure active & system_admin role
                user.hashed_password = hashed_pwd
                user.role = admin_data["role"]
                user.is_active = True
                user.is_deleted = False
                user.must_change_password = False
                db.commit()
                logger.info(f"Updated System Admin credentials for: {username}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding system admins: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_system_admins()
