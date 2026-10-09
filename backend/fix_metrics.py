import psycopg2

def fix_metrics():
    conn = psycopg2.connect('postgresql://postgres:SKIT025@localhost:5432/brsr_db')
    cur = conn.cursor()
    try:
        cur.execute("UPDATE metrics SET owner_role = 'project_admin' WHERE owner_role IN ('site_collector', 'maker', 'checker');")
        conn.commit()
        print('Metrics fixed.')
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    fix_metrics()
