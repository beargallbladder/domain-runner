#!/usr/bin/env python3
"""
Validate crawl output against schema and check for data quality.
"""
import json
import sys
import argparse
from pathlib import Path

def validate_crawl_output(crawl_file: str, schema_file: str = None) -> bool:
    """Validate crawl.jsonl file structure and content."""
    try:
        valid_lines = 0
        error_lines = 0
        
        with open(crawl_file, 'r') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    entry = json.loads(line)
                    
                    # Check required fields
                    required = ['timestamp', 'brand', 'model', 'provider', 'status']
                    for field in required:
                        if field not in entry:
                            print(f"Line {line_num}: Missing required field '{field}'", file=sys.stderr)
                            error_lines += 1
                            continue
                    
                    # Check status-specific fields
                    if entry['status'] == 'success':
                        if 'response' not in entry:
                            print(f"Line {line_num}: Success entry missing 'response'", file=sys.stderr)
                            error_lines += 1
                        else:
                            valid_lines += 1
                    elif entry['status'] == 'error':
                        if 'error' not in entry and 'error_type' not in entry:
                            print(f"Line {line_num}: Error entry missing error details", file=sys.stderr)
                            error_lines += 1
                        else:
                            valid_lines += 1
                    
                except json.JSONDecodeError as e:
                    print(f"Line {line_num}: Invalid JSON - {e}", file=sys.stderr)
                    error_lines += 1
        
        print(f"Validation complete: {valid_lines} valid, {error_lines} errors")
        return error_lines == 0
        
    except Exception as e:
        print(f"Error validating crawl file: {e}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Validate crawl output')
    parser.add_argument('--input', required=True, help='Crawl JSONL file to validate')
    parser.add_argument('--schema', help='Optional schema file')
    
    args = parser.parse_args()
    
    if validate_crawl_output(args.input, args.schema):
        print("✓ Crawl output is valid")
        sys.exit(0)
    else:
        print("✗ Crawl output validation failed", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()