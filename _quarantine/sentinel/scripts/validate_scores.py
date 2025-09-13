#!/usr/bin/env python3
"""
Validate score output and check score ranges.
"""
import json
import sys
import argparse

def validate_scores(score_file: str, min_score: float = 0.0, max_score: float = 1.0, 
                   required_fields: str = None) -> bool:
    """Validate score.json structure and value ranges."""
    try:
        with open(score_file, 'r') as f:
            data = json.load(f)
        
        # Check structure
        if 'brands' not in data:
            print("Missing 'brands' array in score data", file=sys.stderr)
            return False
        
        if not isinstance(data['brands'], list):
            print("'brands' must be an array", file=sys.stderr)
            return False
        
        # Parse required fields
        fields = required_fields.split(',') if required_fields else []
        
        # Validate each brand
        for i, brand in enumerate(data['brands']):
            # Check required fields
            for field in fields:
                if field not in brand:
                    print(f"Brand {i}: Missing required field '{field}'", file=sys.stderr)
                    return False
            
            # Check score ranges
            for score_field in ['memory_score', 'consensus_score']:
                if score_field in brand:
                    score = brand[score_field]
                    if not isinstance(score, (int, float)):
                        print(f"Brand {i}: {score_field} must be numeric", file=sys.stderr)
                        return False
                    if score < min_score or score > max_score:
                        print(f"Brand {i}: {score_field} ({score}) out of range [{min_score}, {max_score}]", 
                              file=sys.stderr)
                        return False
        
        print(f"✓ Validated {len(data['brands'])} brand scores")
        return True
        
    except Exception as e:
        print(f"Error validating scores: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Validate score output')
    parser.add_argument('--scores', required=True, help='Score JSON file')
    parser.add_argument('--min-score', type=float, default=0.0, help='Minimum valid score')
    parser.add_argument('--max-score', type=float, default=1.0, help='Maximum valid score')
    parser.add_argument('--required-fields', help='Comma-separated required fields')
    
    args = parser.parse_args()
    
    if validate_scores(args.scores, args.min_score, args.max_score, args.required_fields):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()