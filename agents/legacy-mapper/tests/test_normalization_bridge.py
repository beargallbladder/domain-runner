import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.mapper import LegacyMapper

def test_malformed_legacy_normalized():
    """T3: Malformed legacy responses are properly normalized"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Legacy row with malformed JSON response
    legacy_row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'Test prompt',
        'raw_response': '{bad json: no closing',
        'status': 'success'  # Legacy might mark as success
    }

    raw, normalized, prov = mapper._map_legacy_row(legacy_row)

    # Should create valid entries
    assert raw is not None
    assert normalized is not None
    assert prov['status'] == 'ok'

    # Raw should preserve the malformed response
    assert raw['raw'] == '{bad json: no closing'

    # Normalized should flag as malformed
    assert normalized['normalized_status'] in ('malformed', 'empty')
    assert normalized['answer'] == '{bad json: no closing' or normalized['answer'] == ''

def test_empty_legacy_normalized():
    """Empty legacy responses are properly normalized"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    legacy_row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'claude-3.5',
        'domain': 'test.com',
        'prompt_text': 'Question',
        'raw_response': '',  # Empty response
        'status': 'timeout'
    }

    raw, normalized, prov = mapper._map_legacy_row(legacy_row)

    assert raw is not None
    assert normalized is not None

    # Raw preserves empty
    assert raw['raw'] == ''
    assert raw['status'] == 'timeout'

    # Normalized flags as empty
    assert normalized['normalized_status'] == 'empty'
    assert normalized['answer'] == ''

def test_valid_json_legacy_normalized():
    """Valid JSON responses are properly parsed"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    legacy_row = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'Test',
        'raw_response': '{"answer": "42", "confidence": 0.95}',
        'status': 'success'
    }

    raw, normalized, prov = mapper._map_legacy_row(legacy_row)

    assert raw is not None
    assert normalized is not None

    # Should parse JSON correctly
    assert normalized['answer'] == '42'
    assert normalized['confidence'] == 0.95
    assert normalized['normalized_status'] == 'valid'