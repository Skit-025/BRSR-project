"""
app/modules/auth/repository.py
Repository pattern for user accounts and access credentials.
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from app.modules.auth.models import User


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.id == user_id, User.is_deleted == False)
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        return (
            self.db.query(User)
            .filter(User.email == email, User.is_deleted == False)
            .first()
        )

    def list_users(
        self,
        org_node_id: Optional[str] = None,
        role: Optional[str] = None,
        active_only: bool = True,
    ) -> List[User]:
        query = self.db.query(User).filter(User.is_deleted == False)
        if active_only:
            query = query.filter(User.is_active == True)
        if org_node_id:
            query = query.filter(User.org_node_id == org_node_id)
        if role:
            query = query.filter(User.role == role)
        return query.all()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.db.commit()
        self.db.refresh(user)
        return user
