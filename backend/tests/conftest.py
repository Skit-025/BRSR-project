import os
os.environ["TESTING"] = "1"

import pytest
from app.db.seed_admins import seed_system_admins

@pytest.fixture(autouse=True, scope="session")
def setup_test_suite():
    seed_system_admins()
