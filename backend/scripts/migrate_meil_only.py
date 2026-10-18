# -*- coding: utf-8 -*-
"""
MEIL-Only Organizational Migration Script
==========================================
Phase 1+2+3: Inspect → Design → Implement

Canonical MEIL Group ID: 5f011418-17c5-4f9c-a037-e9c4272b4a1c
Canonical MEIL Path: MEIL

This script:
1. Retains the single canonical MEIL group (code=MEIL-GROUP)
2. Creates/retains the 7 approved subsidiaries under MEIL
3. Creates/retains the 7 approved BUs under MEIL (group-level BUs)
4. Reassigns valid MEIL projects to the correct approved BU
5. Deletes all duplicate/stale org nodes (156 duplicate groups → 1)
6. Handles FK constraints safely in correct order
7. Is idempotent — safe to re-run

FK DELETE RULES (from inspection):
  - calculation_jobs → org_nodes: CASCADE (auto-deletes)
  - org_level_disclosures → org_nodes: CASCADE (auto-deletes)
  - users → org_nodes: SET NULL (users preserved, org_node_id cleared)
  - user_invitations → org_nodes: SET NULL
  - user_role_assignments → org_nodes: SET NULL
  - user_creation_requests → org_nodes: SET NULL
  - submissions → org_nodes: NO ACTION (must delete or reassign first)
  - reports → org_nodes: NO ACTION
  - consolidated_values → org_nodes: NO ACTION
  - metric_applicability → org_nodes: NO ACTION
  - calc_logs → org_nodes: NO ACTION
  - custom_emission_factors → org_nodes: NO ACTION
  - assurance_engagements → org_nodes: NO ACTION
  - report_snapshots → org_nodes: NO ACTION
"""

import psycopg2
import psycopg2.extras
import uuid
from datetime import date

DB_URL = "postgresql://postgres:SKIT025@localhost:5432/brsr_db"

# ============================================================
# CANONICAL MEIL GROUP (retain this exact record)
# ============================================================
MEIL_GROUP_ID = "5f011418-17c5-4f9c-a037-e9c4272b4a1c"
MEIL_PATH = "MEIL"

# ============================================================
# TARGET: 7 APPROVED SUBSIDIARIES
# ============================================================
SUBSIDIARIES = [
    {
        "code": "SUB-OLECTRA",
        "name": "Olectra Greentech Limited",
        "description": "Electric mobility, electric buses, commercial electric trucks, and EHV insulators.",
        "path": "MEIL.OLECTRA",
        "project_type": "ev_mobility",
    },
    {
        "code": "SUB-EVEY",
        "name": "Evey Trans Private Limited",
        "description": "Electric bus fleet operations, public transportation, and asset-light transit services.",
        "path": "MEIL.EVEY",
        "project_type": "ev_mobility",
    },
    {
        "code": "SUB-DRILLMEC",
        "name": "Drillmec S.p.A.",
        "description": "Oil and gas drilling rigs, workover rigs, and heavy engineering.",
        "path": "MEIL.DRILLMEC",
        "project_type": "hydrocarbon",
    },
    {
        "code": "SUB-MEGHA-GAS",
        "name": "Megha Gas",
        "description": "City Gas Distribution (CGD), Piped Natural Gas (PNG), and Compressed Natural Gas (CNG).",
        "path": "MEIL.MEGHA_GAS",
        "project_type": "hydrocarbon_cgd",
    },
    {
        "code": "SUB-ICOMM",
        "name": "ICOMM (ICOMM Tele Limited)",
        "description": "Strategic communications, defense and telecom equipment, RF hardware, antennas, and related infrastructure.",
        "path": "MEIL.ICOMM",
        "project_type": "telecom_defence",
    },
    {
        "code": "SUB-SEPC",
        "name": "SEPC Power Private Limited",
        "description": "Power-generation assets and electricity infrastructure management.",
        "path": "MEIL.SEPC",
        "project_type": "renewable_energy",
    },
    {
        "code": "SUB-MFGIL",
        "name": "Megha Fibre Glass Industries Ltd (MFGIL)",
        "description": "Composite fiberglass piping, infrastructure components, and water and irrigation systems.",
        "path": "MEIL.MFGIL",
        "project_type": "heavy_engineering",
    },
]

