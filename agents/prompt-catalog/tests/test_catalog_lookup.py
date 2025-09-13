import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.catalog import PromptCatalog

def test_lookup_returns_latest():
    pc = PromptCatalog()
    p = {
        "prompt_id": "P1",
        "text": "v1",
        "task": "brand",
        "version": "1.0.0",
        "safety_tags": ["safe"],
        "created_by": "test"
    }
    pc.add_prompt(p)
    pc.update_prompt("P1", "v2")
    latest = pc.get_prompt("P1")
    assert latest["text"] == "v2"
    history = pc.get_history("P1")
    assert len(history) == 2