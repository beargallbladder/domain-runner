import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.mapper import LegacyMapper

def test_prompt_text_to_id_mapping():
    """T2: Identical prompt_text maps to same prompt_id across models"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    # Two rows with same prompt_text but different models
    row1 = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'Explain quantum computing',
        'raw_response': 'Quantum computing uses quantum bits...'
    }

    row2 = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'claude-3.5',
        'domain': 'example.com',
        'prompt_text': 'Explain quantum computing',  # Same prompt
        'raw_response': 'Quantum computing is a type of computation...'
    }

    raw1, _, _ = mapper._map_legacy_row(row1)
    raw2, _, _ = mapper._map_legacy_row(row2)

    # Same prompt_text = same prompt_id
    assert raw1['prompt_id'] == raw2['prompt_id']
    # But different models = different row IDs
    assert raw1['id'] != raw2['id']
    assert raw1['model'] != raw2['model']

def test_different_prompts_different_ids():
    """Different prompt texts should generate different prompt_ids"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    row1 = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is machine learning?',
        'raw_response': 'ML is...'
    }

    row2 = {
        'timestamp': '2024-01-01T12:00:00Z',
        'model_name': 'gpt-4o',
        'domain': 'example.com',
        'prompt_text': 'What is deep learning?',
        'raw_response': 'DL is...'
    }

    raw1, _, _ = mapper._map_legacy_row(row1)
    raw2, _, _ = mapper._map_legacy_row(row2)

    # Different prompts = different prompt_ids
    assert raw1['prompt_id'] != raw2['prompt_id']
    # And therefore different row IDs
    assert raw1['id'] != raw2['id']

def test_prompt_id_deterministic():
    """Prompt ID generation should be deterministic"""
    mapper = LegacyMapper('/Users/samkim/domain-runner/config/legacy_mapping.v1.yml')

    prompt_text = "What is the capital of France?"

    # Generate prompt_id multiple times
    id1 = mapper._derive_prompt_id(prompt_text)
    id2 = mapper._derive_prompt_id(prompt_text)
    id3 = mapper._derive_prompt_id(prompt_text)

    # All should be identical
    assert id1 == id2 == id3
    # Should be a 16-character hex string
    assert len(id1) == 16
    assert all(c in '0123456789abcdef' for c in id1)