#!/usr/bin/env python3
"""
Collect logs and artifacts from a run and create the run envelope.
"""
import json
import os
import sys
import hashlib
import glob
from datetime import datetime
from pathlib import Path
import argparse
from typing import Dict, List, Any

def calculate_hash(filepath: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return sha256.hexdigest()

def validate_against_schema(data: Dict, schema_path: str) -> bool:
    """Validate data against JSON schema."""
    try:
        import jsonschema
        with open(schema_path, 'r') as f:
            schema = json.load(f)
        jsonschema.validate(instance=data, schema=schema)
        return True
    except Exception as e:
        print(f"Schema validation failed: {e}", file=sys.stderr)
        return False

def collect_artifacts(run_root: str) -> List[Dict]:
    """Collect all artifacts from a run directory."""
    artifacts = []
    run_path = Path(run_root)
    
    artifact_patterns = {
        'crawl': 'crawl.jsonl',
        'score': 'score.json',
        'metrics': 'metrics.json',
        'log': '*.log',
        'envelope': 'run.envelope.json',
        'publish': 'publish*.json'
    }
    
    for kind, pattern in artifact_patterns.items():
        for filepath in run_path.glob(pattern):
            if filepath.is_file():
                artifacts.append({
                    'kind': kind,
                    'path': str(filepath.relative_to(run_path)),
                    'hash': calculate_hash(str(filepath)),
                    'created_at': datetime.fromtimestamp(
                        filepath.stat().st_mtime
                    ).isoformat(),
                    'size_bytes': filepath.stat().st_size
                })
    
    return artifacts

def parse_metrics(metrics_file: str) -> Dict:
    """Load metrics from metrics.json."""
    if os.path.exists(metrics_file):
        with open(metrics_file, 'r') as f:
            return json.load(f)
    return {
        'brands_queried': 0,
        'llm_calls': 0,
        'errors': 0,
        'timeout_rate': 0.0,
        'memory_score_avg': 0.0,
        'consensus_score_avg': 0.0
    }

def parse_error_buckets(error_file: str) -> Dict:
    """Load error buckets from error_buckets.json."""
    if os.path.exists(error_file):
        with open(error_file, 'r') as f:
            return json.load(f)
    return {}

def determine_status(metrics: Dict, error_buckets: Dict) -> str:
    """Determine run status based on metrics."""
    error_rate = metrics.get('errors', 0) / max(metrics.get('llm_calls', 1), 1)
    timeout_rate = metrics.get('timeout_rate', 0)
    
    if error_rate > 0.5:
        return 'failed'
    elif error_rate > 0.02 or timeout_rate > 0.05:
        return 'degraded'
    elif metrics.get('brands_queried', 0) < metrics.get('expected_brands', 1):
        return 'partial'
    else:
        return 'ok'

def create_envelope(args) -> Dict:
    """Create the run envelope."""
    run_path = Path(args.run_root)
    
    # Load metrics
    metrics = parse_metrics(run_path / 'metrics.json')
    error_buckets = parse_error_buckets(run_path / 'error_buckets.json')
    
    # Calculate duration
    start_time = datetime.fromisoformat(args.run_id.replace('Z', '+00:00').replace('T', ' '))
    end_time = datetime.utcnow()
    duration_seconds = (end_time - start_time).total_seconds()
    metrics['duration_seconds'] = duration_seconds
    
    # Build envelope
    envelope = {
        'run_id': args.run_id,
        'started_at': start_time.isoformat(),
        'ended_at': end_time.isoformat(),
        'spec_version': args.spec_version,
        'status': determine_status(metrics, error_buckets),
        'metrics': metrics,
        'error_buckets': error_buckets,
        'artifacts': collect_artifacts(args.run_root)
    }
    
    return envelope

def main():
    parser = argparse.ArgumentParser(description='Collect logs and create run envelope')
    parser.add_argument('run_root', nargs='?', help='Run root directory (positional)')
    parser.add_argument('--run-id', help='Run ID')
    parser.add_argument('--spec-version', help='Spec version')
    parser.add_argument('--run-root', help='Run root directory')
    parser.add_argument('--out', help='Output file path')
    parser.add_argument('--envelope', action='store_true', help='Create envelope')
    parser.add_argument('--validate', action='store_true', help='Validate against schema')
    
    args = parser.parse_args()
    
    # Handle positional argument for compatibility
    if args.run_root is None and args.run_root:
        args.run_root = args.run_root
    elif args.run_root and not args.run_root:
        args.run_root = args.run_root
    
    # Extract run_id from path if not provided
    if not args.run_id and args.run_root:
        import os
        args.run_id = os.path.basename(os.path.normpath(args.run_root))
    
    # Default spec version
    if not args.spec_version:
        args.spec_version = 'v1.0.0'
    
    # Default output path
    if not args.out:
        args.out = os.path.join(args.run_root, 'run.envelope.json')
    
    # Create envelope
    envelope = create_envelope(args)
    
    # Validate if requested
    if args.validate:
        schema_path = Path(__file__).parent.parent / 'interfaces' / 'run.schema.json'
        if not validate_against_schema(envelope, str(schema_path)):
            sys.exit(1)
    
    # Write output
    with open(args.out, 'w') as f:
        json.dump(envelope, f, indent=2)
    
    print(f"Created envelope for run {args.run_id} with status: {envelope['status']}")
    
    # Exit with non-zero if failed
    if envelope['status'] == 'failed':
        sys.exit(1)

if __name__ == '__main__':
    main()