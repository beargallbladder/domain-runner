#!/usr/bin/env python3
"""
Validate input files (targets.json, models.json) before running crawl.
"""
import json
import sys
import argparse
from pathlib import Path

def validate_targets(targets_file: str) -> bool:
    """Validate targets.json structure."""
    try:
        with open(targets_file, 'r') as f:
            data = json.load(f)
        
        if 'brands' not in data:
            print("Error: 'brands' key missing in targets.json", file=sys.stderr)
            return False
        
        if not isinstance(data['brands'], list):
            print("Error: 'brands' must be a list", file=sys.stderr)
            return False
        
        if len(data['brands']) == 0:
            print("Error: No brands defined", file=sys.stderr)
            return False
        
        # Validate each brand
        for i, brand in enumerate(data['brands']):
            if 'name' not in brand:
                print(f"Error: Brand {i} missing 'name' field", file=sys.stderr)
                return False
            if 'domain' not in brand:
                print(f"Error: Brand {brand.get('name', i)} missing 'domain' field", file=sys.stderr)
                return False
        
        print(f"✓ Validated {len(data['brands'])} brands")
        return True
        
    except Exception as e:
        print(f"Error validating targets: {e}", file=sys.stderr)
        return False

def validate_models(models_file: str) -> bool:
    """Validate models.json structure."""
    try:
        with open(models_file, 'r') as f:
            data = json.load(f)
        
        if 'models' not in data:
            print("Error: 'models' key missing in models.json", file=sys.stderr)
            return False
        
        if not isinstance(data['models'], list):
            print("Error: 'models' must be a list", file=sys.stderr)
            return False
        
        if len(data['models']) == 0:
            print("Error: No models defined", file=sys.stderr)
            return False
        
        # Validate each model
        for i, model in enumerate(data['models']):
            if 'provider' not in model:
                print(f"Error: Model {i} missing 'provider' field", file=sys.stderr)
                return False
            if 'model' not in model:
                print(f"Error: Model {i} missing 'model' field", file=sys.stderr)
                return False
            if 'endpoint' not in model:
                print(f"Error: Model {model.get('model', i)} missing 'endpoint' field", file=sys.stderr)
                return False
        
        print(f"✓ Validated {len(data['models'])} models")
        return True
        
    except Exception as e:
        print(f"Error validating models: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Validate input files')
    parser.add_argument('--targets', required=True, help='Path to targets.json')
    parser.add_argument('--models', required=True, help='Path to models.json')
    
    args = parser.parse_args()
    
    # Validate both files
    targets_valid = validate_targets(args.targets)
    models_valid = validate_models(args.models)
    
    if targets_valid and models_valid:
        print("✓ All inputs validated successfully")
        sys.exit(0)
    else:
        print("✗ Validation failed", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()