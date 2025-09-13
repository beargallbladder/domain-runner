#!/bin/bash

echo "🔍 Verifying Missing LLMs Setup"
echo "=============================="

# SSH command to check environment variables
echo ""
echo "Step 1: SSH into your Render service:"
echo "ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"

echo ""
echo "Step 2: Once connected, run these commands:"
echo ""

cat << 'EOF'
# Check if API keys are set
echo "Checking API keys..."
env | grep -E "(AI21|PERPLEXITY|XAI)_API_KEY" | sed 's/=.*/=<key_present>/'

# Test the endpoints
echo ""
echo "Testing LLM endpoints..."
curl -s http://localhost:10000/api/provider-status | jq '.'

# Check recent responses
echo ""
echo "Checking database for recent responses..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
SELECT model, COUNT(*) as responses 
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '30 minutes' 
GROUP BY model 
ORDER BY model;"
EOF

echo ""
echo "Step 3: Test processing with all LLMs:"
echo "curl -X POST http://localhost:10000/api/process-domains -d '{\"limit\": 1}'"

echo ""
echo "Expected output: Should see all 11 LLMs listed with ✅"