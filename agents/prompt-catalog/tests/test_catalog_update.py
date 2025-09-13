import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.catalog import PromptCatalog

def test_update_prompt_creates_new_version():
    pc = PromptCatalog()
    p = {
        "prompt_id": "P1",
        "text": "original",
        "task": "brand",
        "version": "1.0.0",
        "safety_tags": ["safe"],
        "created_by": "test"
    }
    pc.add_prompt(p)
    updated = pc.update_prompt("P1", "changed")
    assert updated["version"].startswith("1.1.")
    assert pc.get_prompt("P1")["text"] == "changed"