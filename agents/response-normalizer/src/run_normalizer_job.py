import json, sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from agents.response_normalizer.src.normalizer import ResponseNormalizer
from infra.db import get_conn, write_rows

def main():
    rn = ResponseNormalizer()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM responses_raw ORDER BY ts_iso DESC LIMIT 1000;")
        raw = cur.fetchall()
    out=[]
    for r in raw:
        o = rn.normalize(r)
        out.append(o)
    cols=["id","domain","prompt_id","model","ts_iso","answer","confidence","citations","normalized_status","raw_ref"]
    write_rows("responses_normalized", out, cols)
if __name__=="__main__":
    main()