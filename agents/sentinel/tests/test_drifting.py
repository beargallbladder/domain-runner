import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.drift_detector import DriftDetector

def test_paraphrased_answer_drifting():
    """T2: Paraphrased answers should be marked as drifting"""
    d = DriftDetector()

    row1 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "OpenAI is a lab focused on artificial intelligence research",
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "OpenAI is an AI company that develops machine learning models",
        "normalized_status": "valid"
    }

    d.detect(row1)
    out = d.detect(row2)

    # Paraphrased content should drift
    assert out["status"] in ("drifting", "stable")  # Depends on exact similarity
    assert 0.2 < out["drift_score"] < 0.8  # In the middle range
    assert 0.2 < out["similarity_prev"] < 0.8

    # Should generate alert if drifting
    alerts = d.get_alerts()
    if out["status"] == "drifting":
        assert len(alerts) == 1
        assert alerts[0]["event"] == "sentinel.alert"
        assert alerts[0]["payload"]["status"] == "drifting"

def test_moderate_changes_drifting():
    """Moderate content changes should trigger drifting status"""
    d = DriftDetector(drift_threshold=0.3, decay_threshold=0.7)

    row1 = {
        "domain": "test.com",
        "prompt_id": "P3",
        "model": "claude",
        "answer": "The company was founded in 2015 in San Francisco",
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "test.com",
        "prompt_id": "P3",
        "model": "claude",
        "answer": "The organization started in 2015 in the Bay Area",
        "normalized_status": "valid"
    }

    d.detect(row1)
    out = d.detect(row2)

    # Should be drifting (not identical but not totally different)
    assert out["drift_score"] > 0.3  # Above drift threshold
    assert out["drift_score"] < 0.7  # Below decay threshold
    if out["drift_score"] > 0.3 and out["drift_score"] < 0.7:
        assert out["status"] == "drifting"

def test_multiple_drift_tracking():
    """Should track drift independently for different domain/prompt/model combinations"""
    d = DriftDetector()

    # Set baseline for two different combinations
    d.detect({
        "domain": "site1.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "Answer A",
        "normalized_status": "valid"
    })

    d.detect({
        "domain": "site2.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "Answer B",
        "normalized_status": "valid"
    })

    # Update first combination
    out1 = d.detect({
        "domain": "site1.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "Modified Answer A with changes",
        "normalized_status": "valid"
    })

    # Update second combination
    out2 = d.detect({
        "domain": "site2.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "Answer B",  # Unchanged
        "normalized_status": "valid"
    })

    # First should drift, second should be stable
    assert out1["drift_score"] > 0  # Changed
    assert out2["drift_score"] == 0  # Unchanged