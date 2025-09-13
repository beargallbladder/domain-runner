import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.manifest_manager import RunManifestManager, TierLevel

def test_floor_enforcement():
    """GT1: Coverage below floor results in invalid tier and no tensor update"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    # Create manifest with 10 expected combos
    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)
    expected_combos = [
        (f"domain{i}.com", "P1", "gpt-4") for i in range(10)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Simulate only 6 successes (60% coverage, below 70% floor)
    for i in range(6):
        manager.update_observation(
            run_id, f"domain{i}.com", "P1", "gpt-4",
            status="success",
            response_id=f"resp-{i}"
        )

    # Simulate 4 failures
    for i in range(6, 10):
        manager.update_observation(
            run_id, f"domain{i}.com", "P1", "gpt-4",
            status="failed",
            error="Timeout"
        )

    # Close manifest
    final_manifest = manager.close_manifest(run_id)

    # Verify tier is invalid
    assert final_manifest["tier"] == TierLevel.INVALID.value
    assert final_manifest["coverage"] == 0.6  # 6/10
    assert final_manifest["observed_ok"] == 6
    assert final_manifest["observed_fail"] == 4

    # Check events
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    # Should have mii.skipped but NOT gap-fill (invalid tier = unusable)
    assert "mii.skipped" in event_types
    assert "gapfill.ready" not in event_types  # No gap-fill for invalid tier
    assert "tensor.ready" not in event_types  # No tensor when invalid

    # Verify mii.skipped event has correct payload
    mii_event = next(e for e in events if e["type"] == "mii.skipped")
    assert mii_event["payload"]["coverage"] == 0.6
    assert "message" in mii_event["payload"]

def test_floor_boundary():
    """Test exact floor boundary (70% coverage)"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)
    expected_combos = [(f"d{i}.com", "P1", "m1") for i in range(10)]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Exactly 7 successes (70% coverage, at floor)
    for i in range(7):
        manager.update_observation(
            run_id, f"d{i}.com", "P1", "m1",
            status="success",
            response_id=f"r-{i}"
        )

    for i in range(7, 10):
        manager.update_observation(
            run_id, f"d{i}.com", "P1", "m1",
            status="failed"
        )

    final_manifest = manager.close_manifest(run_id)

    # At floor should be degraded, not invalid
    assert final_manifest["tier"] == TierLevel.DEGRADED.value
    assert final_manifest["coverage"] == 0.7

    events = manager.get_events()
    event_types = [e["type"] for e in events]
    assert "tensor.ready" in event_types  # Tensor runs at floor
    assert "mii.skipped" not in event_types