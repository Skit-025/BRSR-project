import psycopg2

def fix_roles():
    conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
    cur = conn.cursor()
    
    queries = [
        "UPDATE users SET role = 'system_admin' WHERE role = 'super_admin';",
        "UPDATE users SET role = 'group_admin' WHERE role IN ('group_esg_manager', 'esg_manager');",
        "UPDATE users SET role = 'subsidiary_admin' WHERE role = 'subsidiary_esg_manager';",
        "UPDATE users SET role = 'bu_admin' WHERE role IN ('bu_reviewer', 'bu_esg_manager');",
        "UPDATE users SET role = 'project_admin' WHERE role IN ('maker', 'project_data_entry_user', 'checker', 'site_collector');",
        "UPDATE users SET role = 'project_admin', is_active = false WHERE role IN ('auditor', 'read_only_viewer', 'viewer');"
    ]
    
    for q in queries:
        cur.execute(q)
        
    # Also fix user_role_assignments if exists
    try:
        cur.execute("SELECT 1 FROM user_role_assignments LIMIT 1;")
        queries2 = [
            "UPDATE user_role_assignments SET role = 'system_admin' WHERE role = 'super_admin';",
            "UPDATE user_role_assignments SET role = 'group_admin' WHERE role IN ('group_esg_manager', 'esg_manager');",
            "UPDATE user_role_assignments SET role = 'subsidiary_admin' WHERE role = 'subsidiary_esg_manager';",
            "UPDATE user_role_assignments SET role = 'bu_admin' WHERE role IN ('bu_reviewer', 'bu_esg_manager');",
            "UPDATE user_role_assignments SET role = 'project_admin' WHERE role IN ('maker', 'project_data_entry_user', 'checker', 'site_collector');",
            "UPDATE user_role_assignments SET role = 'project_admin', is_active = false WHERE role IN ('auditor', 'read_only_viewer', 'viewer');"
        ]
        for q in queries2:
            cur.execute(q)
    except Exception as e:
        conn.rollback()
        pass
        
    conn.commit()
    print("Roles fixed.")

if __name__ == '__main__':
    fix_roles()
