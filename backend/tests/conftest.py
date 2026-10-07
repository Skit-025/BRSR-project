import os
os.environ["TESTING"] = "1"

import pytest
from app.db.session import init_db
from app.db.seed_admins import seed_system_admins

@pytest.fixture(autouse=True, scope="session")
def setup_test_suite():
    init_db()
    seed_system_admins()