# ============================================================
# TARGET: 7 APPROVED BUSINESS UNITS (group-level, under MEIL)
# ============================================================
BUSINESS_UNITS = [
    {
        "code": "BU-TRANSPORTATION",
        "name": "Transportation",
        "description": "Surface transportation, major highways, greenfield expressways, runways, rail networks, tunneling, and associated civil engineering.",
        "path": "MEIL.BU_TRANS",
        "project_type": "transport_infra",
    },
    {
        "code": "BU-HYDROCARBONS",
        "name": "Hydrocarbons",
        "description": "Upstream, midstream, and downstream oil and gas infrastructure, including storage caverns, pipelines, refinery projects, and process facilities.",
        "path": "MEIL.BU_HYDRO",
        "project_type": "hydrocarbon",
    },
    {
        "code": "BU-IRRIGATION",
        "name": "Irrigation & Water Management",
        "description": "Large-scale irrigation, lift irrigation, drinking-water supply, water grids, and associated infrastructure.",
        "path": "MEIL.BU_IRRIG",
        "project_type": "water_irrigation",
    },
    {
        "code": "BU-POWER",
        "name": "Power & Renewable Energy",
        "description": "Conventional and renewable power infrastructure, including thermal/nuclear power engineering, transmission substations, solar farms, wind energy, and grid integration.",
        "path": "MEIL.BU_POWER",
        "project_type": "renewable_energy",
    },
    {
        "code": "BU-MANUFACTURING",
        "name": "Manufacturing & Heavy Engineering",
        "description": "Manufacturing and industrial production facilities supporting pipes, coatings, pressure vessels, pumps, drilling components, and heavy machinery.",
        "path": "MEIL.BU_MFG",
        "project_type": "heavy_engineering",
    },
    {
        "code": "BU-BUILDINGS",
        "name": "Buildings & Industrial Infrastructure",
        "description": "Commercial, industrial, healthcare, government, and other major civil-engineering and construction infrastructure.",
        "path": "MEIL.BU_BLDG",
        "project_type": "corporate",
    },
    {
        "code": "BU-IBD",
        "name": "International Business Development (IBD) & O&M",
        "description": "International business development, overseas execution, bidding, operations, and long-term operation and maintenance of infrastructure assets.",
        "path": "MEIL.BU_IBD",
        "project_type": "corporate",
    },
]

# ============================================================
# CANONICAL PROJECTS to retain & map to correct BU
# Projects that are under the canonical MEIL.* hierarchy
# and have real users / submissions assigned
# ============================================================
# Format: (existing_id, target_bu_code)
CANONICAL_PROJECTS_BU_MAP = {
    # Tunnel Project P7 (Zojila Tunnel) → Transportation
    "4cf5fec9-cbef-439b-a991-aefc391a56e8": "BU-TRANSPORTATION",
    # Highway Construction P-001 (Odisha Expressway) → Transportation
    "154fe2aa-8ac5-4ff1-b04f-a05a8a00a03b": "BU-TRANSPORTATION",
    # Railway tunnel projects → Transportation
    "82514924-c0d3-4f91-894c-7871fd9f7bc2": "BU-TRANSPORTATION",
    "e328491e-1ee8-4f7a-a16d-bdcf11045e67": "BU-TRANSPORTATION",
    "6d0cf4cb-40d6-4c82-a8f7-5cc04afdbca4": "BU-TRANSPORTATION",
    # a highway construction at godavari → Transportation
    "9e98f898-24f7-4268-9c2a-cebd768060d3": "BU-TRANSPORTATION",
    # Tunnel at Jamshedpur → Transportation
    "d8eebbb6-7444-4d42-8a93-952ed4b826ee": "BU-TRANSPORTATION",
    # CHARMINAR TERMINAL BBSR → Hydrocarbons
    "dd19c60b-8316-4c38-9c45-69af7e7404a3": "BU-HYDROCARBONS",
}


def new_uuid():
    return str(uuid.uuid4())


