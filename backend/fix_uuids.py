import sqlite3
import uuid

conn = sqlite3.connect('brsr_portal.db')
cursor = conn.cursor()

# 1. Update submissions maker_id from 'site-user-1' to the valid collector user ID
collector_id = '0ab115b7-def3-4802-a84d-a891ba904d87'
cursor.execute("UPDATE submissions SET maker_id = ? WHERE maker_id = 'site-user-1'", (collector_id,))
print("Updated submissions maker_id:", cursor.rowcount)

# Check all tables and report invalid UUIDs in ID columns
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]

for t in tables:
    cursor.execute(f"PRAGMA table_info({t})")
    cols = [r[1] for r in cursor.fetchall() if r[1].lower().endswith('_id') or r[1].lower() == 'id']
    for col in cols:
        try:
            cursor.execute(f"SELECT DISTINCT {col} FROM {t} WHERE {col} IS NOT NULL")
            for val, in cursor.fetchall():
                if isinstance(val, str) and val:
                    try:
                        uuid.UUID(val)
                    except ValueError:
                        print(f"Invalid UUID in {t}.{col}: {val!r}")
        except Exception:
            pass

conn.commit()
conn.close()
print("Done fixing and scanning UUIDs.")
