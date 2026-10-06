import sqlite3
import re

UUID_PATTERN = re.compile(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')

conn = sqlite3.connect('brsr_portal.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]

total_normalized = 0
for t in tables:
    cursor.execute(f"PRAGMA table_info({t})")
    cols = [r[1] for r in cursor.fetchall() if r[1].lower().endswith('_id') or r[1].lower() == 'id']
    for col in cols:
        cursor.execute(f"SELECT DISTINCT {col} FROM {t} WHERE {col} IS NOT NULL")
        for val, in cursor.fetchall():
            if isinstance(val, str) and UUID_PATTERN.match(val):
                clean_val = val.replace('-', '')
                cursor.execute(f"UPDATE {t} SET {col} = ? WHERE {col} = ?", (clean_val, val))
                total_normalized += cursor.rowcount

conn.commit()
conn.close()
print(f"Total UUID values normalized to 32-hex: {total_normalized}")
