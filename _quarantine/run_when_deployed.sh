#!/bin/bash
# Run this when services are deployed

echo "🧪 Testing 11 LLM Setup"
echo "======================="

# Check service health
echo -e "\n1. Checking services..."
curl -s -o /dev/null -w "sophisticated-runner: %{http_code}\n" https://sophisticated-runner.onrender.com/health
curl -s -o /dev/null -w "domain-processor-v2: %{http_code}\n" https://domain-processor-v2.onrender.com/health

# Run the final test
echo -e "\n2. Running 11 LLM test..."
python3 final_11_llm_test.py