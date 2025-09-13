#!/usr/bin/env python3
"""
Propose low-risk updates to the spec based on run metrics.
Only adjusts tunable parameters, never changes contracts or core logic.
"""
import json
import re
import sys
from pathlib import Path
import argparse
from typing import Dict, List, Tuple

# Parameters that are safe to auto-tune
TUNABLE_PARAMS = {
    'timeout_ms': (5000, 60000, 5000),  # (min, max, step)
    'retry_count': (0, 5, 1),
    'batch_size': (1, 50, 5),
    'parallel_workers': (1, 10, 1),
    'cache_ttl_seconds': (300, 7200, 300)
}

def load_run_metrics(run_dir: str) -> Dict:
    """Load metrics from a run directory."""
    metrics_file = Path(run_dir) / 'metrics.json'
    if metrics_file.exists():
        with open(metrics_file, 'r') as f:
            return json.load(f)
    return {}

def analyze_metrics_for_tuning(metrics: Dict) -> List[Tuple[str, str, any]]:
    """Analyze metrics and propose parameter adjustments."""
    proposals = []
    
    # Analyze timeout rate
    timeout_rate = metrics.get('timeout_rate', 0)
    if timeout_rate > 0.05:
        # Increase timeout
        proposals.append(('timeout_ms', 'increase', 10000))
    elif timeout_rate < 0.01:
        # Can potentially decrease timeout
        proposals.append(('timeout_ms', 'decrease', 5000))
    
    # Analyze error rate
    error_rate = metrics.get('error_rate', 0)
    if error_rate > 0.02:
        # Increase retry count
        proposals.append(('retry_count', 'increase', 1))
    
    # Analyze response times
    p95_response = metrics.get('response_time_p95', 0)
    if p95_response > 10000:  # If p95 > 10s
        # Decrease batch size to reduce load
        proposals.append(('batch_size', 'decrease', 5))
    elif p95_response < 2000:  # If p95 < 2s
        # Can increase batch size
        proposals.append(('batch_size', 'increase', 5))
    
    # Analyze success rate for parallel workers
    success_rate = metrics.get('success_rate', 1.0)
    if success_rate < 0.95:
        # Reduce parallel workers to decrease load
        proposals.append(('parallel_workers', 'decrease', 1))
    elif success_rate > 0.99:
        # Can increase parallel workers
        proposals.append(('parallel_workers', 'increase', 1))
    
    return proposals

def read_spec(spec_file: str) -> str:
    """Read the current spec file."""
    with open(spec_file, 'r') as f:
        return f.read()

def extract_current_params(spec_content: str) -> Dict:
    """Extract current parameter values from spec."""
    params = {}
    
    # Look for parameters in the AUTO-TUNED section
    auto_tuned_section = re.search(
        r'<!-- AUTO-TUNED:.*?-->(.*?)(?=\n##|\Z)',
        spec_content,
        re.DOTALL
    )
    
    if auto_tuned_section:
        section_text = auto_tuned_section.group(1)
        for param_name in TUNABLE_PARAMS.keys():
            match = re.search(f'- {param_name}: (\\d+)', section_text)
            if match:
                params[param_name] = int(match.group(1))
    
    # Default values if not found
    defaults = {
        'timeout_ms': 30000,
        'retry_count': 2,
        'batch_size': 10,
        'parallel_workers': 4,
        'cache_ttl_seconds': 3600
    }
    
    for param, default in defaults.items():
        if param not in params:
            params[param] = default
    
    return params

