#!/bin/bash
# Start full domain crawl in background

echo "🚀 Starting full domain crawl with 11 LLMs..."
echo "This will run in background. Check crawl.log for progress."

# Run the crawl in background, redirecting output to log file
nohup python3 run_full_domain_crawl.py > crawl.log 2>&1 &

# Get the process ID
PID=$!
echo "✅ Crawl started with PID: $PID"
echo ""
echo "Monitor progress with:"
echo "  tail -f crawl.log"
echo ""
echo "Check status with:"
echo "  ps -p $PID"
echo ""
echo "The crawl will process all 3,239 domains with 11 LLMs."
echo "This will make ~107,000 API calls and may take several hours."