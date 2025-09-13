import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.normalizer import ResponseNormalizer

def test_empty_answer_flagged():
    rn = ResponseNormalizer()
    row = {"id":"1","domain":"ex.com","prompt_id":"P1","model":"gpt","ts_iso":"2025-01-01T00:00:00Z","raw":"   "}
    out = rn.normalize(row)
    assert out["answer"]==""
    assert out["normalized_status"]=="empty"