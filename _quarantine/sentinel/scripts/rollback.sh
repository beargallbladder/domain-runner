#!/bin/bash
# Rollback to a specific tagged release

set -e

TAG=$1

if [ -z "$TAG" ]; then
    echo "Usage: $0 <tag>"
    echo "Example: $0 v2025-01-15-1"
    exit 1
fi

echo "Rolling back to tag: $TAG"

# Checkout the tag
git checkout $TAG

# Get the run ID from the tag message or commit
RUN_ID=$(git log -1 --pretty=format:'%s' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}-[0-9]{2}Z' || echo "")

if [ -z "$RUN_ID" ]; then
    echo "Warning: Could not extract run ID from tag"
else
    echo "Associated run ID: $RUN_ID"
    
    # Update latest symlink to point to this run
    if [ -d "runs/$RUN_ID" ]; then
        cd runs && ln -sfn $RUN_ID latest
        echo "Updated runs/latest symlink to $RUN_ID"
    fi
fi

# Trigger Render deployment if API key is available
if [ ! -z "$RENDER_API_KEY" ]; then
    echo "Triggering Render deployment..."
    curl -X POST "https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d '{"clearCache": true}'
else
    echo "RENDER_API_KEY not set, skipping Render deployment"
fi

echo "Rollback complete!"