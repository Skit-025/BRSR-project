import psycopg2

conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
cur = conn.cursor()

cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
""")
tables = [r[0] for r in cur.fetchall()]

print("=== PUBLIC TABLES & ROW COUNTS ===")
for t in tables:
    try:
        cur.execute(f'SELECT count(*) FROM "{t}";')
        cnt = cur.fetchone()[0]
        if cnt > 0:
            print(f"TABLE {t}: {cnt}")
    except Exception as e:
        print(f"TABLE {t}: ERROR {e}")

print("\n=== TOTAL ORG NODES BY TYPE ===")
cur.execute("SELECT type, count(*) FROM org_nodes GROUP BY type;")
for r in cur.fetchall():
    print(r)

print("\n=== ACTIVE USERS AND THEIR ROLES / NODES ===")
cur.execute("""
    SELECT u.id, u.email, u.full_name, u.role, u.org_node_id, o.name, o.code, o.type, o.path
    FROM users u
    LEFT JOIN org_nodes o ON u.org_node_id = o.id
    ORDER BY u.role, u.email;
""")
for r in cur.fetchall():
    print(r)

print("\n=== CANONICAL OR RELEVANT MEIL NODES (PATH LIKE 'MEIL%') ===")
cur.execute("""
    SELECT id, parent_id, name, code, type, path
    FROM org_nodes
    WHERE path::text LIKE 'MEIL%'
    ORDER BY path;
""")
for r in cur.fetchall():
    print(r)

conn.close()
