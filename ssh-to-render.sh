#!/bin/bash

# SSH to Render Service
SERVICE_ID="srv-d1lfb8ur433s73dm0pi0"
REGION="oregon"

echo "🔐 Connecting to Render service..."
echo "Service: sophisticated-runner"
echo "Region: Oregon"
echo ""

# Connect with your SSH key
ssh ${SERVICE_ID}@ssh.${REGION}.render.com

# Useful commands once connected:
# - cd /opt/render/project/src
# - ls -la
# - cat services/sophisticated-runner/dist/clean-index.js
# - ps aux | grep node
# - tail -f /var/log/render/app.log
# - env | grep API_KEY | wc -l  (count configured API keys)