def apply_proposals(current_params: Dict, proposals: List[Tuple]) -> Dict:
    """Apply proposed changes to parameters."""
    updated_params = current_params.copy()
    
    for param_name, action, value in proposals:
        if param_name not in TUNABLE_PARAMS:
            continue
        
        min_val, max_val, step = TUNABLE_PARAMS[param_name]
        current_val = updated_params[param_name]
        
        if action == 'increase':
            new_val = min(current_val + value, max_val)
        elif action == 'decrease':
            new_val = max(current_val - value, min_val)
        else:
            new_val = value
        
        # Ensure value is within bounds and on step boundary
        new_val = max(min_val, min(new_val, max_val))
        new_val = min_val + ((new_val - min_val) // step) * step
        
        updated_params[param_name] = new_val
    
    return updated_params

def update_spec_content(spec_content: str, updated_params: Dict, run_id: str) -> str:
    """Update the spec content with new parameter values."""
    # Build the new parameters section
    param_lines = []
    for param_name, value in updated_params.items():
        param_lines.append(f"- {param_name}: {value}")
    
    new_params_section = "\n".join(param_lines)
    
    # Find and replace the AUTO-TUNED section
    auto_tuned_pattern = r'(<!-- AUTO-TUNED:.*?-->)(.*?)(?=\n##|\Z)'
    
    def replace_func(match):
        return f"{match.group(1)}\n{new_params_section}\n"
    
    updated_content = re.sub(auto_tuned_pattern, replace_func, spec_content, flags=re.DOTALL)
    
    # Add a comment about the update
    comment = f"\n<!-- Last auto-tuned from run: {run_id} -->\n"
    if "<!-- Last auto-tuned from run:" not in updated_content:
        # Insert after the AUTO-TUNED section
        updated_content = re.sub(
            r'(<!-- AUTO-TUNED:.*?-->.*?)(\n##)',
            f'\\1{comment}\\2',
            updated_content,
            flags=re.DOTALL
        )
    else:
        # Update existing comment
        updated_content = re.sub(
            r'<!-- Last auto-tuned from run:.*?-->',
            comment.strip(),
            updated_content
        )
    
    return updated_content

def validate_spec(spec_content: str) -> bool:
    """Validate that the spec still meets invariants."""
    # Check that required sections exist
    required_sections = [
        '## Objective',
        '## Scope',
        '## Invariants',
        '## Orchestration',
        '## SLOs'
    ]
    
    for section in required_sections:
        if section not in spec_content:
            print(f"Error: Required section '{section}' not found", file=sys.stderr)
            return False
    
    # Check that contracts are not modified
    if '/interfaces/*.json' not in spec_content:
        print("Error: Contract reference missing", file=sys.stderr)
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(description='Propose spec updates based on metrics')
    parser.add_argument('--from-runs', help='Run directory to analyze')
    parser.add_argument('--spec', default='specs/sentinel.prd.md', help='Spec file to update')
    parser.add_argument('--mode', choices=['low-risk', 'moderate', 'aggressive'], default='low-risk')
    parser.add_argument('--validate', action='store_true', help='Validate spec only')
    parser.add_argument('--dry-run', action='store_true', help='Show changes without applying')
    
    args = parser.parse_args()
    
    # Read current spec
    spec_content = read_spec(args.spec)
    
    # Validate only mode
    if args.validate:
        if validate_spec(spec_content):
            print("Spec validation passed")
            sys.exit(0)
        else:
            print("Spec validation failed", file=sys.stderr)
            sys.exit(1)
    
    # Load metrics and analyze
    if args.from_runs:
        metrics = load_run_metrics(args.from_runs)
        proposals = analyze_metrics_for_tuning(metrics)
        
        if not proposals:
            print("No parameter adjustments needed")
            sys.exit(0)
        
        # Extract current parameters
        current_params = extract_current_params(spec_content)
        
        # Apply proposals based on mode
        if args.mode == 'low-risk':
            # Only apply first proposal
            proposals = proposals[:1]
        elif args.mode == 'moderate':
            # Apply up to 3 proposals
            proposals = proposals[:3]
        # aggressive mode applies all proposals
        
        updated_params = apply_proposals(current_params, proposals)
        
        # Check if anything changed
        if updated_params == current_params:
            print("No changes needed after applying constraints")
            sys.exit(0)
        
        # Update spec content
        run_id = Path(args.from_runs).name
        updated_spec = update_spec_content(spec_content, updated_params, run_id)
        
        # Validate updated spec
        if not validate_spec(updated_spec):
            print("Error: Updated spec failed validation", file=sys.stderr)
            sys.exit(1)
        
        # Show or apply changes
        if args.dry_run:
            print("Proposed changes:")
            for param, old_val in current_params.items():
                new_val = updated_params[param]
                if old_val != new_val:
                    print(f"  {param}: {old_val} → {new_val}")
        else:
            # Write updated spec
            with open(args.spec, 'w') as f:
                f.write(updated_spec)
            
            print(f"Updated {args.spec} with auto-tuned parameters:")
            for param, old_val in current_params.items():
                new_val = updated_params[param]
                if old_val != new_val:
                    print(f"  {param}: {old_val} → {new_val}")

if __name__ == '__main__':
    main()