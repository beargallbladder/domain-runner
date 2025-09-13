import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.catalog import PromptCatalog

def test_add_prompt():
    pc = PromptCatalog()
    p = {
        "prompt_id": "P1",
        "text": "What does {domain} do?",
        "task": "brand",
        "version": "1.0.0",
        "safety_tags": ["PII-safe"],
        "created_by": "test"
    }
    result = pc.add_prompt(p)
    assert result["prompt_id"] == "P1"
    assert pc.get_prompt("P1")["version"] == "1.0.0"

def test_missing_tags_rejected():
    pc = PromptCatalog()
    with pytest.raises(ValueError):
        pc.add_prompt({
            "prompt_id": "P2",
            "text": "Invalid",
            "task": "brand",
            "version": "1.0.0",
            "safety_tags": [],
            "created_by": "test"
        })