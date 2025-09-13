import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.runner import LLMQueryRunner
from src.mock_clients import MockTimeout, MockMalformed

def test_timeouts_retried_and_marked_failed(monkeypatch):
    # make sleep a no-op to speed tests
    runner = LLMQueryRunner({"gpt-4o": MockTimeout(n=3)}, sleep_fn=lambda s: None)
    rows, errs = runner.run_batch(["ex.com"], [{"prompt_id":"P1","text":"Q {domain}"}], ["gpt-4o"])
    assert rows[0]["status"] in ("timeout","failed")
    assert rows[0]["attempt"] <= 3
    assert errs  # captured error(s)

def test_malformed_stored_flagged():
    runner = LLMQueryRunner({"claude-3.5": MockMalformed()})
    rows, errs = runner.run_batch(["ex.com"], [{"prompt_id":"P1","text":"Q {domain}"}], ["claude-3.5"])
    assert rows[0]["status"] == "failed"
    assert rows[0]["raw"] == ""