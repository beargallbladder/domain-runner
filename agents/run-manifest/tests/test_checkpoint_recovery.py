import sys
import os
import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.manifest_manager import RunManifestManager

def test_checkpoint_and_restore():
    """GT5: Checkpoint and restore manifest state"""
    manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    expected_combos = [
        (f"domain{i}.com", "P1", "gpt-4")
        for i in range(10)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Process first 5 observations
    for i in range(5):
        manager.update_observation(
            run_id, f"domain{i}.com", "P1", "gpt-4",
            status="success",
            response_id=f"resp-{i}"
        )

    # Create checkpoint
    checkpoint = manager.checkpoint(run_id)

    # Verify checkpoint structure
    assert "manifest" in checkpoint
    assert "observations" in checkpoint
    assert "timestamp" in checkpoint
    assert checkpoint["manifest"]["observed_ok"] == 5
    assert len(checkpoint["observations"]) == 10  # All 10 observations tracked

    # Simulate crash - create new manager
    new_manager = RunManifestManager(min_floor=0.70, target_coverage=0.95)

    # Restore from checkpoint
    new_manager.restore_checkpoint(checkpoint)

    # Verify restoration
    restored_manifest = new_manager.get_manifest(run_id)
    assert restored_manifest is not None
    assert restored_manifest["observed_ok"] == 5
    assert restored_manifest["run_id"] == run_id

    # Continue processing from checkpoint
    for i in range(5, 10):
        new_manager.update_observation(
            run_id, f"domain{i}.com", "P1", "gpt-4",
            status="success",
            response_id=f"resp-{i}"
        )

    # Close and verify
    final_manifest = new_manager.close_manifest(run_id)
    assert final_manifest["observed_ok"] == 10
    assert final_manifest["coverage"] == 1.0

def test_no_duplicate_work_after_restore():
    """Ensure no duplicate processing after checkpoint restore"""
    manager = RunManifestManager()

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    expected_combos = [
        ("example.com", f"P{i}", "model1")
        for i in range(5)
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Process some observations
    manager.update_observation(run_id, "example.com", "P0", "model1",
                              status="success", response_id="r0")
    manager.update_observation(run_id, "example.com", "P1", "model1",
                              status="success", response_id="r1")
    manager.update_observation(run_id, "example.com", "P2", "model1",
                              status="running")  # In progress

    # Checkpoint
    checkpoint = manager.checkpoint(run_id)

    # New manager instance
    new_manager = RunManifestManager()
    new_manager.restore_checkpoint(checkpoint)

    # Check observation states
    obs0 = new_manager.get_observation(run_id, "example.com", "P0", "model1")
    obs1 = new_manager.get_observation(run_id, "example.com", "P1", "model1")
    obs2 = new_manager.get_observation(run_id, "example.com", "P2", "model1")

    assert obs0["status"] == "success"
    assert obs0["response_id"] == "r0"
    assert obs1["status"] == "success"
    assert obs1["response_id"] == "r1"
    assert obs2["status"] == "running"  # Preserved in-progress state

    # Continue with P2 (which was running)
    new_manager.update_observation(run_id, "example.com", "P2", "model1",
                                  status="success", response_id="r2")

    # Process remaining
    new_manager.update_observation(run_id, "example.com", "P3", "model1",
                                  status="success", response_id="r3")
    new_manager.update_observation(run_id, "example.com", "P4", "model1",
                                  status="failed", error="Timeout")

    final_manifest = new_manager.close_manifest(run_id)
    assert final_manifest["observed_ok"] == 4
    assert final_manifest["observed_fail"] == 1
    assert final_manifest["coverage"] == 0.8  # 4/5

def test_checkpoint_with_mixed_states():
    """Test checkpoint with various observation states"""
    manager = RunManifestManager()

    window_start = datetime.datetime(2024, 1, 1, 0, 0, 0)
    window_end = datetime.datetime(2024, 1, 1, 1, 0, 0)

    expected_combos = [
        ("d1.com", "P1", "m1"),  # Will be success
        ("d2.com", "P1", "m1"),  # Will be failed
        ("d3.com", "P1", "m1"),  # Will be running
        ("d4.com", "P1", "m1"),  # Will remain queued
        ("d5.com", "P1", "m1"),  # Will be skipped
    ]

    manifest = manager.create_manifest(window_start, window_end, expected_combos)
    run_id = manifest["run_id"]

    # Set various states
    manager.update_observation(run_id, "d1.com", "P1", "m1",
                              status="success", response_id="r1")
    manager.update_observation(run_id, "d2.com", "P1", "m1",
                              status="failed", error="Error")
    manager.update_observation(run_id, "d3.com", "P1", "m1",
                              status="running")
    # d4 remains queued
    manager.update_observation(run_id, "d5.com", "P1", "m1",
                              status="skipped")

    # Checkpoint
    checkpoint = manager.checkpoint(run_id)

    # Restore to new manager
    new_manager = RunManifestManager()
    new_manager.restore_checkpoint(checkpoint)

    # Verify all states preserved
    assert new_manager.get_observation(run_id, "d1.com", "P1", "m1")["status"] == "success"
    assert new_manager.get_observation(run_id, "d2.com", "P1", "m1")["status"] == "failed"
    assert new_manager.get_observation(run_id, "d3.com", "P1", "m1")["status"] == "running"
    assert new_manager.get_observation(run_id, "d4.com", "P1", "m1")["status"] == "queued"
    assert new_manager.get_observation(run_id, "d5.com", "P1", "m1")["status"] == "skipped"