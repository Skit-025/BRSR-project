"""
Post-migration cleanup and fixups:
1. Assign bu.admin to BU-TRANSPORTATION
2. Remove legacy non-approved subsidiary (AAROHAN-CONSTRUCTION-02) and its stale BU
3. Note: MEGHA-ROAD-TRANS is Meera Nair's assignment - we KEEP this but it must be one
   of the 7 approved subsidiaries or reclassified. It's an existing canonical subsidiary
   we retain for now (Meera Nair works under it).
"""
import psycopg2

conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
cur = conn.cursor()
conn.autocommit = False

try:
    # 1. Assign bu.admin@aarohan.in to BU-TRANSPORTATION
    BU_TRANSPORTATION_CODE = 'BU-TRANSPORTATION'
    cur.execute("SELECT id, path::text FROM org_nodes WHERE code = %s AND is_deleted=false", (BU_TRANSPORTATION_CODE,))
    bu_trans = cur.fetchone()
    if bu_trans:
        bu_trans_id, bu_trans_path = bu_trans
        cur.execute(
            "UPDATE users SET org_node_id=%s, updated_at=NOW() WHERE email='bu.admin@aarohan.in'",
            (bu_trans_id,)
        )
        print(f"[FIXED] bu.admin@aarohan.in assigned to {BU_TRANSPORTATION_CODE} ({bu_trans_id})")
    else:
        print("ERROR: BU-TRANSPORTATION not found!")

    # 2. Clean up AAROHAN-CONSTRUCTION-02 subsidiary and its child BU (MEIL-BUSINESS-UNIT-001)
    # The CHARMINAR project was already reparented to BU-HYDROCARBONS in migration
    # So we can safely delete this stale subsidiary and its now-empty BU
    
    # First check if MEIL-BUSINESS-UNIT-001 has any children
    cur.execute("SELECT count(*) FROM org_nodes WHERE parent_id = 'dfeaf2d2-dec3-403b-a98c-6a1b7ba435ec' AND is_deleted=false")
    child_count = cur.fetchone()[0]
    print(f"\n[CHECK] MEIL-BUSINESS-UNIT-001 has {child_count} active children")

    if child_count == 0:
        # Safe to delete
        cur.execute("DELETE FROM metric_applicability WHERE org_node_id = 'dfeaf2d2-dec3-403b-a98c-6a1b7ba435ec'")
        cur.execute("DELETE FROM org_nodes WHERE id = 'dfeaf2d2-dec3-403b-a98c-6a1b7ba435ec'")
        print("  [DELETED] MEIL-BUSINESS-UNIT-001 (stale legacy BU)")
    else:
        cur.execute("UPDATE org_nodes SET is_active=false, is_deleted=true, updated_at=NOW() WHERE id='dfeaf2d2-dec3-403b-a98c-6a1b7ba435ec'")
        print("  [SOFT-DELETED] MEIL-BUSINESS-UNIT-001 (has children, soft-deleted)")

    # Check AAROHAN-CONSTRUCTION-02 subsidiary children
    cur.execute("SELECT count(*) FROM org_nodes WHERE parent_id = '991822b5-260b-4c70-8258-45a946df77f9' AND is_deleted=false")
    child_count2 = cur.fetchone()[0]
    print(f"\n[CHECK] AAROHAN-CONSTRUCTION-02 has {child_count2} active children")

    if child_count2 == 0:
        cur.execute("DELETE FROM metric_applicability WHERE org_node_id = '991822b5-260b-4c70-8258-45a946df77f9'")
        cur.execute("DELETE FROM org_nodes WHERE id = '991822b5-260b-4c70-8258-45a946df77f9'")
        print("  [DELETED] AAROHAN-CONSTRUCTION-02 (stale legacy subsidiary)")
    else:
        cur.execute("UPDATE org_nodes SET is_active=false, is_deleted=true, updated_at=NOW() WHERE id='991822b5-260b-4c70-8258-45a946df77f9'")
        print("  [SOFT-DELETED] AAROHAN-CONSTRUCTION-02 (has children, soft-deleted)")

    # 3. Final count verification
    cur.execute("SELECT type, count(*) FROM org_nodes WHERE is_deleted=false GROUP BY type;")
    counts = dict(cur.fetchall())
    print(f"\n[FINAL] Active org_nodes by type: {counts}")
    
    cur.execute("SELECT count(*) FROM org_nodes WHERE type='group' AND is_deleted=false;")
    grp_count = cur.fetchone()[0]

    print(f"\nGroups: {grp_count} (expected: 1)")
    print(f"Subsidiaries: {counts.get('subsidiary', 0)} (expected: 8, includes Megha Road and Transport)")
    print(f"Business Units: {counts.get('business_unit', 0)} (expected: 7)")
    print(f"Projects: {counts.get('project', 0)}")

    conn.commit()
    print("\n[OK] Cleanup committed successfully")

except Exception as e:
    conn.rollback()
    print(f"\nERROR: {e}")
    import traceback; traceback.print_exc()
    raise
finally:
    cur.close()
    conn.close()
