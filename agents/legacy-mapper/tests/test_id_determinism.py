import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.mapper import LegacyMapper

def test_deterministic_id_generation():
    """T1: Legacy duplicates map to the same responses_raw.id"""
    # Create mapper with test config
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Two legacy rows with same domain, prompt, model, and minute
    legacy_row1 = {
        'id': 1,
        'timestamp': '2024-01-01T12:00:15Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is AI?',
        'raw_response': 'AI is artificial intelligence',
        'latency_ms': 500
    }

    legacy_row2 = {
        'id': 2,
        'timestamp': '2024-01-01T12:00:45Z',  # Same minute bucket
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is AI?',  # Same prompt
        'raw_response': 'AI is artificial intelligence technology',
        'latency_ms': 600
    }

    # Map both rows
    raw1, _, _ = mapper._map_legacy_row(legacy_row1)
    mapper.reset()  # Reset to test true determinism
    raw2, _, _ = mapper._map_legacy_row(legacy_row2)

    # Should generate identical IDs
    assert raw1['id'] == raw2['id']
    assert raw1['prompt_id'] == raw2['prompt_id']

def test_different_models_different_ids():
    """Different models should generate different IDs"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    base_row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'domain': 'example.com',
        'prompt_text': 'What is AI?',
        'raw_response': 'Response'
    }

    # Test with different models
    row1 = {**base_row, 'model_name': 'gpt-4o'}
    row2 = {**base_row, 'model_name': 'claude-3.5'}

    raw1, _, _ = mapper._map_legacy_row(row1)
    raw2, _, _ = mapper._map_legacy_row(row2)

    # Different models = different IDs
    assert raw1['id'] != raw2['id']
    # But same prompt_id
    assert raw1['prompt_id'] == raw2['prompt_id']

def test_different_minutes_different_ids():
    """Different minute buckets should generate different IDs"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    base_row = {
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is AI?',
        'raw_response': 'Response'
    }

    # Test with different minutes
    row1 = {**base_row, 'timestamp': '2024-01-01T12:00:00Z'}
    row2 = {**base_row, 'timestamp': '2024-01-01T12:01:00Z'}  # Next minute

    raw1, _, _ = mapper._map_legacy_row(row1)
    raw2, _, _ = mapper._map_legacy_row(row2)

    # Different minutes = different IDs
    assert raw1['id'] != raw2['id']