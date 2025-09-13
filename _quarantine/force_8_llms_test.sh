#!/bin/bash
# Quick test to verify all 8 LLM API keys work

echo "🚀 TESTING ALL 8 LLM API KEYS"
echo "============================="

# Test each provider with a simple call
providers=(
  "deepseek|https://api.deepseek.com/v1/chat/completions|sk-a03c67f1fdd74c139faa0ad69b44a0fa"
  "openai|https://api.openai.com/v1/chat/completions|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"
  "mistral|https://api.mistral.ai/v1/chat/completions|ft2Xg7JfRU7OXoBQnrmIlLQdVJQQO89Z"
  "anthropic|https://api.anthropic.com/v1/messages|sk-ant-api03-jZa-W0Cyk3Z_s7vF_dLYJkP2YYiclqS0d8M-dO15s_j4fPFnNu_kFPXnCx3aK-pD-O8D3_DVqFMZ0rBJJ6Kg5g-x2nA8AAA"
  "xai|https://api.x.ai/v1/chat/completions|xai-TvMNjOdmQG8wFYI8nplKvopQlflnCSDo1fwmUl7XzQ9TLXrGZcJ4OJnJXGRRn7pjP7VKJBHQAyU4Yonc"
  "together|https://api.together.xyz/v1/chat/completions|9e3ba0c46dd44a97d19bb02c86bc79fdbbbe4acdad62c3c088c96cc08758c8f4"
  "perplexity|https://api.perplexity.ai/chat/completions|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"
)

working=0
for provider_info in "${providers[@]}"; do
  IFS='|' read -r name url key <<< "$provider_info"
  echo -n "Testing $name... "
  
  if [[ $name == "anthropic" ]]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
      -H "x-api-key: $key" \
      -H "anthropic-version: 2023-06-01" \
      -H "Content-Type: application/json" \
      -d '{"model":"claude-3-haiku-20240307","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}')
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
      -H "Authorization: Bearer $key" \
      -H "Content-Type: application/json" \
      -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}],"max_tokens":10}')
  fi
  
  http_code=$(echo "$response" | tail -n1)
  if [[ $http_code == "200" ]]; then
    echo "✅ Working"
    ((working++))
  else
    echo "❌ Failed (HTTP $http_code)"
  fi
done

# Google needs special handling
echo -n "Testing google... "
response=$(curl -s -w "\n%{http_code}" -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyDi-i8I9BiL7E36skCmR6BQXNO7Y5LHnxg" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hi"}]}]}')

http_code=$(echo "$response" | tail -n1)
if [[ $http_code == "200" ]]; then
  echo "✅ Working"
  ((working++))
else
  echo "❌ Failed (HTTP $http_code)"
fi

echo ""
echo "📊 Summary: $working/8 LLMs have working API keys"
echo ""
echo "🎯 These keys should be added to Render environment variables"