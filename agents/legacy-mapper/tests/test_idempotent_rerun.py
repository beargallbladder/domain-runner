import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.mapper import LegacyMapper

def test_idempotent_batch_processing():
    """T4: Running the same batch twice produces no duplicates"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Create test batch
    batch = [
        {
            'id': 1,
            'timestamp': '2024-01-01T10:00:00Z',
            'model_name': 'gpt-4o',
            'domain': 'site1.com',
            'prompt_text': 'Question 1',
            'raw_response': 'Answer 1'
        },
        {
            'id': 2,
            'timestamp': '2024-01-01T10:01:00Z',
            'model_name': 'claude-3.5',
            'domain': 'site2.com',
            'prompt_text': 'Question 2',
            'raw_response': 'Answer 2'
        }
    ]

    # Process batch twice
    stats1 = mapper.process_batch(batch)
    stats2 = mapper.process_batch(batch)  # Second run

    # First run should process all
    assert stats1['success'] == 2
    assert stats1['skipped'] == 0
    assert stats1['quarantined'] == 0

    # Second run should skip all (idempotent)
    assert stats2['success'] == 0
    assert stats2['skipped'] == 2  # All skipped as duplicates
    assert stats2['quarantined'] == 0

    # Check provenance
    staging = mapper.get_staging_data()
    provenance = staging['backfill_provenance']

    # Should have 4 provenance records (2 ok, 2 skipped)
    assert len(provenance) == 4
    ok_records = [p for p in provenance if p['status'] == 'ok']
    skip_records = [p for p in provenance if p['status'] == 'skipped']

    assert len(ok_records) == 2
    assert len(skip_records) == 2

    # Skipped records should have "Duplicate ID" reason
    for skip in skip_records:
        assert 'Duplicate' in skip['reason']

def test_single_row_idempotency():
    """Processing the same row multiple times yields same ID"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    row = {
        'timestamp': '2024-01-01T15:30:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is AI?',
        'raw_response': 'AI is artificial intelligence'
    }

    # Process same row 3 times
    raw1, norm1, prov1 = mapper._map_legacy_row(row)
    raw2, norm2, prov2 = mapper._map_legacy_row(row)
    raw3, norm3, prov3 = mapper._map_legacy_row(row)

    # First should succeed
    assert raw1 is not None
    assert prov1['status'] == 'ok'

    # Second and third should be skipped
    assert raw2 is None
    assert prov2['status'] == 'skipped'
    assert raw3 is None
    assert prov3['status'] == 'skipped'

    # All should reference the same new_id
    assert prov1['new_id_raw'] == prov2['new_id_raw'] == prov3['new_id_raw']

def test_reset_allows_reprocessing():
    """Reset should clear state and allow reprocessing"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'claude-3.5',
        'domain': 'test.com',
        'prompt_text': 'Test',
        'raw_response': 'Response'
    }

    # First processing
    raw1, _, prov1 = mapper._map_legacy_row(row)
    assert raw1 is not None
    assert prov1['status'] == 'ok'

    # Second should skip
    raw2, _, prov2 = mapper._map_legacy_row(row)
    assert raw2 is None
    assert prov2['status'] == 'skipped'

    # Reset and process again
    mapper.reset()
    raw3, _, prov3 = mapper._map_legacy_row(row)
    assert raw3 is not None
    assert prov3['status'] == 'ok'
    assert raw3['id'] == raw1['id']  # Same deterministic ID