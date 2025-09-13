import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.runner import LLMQueryRunner
from src.mock_clients import MockOK

def test_basic_two_models_and_idempotency(monkeypatch):
    # freeze time to lock the minute bucket
    import time
    original_gmtime = time.gmtime
    def mock_gmtime(secs=None):
        return original_gmtime(0)  # 1970-01-01 00:00
    monkeypatch.setattr(time, "gmtime", mock_gmtime)

    runner = LLMQueryRunner({"gpt-4o": MockOK(), "claude-3.5": MockOK()})
    domains = ["example.com"]
    prompts = [{"prompt_id":"P1","text":"What is {domain}?"}]
    models = ["gpt-4o","claude-3.5"]

    rows1, _ = runner.run_batch(domains, prompts, models)
    rows2, _ = runner.run_batch(domains, prompts, models)

    assert len(rows1) == 2 and len(rows2) == 2
    ids1 = {r["id"] for r in rows1}
    ids2 = {r["id"] for r in rows2}
    assert ids1 == ids2
    assert all(r["status"] == "success" and r["raw"] for r in rows1)