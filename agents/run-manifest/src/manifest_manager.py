import uuid
import datetime
from typing import Dict, Any, List, Tuple, Optional
from enum import Enum

class ObservationStatus(Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"

class TierLevel(Enum):
    INVALID = "invalid"
    DEGRADED = "degraded"
    HEALTHY = "healthy"

class ManifestStatus(Enum):
    OPEN = "open"
    CLOSING = "closing"
    CLOSED = "closed"

class RunManifestManager:
    """
    Manages run manifests with coverage tracking and tiered degradation.
    Replaces brittle all-or-nothing execution with fault-tolerant checkpoints.
    """

    def __init__(self, min_floor: float = 0.70, target_coverage: float = 0.95, max_retries: int = 3):
        """
        Initialize manifest manager with coverage thresholds.

        Args:
            min_floor: Minimum coverage to allow computation (default 0.70)
            target_coverage: Coverage target for healthy tier (default 0.95)
            max_retries: Maximum retry attempts per observation (default 3)
        """
        if not (0 <= min_floor <= 1):
            raise ValueError("min_floor must be between 0 and 1")
        if not (0 <= target_coverage <= 1):
            raise ValueError("target_coverage must be between 0 and 1")
        if min_floor > target_coverage:
            raise ValueError("min_floor must be less than or equal to target_coverage")

        self.min_floor = min_floor
        self.target_coverage = target_coverage
        self.max_retries = max_retries
        self.manifests = {}  # run_id -> manifest
        self.observations = {}  # (run_id, domain, prompt_id, model) -> observation
        self.events = []  # Event queue

    def create_manifest(self,
                       window_start: datetime.datetime,
                       window_end: datetime.datetime,
                       expected_combos: List[Tuple[str, str, str]]) -> Dict[str, Any]:
        """
        Create a new run manifest with expected combinations.

        Args:
            window_start: Start of time window
            window_end: End of time window
            expected_combos: List of (domain, prompt_id, model) tuples

        Returns:
            Run manifest dictionary
        """
        run_id = str(uuid.uuid4())

        manifest = {
            "run_id": run_id,
            "window_start": window_start.isoformat() + "Z",
            "window_end": window_end.isoformat() + "Z",
            "target_combos": len(expected_combos),
            "min_floor": self.min_floor,
            "target_coverage": self.target_coverage,
            "observed_ok": 0,
            "observed_fail": 0,
            "coverage": 0.0,
            "tier": TierLevel.INVALID.value,
            "status": ManifestStatus.OPEN.value,
            "created_at": datetime.datetime.utcnow().isoformat() + "Z",
            "closed_at": None
        }

        self.manifests[run_id] = manifest

        # Initialize observation status for each expected combo
        for domain, prompt_id, model in expected_combos:
            obs_key = (run_id, domain, prompt_id, model)
            self.observations[obs_key] = {
                "run_id": run_id,
                "domain": domain,
                "prompt_id": prompt_id,
                "model": model,
                "status": ObservationStatus.QUEUED.value,
                "attempts": 0,
                "last_error": None,
                "latency_ms": None,
                "response_id": None
            }

        self._emit_event("manifest.opened", {"run_id": run_id, "target_combos": len(expected_combos)})
        return manifest

    def update_observation(self,
                          run_id: str,
                          domain: str,
                          prompt_id: str,
                          model: str,
                          status: str,
                          error: Optional[str] = None,
                          latency_ms: Optional[int] = None,
                          response_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Update observation status and recalculate coverage.

        Args:
            run_id: Run identifier
            domain: Domain being queried
            prompt_id: Prompt identifier
            model: Model name
            status: New status (running, success, failed)
            error: Error message if failed
            latency_ms: Response latency
            response_id: A1 response ID if successful

        Returns:
            Updated observation dictionary
        """
        obs_key = (run_id, domain, prompt_id, model)
        if obs_key not in self.observations:
            raise ValueError(f"Observation not found: {obs_key}")

        obs = self.observations[obs_key]
        old_status = obs["status"]

        # Update observation
        obs["status"] = status
        if status == ObservationStatus.RUNNING.value:
            obs["attempts"] += 1
        if error:
            obs["last_error"] = error
        if latency_ms is not None:
            obs["latency_ms"] = latency_ms
        if response_id:
            obs["response_id"] = response_id

        # Check retry limit
        if status == ObservationStatus.FAILED.value and obs["attempts"] >= self.max_retries:
            obs["status"] = ObservationStatus.FAILED.value  # Final failure

        # Update manifest coverage if status changed to terminal state
        if old_status != status and status in [ObservationStatus.SUCCESS.value, ObservationStatus.FAILED.value]:
            self._update_manifest_coverage(run_id)

        return obs

    def _update_manifest_coverage(self, run_id: str) -> None:
        """
        Recalculate coverage and tier for a manifest.
        """
        if run_id not in self.manifests:
            return

        manifest = self.manifests[run_id]

        # Count successes and failures
        observed_ok = 0
        observed_fail = 0

        for obs_key, obs in self.observations.items():
            if obs_key[0] == run_id:  # This observation belongs to this run
                if obs["status"] == ObservationStatus.SUCCESS.value:
                    observed_ok += 1
                elif obs["status"] == ObservationStatus.FAILED.value:
                    observed_fail += 1

        # Update counts and coverage
        manifest["observed_ok"] = observed_ok
        manifest["observed_fail"] = observed_fail

        if manifest["target_combos"] > 0:
            manifest["coverage"] = observed_ok / manifest["target_combos"]
        else:
            manifest["coverage"] = 0.0

        # Determine tier
        coverage = manifest["coverage"]
        if coverage < self.min_floor:
            manifest["tier"] = TierLevel.INVALID.value
        elif coverage >= self.target_coverage:
            manifest["tier"] = TierLevel.HEALTHY.value
        else:
            manifest["tier"] = TierLevel.DEGRADED.value

    def close_manifest(self, run_id: str) -> Dict[str, Any]:
        """
        Close a manifest and emit appropriate events.

        Args:
            run_id: Run identifier

        Returns:
            Final manifest state
        """
        if run_id not in self.manifests:
            raise ValueError(f"Manifest not found: {run_id}")

        manifest = self.manifests[run_id]

        # Final coverage calculation
        self._update_manifest_coverage(run_id)

        # Update status
        manifest["status"] = ManifestStatus.CLOSED.value
        manifest["closed_at"] = datetime.datetime.utcnow().isoformat() + "Z"

        # Emit events based on tier
        tier = TierLevel(manifest["tier"])
        coverage = manifest["coverage"]
        observed_ok = manifest["observed_ok"]
        observed_fail = manifest["observed_fail"]

        # Collect failed observations for potential gap-fill
        failed_observations = []
        for obs_key, obs in self.observations.items():
            if obs_key[0] == run_id and obs["status"] == ObservationStatus.FAILED.value:
                failed_observations.append({
                    "domain": obs["domain"],
                    "prompt_id": obs["prompt_id"],
                    "model": obs["model"],
                    "error": obs.get("last_error", "Unknown error")
                })

        if tier == TierLevel.INVALID:
            # Below floor - skip MII calculation
            self._emit_event("mii.skipped", {
                "run_id": run_id,
                "coverage": coverage,
                "message": f"Coverage {coverage:.1%} below floor {self.min_floor:.1%}"
            })
            # Do NOT emit gap-fill for invalid tier (below floor = unusable)
        else:
            # Emit tensor.ready for valid data
            self._emit_event("tensor.ready", {
                "run_id": run_id,
                "tier": tier.value,
                "coverage": coverage,
                "observed_ok": observed_ok,
                "observed_fail": observed_fail,
                "window_start": manifest["window_start"],
                "window_end": manifest["window_end"]
            })

            # Emit gap-fill ONLY for degraded tier (not healthy, not invalid)
            if tier == TierLevel.DEGRADED and failed_observations:
                self._emit_event("gapfill.ready", {
                    "run_id": run_id,
                    "failed_observations": failed_observations,
                    "coverage": coverage,
                    "tier": tier.value
                })

        self._emit_event("manifest.closed", {
            "run_id": run_id,
            "tier": manifest["tier"],
            "coverage": manifest["coverage"],
            "observed_ok": manifest["observed_ok"],
            "observed_fail": manifest["observed_fail"]
        })

        return manifest

    def _get_missing_combos(self, run_id: str) -> List[Tuple[str, str, str]]:
        """
        Get list of failed or queued combinations for gap-fill.
        """
        missing = []
        for obs_key, obs in self.observations.items():
            if obs_key[0] == run_id:
                if obs["status"] in [ObservationStatus.FAILED.value, ObservationStatus.QUEUED.value]:
                    missing.append((obs["domain"], obs["prompt_id"], obs["model"]))
        return missing

    def _emit_event(self, event_type: str, payload: Dict[str, Any]) -> None:
        """
        Emit an event for downstream consumption.
        """
        event = {
            "type": event_type,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "payload": payload
        }
        self.events.append(event)

    def get_events(self) -> List[Dict[str, Any]]:
        """
        Retrieve and clear event queue.
        """
        events = self.events.copy()
        self.events.clear()
        return events

    def get_manifest(self, run_id: str) -> Optional[Dict[str, Any]]:
        """
        Get manifest by run ID.
        """
        return self.manifests.get(run_id)

    def get_observation(self, run_id: str, domain: str, prompt_id: str, model: str) -> Optional[Dict[str, Any]]:
        """
        Get observation status.
        """
        return self.observations.get((run_id, domain, prompt_id, model))

    def checkpoint(self, run_id: str) -> Dict[str, Any]:
        """
        Create a checkpoint of current state for recovery.
        """
        return {
            "manifest": self.manifests.get(run_id),
            "observations": {
                f"{k[1]}|{k[2]}|{k[3]}": v
                for k, v in self.observations.items()
                if k[0] == run_id
            },
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        }

    def restore_checkpoint(self, checkpoint: Dict[str, Any]) -> None:
        """
        Restore from a checkpoint.
        """
        manifest = checkpoint["manifest"]
        run_id = manifest["run_id"]

        self.manifests[run_id] = manifest

        for key_str, obs in checkpoint["observations"].items():
            domain, prompt_id, model = key_str.split("|")
            obs_key = (run_id, domain, prompt_id, model)
            self.observations[obs_key] = obs