#!/bin/bash
# Check deployment status

WEB_URL="https://domain-runner-rust-web.onrender.com"

echo "Checking Rust deployment..."
echo ""

# Health check
echo "1. Health Check:"
curl -s ${WEB_URL}/healthz | python3 -m json.tool

echo ""
echo "2. Readiness Check:"
curl -s ${WEB_URL}/readyz | python3 -m json.tool

echo ""
echo "3. Status (Real Data):"
curl -s ${WEB_URL}/status | python3 -m json.tool

echo ""
echo "If you see your real domain counts and data above, the deployment is successful!"
