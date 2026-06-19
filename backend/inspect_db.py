import sqlite3, json
from pathlib import Path

path = Path('educampus.db')
conn = sqlite3.connect(path)
cur = conn.cursor()

queries = [
    "SELECT name FROM sqlite_master WHERE type='table'",
    "SELECT id, name FROM subjects",
    "SELECT id, subject_id, name FROM evaluation_types",
    "SELECT id, evaluation_type_id, student_id, grade, feedback, is_published FROM evaluations",
    "SELECT student_id, subject_id FROM subject_enrollments",
]

for q in queries:
    print(f"\nQUERY: {q}")
    rows = cur.execute(q).fetchall()
    print(json.dumps(rows, indent=2, default=str))

conn.close()
