import pytest
from app.modules.auth.service import HIERARCHICAL_DELEGATION_RULES, validate_admin_delegation
from app.modules.auth.models import User

def test_hierarchical_delegation_rules_structure():
    # Group Admin: can ONLY delegate to Subsidiary Admin
    group_rules = HIERARCHICAL_DELEGATION_RULES["group_admin"]
    assert group_rules["allowed_roles"] == ["subsidiary_admin"]
    assert "group_admin" not in group_rules["allowed_roles"]
    assert "bu_admin" not in group_rules["allowed_roles"]
    assert "project_admin" not in group_rules["allowed_roles"]

    # Subsidiary Admin: can ONLY delegate to BU Admin
    sub_rules = HIERARCHICAL_DELEGATION_RULES["subsidiary_admin"]
    assert sub_rules["allowed_roles"] == ["bu_admin"]
    assert "subsidiary_admin" not in sub_rules["allowed_roles"]
    assert "group_admin" not in sub_rules["allowed_roles"]
    assert "project_admin" not in sub_rules["allowed_roles"]

    # BU Admin: can ONLY delegate to Project Admin
    bu_rules = HIERARCHICAL_DELEGATION_RULES["bu_admin"]
    assert bu_rules["allowed_roles"] == ["project_admin"]
    assert "bu_admin" not in bu_rules["allowed_roles"]
    assert "subsidiary_admin" not in bu_rules["allowed_roles"]
    assert "group_admin" not in bu_rules["allowed_roles"]

    # Project Admin: cannot create downstream roles
    proj_rules = HIERARCHICAL_DELEGATION_RULES["project_admin"]
    assert proj_rules["allowed_roles"] == []
