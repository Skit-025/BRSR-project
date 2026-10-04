"""
scripts/recreate_db.py
Drops old public schema, enables PostgreSQL extensions, creates all tables fresh,
and stamps the schema.
"""
from sqlalchemy import text
from app.db.session import engine
from app.db.base import Base
import app.db.registry


def main():
    print("Connecting to PostgreSQL database...")
    with engine.connect() as conn:
        print("Resetting public schema...")
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO postgres;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        
        print("Enabling required PostgreSQL extensions...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS ltree;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))
        conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
        conn.commit()
        print("PostgreSQL extensions verified successfully.")

    print(f"Discovered {len(Base.metadata.tables)} models in Base.metadata.")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully!")
    for table_name in sorted(Base.metadata.tables.keys()):
        print(f"  [OK] {table_name}")



if __name__ == "__main__":
    main()
