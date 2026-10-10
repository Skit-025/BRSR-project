from app.security.rbac import Permission, has_permission
from app.ai.aarohan_router import get_aarohan_engine_catalog


def test_core_ai_permissions_matrix():
    assert has_permission("system_admin", Permission.AI_E1_USE)
    assert has_permission("group_admin", Permission.AI_E1_USE)
    assert has_permission("subsidiary_admin", Permission.AI_E1_USE)
    assert has_permission("bu_admin", Permission.AI_E7_USE)
    assert has_permission("project_admin", Permission.AI_E1_USE)
    assert has_permission("project_admin", Permission.AI_E2_USE)
    assert not has_permission("project_admin", Permission.AI_E7_USE)


def test_aarohan_catalog_masks_to_role_permissions():
    system = get_aarohan_engine_catalog("system_admin")
    project = get_aarohan_engine_catalog("project_admin")
    bu = get_aarohan_engine_catalog("bu_admin")

    assert {item["engine"] for item in system} == {"E1", "E2", "E3", "E4", "E5", "E6", "E7"}
    assert {item["engine"] for item in project} == {"E1", "E2", "E3", "E6"}
    assert {item["engine"] for item in bu} == {"E1", "E2", "E3", "E6", "E7"}
