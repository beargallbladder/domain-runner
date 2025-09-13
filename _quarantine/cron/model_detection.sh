#!/bin/bash
# Weekly Model Detection Script
# Add to crontab: 0 9 * * 1 /path/to/model_detection.sh

cd /Users/samkim/domain-runner

# Load environment variables
source .env 2>/dev/null || true

# Run the detection script
python3 auto_detect_model_changes.py >> logs/model_detection.log 2>&1

# Check if any changes were detected
if [ -f model_updates.ts ]; then
    echo "Model changes detected at $(date)" >> logs/model_detection.log
    # Could add email/slack notification here
fi