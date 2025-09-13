import uuid
import datetime
from typing import Dict, Any, Optional, List
from difflib import SequenceMatcher

class DriftDetector:
    """
    Detects memory drift and citation decay in LLM responses.
    Compares normalized answers across time to identify stability, drift, or decay.
    """

    def __init__(self, drift_threshold: float = 0.3, decay_threshold: float = 0.7):
        """
        Initialize drift detector with configurable thresholds.

        Args:
            drift_threshold: Similarity below which answer is considered drifting (default 0.3)
            decay_threshold: Similarity below which answer is considered decayed (default 0.7)
        """
        if not (0 <= drift_threshold <= 1):
            raise ValueError("drift_threshold must be between 0 and 1")
        if not (0 <= decay_threshold <= 1):
            raise ValueError("decay_threshold must be between 0 and 1")
        if drift_threshold >= decay_threshold:
            raise ValueError("drift_threshold must be less than decay_threshold")

        self.drift_threshold = drift_threshold
        self.decay_threshold = decay_threshold
        self.last_answers = {}  # {(domain, prompt_id, model): last_answer}
        self.alerts = []  # Store alerts for drifting/decayed responses

    def _similarity(self, a: str, b: str) -> float:
        """
        Calculate text similarity using SequenceMatcher.
        Returns 1.0 for identical strings, 0.0 for completely different.
        """
        if not a and not b:
            return 1.0
        if not a or not b:
            return 0.0
        return SequenceMatcher(None, a, b).ratio()

    def detect(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect drift in a normalized response by comparing to previous answer.

        Args:
            row: Normalized response with keys: domain, prompt_id, model, answer, normalized_status

        Returns:
            Drift score dictionary with status and metrics
        """
        # Extract key fields
        domain = row.get("domain", "")
        prompt_id = row.get("prompt_id", "")
        model = row.get("model", "")
        answer = row.get("answer", "").strip()
        normalized_status = row.get("normalized_status", "")

        # Create composite key for tracking
        key = (domain, prompt_id, model)

        # Get previous answer if exists
        prev_answer = self.last_answers.get(key, "")

        # Handle empty/malformed cases - auto decay
        if normalized_status in ("empty", "malformed"):
            similarity = 0.0
            drift_score = 1.0
            status = "decayed"
            explanation = f"Auto-decayed due to {normalized_status} status"
        else:
            # Calculate similarity with previous answer
            if prev_answer:
                similarity = self._similarity(answer, prev_answer)
                drift_score = 1 - similarity
            else:
                # First time seeing this combination - consider stable
                similarity = 1.0
                drift_score = 0.0

            # Determine status based on thresholds
            if drift_score < self.drift_threshold:
                status = "stable"
                explanation = "Answer remains consistent"
            elif drift_score < self.decay_threshold:
                status = "drifting"
                explanation = f"Answer differs from baseline: {prev_answer[:30]}..." if prev_answer else "Minor changes detected"
            else:
                status = "decayed"
                explanation = f"Significant divergence from: {prev_answer[:30]}..." if prev_answer else "Major changes detected"

        # Update last answer for future comparisons
        self.last_answers[key] = answer

        # Generate result
        result = {
            "drift_id": str(uuid.uuid4()),
            "domain": domain,
            "prompt_id": prompt_id,
            "model": model,
            "ts_iso": datetime.datetime.utcnow().isoformat() + "Z",
            "similarity_prev": round(similarity, 3),
            "drift_score": round(drift_score, 3),
            "status": status,
            "explanation": explanation
        }

        # Generate alert if drifting or decayed
        if status in ("drifting", "decayed"):
            self._emit_alert(result)

        return result

    def _emit_alert(self, drift_result: Dict[str, Any]) -> None:
        """
        Emit sentinel.alert event for drifting/decayed responses.
        """
        alert = {
            "event": "sentinel.alert",
            "timestamp": drift_result["ts_iso"],
            "payload": {
                "domain": drift_result["domain"],
                "prompt_id": drift_result["prompt_id"],
                "model": drift_result["model"],
                "drift_score": drift_result["drift_score"],
                "status": drift_result["status"],
                "ts_iso": drift_result["ts_iso"]
            }
        }
        self.alerts.append(alert)

    def get_alerts(self) -> List[Dict[str, Any]]:
        """
        Retrieve all alerts generated since last check.
        """
        alerts = self.alerts.copy()
        self.alerts.clear()
        return alerts

    def reset(self) -> None:
        """
        Reset detector state (clear history and alerts).
        """
        self.last_answers.clear()
        self.alerts.clear()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about tracked answers and alerts.
        """
        return {
            "tracked_combinations": len(self.last_answers),
            "pending_alerts": len(self.alerts),
            "drift_threshold": self.drift_threshold,
            "decay_threshold": self.decay_threshold
        }