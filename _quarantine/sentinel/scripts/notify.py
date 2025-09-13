#!/usr/bin/env python3
"""
Send notifications about run status.
"""
import json
import os
import sys
import argparse
import urllib.request
import urllib.parse

def send_notification(status: str, run_id: str, metrics_file: str = None):
    """Send notification via configured webhook."""
    
    # Load metrics if provided
    metrics = {}
    if metrics_file and os.path.exists(metrics_file):
        with open(metrics_file, 'r') as f:
            metrics = json.load(f)
    
    # Build message
    emoji = {
        'ok': '✅',
        'partial': '⚠️',
        'degraded': '🔶',
        'failed': '❌'
    }.get(status, '❓')
    
    message = f"{emoji} Sentinel Run {run_id}: {status.upper()}"
    
    if metrics:
        message += f"\n• Brands: {metrics.get('brands_queried', 0)}"
        message += f"\n• Success rate: {metrics.get('success_rate', 0):.1%}"
        message += f"\n• Memory score: {metrics.get('memory_score_avg', 0):.3f}"
    
    # Send to webhook if configured
    webhook_url = os.environ.get('SLACK_WEBHOOK_URL') or os.environ.get('DISCORD_WEBHOOK_URL')
    
    if webhook_url:
        try:
            data = json.dumps({'text': message}).encode('utf-8')
            req = urllib.request.Request(webhook_url, data=data)
            req.add_header('Content-Type', 'application/json')
            
            with urllib.request.urlopen(req) as response:
                print(f"✓ Notification sent: {response.status}")
        except Exception as e:
            print(f"Warning: Could not send notification: {e}", file=sys.stderr)
    else:
        print(f"Notification (no webhook configured): {message}")

def main():
    parser = argparse.ArgumentParser(description='Send run notifications')
    parser.add_argument('--status', required=True, help='Run status')
    parser.add_argument('--run-id', required=True, help='Run ID')
    parser.add_argument('--metrics', help='Metrics JSON file')
    
    args = parser.parse_args()
    
    send_notification(args.status, args.run_id, args.metrics)

if __name__ == '__main__':
    main()