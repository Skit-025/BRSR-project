import sqlite3
from app.db.base import Base
import app.db.registry

conn = sqlite3.connect('brsr_portal.db')
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]

added_count = 0
for table_name, table in Base.metadata.tables.items():
    if table_name in tables:
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_cols = {r[1].lower() for r in cursor.fetchall()}
        
        for col in table.columns:
            if col.name.lower() not in existing_cols:
                col_type = 'VARCHAR(255)'
                default_val = 'NULL'
                type_str = str(col.type).lower()
                
                if 'bool' in type_str:
                    col_type = 'BOOLEAN'
                    default_val = '0'
                elif 'int' in type_str:
                    col_type = 'INTEGER'
                    default_val = '0'
                elif 'float' in type_str or 'numeric' in type_str or 'real' in type_str:
                    col_type = 'REAL'
                    default_val = '0.0'
                elif 'json' in type_str:
                    col_type = 'TEXT'
                    default_val = "'{}'"
                elif 'date' in type_str or 'time' in type_str:
                    col_type = 'DATETIME'
                    default_val = 'NULL'
                
                stmt = f"ALTER TABLE {table_name} ADD COLUMN {col.name} {col_type} DEFAULT {default_val}"
                try:
                    cursor.execute(stmt)
                    print(f"Added {table_name}.{col.name}")
                    added_count += 1
                except Exception as e:
                    print(f"Error adding {table_name}.{col.name}: {e}")

conn.commit()
conn.close()
print(f"Total columns added: {added_count}")
