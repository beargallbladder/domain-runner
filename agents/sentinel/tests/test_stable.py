import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.drift_detector import DriftDetector

def test_identical_answers_stable():
    """T1: Identical answers should be marked as stable"""
    d = DriftDetector()

    # First answer establishes baseline
    row1 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "OpenAI is an AI research company",
        "normalized_status": "valid"
    }

    # Second identical answer
    row2 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "OpenAI is an AI research company",
        "normalized_status": "valid"
    }

    out1 = d.detect(row1)
    out2 = d.detect(row2)

    # First response should be stable (no previous to compare)
    assert out1["status"] == "stable"
    assert out1["drift_score"] == 0.0
    assert out1["similarity_prev"] == 1.0

    # Second response should be stable (identical to first)
    assert out2["status"] == "stable"
    assert out2["drift_score"] == 0.0
    assert out2["similarity_prev"] == 1.0

    # No alerts for stable responses
    assert len(d.get_alerts()) == 0

def test_first_response_stable():
    """First response for a new combination should be stable"""
    d = DriftDetector()

    row = {
        "domain": "test.com",
        "prompt_id": "P2",
        "model": "claude-3",
        "answer": "First response",
        "normalized_status": "valid"
    }

    out = d.detect(row)

    assert out["status"] == "stable"
    assert out["drift_score"] == 0.0
    assert out["similarity_prev"] == 1.0
    assert "consistent" in out["explanation"].lower()

def test_minor_variations_stable():
    """Minor punctuation/whitespace changes should remain stable"""
    d = DriftDetector()

    row1 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "The answer is 42.",
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "The answer is 42",  # Missing period
        "normalized_status": "valid"
    }

    d.detect(row1)
    out = d.detect(row2)

    # Very similar answers should be stable
    assert out["status"] == "stable"
    assert out["drift_score"] < 0.3  # Below drift threshold
    assert out["similarity_prev"] > 0.7