#!/bin/bash

# Test the 3 missing LLMs directly

echo "🔍 Testing Missing LLMs: AI21, Perplexity, XAI"
echo "=============================================="
echo ""

# Get the API keys from Render environment
echo "First, SSH into the service and get the API keys:"
echo "ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"
echo ""
echo "Then run: env | grep -E '(AI21|PERPLEXITY|XAI)_API_KEY'"
echo ""

# Check if these providers have any responses in the last hour
echo "Checking database for ANY responses from missing LLMs..."
PGPASSWORD=wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5 psql "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db" -c "
SELECT 
    model,
    COUNT(*) as total_responses,
    COUNT(CASE WHEN response = 'No response' THEN 1 END) as no_response,
    COUNT(CASE WHEN response LIKE '%Error:%' THEN 1 END) as errors,
    MAX(created_at) as last_attempt
FROM domain_responses 
WHERE model IN ('ai21', 'perplexity', 'xai')
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY model
ORDER BY model;"

echo ""
echo "Checking if API keys are being detected..."
echo ""

# Create a test script for the service
cat > test-llm-keys.js << 'EOF'
// Test script to check LLM API keys
console.log("🔑 Checking LLM API Keys:");
console.log("========================");

const providers = [
  { name: 'AI21', key: process.env.AI21_API_KEY, key2: process.env.AI21_API_KEY_2 },
  { name: 'Perplexity', key: process.env.PERPLEXITY_API_KEY, key2: process.env.PERPLEXITY_API_KEY_2 },
  { name: 'XAI', key: process.env.XAI_API_KEY, key2: process.env.XAI_API_KEY_2 }
];

providers.forEach(provider => {
  console.log(`\n${provider.name}:`);
  console.log(`  Primary key: ${provider.key ? '✅ Set' : '❌ Missing'}`);
  console.log(`  Secondary key: ${provider.key2 ? '✅ Set' : '❌ Missing'}`);
  
  if (!provider.key && !provider.key2) {
    console.log(`  ⚠️  NO KEYS CONFIGURED FOR ${provider.name}!`);
  }
});

// Test API endpoints
console.log("\n📡 Testing API Endpoints:");
console.log("========================");

async function testAI21() {
  if (!process.env.AI21_API_KEY) return console.log("AI21: ❌ No API key");
  
  try {
    const response = await fetch('https://api.ai21.com/studio/v1/j2-light/complete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AI21_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: "Test",
        maxTokens: 10
      })
    });
    
    console.log(`AI21: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const error = await response.text();
      console.log(`AI21 Error: ${error}`);
    }
  } catch (error) {
    console.log(`AI21: ❌ ${error.message}`);
  }
}

async function testPerplexity() {
  if (!process.env.PERPLEXITY_API_KEY) return console.log("Perplexity: ❌ No API key");
  
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{role: 'user', content: 'Test'}],
        max_tokens: 10
      })
    });
    
    console.log(`Perplexity: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const error = await response.text();
      console.log(`Perplexity Error: ${error}`);
    }
  } catch (error) {
    console.log(`Perplexity: ❌ ${error.message}`);
  }
}

async function testXAI() {
  if (!process.env.XAI_API_KEY) return console.log("XAI: ❌ No API key");
  
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [{role: 'user', content: 'Test'}],
        max_tokens: 10
      })
    });
    
    console.log(`XAI: ${response.status} ${response.statusText}`);
    if (!response.ok) {
      const error = await response.text();
      console.log(`XAI Error: ${error}`);
    }
  } catch (error) {
    console.log(`XAI: ❌ ${error.message}`);
  }
}

// Run tests
Promise.all([testAI21(), testPerplexity(), testXAI()]).then(() => {
  console.log("\n✅ Test complete");
});
EOF

echo ""
echo "Created test-llm-keys.js"
echo ""
echo "To run this test on the service:"
echo "1. SSH in: ssh srv-d1lfb8ur433s73dm0pi0@ssh.oregon.render.com"
echo "2. cd /opt/render/project/src"
echo "3. node test-llm-keys.js"
echo ""
echo "This will show which API keys are missing and test the endpoints."