import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.manifest_manager import RunManifestManager, TierLevel

def test_degraded_tier():
    """GT2: Coverage between floor and target results in degraded tier"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)
    expected_combos = [
        (f"site{i}.com", f"P{j}", "claude-3")
        for i in range(5)
        for j in range(4)
    ]  # 20 total combos

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # 17 successes = 85% coverage (between 70% floor and 95% target)
    success_count = 17
    for i in range(success_count):
        domain_idx = i // 4
        prompt_idx = i % 4
        manager.update_observation(
            run_id, f"site{domain_idx}.com", f"P{prompt_idx}", "claude-3",
            status="success",
            response_id=f"response-{i}",
            latency_ms=500 + i * 10
        )

    # 3 failures
    for i in range(success_count, 20):
        domain_idx = i // 4
        prompt_idx = i % 4
        manager.update_observation(
            run_id, f"site{domain_idx}.com", f"P{prompt_idx}", "claude-3",
            status="failed",
            error="Rate limit exceeded"
        )

    final_manifest = manager.close_manifest(run_id)

    # Verify degraded tier
    assert final_manifest["tier"] == TierLevel.DEGRADED.value
    assert final_manifest["coverage"] == 0.85  # 17/20
    assert final_manifest["observed_ok"] == 17
    assert final_manifest["observed_fail"] == 3

    # Check events
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    # Should have tensor.ready but marked as degraded
    assert "tensor.ready" in event_types
    assert "mii.skipped" not in event_types

    tensor_event = next(e for e in events if e["type"] == "tensor.ready")
    assert tensor_event["payload"]["tier"] == TierLevel.DEGRADED.value
    assert tensor_event["payload"]["coverage"] == 0.85

def test_multiple_coverage_levels():
    """Test different coverage levels and their corresponding tiers"""
    test_cases = [
        (0.50, TierLevel.INVALID),   # 50% - below floor
        (0.69, TierLevel.INVALID),   # 69% - just below floor
        (0.70, TierLevel.DEGRADED),  # 70% - at floor
        (0.85, TierLevel.DEGRADED),  # 85% - between floor and target
        (0.94, TierLevel.DEGRADED),  # 94% - just below target
        (0.95, TierLevel.HEALTHY),   # 95% - at target
        (1.00, TierLevel.HEALTHY),   # 100% - above target
    ]

    for coverage_target, expected_tier in test_cases:
        manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

        window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
        window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

        # Use 100 combos for easy percentage calculation
        expected_combos = [(f"d{i}", "P1", "m1") for i in range(100)]
        manifest = manager.create_manifest(window_start, window_end, expected_combos)
        run_id = manifest["run_id"]

        # Create successes to match target coverage
        success_count = int(coverage_target * 100)
        for i in range(success_count):
            manager.update_observation(
                run_id, f"d{i}", "P1", "m1",
                status="success",
                response_id=f"r{i}"
            )

        # Rest are failures
        for i in range(success_count, 100):
            manager.update_observation(
                run_id, f"d{i}", "P1", "m1",
                status="failed"
            )

        final_manifest = manager.close_manifest(run_id)

        assert final_manifest["tier"] == expected_tier.value, \
            f"Coverage {coverage_target} should result in tier {expected_tier.value}, got {final_manifest['tier']}"
        assert abs(final_manifest["coverage"] - coverage_target) < 0.001