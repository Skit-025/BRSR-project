from app.security.rbac import Permission, has_permission
from app.ai.aarohan_router import get_aarohan_engine_catalog


def test_core_ai_permissions_matrix():
    # ── 5-Role Architecture Assertions ──────────────────────────────────────
    # system_admin: all permissions (superuser)
    assert has_permission("system_admin", Permission.AI_E1_USE)
    assert has_permission("system_admin", Permission.AI_E7_USE)

    # group_admin: all AI engines (E1-E7 + approve)
    assert has_permission("group_admin", Permission.AI_E1_USE)
    assert has_permission("group_admin", Permission.AI_E7_USE)
    assert has_permission("group_admin", Permission.AI_APPROVE)

    # subsidiary_admin: AI engines E1-E7 + approve
    assert has_permission("subsidiary_admin", Permission.AI_E1_USE)
    assert has_permission("subsidiary_admin", Permission.AI_E7_USE)

    # bu_admin: AI engines E1, E2, E3, E6, E7 + approve
    assert has_permission("bu_admin", Permission.AI_E1_USE)
    assert has_permission("bu_admin", Permission.AI_E7_USE)
    assert has_permission("bu_admin", Permission.AI_APPROVE)
    assert not has_permission("bu_admin", Permission.AI_E4_USE)
    assert not has_permission("bu_admin", Permission.AI_E5_USE)

    # project_admin: AI engines E1, E2, E3, E6 only
    assert has_permission("project_admin", Permission.AI_E1_USE)
    assert has_permission("project_admin", Permission.AI_E2_USE)
    assert has_permission("project_admin", Permission.AI_E6_USE)
    assert has_permission("project_admin", Permission.AI_E3_USE)
    assert not has_permission("project_admin", Permission.AI_E7_USE)

    # ── 6. project_data_entry_user: AI engines E1, E3, E6 (data collector / maker) ──
    assert has_permission("project_data_entry_user", Permission.AI_E1_USE)
    assert has_permission("project_data_entry_user", Permission.AI_E3_USE)
    assert has_permission("project_data_entry_user", Permission.AI_E6_USE)
    assert not has_permission("project_data_entry_user", Permission.AI_E2_USE)
    assert not has_permission("project_data_entry_user", Permission.AI_E7_USE)

    # Truly obsolete roles must NOT grant any permissions
    assert not has_permission("bu_reviewer", Permission.AI_E7_USE)
    assert not has_permission("esg_manager", Permission.AI_E1_USE)
    assert not has_permission("super_admin", Permission.AI_E1_USE)


def test_aarohan_catalog_masks_to_role_permissions():
    system = get_aarohan_engine_catalog("system_admin")
    project = get_aarohan_engine_catalog("project_admin")
    bu = get_aarohan_engine_catalog("bu_admin")
    subsidiary = get_aarohan_engine_catalog("subsidiary_admin")
    group = get_aarohan_engine_catalog("group_admin")

    assert {item["engine"] for item in system} == {"E1", "E2", "E3", "E4", "E5", "E6", "E7"}
    assert {item["engine"] for item in project} == {"E1", "E2", "E3", "E6"}
    assert {item["engine"] for item in bu} == {"E1", "E2", "E3", "E6", "E7"}
    assert {item["engine"] for item in subsidiary} == {"E1", "E2", "E3", "E4", "E5", "E6", "E7"}
    assert {item["engine"] for item in group} == {"E1", "E2", "E3", "E4", "E5", "E6", "E7"}

    # project_data_entry_user catalog = E1, E3, E6
    data_entry = get_aarohan_engine_catalog("project_data_entry_user")
    assert {item["engine"] for item in data_entry} == {"E1", "E3", "E6"}
