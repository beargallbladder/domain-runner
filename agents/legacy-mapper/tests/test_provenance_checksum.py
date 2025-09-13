import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.mapper import LegacyMapper
from src.checksum import compute_checksum, verify_checksum, detect_change

def test_checksum_consistency():
    """T5: Checksums are consistent for same data"""
    data = {
        'id': 1,
        'timestamp': '2024-01-01T12:00:00Z',
        'model': 'gpt-4o',
        'response': 'Test response'
    }

    # Multiple computations should yield same checksum
    checksum1 = compute_checksum(data)
    checksum2 = compute_checksum(data)
    checksum3 = compute_checksum(data)

    assert checksum1 == checksum2 == checksum3
    assert len(checksum1) == 64  # SHA256 hex string

def test_checksum_detects_changes():
    """Checksums detect data changes"""
    original = {
        'id': 1,
        'timestamp': '2024-01-01T12:00:00Z',
        'response': 'Original'
    }

    modified = {
        'id': 1,
        'timestamp': '2024-01-01T12:00:00Z',
        'response': 'Modified'  # Changed
    }

    checksum_orig = compute_checksum(original)
    checksum_mod = compute_checksum(modified)

    # Should be different
    assert checksum_orig != checksum_mod
    assert detect_change(original, modified) is True

def test_provenance_tracking():
    """Provenance records include checksums"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    legacy_row = {
        'id': 'legacy-123',
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'Test',
        'raw_response': 'Response'
    }

    _, _, provenance = mapper._map_legacy_row(legacy_row)

    # Provenance should include checksum
    assert 'checksum' in provenance
    assert len(provenance['checksum']) == 64

    # Verify checksum matches
    expected_checksum = compute_checksum(legacy_row)
    assert provenance['checksum'] == expected_checksum

def test_quarantine_on_invalid_data():
    """Invalid data is quarantined with reason"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Row exceeding size limit (if configured)
    huge_row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'Test',
        'raw_response': 'x' * 2_000_000  # 2MB response
    }

    raw, norm, prov = mapper._map_legacy_row(huge_row)

    # Should be quarantined
    assert raw is None
    assert norm is None
    assert prov['status'] == 'quarantined'
    assert 'exceeds max size' in prov['reason']
    assert prov['checksum'] == compute_checksum(huge_row)

def test_model_allowlist_mapping():
    """Unknown models are mapped to unknown-* variant"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Model not in allowlist
    row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'llama-70b',  # Not in config allowlist
        'domain': 'example.com',
        'prompt_text': 'Test',
        'raw_response': 'Response'
    }

    raw, _, prov = mapper._map_legacy_row(row)

    # Should map to unknown variant
    assert raw['model'] == 'unknown-llama-70b'
    assert prov['status'] == 'ok'