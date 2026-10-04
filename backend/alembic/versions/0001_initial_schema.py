"""initial_schema

Revision ID: 0001
Revises: 
Create Date: 2026-10-04

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.db.base import Base
import app.db.registry

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # Create required PostgreSQL extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS ltree;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
