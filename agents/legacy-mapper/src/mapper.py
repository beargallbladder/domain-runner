import uuid
import hashlib
import datetime
import yaml
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
import sys
import os

# Add parent directories to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Try to import ResponseNormalizer, fall back to mock if not available
try:
    response_normalizer_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        'agents', 'response-normalizer'
    )
    sys.path.insert(0, response_normalizer_path)
    from src.normalizer import ResponseNormalizer
except ImportError:
    # Mock normalizer for testing
    class ResponseNormalizer:
        def normalize(self, row):
            import json
            result = {
                'id': row.get('id'),
                'domain': row.get('domain'),
                'prompt_id': row.get('prompt_id'),
                'model': row.get('model'),
                'ts_iso': row.get('ts_iso'),
                'answer': '',
                'confidence': None,
                'citations': [],
                'normalized_status': 'empty'
            }

            raw = row.get('raw', '').strip()
            if not raw:
                result['normalized_status'] = 'empty'
            else:
                try:
                    parsed = json.loads(raw)
                    result['answer'] = str(parsed.get('answer', ''))
                    result['confidence'] = parsed.get('confidence')
                    result['citations'] = list(set(parsed.get('citations', [])))
                    result['normalized_status'] = 'valid'
                except:
                    result['answer'] = raw
                    result['normalized_status'] = 'malformed'

            return result
from .io_legacy import get_reader
from .checksum import compute_checksum

