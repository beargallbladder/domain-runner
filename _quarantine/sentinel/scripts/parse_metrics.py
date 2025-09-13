#!/usr/bin/env python3
"""
Parse crawl and score data to compute metrics.
"""
import json
import sys
from pathlib import Path
import argparse
from typing import Dict, List
from collections import defaultdict

def parse_crawl_data(crawl_file: str) -> Dict:
    """Parse crawl.jsonl to extract metrics."""
    metrics = {
        'total_requests': 0,
        'successful_requests': 0,
        'failed_requests': 0,
        'timeouts': 0,
        'response_times': [],
        'models_used': set(),
        'brands_queried': set()
    }
    
    with open(crawl_file, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line)
                metrics['total_requests'] += 1
                
                if entry.get('status') == 'success':
                    metrics['successful_requests'] += 1
                elif entry.get('error_type') == 'timeout':
                    metrics['timeouts'] += 1
                else:
                    metrics['failed_requests'] += 1
                
                if 'response_time_ms' in entry:
                    metrics['response_times'].append(entry['response_time_ms'])
                
                if 'model' in entry:
                    metrics['models_used'].add(entry['model'])
                
                if 'brand' in entry:
                    metrics['brands_queried'].add(entry['brand'])
                    
            except json.JSONDecodeError:
                continue
    
    return metrics

def parse_score_data(score_file: str) -> Dict:
    """Parse score.json to extract score metrics."""
    with open(score_file, 'r') as f:
        scores = json.load(f)
    
    memory_scores = []
    consensus_scores = []
    
    for brand_data in scores.get('brands', []):
        if 'memory_score' in brand_data:
            memory_scores.append(brand_data['memory_score'])
        if 'consensus_score' in brand_data:
            consensus_scores.append(brand_data['consensus_score'])
    
    return {
        'memory_scores': memory_scores,
        'consensus_scores': consensus_scores,
        'total_brands_scored': len(scores.get('brands', []))
    }

def parse_error_buckets(error_file: str) -> Dict:
    """Parse error buckets if available."""
    if Path(error_file).exists():
        with open(error_file, 'r') as f:
            return json.load(f)
    return {}

def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile of a list of values."""
    if not values:
        return 0.0
    sorted_values = sorted(values)
    index = int(len(sorted_values) * percentile / 100)
    return sorted_values[min(index, len(sorted_values) - 1)]

def compute_metrics(crawl_file: str, score_file: str, error_file: str = None) -> Dict:
    """Compute all metrics from crawl and score data."""
    crawl_metrics = parse_crawl_data(crawl_file)
    score_metrics = parse_score_data(score_file)
    
    # Calculate aggregated metrics
    total_requests = crawl_metrics['total_requests']
    
    metrics = {
        'brands_queried': len(crawl_metrics['brands_queried']),
        'llm_calls': total_requests,
        'errors': crawl_metrics['failed_requests'],
        'timeout_rate': crawl_metrics['timeouts'] / max(total_requests, 1),
        'error_rate': crawl_metrics['failed_requests'] / max(total_requests, 1),
        'success_rate': crawl_metrics['successful_requests'] / max(total_requests, 1),
        'models_used': len(crawl_metrics['models_used']),
        'total_brands_scored': score_metrics['total_brands_scored']
    }
    
    # Calculate score averages
    if score_metrics['memory_scores']:
        metrics['memory_score_avg'] = sum(score_metrics['memory_scores']) / len(score_metrics['memory_scores'])
        metrics['memory_score_min'] = min(score_metrics['memory_scores'])
        metrics['memory_score_max'] = max(score_metrics['memory_scores'])
    else:
        metrics['memory_score_avg'] = 0.0
        metrics['memory_score_min'] = 0.0
        metrics['memory_score_max'] = 0.0
    
    if score_metrics['consensus_scores']:
        metrics['consensus_score_avg'] = sum(score_metrics['consensus_scores']) / len(score_metrics['consensus_scores'])
        metrics['consensus_score_min'] = min(score_metrics['consensus_scores'])
        metrics['consensus_score_max'] = max(score_metrics['consensus_scores'])
    else:
        metrics['consensus_score_avg'] = 0.0
        metrics['consensus_score_min'] = 0.0
        metrics['consensus_score_max'] = 0.0
    
    # Calculate response time percentiles
    if crawl_metrics['response_times']:
        metrics['response_time_p50'] = calculate_percentile(crawl_metrics['response_times'], 50)
        metrics['response_time_p95'] = calculate_percentile(crawl_metrics['response_times'], 95)
        metrics['response_time_p99'] = calculate_percentile(crawl_metrics['response_times'], 99)
    
    # Add error buckets if available
    if error_file:
        error_buckets = parse_error_buckets(error_file)
        metrics['error_buckets'] = error_buckets
    
    return metrics

def main():
    parser = argparse.ArgumentParser(description='Parse metrics from crawl and score data')
    parser.add_argument('score_file', nargs='?', help='Score file (positional)')
    parser.add_argument('--crawl', help='Path to crawl.jsonl')
    parser.add_argument('--score', help='Path to score.json')
    parser.add_argument('--errors', help='Path to error_buckets.json')
    parser.add_argument('--out', required=True, help='Output metrics file')
    
    args = parser.parse_args()
    
    # Handle positional argument
    if args.score_file and not args.score:
        args.score = args.score_file
    
    # Determine input files if not specified
    if not args.crawl and not args.score:
        # Try to infer from output path
        run_dir = Path(args.out).parent
        args.crawl = str(run_dir / 'crawl.jsonl')
        args.score = str(run_dir / 'score.json')
        args.errors = str(run_dir / 'error_buckets.json')
    
    # Compute metrics
    metrics = compute_metrics(args.crawl, args.score, args.errors)
    
    # Write output
    with open(args.out, 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print(f"Computed metrics: {len(metrics)} metrics written to {args.out}")
    print(f"  - Brands queried: {metrics['brands_queried']}")
    print(f"  - Success rate: {metrics['success_rate']:.2%}")
    print(f"  - Memory score avg: {metrics['memory_score_avg']:.3f}")
    print(f"  - Consensus score avg: {metrics['consensus_score_avg']:.3f}")

if __name__ == '__main__':
    main()