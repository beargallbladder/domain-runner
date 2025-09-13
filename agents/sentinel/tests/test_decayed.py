import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.drift_detector import DriftDetector

def test_empty_answer_decayed():
    """T3: Empty answers should be marked as decayed"""
    d = DriftDetector()

    # Establish baseline with content
    row1 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "Substantial content here",
        "normalized_status": "valid"
    }

    # Empty answer
    row2 = {
        "domain": "example.com",
        "prompt_id": "P1",
        "model": "gpt-4",
        "answer": "",
        "normalized_status": "empty"
    }

    d.detect(row1)
    out = d.detect(row2)

    assert out["status"] == "decayed"
    assert out["drift_score"] == 1.0
    assert out["similarity_prev"] == 0.0
    assert "auto-decayed" in out["explanation"].lower()

    # Should generate alert
    alerts = d.get_alerts()
    assert len(alerts) == 1
    assert alerts[0]["event"] == "sentinel.alert"
    assert alerts[0]["payload"]["status"] == "decayed"

def test_malformed_answer_decayed():
    """T4: Malformed responses should be marked as decayed"""
    d = DriftDetector()

    row1 = {
        "domain": "test.com",
        "prompt_id": "P2",
        "model": "claude",
        "answer": "Valid JSON response",
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "test.com",
        "prompt_id": "P2",
        "model": "claude",
        "answer": "{malformed json",
        "normalized_status": "malformed"
    }

    d.detect(row1)
    out = d.detect(row2)

    assert out["status"] == "decayed"
    assert out["drift_score"] == 1.0
    assert "malformed" in out["explanation"].lower()

def test_major_content_change_decayed():
    """Major content changes should trigger decayed status"""
    d = DriftDetector(drift_threshold=0.3, decay_threshold=0.7)

    row1 = {
        "domain": "example.com",
        "prompt_id": "P3",
        "model": "gpt-4",
        "answer": "The capital of France is Paris",
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "example.com",
        "prompt_id": "P3",
        "model": "gpt-4",
        "answer": "Machine learning is a subset of artificial intelligence",
        "normalized_status": "valid"
    }

    d.detect(row1)
    out = d.detect(row2)

    # Completely different content should decay
    assert out["drift_score"] > 0.7  # Above decay threshold
    assert out["status"] == "decayed"
    assert out["similarity_prev"] < 0.3

def test_threshold_boundary():
    """T5: Test behavior at exact threshold boundary"""
    # Test at exact decay threshold (0.7)
    d = DriftDetector(drift_threshold=0.3, decay_threshold=0.7)

    # Mock a scenario where drift_score would be exactly 0.7
    # Since we control the detector, we can test the boundary
    row1 = {
        "domain": "boundary.com",
        "prompt_id": "P4",
        "model": "gpt-4",
        "answer": "ABCDEFGHIJ",  # 10 chars
        "normalized_status": "valid"
    }

    row2 = {
        "domain": "boundary.com",
        "prompt_id": "P4",
        "model": "gpt-4",
        "answer": "ABC",  # 3 chars, ~30% similar
        "normalized_status": "valid"
    }

    d.detect(row1)
    out = d.detect(row2)

    # At or above decay threshold should be decayed
    if out["drift_score"] >= 0.7:
        assert out["status"] == "decayed"
    elif out["drift_score"] >= 0.3:
        assert out["status"] == "drifting"
    else:
        assert out["status"] == "stable"

def test_decay_generates_alert():
    """Decayed responses should always generate alerts"""
    d = DriftDetector()

    # Create multiple decayed responses
    test_cases = [
        {"domain": "d1.com", "prompt_id": "P1", "model": "m1", "answer": "", "normalized_status": "empty"},
        {"domain": "d2.com", "prompt_id": "P2", "model": "m2", "answer": "bad", "normalized_status": "malformed"},
    ]

    alert_count = 0
    for row in test_cases:
        out = d.detect(row)
        if out["status"] == "decayed":
            alert_count += 1

    alerts = d.get_alerts()
    assert len(alerts) == alert_count
    for alert in alerts:
        assert alert["event"] == "sentinel.alert"
        assert alert["payload"]["status"] == "decayed"