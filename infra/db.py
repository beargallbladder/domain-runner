import os, psycopg2
from psycopg2.extras import execute_batch, RealDictCursor

def get_conn():
    url = os.environ["DATABASE_URL"]
    return psycopg2.connect(url, cursor_factory=RealDictCursor)

def write_rows(table, rows, cols):
    if not rows: return 0
    sql = f"INSERT INTO {table} ({','.join(cols)}) VALUES ({','.join(['%s']*len(cols))}) ON CONFLICT DO NOTHING"
    with get_conn() as conn, conn.cursor() as cur:
        execute_batch(cur, sql, [[r[c] for c in cols] for r in rows], page_size=1000)
    return len(rows)