def upsert_org_node(cur, code, name, node_type, parent_id, path, project_type, description=None):
    """Insert org node if code doesn't exist, or update if name changed. Returns the node id."""
    cur.execute("SELECT id, name FROM org_nodes WHERE code = %s", (code,))
    existing = cur.fetchone()
    if existing:
        node_id = existing[0]
        if existing[1] != name:
            cur.execute(
                "UPDATE org_nodes SET name=%s, parent_id=%s, path=%s, project_type=%s, "
                "project_description=%s, is_active=true, is_deleted=false, updated_at=NOW() "
                "WHERE id=%s",
                (name, parent_id, path, project_type, description, node_id)
            )
            print(f"  [UPDATED] {node_type}: {name} (code={code})")
        else:
            # Ensure is_active and not deleted
            cur.execute(
                "UPDATE org_nodes SET parent_id=%s, path=%s, is_active=true, is_deleted=false, updated_at=NOW() "
                "WHERE id=%s",
                (parent_id, path, node_id)
            )
            print(f"  [RETAINED] {node_type}: {name} (code={code})")
        return node_id
    else:
        node_id = new_uuid()
        cur.execute(
            """INSERT INTO org_nodes 
               (id, code, name, type, parent_id, path, is_root, ownership_pct, control_type,
                boundary, project_type, project_description, location_country, 
                is_listed, is_water_stressed, is_pat_designated, has_land_acquisition,
                is_active, is_deleted, attributes, enabled_activity_categories, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (
                node_id, code, name, node_type, parent_id, path,
                node_type == "group",  # is_root
                100.0, "operational_control", True,
                project_type, description, "India",
                False, False, False, False,
                True, False, "{}", "[]"
            )
        )
        print(f"  [CREATED] {node_type}: {name} (code={code})")
        return node_id


def run_migration():
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur = conn.cursor()

    print("=" * 70)
    print("MEIL-ONLY ORGANIZATIONAL MIGRATION")
    print("=" * 70)

    try:
        # --------------------------------------------------------
        # STEP 0: Verify canonical MEIL group exists
        # --------------------------------------------------------
        print("\n[STEP 0] Verifying canonical MEIL group...")
        cur.execute("SELECT id, name, code, path::text FROM org_nodes WHERE id = %s", (MEIL_GROUP_ID,))
        meil_group = cur.fetchone()
        if not meil_group:
            print("ERROR: Canonical MEIL group not found! Aborting.")
            conn.rollback()
            return
        print(f"  OK: Found MEIL group: {meil_group[1]} (code={meil_group[2]}, path={meil_group[3]})")
        
        # Ensure MEIL group is active
        cur.execute(
            "UPDATE org_nodes SET is_active=true, is_deleted=false, is_root=true, updated_at=NOW() WHERE id=%s",
            (MEIL_GROUP_ID,)
        )

        # --------------------------------------------------------
        # STEP 1: Upsert 7 approved subsidiaries under MEIL
        # --------------------------------------------------------
        print("\n[STEP 1] Creating/retaining 7 approved subsidiaries...")
        subsidiary_ids = {}
        for sub in SUBSIDIARIES:
            node_id = upsert_org_node(
                cur,
                code=sub["code"],
                name=sub["name"],
                node_type="subsidiary",
                parent_id=MEIL_GROUP_ID,
                path=sub["path"],
                project_type=sub["project_type"],
                description=sub["description"]
            )
            subsidiary_ids[sub["code"]] = node_id

        # --------------------------------------------------------
        # STEP 2: Upsert 7 approved BUs under MEIL
        # --------------------------------------------------------
        print("\n[STEP 2] Creating/retaining 7 approved Business Units...")
        bu_ids = {}
        for bu in BUSINESS_UNITS:
            node_id = upsert_org_node(
                cur,
                code=bu["code"],
                name=bu["name"],
                node_type="business_unit",
                parent_id=MEIL_GROUP_ID,
                path=bu["path"],
                project_type=bu["project_type"],
                description=bu["description"]
            )
            bu_ids[bu["code"]] = node_id
        
        # Special: the existing BU-TRANS (Transportation & Tunneling BU) maps to BU-TRANSPORTATION
        # b7515bf0-1b81-40f7-890a-4180a9ee9189
        EXISTING_BU_TRANS_ID = "b7515bf0-1b81-40f7-890a-4180a9ee9189"
        print(f"\n  Note: Existing BU-TRANS ({EXISTING_BU_TRANS_ID}) will be replaced by BU-TRANSPORTATION ({bu_ids['BU-TRANSPORTATION']})")

        # --------------------------------------------------------
        # STEP 3: Reassign canonical projects to correct BU
        # --------------------------------------------------------
        print("\n[STEP 3] Reassigning canonical projects to correct BUs...")
        for project_id, bu_code in CANONICAL_PROJECTS_BU_MAP.items():
            bu_id = bu_ids[bu_code]
            cur.execute(
                "SELECT id, name, code, path::text, parent_id FROM org_nodes WHERE id = %s AND is_deleted=false",
                (project_id,)
            )
            prj = cur.fetchone()
            if prj:
                # Compute new path: BU path + project code segment
                cur.execute("SELECT path::text FROM org_nodes WHERE id = %s", (bu_id,))
                bu_path = cur.fetchone()[0]
                # extract last segment from current path as label
                old_path = prj[3]
                last_seg = old_path.split(".")[-1]
                new_path = f"{bu_path}.{last_seg}"
                cur.execute(
                    "UPDATE org_nodes SET parent_id=%s, path=%s, is_active=true, is_deleted=false, updated_at=NOW() WHERE id=%s",
                    (bu_id, new_path, project_id)
                )
                print(f"  [REPARENTED] {prj[1]} (code={prj[2]}) → {bu_code} (path: {old_path} → {new_path})")
            else:
                print(f"  [SKIP] Project {project_id} not found or already deleted")

        # --------------------------------------------------------
        # STEP 4: Identify & remove duplicate / stale groups
        # --------------------------------------------------------
        print("\n[STEP 4] Identifying stale groups to purge...")
        cur.execute("""
            SELECT id, name, code, path::text
            FROM org_nodes
            WHERE type = 'group'
            AND id != %s
            ORDER BY name;
        """, (MEIL_GROUP_ID,))
        stale_groups = cur.fetchall()
        print(f"  Found {len(stale_groups)} stale groups to purge")

        stale_group_ids = [g[0] for g in stale_groups]
        
        if not stale_group_ids:
            print("  No stale groups found.")
        else:
            # Find all org_nodes in stale group subtrees
            # These are: nodes whose path starts with a stale group code
            stale_paths = [g[3] for g in stale_groups]  # e.g. GRP-0BE6A0, MEIL-2CA60F etc
            
            # Get all descendant nodes of stale groups
            placeholders = ",".join(["%s"] * len(stale_group_ids))
            cur.execute(f"""
                SELECT id, name, code, type, path::text
                FROM org_nodes
                WHERE id IN ({placeholders})
                   OR parent_id IN ({placeholders})
            """, stale_group_ids + stale_group_ids)
            # This only gets immediate children; we need all descendants
            # Use recursive approach via path prefix
            
            # Build path prefix conditions
            path_conditions = " OR ".join([f"path::text LIKE %s" for _ in stale_paths])
            like_patterns = [f"{p}%" for p in stale_paths]
            
            cur.execute(f"""
                SELECT id, type, path::text
                FROM org_nodes
                WHERE ({path_conditions})
                ORDER BY path::text DESC;
            """, like_patterns)
            stale_nodes = cur.fetchall()
            stale_node_ids = [n[0] for n in stale_nodes]
            
            print(f"  Found {len(stale_node_ids)} total stale nodes (groups + descendants) to purge")

            if stale_node_ids:
                # Delete dependents with NO ACTION FK first
                # 1. Delete metric_applicability for stale nodes
                if stale_node_ids:
                    placeholders_n = ",".join(["%s"] * len(stale_node_ids))
                    cur.execute(f"DELETE FROM metric_applicability WHERE org_node_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted metric_applicability rows: {cur.rowcount}")

                    # 2. Delete consolidated_values
                    cur.execute(f"DELETE FROM consolidated_values WHERE entity_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted consolidated_values rows: {cur.rowcount}")

                    # 3. Delete calc_logs
                    cur.execute(f"DELETE FROM calc_logs WHERE org_node_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted calc_logs rows: {cur.rowcount}")

                    # 4. Delete custom_emission_factors
                    cur.execute(f"DELETE FROM custom_emission_factors WHERE org_node_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted custom_emission_factors rows: {cur.rowcount}")

                    # 5. Delete assurance_engagements
                    cur.execute(f"DELETE FROM assurance_engagements WHERE entity_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted assurance_engagements rows: {cur.rowcount}")

                    # 6. Delete report_snapshots
                    cur.execute(f"DELETE FROM report_snapshots WHERE entity_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted report_snapshots rows: {cur.rowcount}")

                    # 7. Delete reports for stale nodes
                    cur.execute(f"DELETE FROM reports WHERE entity_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted reports rows: {cur.rowcount}")

                    # 8a. Delete validation_exceptions for stale submissions
                    cur.execute(f"DELETE FROM validation_exceptions WHERE submission_id IN (SELECT id FROM submissions WHERE entity_id IN ({placeholders_n}))", stale_node_ids)
                    print(f"  Deleted validation_exceptions rows: {cur.rowcount}")

                    # 8b. Delete validation_results for stale submissions
                    cur.execute(f"DELETE FROM validation_results WHERE submission_id IN (SELECT id FROM submissions WHERE entity_id IN ({placeholders_n}))", stale_node_ids)
                    print(f"  Deleted validation_results rows: {cur.rowcount}")

                    # 8c. Delete reviews for stale submissions
                    cur.execute(f"DELETE FROM reviews WHERE submission_id IN (SELECT id FROM submissions WHERE entity_id IN ({placeholders_n}))", stale_node_ids)
                    print(f"  Deleted reviews rows: {cur.rowcount}")

                    # 8d. Delete evidence_links for stale data_points
                    cur.execute(f"DELETE FROM evidence_links WHERE data_point_id IN (SELECT id FROM data_points WHERE submission_id IN (SELECT id FROM submissions WHERE entity_id IN ({placeholders_n})))", stale_node_ids)
                    print(f"  Deleted evidence_links rows: {cur.rowcount}")

                    # 8e. Delete data_points for stale submissions
                    cur.execute(f"DELETE FROM data_points WHERE submission_id IN (SELECT id FROM submissions WHERE entity_id IN ({placeholders_n}))", stale_node_ids)
                    print(f"  Deleted data_points rows: {cur.rowcount}")

                    # 8f. Delete submissions for stale nodes
                    cur.execute(f"DELETE FROM submissions WHERE entity_id IN ({placeholders_n})", stale_node_ids)
                    print(f"  Deleted stale submissions rows: {cur.rowcount}")

                    # 10. DELETE stale org nodes (CASCADE will handle calculation_jobs, org_level_disclosures)
                    # Must delete in leaf-first order (sort by path desc = deepest first)
                    stale_node_ids_sorted = [n[0] for n in sorted(stale_nodes, key=lambda x: x[2], reverse=True)]
                    placeholders_s = ",".join(["%s"] * len(stale_node_ids_sorted))
                    cur.execute(f"DELETE FROM org_nodes WHERE id IN ({placeholders_s})", stale_node_ids_sorted)
                    print(f"  Deleted stale org_nodes: {cur.rowcount}")

        # --------------------------------------------------------
        # STEP 5: Clean up remaining stale nodes NOT under MEIL path
        # (nodes whose path doesn't start with MEIL, not already deleted)
        # --------------------------------------------------------
        print("\n[STEP 5] Cleaning up remaining non-MEIL nodes...")
        cur.execute("""
            SELECT id, name, code, type, path::text
            FROM org_nodes
            WHERE path::text NOT LIKE 'MEIL%'
            AND is_deleted = false
            ORDER BY path::text DESC;
        """)
        remaining_stale = cur.fetchall()
        print(f"  Found {len(remaining_stale)} remaining non-MEIL nodes")
        if remaining_stale:
            rem_ids = [n[0] for n in remaining_stale]
            for n in remaining_stale:
                print(f"    {n[4]} ({n[3]}): {n[1]}")
            
            phs = ",".join(["%s"] * len(rem_ids))
            cur.execute(f"DELETE FROM metric_applicability WHERE org_node_id IN ({phs})", rem_ids)
            cur.execute(f"DELETE FROM consolidated_values WHERE entity_id IN ({phs})", rem_ids)
            cur.execute(f"DELETE FROM calc_logs WHERE org_node_id IN ({phs})", rem_ids)
            cur.execute(f"DELETE FROM reports WHERE entity_id IN ({phs})", rem_ids)
            cur.execute(f"DELETE FROM submissions WHERE entity_id IN ({phs})", rem_ids)
            try:
                cur.execute(f"DELETE FROM assurance_engagements WHERE entity_id IN ({phs})", rem_ids)
                cur.execute(f"DELETE FROM report_snapshots WHERE entity_id IN ({phs})", rem_ids)
            except:
                conn.rollback()
                conn.autocommit = False
                cur = conn.cursor()
            cur.execute(f"DELETE FROM org_nodes WHERE id IN ({phs})", rem_ids)
            print(f"  Deleted {cur.rowcount} remaining non-MEIL org_nodes")

        # --------------------------------------------------------
        # STEP 6: Reparent the existing BU-TRANS projects to BU-TRANSPORTATION
        # --------------------------------------------------------
        print("\n[STEP 6] Migrating existing BU-TRANS children to new BU-TRANSPORTATION...")
        bu_trans_new_id = bu_ids["BU-TRANSPORTATION"]
        bu_trans_new_path = "MEIL.BU_TRANS"
        
        # Find children of old BU-TRANS that weren't already remapped
        cur.execute("""
            SELECT id, name, code, path::text FROM org_nodes 
            WHERE parent_id = %s AND is_deleted = false
        """, (EXISTING_BU_TRANS_ID,))
        bt_children = cur.fetchall()
        for child in bt_children:
            old_path_seg = child[3].split(".")[-1]
            new_path = f"{bu_trans_new_path}.{old_path_seg}"
            cur.execute(
                "UPDATE org_nodes SET parent_id=%s, path=%s, updated_at=NOW() WHERE id=%s",
                (bu_trans_new_id, new_path, child[0])
            )
            print(f"  Reparented: {child[1]} → BU-TRANSPORTATION (path: {new_path})")

        # Mark old BU-TRANS (the legacy one) as inactive / soft-deleted
        # since BU-TRANSPORTATION is now the canonical one
        cur.execute("""
            UPDATE org_nodes 
            SET is_active=false, is_deleted=true, updated_at=NOW() 
            WHERE id=%s
        """, (EXISTING_BU_TRANS_ID,))
        print(f"  Soft-deleted legacy BU-TRANS ({EXISTING_BU_TRANS_ID})")

        # Also reparent the existing MEGHA-ROAD-TRANS subsidiary under MEIL to remain
        MEGHA_ROAD_TRANS_ID = "b5bf5b6a-0039-4a54-b74a-dd8dc5596250"
        cur.execute("""
            UPDATE org_nodes SET is_active=true, is_deleted=false, updated_at=NOW()
            WHERE id = %s
        """, (MEGHA_ROAD_TRANS_ID,))
        print(f"  Retained legacy Megha Road and Transport Ltd subsidiary ({MEGHA_ROAD_TRANS_ID})")

        # --------------------------------------------------------
        # STEP 7: Fix users whose org_node_id still points to deleted nodes
        # --------------------------------------------------------
        print("\n[STEP 7] Verifying user assignments are still valid...")
        cur.execute("""
            SELECT u.id, u.email, u.role, u.org_node_id, o.id as node_id
            FROM users u
            LEFT JOIN org_nodes o ON u.org_node_id = o.id AND o.is_deleted = false
            WHERE u.org_node_id IS NOT NULL
        """)
        user_checks = cur.fetchall()
        for uc in user_checks:
            if uc[4] is None:
                print(f"  WARNING: User {uc[1]} has invalid org_node_id {uc[3]} - clearing it")
                cur.execute("UPDATE users SET org_node_id=NULL WHERE id=%s", (uc[0],))
            else:
                print(f"  OK: {uc[1]} ({uc[2]}) → node {uc[3]}")

        # --------------------------------------------------------
        # STEP 8: Post-migration counts verification
        # --------------------------------------------------------
        print("\n[STEP 8] Post-migration verification...")
        cur.execute("SELECT type, count(*) FROM org_nodes WHERE is_deleted=false GROUP BY type;")
        counts = dict(cur.fetchall())
        print(f"  Active org_nodes by type: {counts}")
        
        cur.execute("SELECT count(*) FROM org_nodes WHERE type='group' AND is_deleted=false;")
        grp_count = cur.fetchone()[0]
        
        cur.execute("SELECT count(*) FROM submissions;")
        sub_count = cur.fetchone()[0]
        
        cur.execute("SELECT count(*) FROM evidence_files WHERE is_deleted=false;")
        ev_count = cur.fetchone()[0]
        
        print(f"  Active groups: {grp_count} (expected: 1)")
        print(f"  Total submissions: {sub_count}")
        print(f"  Active evidence files: {ev_count}")

        # --------------------------------------------------------
        # COMMIT
        # --------------------------------------------------------
        conn.commit()
        print("\n" + "=" * 70)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"\nActive groups: {grp_count}")
        print(f"Active org nodes: {counts}")
        
        if grp_count == 1:
            print("\n✅ ACCEPTANCE CHECK PASSED: Exactly 1 active group exists.")
        else:
            print(f"\n⚠️  ACCEPTANCE CHECK FAILED: {grp_count} groups exist (expected 1).")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
