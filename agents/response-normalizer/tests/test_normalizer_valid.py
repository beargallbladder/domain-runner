import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.normalizer import ResponseNormalizer

def test_valid_json_parsed():
    rn = ResponseNormalizer()
    row = {"id":"1","domain":"ex.com","prompt_id":"P1","model":"gpt","ts_iso":"2025-01-01T00:00:00Z","raw":'{"answer":"42","confidence":0.9,"citations":["a","a","b"]}'}
    out = rn.normalize(row)
    assert out["answer"]=="42"
    assert out["confidence"]==0.9
    assert out["citations"]==["a","b"]
    assert out["normalized_status"]=="valid"