"""
tests/ai/conftest.py

The AI unit tests in this folder are fully offline: network calls are
monkeypatched, so they must not require a PostgreSQL instance.

``tests/conftest.py`` installs a session-scoped autouse fixture that connects to
the database and seeds admins. Overriding it here (same name + scope) keeps that
bootstrap for the rest of the suite while letting these tests run anywhere.
"""
import pytest


@pytest.fixture(autouse=True, scope="session")
def setup_test_suite():
    yield
