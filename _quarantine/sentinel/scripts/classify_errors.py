#!/usr/bin/env python3
"""
Classify errors from crawl data into buckets for analysis.
"""
import json
import sys
from pathlib import Path
import argparse
from collections import defaultdict
from typing import Dict, List

ERROR_PATTERNS = {
    'timeout': ['timeout', 'timed out', 'deadline exceeded'],
    'rate_limit': ['429', 'rate limit', 'too many requests', 'quota exceeded'],
    'auth': ['401', '403', 'unauthorized', 'forbidden', 'invalid api key'],
    'parse': ['json', 'parse error', 'invalid response', 'unexpected format'],
    'network': ['connection', 'ECONNREFUSED', 'ETIMEDOUT', 'network', 'socket'],
    'unknown': []  # Fallback bucket
}

def classify_error(error_message: str, error_code: int = None) -> str:
    """Classify an error into a bucket."""
    if error_message:
        error_lower = error_message.lower()
        
        for bucket, patterns in ERROR_PATTERNS.items():
            if bucket == 'unknown':
                continue
            for pattern in patterns:
                if pattern in error_lower:
                    return bucket
        
        # Check error codes
        if error_code:
            if error_code == 429:
                return 'rate_limit'
            elif error_code in [401, 403]:
                return 'auth'
            elif error_code >= 500:
                return 'server_error'
    
    return 'unknown'

def process_crawl_file(crawl_file: str, buckets: List[str]) -> Dict:
    """Process crawl.jsonl and classify errors."""
    error_buckets = defaultdict(list)
    error_counts = defaultdict(int)
    
    with open(crawl_file, 'r') as f:
        for line_num, line in enumerate(f, 1):
            try:
                entry = json.loads(line)
                
                if entry.get('status') != 'success':
                    error_msg = entry.get('error', '')
                    error_code = entry.get('status_code')
                    error_type = entry.get('error_type', '')
                    
                    # Classify the error
                    bucket = classify_error(error_msg or error_type, error_code)
                    
                    # Store error details
                    error_detail = {
                        'line': line_num,
                        'brand': entry.get('brand', 'unknown'),
                        'model': entry.get('model', 'unknown'),
                        'message': error_msg[:200],  # Truncate long messages
                        'code': error_code,
                        'timestamp': entry.get('timestamp')
                    }
                    
                    error_buckets[bucket].append(error_detail)
                    error_counts[bucket] += 1
                    
            except json.JSONDecodeError:
                continue
    
    # Ensure all requested buckets are in the output
    for bucket in buckets:
        if bucket not in error_counts:
            error_counts[bucket] = 0
            error_buckets[bucket] = []
    
    return {
        'counts': dict(error_counts),
        'details': dict(error_buckets),
        'total_errors': sum(error_counts.values())
    }

def generate_summary(error_data: Dict) -> str:
    """Generate a human-readable summary of errors."""
    lines = []
    lines.append("ERROR CLASSIFICATION SUMMARY")
    lines.append("=" * 40)
    
    total = error_data['total_errors']
    if total == 0:
        lines.append("No errors found!")
        return "\n".join(lines)
    
    lines.append(f"Total errors: {total}")
    lines.append("")
    
    # Sort buckets by count
    sorted_buckets = sorted(
        error_data['counts'].items(),
        key=lambda x: x[1],
        reverse=True
    )
    
    for bucket, count in sorted_buckets:
        if count > 0:
            percentage = (count / total) * 100
            lines.append(f"{bucket:15} {count:5} ({percentage:5.1f}%)")
    
    # Show top errors per bucket
    lines.append("\n" + "=" * 40)
    lines.append("TOP ERRORS BY BUCKET")
    lines.append("=" * 40)
    
    for bucket, errors in error_data['details'].items():
        if errors:
            lines.append(f"\n{bucket.upper()} (top 3):")
            for error in errors[:3]:
                lines.append(f"  - {error['brand']}/{error['model']}: {error['message'][:50]}")
    
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description='Classify errors from crawl data')
    parser.add_argument('--crawl', required=True, help='Path to crawl.jsonl')
    parser.add_argument('--buckets', default='timeout,rate_limit,auth,parse,network,unknown',
                       help='Comma-separated list of error buckets')
    parser.add_argument('--out', required=True, help='Output file path')
    parser.add_argument('--summary', action='store_true', help='Print summary to stdout')
    
    args = parser.parse_args()
    
    # Parse bucket list
    buckets = [b.strip() for b in args.buckets.split(',')]
    
    # Process crawl file
    error_data = process_crawl_file(args.crawl, buckets)
    
    # Write output
    with open(args.out, 'w') as f:
        json.dump(error_data, f, indent=2)
    
    # Print summary if requested
    if args.summary:
        print(generate_summary(error_data))
    else:
        print(f"Classified {error_data['total_errors']} errors into {len(buckets)} buckets")

if __name__ == '__main__':
    main()