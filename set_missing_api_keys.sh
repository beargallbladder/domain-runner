#!/bin/bash
# Script to check and suggest setting missing API keys

echo "🔑 CHECKING FOR MISSING API KEYS"
echo "================================"

# Check local environment
echo -e "\nChecking local environment variables:"

check_key() {
    local key_name=$1
    if [ -z "${!key_name}" ]; then
        echo "❌ $key_name is NOT set"
        return 1
    else
        echo "✅ $key_name is set"
        return 0
    fi
}

# Check all variations
missing_count=0

echo -e "\nxAI keys:"
check_key "XAI_API_KEY" || ((missing_count++))
check_key "XAI_API_KEY_2" || ((missing_count++))
check_key "XAI_API_KEY2" || ((missing_count++))

echo -e "\nPerplexity keys:"
check_key "PERPLEXITY_API_KEY" || ((missing_count++))
check_key "PERPLEXITY_API_KEY_1" || ((missing_count++))
check_key "PERPLEXITY_API_KEY_2" || ((missing_count++))
check_key "PERPLEXITY_API_KEY2" || ((missing_count++))

echo -e "\nGoogle keys:"
check_key "GOOGLE_API_KEY" || ((missing_count++))
check_key "GOOGLE_API_KEY_2" || ((missing_count++))
check_key "GOOGLE_API_KEY2" || ((missing_count++))

echo -e "\nAI21 keys:"
check_key "AI21_API_KEY" || ((missing_count++))
check_key "AI21_API_KEY_1" || ((missing_count++))
check_key "AI21_API_KEY_2" || ((missing_count++))
check_key "AI21_API_KEY2" || ((missing_count++))

echo -e "\n================================"
echo "SOLUTION:"
echo ""
echo "The 4 missing LLMs (xAI, Perplexity, Google, AI21) need API keys."
echo ""
echo "You provided test keys this morning. To use them:"
echo ""
echo "1. Set them locally for testing:"
echo "   export XAI_API_KEY='your-xai-key'"
echo "   export PERPLEXITY_API_KEY='your-perplexity-key'"
echo "   export GOOGLE_API_KEY='your-google-key'"
echo "   export AI21_API_KEY='your-ai21-key'"
echo ""
echo "2. Add them to Render.com dashboard:"
echo "   - Go to the service (domain-runner or sophisticated-runner)"
echo "   - Environment tab"
echo "   - Add each key"
echo "   - Restart service"
echo ""
echo "Without these keys, the crawl will only use 7/11 LLMs."