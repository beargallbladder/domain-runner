#!/bin/bash

# Simple progress monitor for domain processing

SERVICE_URL="https://domain-runner.onrender.com"

echo "📊 Domain Processing Monitor"
echo "============================"

while true; do
    # Get pending count
    PENDING=$(curl -s "$SERVICE_URL/api/pending-count" | jq -r '.pending' 2>/dev/null || echo "?")
    
    # Calculate progress
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    
    # Clear line and print update
    echo -ne "\r[$TIMESTAMP] Pending domains: $PENDING"
    
    # If no domains left, exit
    if [ "$PENDING" = "0" ]; then
        echo -e "\n✅ All domains processed!"
        break
    fi
    
    # Wait 30 seconds before next check
    sleep 30
done