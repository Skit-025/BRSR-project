import psycopg2
import json

conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
cur = conn.cursor()

# Get non-empty tables
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]
table_counts = {}
for t in tables:
    try:
        cur.execute(f'SELECT count(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
        if cnt > 0:
            table_counts[t] = cnt
    except Exception as e:
        table_counts[t] = str(e)

# Node types count
cur.execute("SELECT type, count(*) FROM org_nodes GROUP BY type;")
node_types = dict(cur.fetchall())

# Users
cur.execute("""
    SELECT u.id, u.email, u.full_name, u.role, u.org_node_id, o.name, o.code, o.type, o.path::text
    FROM users u
    LEFT JOIN org_nodes o ON u.org_node_id = o.id
    ORDER BY u.role, u.email;
""")
users = [
    {
        "id": r[0], "email": r[1], "name": r[2], "role": r[3],
        "org_node_id": r[4], "node_name": r[5], "node_code": r[6],
        "node_type": r[7], "node_path": r[8]
    }
    for r in cur.fetchall()
]

# Check submissions
cur.execute("""
    SELECT s.id, s.period_id, s.status, s.entity_id, o.name, o.code, o.path::text
    FROM submissions s
    LEFT JOIN org_nodes o ON s.entity_id = o.id;
""")
submissions = [
    {
        "id": r[0], "period": r[1], "status": r[2], "entity_id": r[3],
        "name": r[4], "code": r[5], "path": r[6]
    }
    for r in cur.fetchall()
]

# Check evidence_files
cur.execute("""
    SELECT e.id, e.original_name, e.project_id, o.name, o.code, o.path::text
    FROM evidence_files e
    LEFT JOIN org_nodes o ON e.project_id = o.id::text;
""")
evidence = [
    {
        "id": r[0], "file_name": r[1], "project_id": r[2],
        "name": r[3], "code": r[4], "path": r[5]
    }
    for r in cur.fetchall()
]

# Check all groups
cur.execute("""
    SELECT id, name, code, path::text
    FROM org_nodes
    WHERE type = 'group'
    ORDER BY name;
""")
all_groups = [{"id": r[0], "name": r[1], "code": r[2], "path": r[3]} for r in cur.fetchall()]

# Check the canonical tree MEIL.*
cur.execute("""
    SELECT id, parent_id, name, code, type, path::text
    FROM org_nodes
    WHERE path::text LIKE 'MEIL%'
    ORDER BY path::text;
""")
meil_nodes = [
    {"id": r[0], "parent_id": r[1], "name": r[2], "code": r[3], "type": r[4], "path": r[5]}
    for r in cur.fetchall()
]

summary = {
    "table_counts": table_counts,
    "node_types": node_types,
    "users": users,
    "submissions": submissions,
    "evidence": evidence,
    "total_groups": len(all_groups),
    "all_groups_sample": all_groups[:15],
    "meil_nodes": meil_nodes
}

with open("scripts/db_summary.json", "w") as f:
    json.dump(summary, f, indent=2)

print("Saved scripts/db_summary.json")
print("Table counts:", table_counts)
print("Node types:", node_types)
print("Total groups:", len(all_groups))
print(f"Users count: {len(users)}")
print(f"Submissions count: {len(submissions)}")
print(f"Evidence count: {len(evidence)}")
print(f"Canonical MEIL nodes count: {len(meil_nodes)}")
conn.close()
