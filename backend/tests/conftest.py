import os
os.environ["TESTING"] = "1"

import pytest


@pytest.fixture(autouse=True, scope="session")
def setup_test_suite():
    # Imported inside the fixture so test collection does not require a live
    # PostgreSQL instance (app.db.session connects to the database on import).
    from app.db.session import init_db
    from app.db.seed_admins import seed_system_admins

    init_db()
    seed_system_admins()
