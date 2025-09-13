import hashlib
import json
from typing import Any, Dict

def compute_checksum(data: Dict[str, Any]) -> str:
    """
    Compute SHA256 checksum of a dictionary for provenance tracking.
    Ensures deterministic ordering for consistent checksums.
    """
    # Sort keys for deterministic JSON serialization
    canonical = json.dumps(data, sort_keys=True, ensure_ascii=True)
    return hashlib.sha256(canonical.encode()).hexdigest()

def verify_checksum(data: Dict[str, Any], expected_checksum: str) -> bool:
    """
    Verify if data matches expected checksum.
    Returns True if match, False if mismatch.
    """
    actual = compute_checksum(data)
    return actual == expected_checksum

def detect_change(old_data: Dict[str, Any], new_data: Dict[str, Any]) -> bool:
    """
    Detect if data has changed based on checksum comparison.
    Returns True if changed, False if identical.
    """
    return compute_checksum(old_data) != compute_checksum(new_data)