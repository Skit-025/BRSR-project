import pytest
from app.modules.auth.service import HIERARCHICAL_DELEGATION_RULES, validate_admin_delegation
from app.modules.auth.models import User

def test_hierarchical_delegation_rules_structure():
    # Group Admin: user creation and appointment access removed
    group_admin_rules = HIERARCHICAL_DELEGATION_RULES["group_admin"]
    assert group_admin_rules["allowed_roles"] == []

    # Group ESG Manager: can delegate to Subsidiary Admin and Subsidiary ESG Manager
    group_esg_rules = HIERARCHICAL_DELEGATION_RULES["group_esg_manager"]
    assert set(group_esg_rules["allowed_roles"]) == {"subsidiary_admin", "subsidiary_esg_manager"}
    assert "group_admin" not in group_esg_rules["allowed_roles"]
    assert "bu_admin" not in group_esg_rules["allowed_roles"]
    assert "project_admin" not in group_esg_rules["allowed_roles"]

    # Subsidiary Admin: can delegate to Subsidiary ESG Manager, BU Admin, BU ESG Manager
    sub_rules = HIERARCHICAL_DELEGATION_RULES["subsidiary_admin"]
    assert set(sub_rules["allowed_roles"]) == {"subsidiary_esg_manager", "bu_admin", "bu_esg_manager"}
    assert "subsidiary_admin" not in sub_rules["allowed_roles"]
    assert "group_admin" not in sub_rules["allowed_roles"]
    assert "project_admin" not in sub_rules["allowed_roles"]

    # BU Admin: can delegate to BU ESG Manager, Project Admin, Project Supervisor
    bu_rules = HIERARCHICAL_DELEGATION_RULES["bu_admin"]
    assert set(bu_rules["allowed_roles"]) == {"bu_esg_manager", "project_admin", "project_supervisor"}
    assert "bu_admin" not in bu_rules["allowed_roles"]
    assert "subsidiary_admin" not in bu_rules["allowed_roles"]
    assert "group_admin" not in bu_rules["allowed_roles"]

    # Project Admin: can delegate to Project Supervisor (data entry maker)
    proj_rules = HIERARCHICAL_DELEGATION_RULES["project_admin"]
    assert set(proj_rules["allowed_roles"]) == {"project_supervisor"}

    # Project Supervisor: cannot create downstream roles
    supervisor_rules = HIERARCHICAL_DELEGATION_RULES["project_supervisor"]
    assert supervisor_rules["allowed_roles"] == []