class LegacyMapper:
    """
    Maps legacy data to new schema (responses_raw and responses_normalized).
    Ensures deterministic IDs, idempotency, and full provenance tracking.
    """

    def __init__(self, config_path: str):
        """Initialize mapper with configuration."""
        self.config = self._load_config(config_path)
        self.normalizer = ResponseNormalizer()
        self.provenance = []
        self.staging_raw = []
        self.staging_normalized = []
        self.processed_ids = set()  # Track processed IDs for idempotency

    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load mapping configuration from YAML file."""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)

    def _derive_prompt_id(self, prompt_text: str) -> str:
        """Derive prompt_id from prompt_text using SHA256."""
        return hashlib.sha256(prompt_text.encode()).hexdigest()[:16]  # Use first 16 chars

    def _compute_deterministic_id(self, domain: str, prompt_id: str, model: str, ts_iso: str) -> str:
        """
        Compute deterministic ID matching A1's idempotency rule.
        ID = hash of (domain, prompt_id, model, ts_bucket_minute)
        """
        # Convert timestamp to minute bucket
        dt = datetime.datetime.fromisoformat(ts_iso.replace('Z', '+00:00'))
        ts_minute = dt.replace(second=0, microsecond=0).isoformat() + 'Z'

        # Create deterministic hash
        key = f"{domain}|{prompt_id}|{model}|{ts_minute}"
        h = hashlib.sha256(key.encode()).hexdigest()
        return str(uuid.UUID(h[:32]))

    def _map_legacy_row(self, row: Dict[str, Any]) -> Tuple[Optional[Dict], Optional[Dict], Dict]:
        """
        Map a single legacy row to new schemas.
        Returns: (responses_raw, responses_normalized, provenance)
        """
        try:
            # Extract fields based on mapping config
            field_map = self.config['fields']

            # Get base fields
            ts_iso = row.get(field_map.get('ts_iso', 'timestamp'), '')
            if not ts_iso:
                ts_iso = datetime.datetime.utcnow().isoformat() + 'Z'

            model = row.get(field_map.get('model', 'model_name'), 'unknown')
            domain = row.get(field_map.get('domain', 'domain'), '')
            raw_response = row.get(field_map.get('raw', 'raw_response'), '')
            latency_ms = row.get(field_map.get('latency_ms', 'latency_ms'), 0)
            status = row.get(field_map.get('status', 'status'),
                           self.config['defaults'].get('status_if_missing', 'success'))

            # Derive prompt_id
            if self.config['derive'].get('prompt_id_from_text'):
                prompt_text = row.get('prompt_text', '')
                prompt_id = self._derive_prompt_id(prompt_text) if prompt_text else 'unknown'
            else:
                prompt_id = row.get('prompt_id', 'unknown')

            # Validate against guards
            guards = self.config.get('guards', {})
            if len(str(raw_response)) > guards.get('max_row_size_bytes', float('inf')):
                raise ValueError(f"Row exceeds max size: {len(str(raw_response))} bytes")

            # Check model allowlist
            allowed_models = guards.get('allow_models', [])
            if allowed_models and not any(
                model == allowed or
                (allowed.endswith('*') and model.startswith(allowed[:-1]))
                for allowed in allowed_models
            ):
                # Map to unknown variant
                model = f"unknown-{model}"

            # Compute deterministic ID
            new_id = self._compute_deterministic_id(domain, prompt_id, model, ts_iso)

            # Check for idempotency
            if new_id in self.processed_ids:
                return None, None, {
                    'legacy_source_id': self.config['legacy_source_id'],
                    'legacy_primary_key': str(row.get('id', compute_checksum(row))),
                    'new_id_raw': new_id,
                    'new_id_norm': None,
                    'ingested_at': datetime.datetime.utcnow().isoformat() + 'Z',
                    'mapping_version': self.config['version'],
                    'checksum': compute_checksum(row),
                    'status': 'skipped',
                    'reason': 'Duplicate ID (idempotent skip)'
                }

            # Create responses_raw entry
            responses_raw = {
                'id': new_id,
                'domain': domain,
                'prompt_id': prompt_id,
                'model': model,
                'ts_iso': ts_iso,
                'raw': raw_response,
                'status': status,
                'latency_ms': latency_ms,
                'attempt': 1
            }

            # Normalize using A3's normalizer
            responses_normalized = self.normalizer.normalize(responses_raw)
            responses_normalized['id'] = new_id  # Use same ID

            # Track processed ID
            self.processed_ids.add(new_id)

            # Create provenance record
            provenance = {
                'legacy_source_id': self.config['legacy_source_id'],
                'legacy_primary_key': str(row.get('id', compute_checksum(row))),
                'new_id_raw': new_id,
                'new_id_norm': new_id,
                'ingested_at': datetime.datetime.utcnow().isoformat() + 'Z',
                'mapping_version': self.config['version'],
                'checksum': compute_checksum(row),
                'status': 'ok',
                'reason': None
            }

            return responses_raw, responses_normalized, provenance

        except Exception as e:
            # Quarantine on error
            return None, None, {
                'legacy_source_id': self.config['legacy_source_id'],
                'legacy_primary_key': str(row.get('id', compute_checksum(row))),
                'new_id_raw': None,
                'new_id_norm': None,
                'ingested_at': datetime.datetime.utcnow().isoformat() + 'Z',
                'mapping_version': self.config['version'],
                'checksum': compute_checksum(row),
                'status': 'quarantined',
                'reason': str(e)
            }

    def process_batch(self, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process a batch of legacy rows.
        Returns statistics about the batch processing.
        """
        stats = {
            'total': len(batch),
            'success': 0,
            'skipped': 0,
            'quarantined': 0
        }

        for row in batch:
            raw, normalized, prov = self._map_legacy_row(row)

            if prov['status'] == 'ok':
                self.staging_raw.append(raw)
                self.staging_normalized.append(normalized)
                stats['success'] += 1
            elif prov['status'] == 'skipped':
                stats['skipped'] += 1
            else:
                stats['quarantined'] += 1

            self.provenance.append(prov)

        return stats

    def run(self, source_type: str, source_path: Optional[str] = None,
            mock_data: Optional[List] = None, start_offset: int = 0,
            batch_size: int = 2000) -> Dict[str, Any]:
        """
        Run the complete backfill process.
        """
        reader = get_reader(source_type, source_path, mock_data)
        total_stats = {
            'total': 0,
            'success': 0,
            'skipped': 0,
            'quarantined': 0,
            'batches': 0
        }

        for batch in reader.read_batch(start_offset, batch_size):
            batch_stats = self.process_batch(batch)

            # Aggregate statistics
            for key in batch_stats:
                total_stats[key] = total_stats.get(key, 0) + batch_stats[key]
            total_stats['batches'] += 1

            # Log progress
            print(f"Processed batch {total_stats['batches']}: "
                  f"{batch_stats['success']} success, "
                  f"{batch_stats['skipped']} skipped, "
                  f"{batch_stats['quarantined']} quarantined")

        return total_stats

    def get_staging_data(self) -> Dict[str, List]:
        """Get all staging data ready for promotion."""
        return {
            'responses_raw': self.staging_raw,
            'responses_normalized': self.staging_normalized,
            'backfill_provenance': self.provenance
        }

    def reset(self):
        """Reset mapper state for new run."""
        self.staging_raw.clear()
        self.staging_normalized.clear()
        self.provenance.clear()
        self.processed_ids.clear()