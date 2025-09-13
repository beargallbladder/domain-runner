#!/usr/bin/env python3
"""
Compare metrics between two runs and generate a diff report.
"""
import json
import sys
from pathlib import Path
import argparse
from typing import Dict, Any

def load_run_data(run_dir: str) -> Dict:
    """Load data from a run directory."""
    run_path = Path(run_dir)
    data = {}
    
    # Load metrics
    metrics_file = run_path / 'metrics.json'
    if metrics_file.exists():
        with open(metrics_file, 'r') as f:
            data['metrics'] = json.load(f)
    
    # Load scores
    score_file = run_path / 'score.json'
    if score_file.exists():
        with open(score_file, 'r') as f:
            data['scores'] = json.load(f)
    
    # Load envelope if exists
    envelope_file = run_path / 'run.envelope.json'
    if envelope_file.exists():
        with open(envelope_file, 'r') as f:
            data['envelope'] = json.load(f)
    
    return data

def calculate_delta(current: float, previous: float) -> Dict:
    """Calculate delta between two values."""
    if previous == 0:
        if current == 0:
            return {'absolute': 0, 'relative': 0, 'direction': 'unchanged'}
        else:
            return {'absolute': current, 'relative': float('inf'), 'direction': 'increased'}
    
    absolute_delta = current - previous
    relative_delta = absolute_delta / previous
    
    if absolute_delta > 0:
        direction = 'increased'
    elif absolute_delta < 0:
        direction = 'decreased'
    else:
        direction = 'unchanged'
    
    return {
        'absolute': absolute_delta,
        'relative': relative_delta,
        'percentage': relative_delta * 100,
        'direction': direction
    }

def compare_metrics(current: Dict, previous: Dict) -> Dict:
    """Compare metrics between two runs."""
    comparison = {}
    
    # Key metrics to compare
    key_metrics = [
        'brands_queried',
        'llm_calls',
        'errors',
        'timeout_rate',
        'error_rate',
        'memory_score_avg',
        'consensus_score_avg',
        'response_time_p50',
        'response_time_p95'
    ]
    
    for metric in key_metrics:
        if metric in current and metric in previous:
            comparison[metric] = {
                'current': current[metric],
                'previous': previous[metric],
                'delta': calculate_delta(current[metric], previous[metric])
            }
    
    return comparison

def compare_scores(current: Dict, previous: Dict) -> Dict:
    """Compare brand scores between two runs."""
    comparison = {
        'brands_improved': [],
        'brands_degraded': [],
        'brands_unchanged': [],
        'new_brands': [],
        'removed_brands': []
    }
    
    current_brands = {b['name']: b for b in current.get('brands', [])}
    previous_brands = {b['name']: b for b in previous.get('brands', [])}
    
    # Compare common brands
    for brand_name, current_data in current_brands.items():
        if brand_name in previous_brands:
            previous_data = previous_brands[brand_name]
            
            current_score = current_data.get('memory_score', 0)
            previous_score = previous_data.get('memory_score', 0)
            
            delta = current_score - previous_score
            
            brand_comparison = {
                'brand': brand_name,
                'current_score': current_score,
                'previous_score': previous_score,
                'delta': delta
            }
            
            if delta > 0.01:  # Threshold for considering improvement
                comparison['brands_improved'].append(brand_comparison)
            elif delta < -0.01:  # Threshold for considering degradation
                comparison['brands_degraded'].append(brand_comparison)
            else:
                comparison['brands_unchanged'].append(brand_comparison)
        else:
            comparison['new_brands'].append(brand_name)
    
    # Find removed brands
    for brand_name in previous_brands:
        if brand_name not in current_brands:
            comparison['removed_brands'].append(brand_name)
    
    return comparison

def generate_summary(comparison: Dict) -> str:
    """Generate human-readable summary of the comparison."""
    lines = []
    lines.append("=" * 60)
    lines.append("RUN COMPARISON SUMMARY")
    lines.append("=" * 60)
    
    # Metrics comparison
    metrics = comparison.get('metrics', {})
    
    lines.append("\n📊 KEY METRICS:")
    for metric_name, data in metrics.items():
        delta = data['delta']
        symbol = "↑" if delta['direction'] == 'increased' else "↓" if delta['direction'] == 'decreased' else "→"
        
        lines.append(f"  {metric_name}:")
        lines.append(f"    Current:  {data['current']:.3f}")
        lines.append(f"    Previous: {data['previous']:.3f}")
        lines.append(f"    Change:   {symbol} {delta['absolute']:+.3f} ({delta['percentage']:+.1f}%)")
    
    # Score comparison
    scores = comparison.get('scores', {})
    if scores:
        lines.append("\n📈 BRAND SCORE CHANGES:")
        lines.append(f"  Improved: {len(scores['brands_improved'])} brands")
        lines.append(f"  Degraded: {len(scores['brands_degraded'])} brands")
        lines.append(f"  Unchanged: {len(scores['brands_unchanged'])} brands")
        
        if scores['brands_improved']:
            lines.append("\n  Top Improvements:")
            for brand in sorted(scores['brands_improved'], key=lambda x: x['delta'], reverse=True)[:3]:
                lines.append(f"    • {brand['brand']}: {brand['delta']:+.3f}")
        
        if scores['brands_degraded']:
            lines.append("\n  Top Degradations:")
            for brand in sorted(scores['brands_degraded'], key=lambda x: x['delta'])[:3]:
                lines.append(f"    • {brand['brand']}: {brand['delta']:+.3f}")
    
    # Alerts
    lines.append("\n⚠️  ALERTS:")
    alerts = []
    
    if metrics.get('error_rate', {}).get('current', 0) > 0.02:
        alerts.append("Error rate exceeds 2% threshold")
    
    if metrics.get('timeout_rate', {}).get('current', 0) > 0.05:
        alerts.append("Timeout rate exceeds 5% threshold")
    
    if metrics.get('memory_score_avg', {}).get('delta', {}).get('absolute', 0) < -0.05:
        alerts.append("Average memory score decreased by more than 0.05")
    
    if alerts:
        for alert in alerts:
            lines.append(f"  • {alert}")
    else:
        lines.append("  • No alerts")
    
    lines.append("\n" + "=" * 60)
    
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description='Compare two sentinel runs')
    parser.add_argument('--current', required=True, help='Current run directory')
    parser.add_argument('--previous', required=True, help='Previous run directory')
    parser.add_argument('--out', help='Output comparison file (JSON)')
    parser.add_argument('--format', choices=['json', 'text', 'both'], default='both')
    
    args = parser.parse_args()
    
    # Load run data
    current_data = load_run_data(args.current)
    previous_data = load_run_data(args.previous)
    
    if not current_data or not previous_data:
        print("Error: Could not load run data", file=sys.stderr)
        sys.exit(1)
    
    # Compare runs
    comparison = {
        'current_run': args.current,
        'previous_run': args.previous,
        'metrics': compare_metrics(
            current_data.get('metrics', {}),
            previous_data.get('metrics', {})
        ),
        'scores': compare_scores(
            current_data.get('scores', {}),
            previous_data.get('scores', {})
        )
    }
    
    # Output results
    if args.format in ['json', 'both'] and args.out:
        with open(args.out, 'w') as f:
            json.dump(comparison, f, indent=2)
    
    if args.format in ['text', 'both']:
        summary = generate_summary(comparison)
        print(summary)
    
    # Exit with non-zero if degraded
    if any(m.get('delta', {}).get('direction') == 'increased' 
           for m in comparison['metrics'].values() 
           if 'error' in m or 'timeout' in m):
        sys.exit(1)

if __name__ == '__main__':
    main()