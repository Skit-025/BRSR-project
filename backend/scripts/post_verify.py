import psycopg2

conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
cur = conn.cursor()

print("=== ALL ACTIVE ORG NODES ===")
cur.execute("SELECT id, name, code, type, path::text FROM org_nodes WHERE is_deleted=false ORDER BY type, path;")
for r in cur.fetchall():
    print(r)

print("\n=== USER: bu.admin@aarohan.in ===")
cur.execute("SELECT id, email, role, org_node_id FROM users WHERE email='bu.admin@aarohan.in';")
print(cur.fetchone())

print("\n=== ALL USERS ===")
cur.execute("""
    SELECT u.id, u.email, u.role, u.org_node_id, o.name, o.code, o.path::text
    FROM users u
    LEFT JOIN org_nodes o ON u.org_node_id = o.id AND o.is_deleted=false
    ORDER BY u.role;
""")
for r in cur.fetchall():
    print(r)

conn.close()
