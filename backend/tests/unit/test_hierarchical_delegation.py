import pytest
from app.modules.auth.service import HIERARCHICAL_DELEGATION_RULES, validate_admin_delegation
from app.modules.auth.models import User

def test_hierarchical_delegation_rules_structure():
    # Group Admin: can create Group Admin, Subsidiary Admin; cannot create BU Admin or Project Admin
    group_rules = HIERARCHICAL_DELEGATION_RULES["group_admin"]
    assert "group_admin" in group_rules["allowed_roles"]
    assert "subsidiary_admin" in group_rules["allowed_roles"]
    assert "bu_admin" not in group_rules["allowed_roles"]
    assert "project_admin" not in group_rules["allowed_roles"]

    # Subsidiary Admin: can create Subsidiary Admin, BU Admin; cannot create Group Admin or Project Admin
    sub_rules = HIERARCHICAL_DELEGATION_RULES["subsidiary_admin"]
    assert "subsidiary_admin" in sub_rules["allowed_roles"]
    assert "bu_admin" in sub_rules["allowed_roles"]
    assert "group_admin" not in sub_rules["allowed_roles"]
    assert "project_admin" not in sub_rules["allowed_roles"]

    # BU Admin: can create BU Admin, Project Admin; cannot create Subsidiary Admin or Group Admin
    bu_rules = HIERARCHICAL_DELEGATION_RULES["bu_admin"]
    assert "bu_admin" in bu_rules["allowed_roles"]
    assert "project_admin" in bu_rules["allowed_roles"]
    assert "subsidiary_admin" not in bu_rules["allowed_roles"]
    assert "group_admin" not in bu_rules["allowed_roles"]

    # Project Admin: can create other project-level admins (same level only)
    proj_rules = HIERARCHICAL_DELEGATION_RULES["project_admin"]
    assert "project_admin" in proj_rules["allowed_roles"]
    assert "bu_admin" not in proj_rules["allowed_roles"]
    assert "subsidiary_admin" not in proj_rules["allowed_roles"]
