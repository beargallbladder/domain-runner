import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.manifest_manager import RunManifestManager, TierLevel

def test_healthy_tier():
    """GT3: Coverage at or above target results in healthy tier"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # 20 expected combos
    expected_combos = [
        (f"domain{i}.com", f"P{j}", "gpt-4o")
        for i in range(4)
        for j in range(5)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # 19 successes = 95% coverage (at target)
    for i in range(19):
        domain_idx = i // 5
        prompt_idx = i % 5
        manager.update_observation(
            run_id, f"domain{domain_idx}.com", f"P{prompt_idx}", "gpt-4o",
            status="success",
            response_id=f"resp-{i}",
            latency_ms=250
        )

    # 1 failure
    manager.update_observation(
        run_id, "domain3.com", "P4", "gpt-4o",
        status="failed",
        error="Network error"
    )

    final_manifest = manager.close_manifest(run_id)

    # Verify healthy tier
    assert final_manifest["tier"] == TierLevel.HEALTHY.value
    assert final_manifest["coverage"] == 0.95  # 19/20
    assert final_manifest["observed_ok"] == 19
    assert final_manifest["observed_fail"] == 1

    # Check events
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    # Should have tensor.ready with healthy tier
    assert "tensor.ready" in event_types
    assert "mii.skipped" not in event_types
    assert "gapfill.ready" not in event_types  # No gap-fill for healthy

    tensor_event = next(e for e in events if e["type"] == "tensor.ready")
    assert tensor_event["payload"]["tier"] == TierLevel.HEALTHY.value

def test_perfect_coverage():
    """Test 100% coverage scenario"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    expected_combos = [
        ("example.com", f"P{i}", "claude-3.5")
        for i in range(10)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # All succeed
    for i in range(10):
        manager.update_observation(
            run_id, "example.com", f"P{i}", "claude-3.5",
            status="success",
            response_id=f"response-{i}",
            latency_ms=300 + i * 5
        )

    final_manifest = manager.close_manifest(run_id)

    # Perfect coverage
    assert final_manifest["tier"] == TierLevel.HEALTHY.value
    assert final_manifest["coverage"] == 1.0
    assert final_manifest["observed_ok"] == 10
    assert final_manifest["observed_fail"] == 0

    events = manager.get_events()
    event_types = [e["type"] for e in events]

    # No failures, no gap-fill needed
    assert "tensor.ready" in event_types
    assert "gapfill.ready" not in event_types
    assert "mii.skipped" not in event_types

def test_above_target_coverage():
    """Test coverage above target threshold"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # 50 combos
    expected_combos = [
        (f"site{i}.com", f"P{j}", "model1")
        for i in range(10)
        for j in range(5)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # 48 successes = 96% coverage (above 95% target)
    for i in range(48):
        domain_idx = i // 5
        prompt_idx = i % 5
        manager.update_observation(
            run_id, f"site{domain_idx}.com", f"P{prompt_idx}", "model1",
            status="success",
            response_id=f"r-{i}"
        )

    # 2 failures
    manager.update_observation(run_id, "site9.com", "P3", "model1", status="failed")
    manager.update_observation(run_id, "site9.com", "P4", "model1", status="failed")

    final_manifest = manager.close_manifest(run_id)

    assert final_manifest["tier"] == TierLevel.HEALTHY.value
    assert final_manifest["coverage"] == 0.96  # 48/50