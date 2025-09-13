#!/bin/bash

# Verify all LLM API keys are configured
echo "🔐 Verifying LLM API Keys"
echo "========================="
echo ""

# SSH command to check environment variables
SSH_CMD="ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"

echo "Checking API keys on the service..."
echo ""

# Check each LLM provider
PROVIDERS=(
    "OPENAI_API_KEY"
    "ANTHROPIC_API_KEY"
    "DEEPSEEK_API_KEY"
    "MISTRAL_API_KEY"
    "XAI_API_KEY"
    "TOGETHER_API_KEY"
    "PERPLEXITY_API_KEY"
    "GOOGLE_API_KEY"
    "COHERE_API_KEY"
    "AI21_API_KEY"
    "GROQ_API_KEY"
)

echo "To check API keys, SSH into the service and run:"
echo ""
for provider in "${PROVIDERS[@]}"; do
    echo "env | grep $provider"
done

echo ""
echo "Each provider should have 2 keys (_KEY and _KEY_2)"
echo ""
echo "SSH Command:"
echo "$SSH_CMD"
echo ""

# Quick database check for LLM activity
echo "Recent LLM Activity (last 10 minutes):"
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -c "
SELECT 
    model,
    COUNT(*) as responses,
    COUNT(CASE WHEN response NOT LIKE '%Error:%' AND response != 'No response' THEN 1 END) as successful,
    COUNT(CASE WHEN response LIKE '%Error:%' OR response = 'No response' THEN 1 END) as failed,
    MAX(created_at) as last_response
FROM domain_responses 
WHERE created_at > NOW() - INTERVAL '10 minutes'
GROUP BY model
ORDER BY model;"