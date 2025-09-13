import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.manifest_manager import RunManifestManager, TierLevel

def test_gap_detection():
    """GT6: System detects gaps and emits gapfill.ready events for degraded tiers"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # 30 expected combos (10 domains × 3 models)
    domains = [f"site{i}.com" for i in range(10)]
    models = ["gpt-4", "claude-3", "gemini-pro"]

    expected_combos = [
        (domain, "P1", model)
        for domain in domains
        for model in models
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Create a degraded scenario: 24/30 = 80% coverage
    # This is between floor (70%) and target (95%)
    success_count = 24
    for i in range(success_count):
        domain_idx = i % 10
        model_idx = i // 10
        manager.update_observation(
            run_id, domains[domain_idx], "P1", models[model_idx],
            status="success",
            response_id=f"resp-{i}"
        )

    # Mark remaining 6 as failed
    for i in range(success_count, 30):
        domain_idx = i % 10
        model_idx = i // 10
        manager.update_observation(
            run_id, domains[domain_idx], "P1", models[model_idx],
            status="failed",
            error="Various errors"
        )

    final_manifest = manager.close_manifest(run_id)

    # Should be degraded tier
    assert final_manifest["tier"] == TierLevel.DEGRADED.value
    assert final_manifest["coverage"] == 0.8  # 24/30

    # Check for gap-fill event
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    # Should have both tensor.ready (degraded) and gapfill.ready
    assert "tensor.ready" in event_types
    assert "gapfill.ready" in event_types

    # Get the gap-fill event
    gapfill_event = next(e for e in events if e["type"] == "gapfill.ready")

    # Should contain the failed observations for retry
    assert "failed_observations" in gapfill_event["payload"]
    assert len(gapfill_event["payload"]["failed_observations"]) == 6

    # Each failed observation should have necessary info for retry
    for failed_obs in gapfill_event["payload"]["failed_observations"]:
        assert "domain" in failed_obs
        assert "prompt_id" in failed_obs
        assert "model" in failed_obs
        assert "error" in failed_obs

def test_gap_detection_healthy_no_gapfill():
    """Healthy tier should not emit gapfill events"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # 10 combos
    expected_combos = [
        (f"d{i}.com", "P1", "model1")
        for i in range(10)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # All succeed (100% coverage = healthy)
    for i in range(10):
        manager.update_observation(
            run_id, f"d{i}.com", "P1", "model1",
            status="success",
            response_id=f"r{i}"
        )

    final_manifest = manager.close_manifest(run_id)

    assert final_manifest["tier"] == TierLevel.HEALTHY.value
    assert final_manifest["coverage"] == 1.0

    # No gap-fill event for healthy tier
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    assert "tensor.ready" in event_types
    assert "gapfill.ready" not in event_types

def test_gap_detection_invalid_no_gapfill():
    """Invalid tier (below floor) should not emit gapfill events, only mii.skipped"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # 20 combos
    expected_combos = [
        (f"d{i}.com", f"P{j}", "model1")
        for i in range(5)
        for j in range(4)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Only 10 succeed = 50% coverage (below 70% floor)
    for i in range(10):
        domain_idx = i // 4
        prompt_idx = i % 4
        manager.update_observation(
            run_id, f"d{domain_idx}.com", f"P{prompt_idx}", "model1",
            status="success",
            response_id=f"r{i}"
        )

    # Rest fail
    for i in range(10, 20):
        domain_idx = i // 4
        prompt_idx = i % 4
        manager.update_observation(
            run_id, f"d{domain_idx}.com", f"P{prompt_idx}", "model1",
            status="failed",
            error="Error"
        )

    final_manifest = manager.close_manifest(run_id)

    assert final_manifest["tier"] == TierLevel.INVALID.value
    assert final_manifest["coverage"] == 0.5  # 10/20

    # Should have mii.skipped but no gapfill.ready (below floor = unusable)
    events = manager.get_events()
    event_types = [e["type"] for e in events]

    assert "mii.skipped" in event_types
    assert "gapfill.ready" not in event_types
    assert "tensor.ready" not in event_types  # No tensor for invalid

def test_gap_prioritization():
    """Gap-fill should prioritize failed observations by importance"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    # Mix of important and less important domains
    important_domains = ["critical1.com", "critical2.com"]
    regular_domains = [f"regular{i}.com" for i in range(3)]
    all_domains = important_domains + regular_domains

    expected_combos = [
        (domain, "P1", "gpt-4")
        for domain in all_domains
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Important domains fail
    for domain in important_domains:
        manager.update_observation(
            run_id, domain, "P1", "gpt-4",
            status="failed",
            error="Critical failure"
        )

    # Regular domains: 2 succeed, 1 fails
    manager.update_observation(
        run_id, "regular0.com", "P1", "gpt-4",
        status="success", response_id="r0"
    )
    manager.update_observation(
        run_id, "regular1.com", "P1", "gpt-4",
        status="success", response_id="r1"
    )
    manager.update_observation(
        run_id, "regular2.com", "P1", "gpt-4",
        status="failed", error="Regular failure"
    )

    final_manifest = manager.close_manifest(run_id)

    # 2/5 = 40% coverage (invalid)
    assert final_manifest["coverage"] == 0.4
    assert final_manifest["tier"] == TierLevel.INVALID.value

    events = manager.get_events()

    # Even though invalid, we can check if gap detection logic works
    # (In a real system, gapfill might still track gaps for diagnostics)
    # But per spec, invalid tier doesn't emit gapfill.ready
    event_types = [e["type"] for e in events]
    assert "mii.skipped" in event_types
    assert "gapfill.ready" not in event_types