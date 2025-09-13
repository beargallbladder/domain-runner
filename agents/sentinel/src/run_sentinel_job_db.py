import uuid, json, datetime
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
from infra.db import get_conn, write_rows
from agents.sentinel.src.drift_detector import DriftDetector

def main():
    det = DriftDetector()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM responses_normalized ORDER BY ts_iso ASC LIMIT 1000;")
        norm = cur.fetchall()
    out=[]
    for r in norm:
        out.append(det.detect(r))
    cols = ["drift_id","domain","prompt_id","model","ts_iso","similarity_prev","drift_score","status","explanation"]
    write_rows("drift_scores", out, cols)
if __name__=="__main__":
    main()