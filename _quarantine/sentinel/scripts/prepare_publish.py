#!/usr/bin/env python3
"""
Prepare publish payload from scores and metrics.
"""
import json
import sys
import argparse
from datetime import datetime

def prepare_payload(score_file: str, metrics_file: str) -> dict:
    """Prepare publish payload combining scores and metrics."""
    with open(score_file, 'r') as f:
        scores = json.load(f)
    
    with open(metrics_file, 'r') as f:
        metrics = json.load(f)
    
    # Build payload
    payload = {
        'timestamp': datetime.utcnow().isoformat(),
        'scores': scores,
        'metrics': metrics,
        'summary': {
            'total_brands': len(scores.get('brands', [])),
            'avg_memory_score': scores.get('summary', {}).get('avg_memory_score', 0),
            'avg_consensus_score': scores.get('summary', {}).get('avg_consensus_score', 0),
            'error_rate': metrics.get('error_rate', 0),
            'success_rate': metrics.get('success_rate', 1)
        }
    }
    
    return payload

def main():
    parser = argparse.ArgumentParser(description='Prepare publish payload')
    parser.add_argument('--scores', required=True, help='Score JSON file')
    parser.add_argument('--metrics', required=True, help='Metrics JSON file')
    parser.add_argument('--out', required=True, help='Output payload file')
    
    args = parser.parse_args()
    
    try:
        payload = prepare_payload(args.scores, args.metrics)
        
        with open(args.out, 'w') as f:
            json.dump(payload, f, indent=2)
        
        print(f"✓ Created publish payload with {payload['summary']['total_brands']} brands")
        
    except Exception as e:
        print(f"Error preparing payload: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()