#!/bin/bash
# Start crawler on Render using their Jobs API

echo "🚀 Starting crawler on Render..."

curl -X POST \
  -H "Authorization: Bearer rnd_dLJ0rSH2rl9HnV5Wy5DBzLCdcQ0R" \
  -H "Content-Type: application/json" \
  -d '{
    "startCommand": "cd services/domain-processor-v2 && node crawler-working.js"
  }' \
  "https://api.render.com/v1/services/srv-d1lfb8ur433s73dm0pi0/jobs"

echo "✅ Job started! Check https://dashboard.render.com for status"